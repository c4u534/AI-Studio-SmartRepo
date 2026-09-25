'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  Terminal, 
  Code, 
  Copy, 
  Check, 
  Sparkles, 
  Play, 
  Cpu, 
  Layers, 
  ExternalLink, 
  Loader2, 
  Share2,
  Database,
  HardDrive,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { RepoSnapshot, IndexedFile } from '@/lib/types';
import { generateAgenticConstruct } from '@/lib/agentic-context';

interface McpA2APanelProps {
  snapshot: RepoSnapshot | null;
  files: IndexedFile[];
  onOpenAgenticModal?: () => void;
}

export function McpA2APanel({ snapshot, files, onOpenAgenticModal }: McpA2APanelProps) {
  const [activeTool, setActiveTool] = useState('get_agentic_context');
  const [toolQuery, setToolQuery] = useState('config');
  const [toolBranch, setToolBranch] = useState('');
  const [toolResult, setToolResult] = useState<string>('');
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);

  // A2A Protocol State
  const [a2aAction, setA2aAction] = useState<'get_context' | 'search' | 'get_architecture' | 'get_database'>('get_context');
  const [a2aQuery, setA2aQuery] = useState('entrypoints');
  const [a2aResult, setA2aResult] = useState<string>('');
  const [isTestingA2a, setIsTestingA2a] = useState(false);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const mcpConfigCode = JSON.stringify(
    {
      mcpServers: {
        "github-smart-repository-indexer": {
          url: `${originUrl}/api/mcp`,
          type: "streamable-jsonrpc"
        }
      }
    },
    null,
    2
  );

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(mcpConfigCode);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const handleExecuteTool = async () => {
    setIsExecutingTool(true);
    setToolResult('');
    try {
      let args: any = {};
      if (activeTool === 'get_agentic_context') {
        args = { repo: snapshot?.fullName, includeFullManifest: false };
      } else if (activeTool === 'search_repo_content') {
        args = { query: toolQuery, branch: toolBranch || undefined };
      } else if (activeTool === 'get_repo_toc') {
        args = { branch: toolBranch || undefined };
      } else if (activeTool === 'get_repo_file') {
        args = { path: toolQuery || 'package.json', branch: toolBranch || undefined };
      } else if (activeTool === 'get_dependency_matrix') {
        args = {};
      } else if (activeTool === 'get_database_status') {
        args = {};
      } else if (activeTool === 'list_repo_branches') {
        args = {};
      } else if (activeTool === 'save_to_drive') {
        args = { format: 'all' };
      }

      // If active repo is present, execute against live client data or call server endpoint
      if (activeTool === 'get_agentic_context' && snapshot) {
        const construct = generateAgenticConstruct(snapshot, files);
        // Condensed manifest for quick view in tester
        construct.fullFileManifest = construct.fullFileManifest.slice(0, 15);
        setToolResult(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            tool: 'get_agentic_context',
            executionStatus: 'success',
            agenticConstruct: construct,
          }
        }, null, 2));
      } else if (activeTool === 'search_repo_content' && files.length > 0) {
        const q = (toolQuery || '').toLowerCase();
        const matches = files.filter(f => f.path.toLowerCase().includes(q) || (f.contentSnippet || '').toLowerCase().includes(q)).slice(0, 10);
        setToolResult(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            tool: 'search_repo_content',
            query: toolQuery,
            totalMatches: matches.length,
            matches: matches.map(m => ({
              path: m.path,
              branch: m.branch,
              category: m.category,
              size: m.size,
              language: m.language,
              rawUrl: m.rawUrl
            }))
          }
        }, null, 2));
      } else if (activeTool === 'get_database_status' && snapshot) {
        setToolResult(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            tool: 'get_database_status',
            provider: 'Google Cloud Firestore',
            documentPath: `/repo_snapshots/${snapshot.id}`,
            filesTracked: files.length,
            versionTag: snapshot.versionTag,
            driveFolderId: snapshot.googleDriveFolderId || null,
            status: 'synced_and_ready'
          }
        }, null, 2));
      } else {
        const res = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: activeTool,
              arguments: args
            }
          })
        });
        const data = await res.json();
        setToolResult(JSON.stringify(data, null, 2));
      }
    } catch (e: any) {
      setToolResult(JSON.stringify({ error: e.message }, null, 2));
    } finally {
      setIsExecutingTool(false);
    }
  };

  const handleTestA2a = async () => {
    setIsTestingA2a(true);
    setA2aResult('');
    try {
      const res = await fetch('/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: a2aAction,
          query: a2aQuery,
          repo: snapshot?.fullName,
        }),
      });
      const data = await res.json();
      setA2aResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setA2aResult(JSON.stringify({ error: e.message }, null, 2));
    } finally {
      setIsTestingA2a(false);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (!snapshot) return;
    setIsAnalyzingAi(true);
    setAiAnalysis('');
    try {
      const res = await fetch('/api/gemini/synthesize-readme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName: snapshot.fullName,
          defaultBranch: snapshot.defaultBranch,
          prioritizedBranches: snapshot.prioritizedBranches,
          totalFiles: files.length,
          branchReadmes: [
            {
              branch: snapshot.defaultBranch,
              path: 'README.md',
              content: snapshot.readmeContent || '',
            }
          ]
        })
      });
      const data = await res.json();
      setAiAnalysis(data.synthesizedDoc || data.markdown || data.error || 'No analysis generated.');
    } catch (err: any) {
      setAiAnalysis(`Error: ${err.message}`);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">
                MCP & A2A Agent Integration Gateway
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                JSON-RPC 2.0 & A2A Protocol
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Autonomous Model Context Protocol (MCP) and Agent-to-Agent (A2A) endpoints enabling AI agents (Claude, Cursor, AutoGen) to ingest the repository index, explore priority tiers, and query persistent Firestore databasing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenAgenticModal && (
              <button
                onClick={onOpenAgenticModal}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>View Full Agentic JSON</span>
              </button>
            )}

            <button
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzingAi || !snapshot}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-all shrink-0"
            >
              {isAnalyzingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Architecture...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Architecture Synthesis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Synthesis Box */}
        {aiAnalysis && (
          <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>AI Architectural Analysis</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Gemini AI Synthesis</span>
            </div>
            <div className="text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {aiAnalysis}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Interactive MCP Tool Tester */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Live MCP Server Tool Execution</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">/api/mcp</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">Select MCP Tool</label>
              <select
                value={activeTool}
                onChange={(e) => setActiveTool(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none font-mono focus:border-indigo-500 text-xs"
              >
                <option value="get_agentic_context">get_agentic_context — Complete JSON construct & tiers</option>
                <option value="search_repo_content">search_repo_content — Search keywords in files</option>
                <option value="get_repo_toc">get_repo_toc — Get categorical Table of Contents</option>
                <option value="get_repo_file">get_repo_file — Fetch file contents & metadata</option>
                <option value="get_dependency_matrix">get_dependency_matrix — Ecosystems & conflicts</option>
                <option value="get_database_status">get_database_status — Inspect Firestore database state</option>
                <option value="list_repo_branches">list_repo_branches — List branches & priority</option>
                <option value="save_to_drive">save_to_drive — Get Google Drive export status</option>
              </select>
            </div>

            {(activeTool === 'search_repo_content' || activeTool === 'get_repo_file') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    {activeTool === 'get_repo_file' ? 'File Path' : 'Query Keyword'}
                  </label>
                  <input
                    type="text"
                    value={toolQuery}
                    onChange={(e) => setToolQuery(e.target.value)}
                    placeholder={activeTool === 'get_repo_file' ? 'e.g. package.json' : 'e.g. config, auth'}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 outline-none font-mono focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Branch (Optional)</label>
                  <input
                    type="text"
                    value={toolBranch}
                    onChange={(e) => setToolBranch(e.target.value)}
                    placeholder="e.g. main"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 outline-none font-mono focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleExecuteTool}
              disabled={isExecutingTool}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold rounded-lg flex items-center justify-center gap-1.5 border border-indigo-200 transition-colors shadow-xs"
            >
              {isExecutingTool ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Play className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>Execute MCP Tool</span>
            </button>

            {/* Response Viewer */}
            <div className="mt-2 space-y-1">
              <label className="block text-slate-500 font-mono text-[11px]">JSON-RPC 2.0 Response</label>
              <pre className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-200 max-h-56 overflow-auto whitespace-pre">
                {toolResult || '// Click "Execute MCP Tool" to view live response payload'}
              </pre>
            </div>
          </div>
        </div>

        {/* Right: Agent-to-Agent (A2A) Protocol Tester */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Agent-to-Agent (A2A) Protocol</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">/api/a2a</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">A2A Action</label>
              <select
                value={a2aAction}
                onChange={(e: any) => setA2aAction(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none font-mono focus:border-emerald-500 text-xs"
              >
                <option value="get_context">get_context — Exchange full agentic context</option>
                <option value="get_architecture">get_architecture — Architecture specification & directives</option>
                <option value="search">search — Inter-agent symbol search</option>
                <option value="get_database">get_database — Query Firestore document state</option>
              </select>
            </div>

            {a2aAction === 'search' && (
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Search Symbol / Query</label>
                <input
                  type="text"
                  value={a2aQuery}
                  onChange={(e) => setA2aQuery(e.target.value)}
                  placeholder="e.g. entrypoints, components"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 outline-none font-mono focus:border-emerald-500"
                />
              </div>
            )}

            <button
              onClick={handleTestA2a}
              disabled={isTestingA2a}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg flex items-center justify-center gap-1.5 border border-emerald-200 transition-colors shadow-xs"
            >
              {isTestingA2a ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Play className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>Dispatch A2A Request</span>
            </button>

            {/* A2A Response Viewer */}
            <div className="mt-2 space-y-1">
              <label className="block text-slate-500 font-mono text-[11px]">A2A Envelope Response</label>
              <pre className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-emerald-400 max-h-56 overflow-auto whitespace-pre">
                {a2aResult || '// Click "Dispatch A2A Request" to trigger inter-agent protocol exchange'}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Client Configuration Snippet */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-700" />
            <h4 className="text-sm font-bold text-slate-900">Claude Desktop, Cursor & Windsurf MCP Integration</h4>
          </div>
          <button
            onClick={handleCopyConfig}
            className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center gap-1 border border-slate-300 transition-colors font-medium shadow-xs"
          >
            {copiedConfig ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
            <span>{copiedConfig ? 'Copied' : 'Copy Config'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Insert into your <code className="text-slate-800 font-mono font-semibold">claude_desktop_config.json</code> or <code className="text-slate-800 font-mono font-semibold">.cursor/mcp.json</code> to give your local coding agents direct tool-calling access into this repository:
        </p>
        <pre className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-sky-300 overflow-x-auto">
          {mcpConfigCode}
        </pre>
      </div>
    </div>
  );
}
