'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Bot, 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Key, 
  Sliders, 
  Download, 
  Upload, 
  RefreshCw, 
  Check, 
  Copy, 
  Code, 
  Database, 
  GitMerge, 
  Terminal, 
  Layers, 
  Workflow, 
  Sparkles, 
  FileJson,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  AgencyExecutionLevel, 
  AgencyDefinition, 
  TEN_AGENCIES, 
  InstructionSetTemplate, 
  generateDefaultInstructionSet, 
  generateAgencyTokenHash 
} from '@/lib/agency';
import { RepoSnapshot } from '@/lib/types';

interface AgencyPanelProps {
  snapshot: RepoSnapshot | null;
  user?: any;
  userUid?: string;
  githubToken?: string;
  onSaveInstructionSet?: (instructionSet: InstructionSetTemplate) => void;
  onApplyAgencyConfig?: (config: {
    level: AgencyExecutionLevel;
    tokenHash: string;
    activeAgencies: string[];
    instructionSet: InstructionSetTemplate;
  }) => void;
}

export function AgencyPanel({
  snapshot,
  user,
  userUid,
  githubToken,
  onSaveInstructionSet,
  onApplyAgencyConfig,
}: AgencyPanelProps) {
  const [level, setLevel] = useState<AgencyExecutionLevel>('hybrid');
  const [activeAgencies, setActiveAgencies] = useState<string[]>(
    TEN_AGENCIES.filter((a) => a.activeByDefault).map((a) => a.id)
  );
  const [adminToken, setAdminToken] = useState<string>(githubToken || '');
  const [customSalt, setCustomSalt] = useState<string>('gh_smart_agent_orchestrator_v1');
  const [tokenHash, setTokenHash] = useState<string>('AGT_HYBRID_INITIALIZING...');
  const [isCopiedHash, setIsCopiedHash] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'agencies' | 'instructionset' | 'bindings' | 'categories'>('agencies');
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Repository Full Name
  const repoName = snapshot?.fullName || 'octocat/Hello-World';

  // Dynamic Token Hash Computation
  useEffect(() => {
    let isMounted = true;
    generateAgencyTokenHash({
      level,
      activeAgencies,
      userUid,
      repoFullName: repoName,
      githubTokenHint: adminToken,
      customSalt,
    }).then((hash) => {
      if (isMounted) setTokenHash(hash);
    });

    return () => {
      isMounted = false;
    };
  }, [level, activeAgencies, userUid, repoName, adminToken, customSalt]);

  // Custom Uploaded Template State
  const [customUploadedTemplate, setCustomUploadedTemplate] = useState<InstructionSetTemplate | null>(null);

  // Compute instruction set synchronously based on tokenHash, level, agencies, and custom template
  const instructionSet: InstructionSetTemplate = useMemo(() => {
    if (customUploadedTemplate) {
      return {
        ...customUploadedTemplate,
        agencyTokenHash: tokenHash,
        agencyLevel: level,
        activeAgencies,
      };
    }
    return generateDefaultInstructionSet(repoName, level, activeAgencies, tokenHash);
  }, [customUploadedTemplate, repoName, level, activeAgencies, tokenHash]);

  // Toggle single agency
  const toggleAgency = (id: string) => {
    setActiveAgencies((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle all agencies
  const toggleAll = (activate: boolean) => {
    if (activate) {
      setActiveAgencies(TEN_AGENCIES.map((a) => a.id));
    } else {
      setActiveAgencies([]);
    }
  };

  // Copy token hash
  const copyTokenHash = () => {
    navigator.clipboard.writeText(tokenHash);
    setIsCopiedHash(true);
    setTimeout(() => setIsCopiedHash(false), 2000);
  };

  // Download Instruction Set Template
  const handleDownloadTemplate = () => {
    const jsonStr = JSON.stringify(instructionSet, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${instructionSet.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Upload Custom Instruction Set JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          setCustomUploadedTemplate(parsed);
          if (parsed.agencyLevel) setLevel(parsed.agencyLevel);
          if (Array.isArray(parsed.activeAgencies)) setActiveAgencies(parsed.activeAgencies);
          setAppliedNotice('Custom Instruction Set JSON successfully loaded and validated!');
          setTimeout(() => setAppliedNotice(null), 4000);
        }
      } catch (err) {
        alert('Invalid JSON file format for Instruction Set.');
      }
    };
    reader.readAsText(file);
  };

  // Apply agency configuration to parent
  const handleApplyConfiguration = () => {
    if (onApplyAgencyConfig) {
      onApplyAgencyConfig({
        level,
        tokenHash,
        activeAgencies,
        instructionSet,
      });
    }
    if (onSaveInstructionSet) {
      onSaveInstructionSet(instructionSet);
    }
    setAppliedNotice(
      `Agency configuration applied with hash ${tokenHash.substring(0, 16)}... and level "${level}"!`
    );
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Agentic Execution Framework & Agency Constructor
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                  10 Autonomous Agencies
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic token hash constructor, AST & database category restructuring, MCP/A2A instruction bindings, and multi-agency routing.
              </p>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleApplyConfiguration}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply Token & Route Instruction Sets</span>
            </button>
          </div>
        </div>

        {/* Agency Execution Level Selection */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-2.5">
            1. Agency Execution Level (Access & Autonomy Tier)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Level: None */}
            <button
              type="button"
              onClick={() => setLevel('none')}
              className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                level === 'none'
                  ? 'border-slate-400 bg-slate-100 text-slate-900 ring-2 ring-slate-400/50'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-slate-500" />
                  Level 0: None
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">Passive</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Strictly read-only passive crawler. No autonomous AST rewrites, no automatic branch modifications, and zero background agency operations.
              </p>
            </button>

            {/* Level: Hybrid Manual/Auto */}
            <button
              type="button"
              onClick={() => setLevel('hybrid')}
              className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                level === 'hybrid'
                  ? 'border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-500/30 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-900 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-sky-600" />
                  Level 1: Hybrid Manual/Auto
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-mono border border-sky-200">Supervised</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Human-in-the-loop autonomous assistance. AI generates AST transforms, branch comparisons, and database categories with explicit user confirmation.
              </p>
            </button>

            {/* Level: Full Allow */}
            <button
              type="button"
              onClick={() => setLevel('full_allow')}
              className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                level === 'full_allow'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500/30 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Level 2: Full Allow
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono border border-indigo-200">Autonomous</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Complete agentic orchestration. Enables multi-agent A2A delegation, continuous workspace synchronization, automated CI/CD rewrites, and MCP pipelines.
              </p>
            </button>
          </div>
        </div>

        {/* Dynamic Token Hash Construct Bar */}
        <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 font-semibold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-600" />
              Dynamic Agency Token Hash (SHA-256 HMAC)
            </span>
            <button
              type="button"
              onClick={copyTokenHash}
              className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium"
            >
              {isCopiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{isCopiedHash ? 'Copied' : 'Copy Hash'}</span>
            </button>
          </div>
          <div className="bg-white border border-slate-300 px-3 py-2 rounded-lg font-mono text-xs text-amber-800 select-all truncate font-semibold">
            {tokenHash}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">GitHub Admin PAT / User Admin Secret (included in hash):</label>
              <input
                type="password"
                placeholder="ghp_... or leave empty for OAuth token"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Custom Salt Seed:</label>
              <input
                type="text"
                value={customSalt}
                onChange={(e) => setCustomSalt(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Notice Message */}
        {appliedNotice && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{appliedNotice}</span>
          </div>
        )}

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200 text-xs font-medium">
          <button
            onClick={() => setActiveTab('agencies')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'agencies'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>10 Agencies Config ({activeAgencies.length}/10 Active)</span>
          </button>
          <button
            onClick={() => setActiveTab('instructionset')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'instructionset'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Instruction Set Template (JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab('bindings')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'bindings'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>MCP & A2A Gateway Bindings</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: 10 Agencies Configuration Grid */}
      {activeTab === 'agencies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs text-slate-500 font-medium">
              Click individual agency cards to toggle autonomous capability bindings
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleAll(true)}
                className="text-xs text-indigo-700 hover:text-indigo-800 font-semibold"
              >
                Enable All
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => toggleAll(false)}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Disable All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {TEN_AGENCIES.map((agency, idx) => {
              const isActive = activeAgencies.includes(agency.id);
              return (
                <div
                  key={agency.id}
                  onClick={() => toggleAgency(agency.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 shadow-xs ${
                    isActive
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white'
                      : 'border-slate-200 bg-white hover:border-slate-300 opacity-70'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900">{agency.name}</h3>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{agency.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="truncate">Category: {agency.badge}</span>
                    <span className="text-indigo-600 font-semibold uppercase">{agency.requiredLevel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Instruction Set JSON Template */}
      {activeTab === 'instructionset' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                Instruction Set Template (RFC-Standardized JSON)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-600 border border-slate-200">
                v1.2.0
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs flex items-center gap-1.5 font-medium border border-slate-200"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Custom JSON</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .JSON</span>
              </button>
            </div>
          </div>

          <pre className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto max-h-[600px] leading-relaxed">
            {JSON.stringify(instructionSet, null, 2)}
          </pre>
        </div>
      )}

      {/* SUB-TAB 3: Gateway Bindings */}
      {activeTab === 'bindings' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Model Context Protocol & A2A Dynamic Routing</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            The active dynamic token hash <code className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 font-mono font-semibold">{tokenHash.substring(0, 16)}...</code> authenticates autonomous agents invoking tool calls against this repository index.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 block">MCP Tool Dispatch Routing</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                When external agents query <code className="text-indigo-700 font-mono">/api/mcp</code>, the runtime validates this token hash against the current session to enforce read/write bounds according to Level {level === 'none' ? '0' : level === 'hybrid' ? '1' : '2'}.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 block">A2A Peer-to-Peer Protocol</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Autonomous agency nodes communicate directly via structured JSON-RPC payloads, sharing file indices, branch variance hashes, and version checkpoint diffs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
