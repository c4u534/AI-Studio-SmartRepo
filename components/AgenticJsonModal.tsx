'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Bot, 
  Database, 
  Cloud, 
  Layers, 
  X,
  Search,
  Sparkles,
  Loader2,
  HardDrive
} from 'lucide-react';
import { RepoSnapshot, IndexedFile } from '@/lib/types';
import { generateAgenticConstruct, AgenticContextConstruct } from '@/lib/agentic-context';
import { uploadAgenticConstructToDrive } from '@/lib/workspace';

interface AgenticJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: RepoSnapshot | null;
  files: IndexedFile[];
  accessToken: string | null;
  onOpenSignIn: () => void;
  onDriveExported?: (link: string) => void;
}

export function AgenticJsonModal({
  isOpen,
  onClose,
  snapshot,
  files,
  accessToken,
  onOpenSignIn,
  onDriveExported,
}: AgenticJsonModalProps) {
  const [copied, setCopied] = useState(false);
  const [isExportingDrive, setIsExportingDrive] = useState(false);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'formatted' | 'raw' | 'overview'>('overview');

  const construct: AgenticContextConstruct | null = useMemo(() => {
    if (!snapshot) return null;
    return generateAgenticConstruct(snapshot, files);
  }, [snapshot, files]);

  const jsonString = useMemo(() => {
    if (!construct) return '';
    return JSON.stringify(construct, null, 2);
  }, [construct]);

  if (!isOpen || !snapshot || !construct) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.repo}-${snapshot.versionTag}-complete-agentic-context.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportToDrive = async () => {
    if (!accessToken) {
      onOpenSignIn();
      return;
    }
    setIsExportingDrive(true);
    try {
      const res = await uploadAgenticConstructToDrive({
        accessToken,
        snapshot,
        agenticConstruct: construct,
        folderId: snapshot.googleDriveFolderId,
      });
      setDriveUrl(res.webViewLink);
      if (onDriveExported) onDriveExported(res.webViewLink);
    } catch (err: any) {
      console.error('Failed to export Agentic JSON to Drive:', err);
    } finally {
      setIsExportingDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">Thorough Agentic JSON Construct</h3>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-mono text-xs rounded-full font-semibold">
                  v2.0.0 Spec
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-mono text-xs rounded-full">
                  Firestore & MCP Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Full-context machine construct containing architecture, priority tiers, database references, and MCP/A2A endpoints for AI agents.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Executive Summary
            </button>
            <button
              onClick={() => setActiveTab('formatted')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'formatted' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Structured Sections
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'raw' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Raw Agentic JSON
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors border border-slate-200"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy JSON'}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Download .json
            </button>

            <button
              onClick={handleExportToDrive}
              disabled={isExportingDrive}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              {isExportingDrive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
              Save Construct to Google Drive
            </button>

            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 underline text-xs font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Drive
              </a>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs mb-1">
                    <Database className="w-4 h-4" />
                    <span>Persistent Database Context</span>
                  </div>
                  <p className="text-slate-800 font-bold text-sm">{construct.database.provider}</p>
                  <p className="text-slate-500 font-mono text-[11px] truncate mt-0.5">
                    Doc: {construct.database.documentPath}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono rounded">
                      {construct.database.recordCount.files} Files Recorded
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono rounded">
                      {construct.database.recordCount.manifests} Manifests
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs mb-1">
                    <Bot className="w-4 h-4" />
                    <span>Agent Token & Context Size</span>
                  </div>
                  <p className="text-slate-800 font-bold text-sm">
                    ~{construct.agentDirectives.contextWindowTokensEstimate.toLocaleString()} Tokens
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {construct.tableOfContents.totalCategories} Categorical divisions across {construct.repository.indexedBranches.length} branches
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Fits comfortably in Gemini 1M/2M context</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-sky-600 font-semibold text-xs mb-1">
                    <Layers className="w-4 h-4" />
                    <span>Protocols & Endpoints</span>
                  </div>
                  <p className="text-slate-800 font-bold text-sm">A2A & MCP 2024-11-05</p>
                  <p className="text-slate-500 font-mono text-[11px] mt-0.5 truncate">
                    MCP: {construct.mcpServerConfig.endpoint}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-mono rounded">
                      {construct.mcpServerConfig.tools.length} Tools Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority Tiers for Agent Execution */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Hierarchical Priority Tiers for Autonomous Agents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg">
                    <div className="font-semibold text-rose-800 mb-1 flex items-center justify-between">
                      <span>Tier 1: Entry Points & Root Controllers</span>
                      <span className="font-mono text-[11px]">({construct.architecture.priorityTiers.tier1Entrypoints.length})</span>
                    </div>
                    <ul className="space-y-1 font-mono text-[11px] text-rose-900 mt-2">
                      {construct.architecture.priorityTiers.tier1Entrypoints.slice(0, 5).map((e, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span className="truncate">{e.path}</span>
                          <span className="text-rose-600 text-[10px] font-sans">[{e.branch}]</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                    <div className="font-semibold text-amber-800 mb-1 flex items-center justify-between">
                      <span>Tier 2: Configs, Schemas & Dependencies</span>
                      <span className="font-mono text-[11px]">({construct.architecture.priorityTiers.tier2ConfigAndSchemas.length})</span>
                    </div>
                    <ul className="space-y-1 font-mono text-[11px] text-amber-900 mt-2">
                      {construct.architecture.priorityTiers.tier2ConfigAndSchemas.slice(0, 5).map((c, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span className="truncate">{c.path}</span>
                          <span className="text-amber-600 text-[10px] font-sans">[{c.branch}]</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Recommended System Prompt */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-600" />
                    Agent System Prompt & Execution Context
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(construct.agentDirectives.systemPrompt);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy System Prompt
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {construct.agentDirectives.systemPrompt}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'formatted' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h4 className="font-bold text-slate-800 text-sm mb-3">Available MCP Tool Specifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {construct.agentDirectives.mcpToolRecommendations.map((t, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="font-mono font-semibold text-indigo-600 text-xs">{t.tool}</span>
                      <p className="text-slate-600 text-xs mt-1">{t.whenToUse}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h4 className="font-bold text-slate-800 text-sm mb-3">Categorical Table of Contents</h4>
                <div className="space-y-2">
                  {construct.tableOfContents.categoryList.map((cat, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                        <span>{cat.category}</span>
                        <span className="font-mono text-indigo-600">{cat.count} files</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 truncate">
                        {cat.fileSample.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[600px] border border-slate-800 shadow-inner">
              <pre>{jsonString}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
