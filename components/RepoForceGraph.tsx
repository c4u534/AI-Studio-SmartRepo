'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Folder, 
  FileCode, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Play, 
  Pause, 
  Layers, 
  GitBranch, 
  Search, 
  Info,
  Eye,
  Sliders,
  Activity,
  Network
} from 'lucide-react';
import { IndexedFile, RepoSnapshot, FileCategory } from '@/lib/types';
import { RepositoryInsights } from '@/components/RepositoryInsights';

interface RepoForceGraphProps {
  files: IndexedFile[];
  snapshot: RepoSnapshot | null;
  onPreviewFile: (file: IndexedFile) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  path: string;
  type: 'root' | 'folder' | 'file';
  category?: FileCategory;
  branch?: string;
  size?: number;
  radius: number;
  fileRef?: IndexedFile;
  childCount?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Documentation': '#059669', // emerald-600
  'Source Code': '#0284c7', // sky-600
  'Architecture & Config': '#d97706', // amber-600
  'Tests': '#7c3aed', // violet-600
  'UI & Styles': '#db2777', // pink-600
  'Build & DevOps': '#0d9488', // teal-600
  'Data & Assets': '#ea580c', // orange-600
  'folder': '#64748b', // slate-500
  'root': '#0f172a', // slate-900
};

export function RepoForceGraph({ files, snapshot, onPreviewFile }: RepoForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeGraphTab, setActiveGraphTab] = useState<'graph' | 'insights'>('graph');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [maxNodesToRender, setMaxNodesToRender] = useState(250);

  // Available Branches
  const branches = useMemo(() => {
    const s = new Set<string>();
    files.forEach((f) => s.add(f.branch));
    return Array.from(s);
  }, [files]);

  // Responsive size observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Build tree graph data (Root -> Folders -> Files)
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // 1. Root Node
    const rootName = snapshot?.fullName || 'Repository';
    const rootNode: GraphNode = {
      id: 'root',
      name: rootName,
      path: '',
      type: 'root',
      radius: 16,
    };
    nodes.push(rootNode);
    nodeMap.set('root', rootNode);

    // 2. Filter target files
    let filtered = files;
    if (selectedBranch !== 'all') {
      filtered = filtered.filter((f) => f.branch === selectedBranch);
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((f) => f.category === selectedCategory);
    }

    // Limit nodes to prevent physics lag on very large repos
    const sampleFiles = filtered.slice(0, maxNodesToRender);

    sampleFiles.forEach((file) => {
      const parts = file.path.split('/');
      let currentPath = '';
      let parentId = 'root';

      // Intermediate folder nodes
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const folderId = `folder:${file.branch}:${currentPath}`;

        if (!nodeMap.has(folderId)) {
          const folderNode: GraphNode = {
            id: folderId,
            name: part,
            path: currentPath,
            type: 'folder',
            radius: 8,
            childCount: 1,
          };
          nodes.push(folderNode);
          nodeMap.set(folderId, folderNode);
          links.push({ source: parentId, target: folderId });
        } else {
          const existing = nodeMap.get(folderId)!;
          existing.childCount = (existing.childCount || 1) + 1;
        }

        parentId = folderId;
      }

      // Leaf file node
      const fileName = parts[parts.length - 1];
      const fileId = `file:${file.branch}:${file.path}`;

      if (!nodeMap.has(fileId)) {
        const fileNode: GraphNode = {
          id: fileId,
          name: fileName,
          path: file.path,
          type: 'file',
          category: file.category,
          branch: file.branch,
          size: file.size,
          radius: Math.max(4, Math.min(9, Math.log10(file.size || 100) * 2.2)),
          fileRef: file,
        };
        nodes.push(fileNode);
        nodeMap.set(fileId, fileNode);
        links.push({ source: parentId, target: fileId });
      }
    });

    return { nodes, links };
  }, [files, snapshot, selectedBranch, selectedCategory, maxNodesToRender]);

  // D3 Force Simulation Setup
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    const g = svg.append('g').attr('class', 'main-container');

    // Zoom setup
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 6])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(graphData.nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(graphData.links)
          .id((d) => d.id)
          .distance((d: any) => (d.source.type === 'root' ? 70 : 45))
          .strength(0.6)
      )
      .force('charge', d3.forceManyBody().strength((d: any) => (d.type === 'root' ? -350 : d.type === 'folder' ? -120 : -40)))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d: any) => d.radius + 5))
      .alphaDecay(0.028);

    simulationRef.current = simulation;

    // Render Links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => (d.source.type === 'root' ? 1.8 : 1));

    // Render Nodes Group
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('cursor', (d) => (d.type === 'file' ? 'pointer' : 'default'))
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node Circles
    node
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => {
        if (d.type === 'root') return CATEGORY_COLORS['root'];
        if (d.type === 'folder') return CATEGORY_COLORS['folder'];
        return CATEGORY_COLORS[d.category || ''] || '#0284c7';
      })
      .attr('stroke', (d) => (d.type === 'root' ? '#0284c7' : '#ffffff'))
      .attr('stroke-width', (d) => (d.type === 'root' ? 3 : 1.5))
      .attr('opacity', 0.95);

    // Node Labels
    node
      .append('text')
      .text((d) => d.name)
      .attr('x', (d) => d.radius + 4)
      .attr('y', 3)
      .attr('font-size', (d) => (d.type === 'root' ? '12px' : d.type === 'folder' ? '10px' : '9px'))
      .attr('font-family', 'ui-monospace, SFMono-Regular, monospace')
      .attr('fill', (d) => (d.type === 'root' ? '#0f172a' : d.type === 'folder' ? '#334155' : '#475569'))
      .attr('pointer-events', 'none')
      .style('display', showLabels ? 'block' : 'none');

    // Hover and Click events
    node
      .on('mouseenter', (event, d) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
        setHoveredNode(d);
        if (event.currentTarget) {
          d3.select(event.currentTarget as SVGGElement).select('circle').attr('stroke', '#0284c7').attr('stroke-width', 2.5);
        }
      })
      .on('mousemove', (event) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mouseleave', (event, d) => {
        setHoveredNode(null);
        if (event.currentTarget) {
          d3.select(event.currentTarget as SVGGElement)
            .select('circle')
            .attr('stroke', d.type === 'root' ? '#0284c7' : '#ffffff')
            .attr('stroke-width', d.type === 'root' ? 3 : 1.5);
        }
      })
      .on('click', (_event, d) => {
        if (d.type === 'file' && d.fileRef) {
          onPreviewFile(d.fileRef);
        }
      });

    // Simulation tick handler
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, showLabels, dimensions, onPreviewFile]);

  // Handle Search Query Highlighting
  useEffect(() => {
    if (!svgRef.current || !searchQuery) return;
    const q = searchQuery.toLowerCase();
    const svg = d3.select(svgRef.current);

    svg.selectAll<SVGGElement, GraphNode>('.nodes g').each(function (d) {
      const match = d.name.toLowerCase().includes(q) || d.path.toLowerCase().includes(q);
      d3.select(this)
        .select('circle')
        .attr('stroke', match ? '#059669' : d.type === 'root' ? '#0284c7' : '#ffffff')
        .attr('stroke-width', match ? 3.5 : d.type === 'root' ? 3 : 1.5);
    });
  }, [searchQuery]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().call(zoomBehaviorRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().call(zoomBehaviorRef.current.scaleBy, 0.7);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const toggleSimulation = () => {
    if (!simulationRef.current) return;
    if (isSimulating) {
      simulationRef.current.stop();
      setIsSimulating(false);
    } else {
      simulationRef.current.restart();
      setIsSimulating(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Switcher: Force Graph vs Repository Insights */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveGraphTab('graph')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeGraphTab === 'graph'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-sky-600" />
            <span>Force-Directed Graph</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveGraphTab('insights')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeGraphTab === 'insights'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-violet-600" />
            <span>Repository Insights</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <span className="font-semibold text-slate-700">{snapshot?.fullName || 'Repository'}</span>
          <span>·</span>
          <span>{files.length} indexed files</span>
        </div>
      </div>

      {activeGraphTab === 'insights' ? (
        <RepositoryInsights snapshot={snapshot} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[650px] relative shadow-sm">
          {/* Top Controls Bar */}
          <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Repository Force Graph
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({graphData.nodes.length} nodes · {graphData.links.length} hierarchy edges)
                </span>
              </div>

              {/* Search box within graph */}
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Highlight path/file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            {Object.keys(CATEGORY_COLORS)
              .filter((k) => k !== 'root' && k !== 'folder')
              .map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>

          {/* Node Density limit */}
          <select
            value={maxNodesToRender}
            onChange={(e) => setMaxNodesToRender(Number(e.target.value))}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2 py-1"
          >
            <option value={100}>100 Files</option>
            <option value={200}>200 Files</option>
            <option value={400}>400 Files</option>
            <option value={800}>All Files</option>
          </select>

          {/* Label Toggle */}
          <button
            type="button"
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2 py-1 rounded-lg border transition-colors text-[11px] font-medium ${
              showLabels
                ? 'bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
            }`}
          >
            Labels
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 p-0.5 rounded-lg shadow-xs">
            <button
              onClick={handleZoomIn}
              title="Zoom in"
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom out"
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleSimulation}
              title={isSimulating ? 'Pause physics simulation' : 'Resume physics simulation'}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas SVG */}
      <div ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden bg-slate-50">
        <svg ref={svgRef} className="w-full h-full cursor-move" />

        {/* Floating Tooltip */}
        {hoveredNode && (
          <div
            className="absolute pointer-events-none z-30 bg-white border border-slate-200 p-2.5 rounded-xl shadow-xl text-xs text-slate-800 font-mono space-y-1 max-w-xs"
            style={{
              left: Math.min(tooltipPos.x + 12, dimensions.width - 260),
              top: Math.max(tooltipPos.y - 40, 10),
            }}
          >
            <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
              {hoveredNode.type === 'folder' ? (
                <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              )}
              <span className="truncate">{hoveredNode.name}</span>
            </div>
            {hoveredNode.path && <p className="text-[10px] text-slate-500 truncate">{hoveredNode.path}</p>}
            {hoveredNode.branch && (
              <p className="text-[10px] text-amber-700 font-semibold">Branch: {hoveredNode.branch}</p>
            )}
            {hoveredNode.category && (
              <p className="text-[10px] font-medium" style={{ color: CATEGORY_COLORS[hoveredNode.category] }}>
                Category: {hoveredNode.category}
              </p>
            )}
            {hoveredNode.size !== undefined && (
              <p className="text-[10px] text-slate-500">Size: {hoveredNode.size} bytes</p>
            )}
            {hoveredNode.type === 'file' && (
              <p className="text-[9px] text-emerald-700 font-sans font-semibold pt-1 border-t border-slate-100">
                Click to inspect source code
              </p>
            )}
          </div>
        )}

        {/* Legend Overlay at Bottom Left */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 p-2.5 rounded-xl text-[10px] space-y-1.5 shadow-md max-w-[200px]">
          <span className="font-bold text-slate-800 block text-[11px]">Graph Legend</span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-sky-500" />
              <span className="text-slate-600 font-medium">Root</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="text-slate-600 font-medium">Folder</span>
            </div>
            {Object.entries(CATEGORY_COLORS)
              .filter(([k]) => k !== 'root' && k !== 'folder')
              .slice(0, 4)
              .map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-1.5 truncate">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-slate-600 truncate font-medium">{cat}</span>
                </div>
              ))}
          </div>
          <span className="text-[9px] text-slate-400 block pt-1 border-t border-slate-100">
            Click any file node to inspect source
          </span>
        </div>
      </div>
    </div>
  )}
</div>
  );
}
