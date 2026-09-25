'use client';

import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  BookOpen, 
  Code, 
  Settings, 
  CheckCircle, 
  Palette, 
  Terminal, 
  Database, 
  ChevronDown, 
  ChevronRight, 
  FileCode, 
  Eye, 
  GitBranch, 
  ExternalLink, 
  Sparkles, 
  Download,
  CheckSquare,
  Square,
  FileText,
  FileSpreadsheet,
  Share2,
  FolderTree,
  Network
} from 'lucide-react';
import { IndexedFile, RepoSnapshot, FileCategory } from '@/lib/types';
import { RepoForceGraph } from '@/components/RepoForceGraph';
import { BatchRenamerModal } from '@/components/BatchRenamerModal';

interface TableOfContentsViewProps {
  snapshot: RepoSnapshot | null;
  files: IndexedFile[];
  onPreviewFile: (file: IndexedFile) => void;
  selectedFiles: IndexedFile[];
  onToggleSelectFile: (file: IndexedFile) => void;
  onSelectMultipleFiles: (filesToSelect: IndexedFile[]) => void;
  onDeselectMultipleFiles: (filesToDeselect: IndexedFile[]) => void;
  onClearSelection: () => void;
  onOpenUrlExporter: () => void;
  onOpenQuickExport: () => void;
  onBatchRenameFiles?: (updatedFiles: IndexedFile[]) => void;
}

const CATEGORY_ICONS: Record<FileCategory, React.ReactNode> = {
  'Documentation': <BookOpen className="w-4 h-4 text-emerald-600" />,
  'Source Code': <Code className="w-4 h-4 text-sky-600" />,
  'Architecture & Config': <Settings className="w-4 h-4 text-amber-600" />,
  'Tests': <CheckCircle className="w-4 h-4 text-violet-600" />,
  'UI & Styles': <Palette className="w-4 h-4 text-pink-600" />,
  'Build & DevOps': <Terminal className="w-4 h-4 text-teal-600" />,
  'Data & Assets': <Database className="w-4 h-4 text-orange-600" />
};

export function TableOfContentsView({ 
  snapshot, 
  files, 
  onPreviewFile,
  selectedFiles,
  onToggleSelectFile,
  onSelectMultipleFiles,
  onDeselectMultipleFiles,
  onClearSelection,
  onOpenUrlExporter,
  onOpenQuickExport,
  onBatchRenameFiles,
}: TableOfContentsViewProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [isBatchRenamerOpen, setIsBatchRenamerOpen] = useState<boolean>(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Architecture & Config': true,
    'Documentation': true,
    'Source Code': true,
    'UI & Styles': true,
    'Tests': true,
    'Build & DevOps': true,
    'Data & Assets': true,
  });
  const [viewMode, setViewMode] = useState<'categories' | 'matrix' | 'readme' | 'graph'>('categories');

  // Selected file ids set for O(1) lookup
  const selectedFileIdSet = useMemo(() => new Set(selectedFiles.map(f => f.id)), [selectedFiles]);

  // Distinct branches present
  const branches = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => set.add(f.branch));
    return Array.from(set);
  }, [files]);

  // Group files by Category
  const groupedFiles = useMemo(() => {
    const map: Record<FileCategory, IndexedFile[]> = {
      'Documentation': [],
      'Source Code': [],
      'Architecture & Config': [],
      'Tests': [],
      'UI & Styles': [],
      'Build & DevOps': [],
      'Data & Assets': []
    };

    const targetFiles = selectedBranch === 'all' 
      ? files 
      : files.filter((f) => f.branch === selectedBranch);

    targetFiles.forEach((file) => {
      if (map[file.category]) {
        map[file.category].push(file);
      } else {
        map['Source Code'].push(file);
      }
    });

    return map;
  }, [files, selectedBranch]);

  // Coverage statistics per branch
  const branchMatrix = useMemo(() => {
    const stats: Record<string, { totalFiles: number; totalBytes: number; categories: Record<string, number> }> = {};
    files.forEach((f) => {
      if (!stats[f.branch]) {
        stats[f.branch] = { totalFiles: 0, totalBytes: 0, categories: {} };
      }
      stats[f.branch].totalFiles += 1;
      stats[f.branch].totalBytes += f.size;
      stats[f.branch].categories[f.category] = (stats[f.branch].categories[f.category] || 0) + 1;
    });

    return Object.entries(stats).map(([branch, data]) => ({
      branch,
      ...data,
      isPrioritized: snapshot?.prioritizedBranches.some((p) => p.toLowerCase() === branch.toLowerCase()) || false,
      isDefault: branch === snapshot?.defaultBranch
    }));
  }, [files, snapshot]);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleDownloadTOCJson = () => {
    const data = {
      snapshot,
      totalFiles: files.length,
      groupedFiles,
      generatedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot?.repo || 'repo'}-toc.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!snapshot) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 shadow-sm">
        <Layers className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Repository Indexed Yet</h3>
        <p className="text-xs text-slate-500 mt-1">
          Use the Universal Crawler tab to start indexing branches and generate a categorical Table of Contents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls & Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {snapshot.fullName}
              </h2>
              <span className="px-2 py-0.5 rounded-full font-mono text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {snapshot.versionTag}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{snapshot.description || 'Deep parsed GitHub repository structure'}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setViewMode('categories')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'categories' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Categorical TOC</span>
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'graph' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Network className="w-3.5 h-3.5 text-sky-600" />
                <span>Force Graph Map</span>
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'matrix' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 text-amber-600" />
                <span>Branch Matrix</span>
              </button>
              <button
                onClick={() => setViewMode('readme')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'readme' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Collated README</span>
              </button>
            </div>

            {/* Quick Export Trigger */}
            <button
              type="button"
              onClick={onOpenQuickExport}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition-colors font-medium shadow-xs"
              title="Batch export snapshot metadata to Google Drive (JSON / CSV)"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Quick Export</span>
            </button>

            {/* File URLs Exporter Trigger */}
            <button
              type="button"
              onClick={onOpenUrlExporter}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition-colors font-medium shadow-xs"
              title="Export selected files or entire repo as URL .txt, Google Docs or Sheets"
            >
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>URL Exporter</span>
            </button>

            {/* Batch Renaming & Organization Tool */}
            <button
              type="button"
              onClick={() => setIsBatchRenamerOpen(true)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition-colors font-medium shadow-xs"
              title="Batch rename and organize files across tree"
            >
              <FolderTree className="w-3.5 h-3.5 text-emerald-600" />
              <span>Batch Rename</span>
            </button>

            <button
              onClick={handleDownloadTOCJson}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs rounded-lg flex items-center gap-1.5 border border-slate-200 transition-colors font-medium shadow-xs"
              title="Download TOC as JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Branch Filter Selector & Multi Selection Stats */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-amber-600" />
            <span className="text-slate-600 font-medium">Filter by Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-slate-800 outline-none font-mono focus:border-emerald-500"
            >
              <option value="all">All Indexed Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b} {snapshot.prioritizedBranches.includes(b) ? '★ (Priority)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {selectedFiles.length > 0 && (
              <span className="text-sky-700 font-semibold flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" />
                {selectedFiles.length} file(s) selected
              </span>
            )}
            <div className="text-slate-500 font-mono text-[11px] hidden sm:block">
              Showing {selectedBranch === 'all' ? files.length : files.filter((f) => f.branch === selectedBranch).length} files
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Selection Action Banner */}
      {selectedFiles.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-sky-900 font-medium">
            <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              {selectedFiles.length} file(s) selected across {branches.length} branch(es)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenUrlExporter}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export URLs (.txt / Docs / Sheets)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBatchRenamerOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Rename Selected ({selectedFiles.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const visible = selectedBranch === 'all' ? files : files.filter((f) => f.branch === selectedBranch);
                onSelectMultipleFiles(visible);
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition-colors font-medium"
            >
              Select All Visible
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-300 transition-colors font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Force Graph View */}
      {viewMode === 'graph' && (
        <RepoForceGraph files={files} snapshot={snapshot} onPreviewFile={onPreviewFile} />
      )}

      {/* Main Content Area Based on View Mode */}
      {viewMode === 'categories' && (
        <div className="space-y-4">
          {(Object.keys(groupedFiles) as FileCategory[]).map((category) => {
            const catFiles = groupedFiles[category];
            const isOpen = openCategories[category] ?? false;
            const allCatSelected = catFiles.length > 0 && catFiles.every((f) => selectedFileIdSet.has(f.id));
            const someCatSelected = catFiles.some((f) => selectedFileIdSet.has(f.id));

            return (
              <div
                key={category}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all shadow-xs"
              >
                {/* Category Group Header */}
                <div className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (allCatSelected) {
                          onDeselectMultipleFiles(catFiles);
                        } else {
                          onSelectMultipleFiles(catFiles);
                        }
                      }}
                      title={allCatSelected ? 'Deselect all in category' : 'Select all in category'}
                      className="text-slate-400 hover:text-sky-600 transition-colors"
                    >
                      {allCatSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-600" />
                      ) : someCatSelected ? (
                        <div className="w-4 h-4 border border-sky-500 rounded bg-sky-50 flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-sky-600" />
                        </div>
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-2.5"
                    >
                      {CATEGORY_ICONS[category]}
                      <span className="text-sm font-bold text-slate-900">{category}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white text-slate-600 border border-slate-200 font-medium">
                        {catFiles.length} files
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">
                      {(catFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* File List under Category */}
                {isOpen && (
                  <div className="divide-y divide-slate-100">
                    {catFiles.length === 0 ? (
                      <div className="p-4 text-xs text-slate-400 italic text-center font-mono">
                        No files in this category on the selected branch.
                      </div>
                    ) : (
                      catFiles.map((file) => {
                        const isSelected = selectedFileIdSet.has(file.id);
                        return (
                          <div
                            key={`${file.branch}_${file.path}`}
                            className={`px-5 py-2.5 flex items-center justify-between gap-3 text-xs font-mono transition-colors ${
                              isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => onToggleSelectFile(file)}
                                className="text-slate-400 hover:text-sky-600 shrink-0 transition-colors"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </button>
                              <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-800 truncate">{file.path}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200 shrink-0 font-medium">
                                {file.branch}
                              </span>
                              {file.isReadme && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 font-sans font-semibold">
                                  README
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-slate-500 text-[11px] font-sans">
                                {file.language}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                {(file.size / 1024).toFixed(1)} KB
                              </span>
                              <button
                                onClick={() => onPreviewFile(file)}
                                className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-sans flex items-center gap-1 border border-slate-300 transition-colors shadow-xs font-medium"
                              >
                                <Eye className="w-3 h-3 text-sky-600" />
                                <span>View</span>
                              </button>
                              {file.rawUrl && (
                                <a
                                  href={file.rawUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                  title="Open Raw File"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Branch Matrix View */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-amber-600" />
              <span>Branch Coverage & File Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Prioritized branches are mapped with primary precedence to document critical code pathways first.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3">Priority Status</th>
                  <th className="py-2.5 px-3">Total Files</th>
                  <th className="py-2.5 px-3">Total Size</th>
                  <th className="py-2.5 px-3">Category Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {branchMatrix.map((item) => (
                  <tr key={item.branch} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900">{item.branch}</span>
                      {item.isDefault && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans font-medium">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      {item.isPrioritized ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                          ★ Prioritized First
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Standard Line</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-800">{item.totalFiles} files</td>
                    <td className="py-3 px-3 text-slate-500">{(item.totalBytes / 1024).toFixed(1)} KB</td>
                    <td className="py-3 px-3 font-sans">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(item.categories).map(([cat, count]) => (
                          <span key={cat} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] border border-slate-200 font-medium">
                            {cat}: {count}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collated README View */}
      {viewMode === 'readme' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-slate-900">Collated Repository Documentation</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Source: Default & Prioritized Branches
            </span>
          </div>

          {snapshot.readmeContent ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
              {snapshot.readmeContent}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No README document was detected in the crawled prioritized branches.
            </div>
          )}
        </div>
      )}

      {/* Batch File Renaming and Organization Tool Modal */}
      {isBatchRenamerOpen && (
        <BatchRenamerModal
          isOpen={isBatchRenamerOpen}
          onClose={() => setIsBatchRenamerOpen(false)}
          files={files}
          snapshot={snapshot}
          selectedFiles={selectedFiles}
          onApplyRenaming={(updatedFiles) => {
            if (onBatchRenameFiles) {
              onBatchRenameFiles(updatedFiles);
            }
          }}
        />
      )}
    </div>
  );
}
