'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Markdown from 'react-markdown';
import { 
  BookOpen, 
  Sparkles, 
  FileDown, 
  Printer, 
  GitBranch, 
  Layers, 
  RefreshCw, 
  Copy, 
  Check, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  FileText
} from 'lucide-react';
import { RepoSnapshot, IndexedFile } from '@/lib/types';
import { exportUrlsToGoogleDocs } from '@/lib/workspace';

interface ReadmeSynthesizerProps {
  snapshot: RepoSnapshot | null;
  files: IndexedFile[];
  accessToken?: string | null;
  onRequireSignIn?: () => void;
  onPreviewFile?: (file: IndexedFile) => void;
}

export function ReadmeSynthesizer({
  snapshot,
  files,
  accessToken,
  onRequireSignIn,
  onPreviewFile,
}: ReadmeSynthesizerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'synthesized' | 'comparison' | 'collated'>('synthesized');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthesizedDoc, setSynthesizedDoc] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [savedDocUrl, setSavedDocUrl] = useState<string | null>(null);
  const [isSavingToDocs, setIsSavingToDocs] = useState<boolean>(false);

  // Extract all README files across all branches
  const readmeFiles = useMemo(() => {
    return files.filter((f) => {
      const p = f.path.toLowerCase();
      return p === 'readme.md' || p === 'readme' || p.endsWith('/readme.md') || p.endsWith('/readme');
    });
  }, [files]);

  // Unique branches containing READMEs
  const readmeBranches = useMemo(() => {
    const set = new Set<string>();
    readmeFiles.forEach((f) => set.add(f.branch));
    return Array.from(set);
  }, [readmeFiles]);

  // Derived effective branch without cascading setState in an effect
  const effectiveBranch = useMemo(() => {
    if (selectedBranch && readmeBranches.includes(selectedBranch)) {
      return selectedBranch;
    }
    const defaultB = snapshot?.defaultBranch;
    if (defaultB && readmeBranches.includes(defaultB)) {
      return defaultB;
    }
    return readmeBranches[0] || '';
  }, [selectedBranch, readmeBranches, snapshot?.defaultBranch]);

  // Active branch README file
  const currentBranchReadme = useMemo(() => {
    return readmeFiles.find((f) => f.branch === effectiveBranch) || readmeFiles[0];
  }, [readmeFiles, effectiveBranch]);

  // Full Collated Text from all branch READMEs
  const collatedReadmesText = useMemo(() => {
    if (!snapshot) return '';
    let text = `# COLLATED MULTI-BRANCH DOCUMENTATION\n`;
    text += `Repository: ${snapshot.fullName}\n`;
    text += `Snapshot: ${snapshot.versionTag}\n`;
    text += `Indexed Branches: ${snapshot.indexedBranches.join(', ')}\n`;
    text += `Total README Documents Found: ${readmeFiles.length}\n`;
    text += `========================================================================\n\n`;

    readmeFiles.forEach((rf) => {
      const isPrioritized = snapshot.prioritizedBranches.includes(rf.branch);
      text += `## Branch: ${rf.branch} ${isPrioritized ? '(★ Prioritized Branch)' : ''}\n`;
      text += `File Path: ${rf.path}\n`;
      text += `GitHub URL: https://github.com/${snapshot.fullName}/blob/${rf.branch}/${rf.path}\n`;
      text += `------------------------------------------------------------------------\n\n`;
      text += `${rf.contentSnippet || rf.content || snapshot.readmeContent || 'No README text snippet available.'}\n\n\n`;
    });

    return text;
  }, [snapshot, readmeFiles]);

  // Trigger Gemini AI Multi-Branch Synthesis
  const handleSynthesizeWithAI = async () => {
    if (!snapshot) return;
    setIsSynthesizing(true);
    setErrorMsg(null);

    try {
      const branchPayload = readmeFiles.map((rf) => ({
        branch: rf.branch,
        path: rf.path,
        isPrioritized: snapshot.prioritizedBranches.includes(rf.branch),
        content: rf.contentSnippet || rf.content || snapshot.readmeContent || '',
      }));

      const res = await fetch('/api/gemini/synthesize-readme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName: snapshot.fullName,
          defaultBranch: snapshot.defaultBranch,
          prioritizedBranches: snapshot.prioritizedBranches,
          totalFiles: files.length,
          branchReadmes: branchPayload,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Synthesis failed: ${res.statusText}`);
      }

      const data = await res.json();
      setSynthesizedDoc(data.synthesizedDoc || data.markdown || '');
    } catch (err: any) {
      console.error('Synthesis failed:', err);
      setErrorMsg(err.message || 'Failed to generate AI synthesis');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Download Markdown file
  const handleDownloadMarkdown = () => {
    if (!snapshot) return;
    const content = synthesizedDoc || collatedReadmesText;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.repo}-${snapshot.versionTag}-synthesized-documentation.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Trigger browser print (renders print-optimized view to Save as PDF)
  const handlePrintPdf = () => {
    window.print();
  };

  // Copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!snapshot) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs shadow-sm">
        Please crawl or select a repository snapshot to synthesize multi-branch documentation.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">README Synthesizer & Collator</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {readmeFiles.length} READMEs detected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Parses README files across indexed branches into unified architectural specifications, cross-branch matrices, and PDF digests.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isSynthesizing}
              onClick={handleSynthesizeWithAI}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Regenerate AI Synthesis</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs flex items-center gap-1.5 border border-slate-200 transition-colors font-medium shadow-xs"
            >
              <FileDown className="w-3.5 h-3.5 text-sky-600" />
              <span>Export .MD</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              title="Print document or Save as PDF"
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs flex items-center gap-1.5 border border-slate-200 transition-colors font-medium shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('synthesized')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'synthesized'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Unified Specification</span>
          </button>
          <button
            onClick={() => setActiveSubTab('comparison')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'comparison'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Branch-by-Branch View</span>
          </button>
          <button
            onClick={() => setActiveSubTab('collated')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'collated'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Collated Multi-Branch Stream</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block">Documentation synthesis notice</strong>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: AI Unified Architecture Specification */}
      {activeSubTab === 'synthesized' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Synthesized Architectural Digest
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-600 border border-slate-200">
                Gemini AI
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(synthesizedDoc)}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 font-medium"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? 'Copied' : 'Copy Markdown'}</span>
              </button>
            </div>
          </div>

          {isSynthesizing ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-700 font-medium">
                Gemini is synthesizing cross-branch README documentation and feature variances...
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                Extracting architectural modules, environment setups, and multi-branch differences.
              </p>
            </div>
          ) : synthesizedDoc ? (
            <div className="prose prose-slate max-w-none prose-sm font-sans space-y-4 text-slate-800 leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="markdown-body">
                <Markdown>{synthesizedDoc}</Markdown>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs space-y-4">
              <p>No synthesized specification generated yet for this repository.</p>
              <button
                type="button"
                onClick={handleSynthesizeWithAI}
                disabled={isSynthesizing || readmeFiles.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Synthesize Multi-Branch Documentation with Gemini</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: Branch-by-Branch View */}
      {activeSubTab === 'comparison' && (
        <div className="space-y-4">
          {/* Branch selector pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-slate-500 font-mono shrink-0">Select Branch:</span>
            {readmeBranches.map((b) => {
              const isPrioritized = snapshot.prioritizedBranches.includes(b);
              const isDefault = snapshot.defaultBranch === b;
              return (
                <button
                  key={b}
                  onClick={() => setSelectedBranch(b)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 flex items-center gap-1.5 transition-all ${
                    selectedBranch === b
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <GitBranch className="w-3 h-3" />
                  <span>{b}</span>
                  {isDefault && <span className="text-[9px] px-1 bg-slate-100 text-slate-700 rounded border border-slate-200">default</span>}
                  {isPrioritized && <span className="text-[9px] px-1 bg-amber-100 text-amber-800 font-sans rounded border border-amber-200">★</span>}
                </button>
              );
            })}
          </div>

          {currentBranchReadme ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-900 font-semibold">{currentBranchReadme.path}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 font-mono">{currentBranchReadme.size} bytes</span>
                </div>
                <div className="flex items-center gap-2">
                  {onPreviewFile && (
                    <button
                      onClick={() => onPreviewFile(currentBranchReadme)}
                      className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium"
                    >
                      Inspect Source
                    </button>
                  )}
                  <a
                    href={`https://github.com/${snapshot.fullName}/blob/${selectedBranch}/${currentBranchReadme.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[650px] overflow-y-auto select-text">
                {currentBranchReadme.contentSnippet || currentBranchReadme.content || snapshot.readmeContent || 'No content found in this branch README.'}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs shadow-sm">
              No README was located on this branch.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: Collated Multi-Branch Stream */}
      {activeSubTab === 'collated' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              Continuous Multi-Branch README Collation
            </span>
            <button
              onClick={() => handleCopy(collatedReadmesText)}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 font-medium"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? 'Copied' : 'Copy All Text'}</span>
            </button>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[700px] overflow-y-auto select-text">
            {collatedReadmesText}
          </div>
        </div>
      )}
    </div>
  );
}
