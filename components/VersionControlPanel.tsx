'use client';

import React, { useState, useMemo } from 'react';
import { 
  History, 
  GitCommit, 
  GitBranch, 
  RotateCcw, 
  FileSpreadsheet, 
  FileText, 
  FolderArchive, 
  ArrowRightLeft, 
  Check, 
  Tag, 
  Clock, 
  Sparkles, 
  ExternalLink, 
  ChevronRight, 
  PlusCircle, 
  FileCheck 
} from 'lucide-react';
import { RepoSnapshot, IndexedFile, DiffResult } from '@/lib/types';

interface VersionControlPanelProps {
  snapshots: RepoSnapshot[];
  activeSnapshot: RepoSnapshot | null;
  onRevertToSnapshot: (snapshot: RepoSnapshot) => void;
  onCreateSnapshotTag: (tag: string, message: string) => void;
  files: IndexedFile[];
}

export function VersionControlPanel({
  snapshots,
  activeSnapshot,
  onRevertToSnapshot,
  onCreateSnapshotTag,
  files,
}: VersionControlPanelProps) {
  const [compareSnapshotId, setCompareSnapshotId] = useState<string>('');
  const [newTagInput, setNewTagInput] = useState('');
  const [newCommitMessage, setNewCommitMessage] = useState('');
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);

  // Snapshot to compare with active
  const targetCompareSnapshot = useMemo(() => {
    return snapshots.find((s) => s.id === compareSnapshotId) || null;
  }, [snapshots, compareSnapshotId]);

  // Compute diff metrics between active and compared snapshot
  const diffMetrics = useMemo(() => {
    if (!activeSnapshot || !targetCompareSnapshot) return null;

    const fileCountDelta = activeSnapshot.totalFiles - targetCompareSnapshot.totalFiles;
    const sizeDelta = activeSnapshot.totalSize - targetCompareSnapshot.totalSize;

    // Branches diff
    const activeBranches = new Set(activeSnapshot.indexedBranches);
    const compareBranches = new Set(targetCompareSnapshot.indexedBranches);

    const newBranches = activeSnapshot.indexedBranches.filter((b) => !compareBranches.has(b));
    const removedBranches = targetCompareSnapshot.indexedBranches.filter((b) => !activeBranches.has(b));

    return {
      fileCountDelta,
      sizeDelta,
      newBranches,
      removedBranches,
    };
  }, [activeSnapshot, targetCompareSnapshot]);

  const handleCreateNewVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;

    onCreateSnapshotTag(
      newTagInput.trim(),
      newCommitMessage.trim() || `Version checkpoint ${newTagInput.trim()}`
    );

    setNewTagInput('');
    setNewCommitMessage('');
    setShowNewVersionForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Snapshot Creator */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              <span>Repository Output Version Control</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Git-like branching and commit history for generated Google Sheets, standalone web apps, and repository metadata
            </p>
          </div>

          <button
            onClick={() => setShowNewVersionForm(!showNewVersionForm)}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-200 transition-colors shrink-0 shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Tag New Version</span>
          </button>
        </div>

        {/* Create Version Checkpoint Form */}
        {showNewVersionForm && (
          <form onSubmit={handleCreateNewVersion} className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Create Immutable Version Checkpoint</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Version Tag (e.g. v1.1.0, release-rc1)"
                required
                className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-mono outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                value={newCommitMessage}
                onChange={(e) => setNewCommitMessage(e.target.value)}
                placeholder="Commit / Snapshot Message (e.g. Added staging branch crawl)"
                className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewVersionForm(false)}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-600 text-xs rounded border border-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded shadow-xs"
              >
                Save Version Checkpoint
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Version Diff Comparator */}
      {snapshots.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-semibold text-slate-900">Historical Version Diff Comparator</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Compare Current against:</span>
              <select
                value={compareSnapshotId}
                onChange={(e) => setCompareSnapshotId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 outline-none font-mono"
              >
                <option value="">Select a version...</option>
                {snapshots
                  .filter((s) => s.id !== activeSnapshot?.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.versionTag} — {new Date(s.createdAt).toLocaleTimeString()} ({s.totalFiles} files)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {diffMetrics && targetCompareSnapshot && activeSnapshot && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-1">File Count Delta</span>
                <span className={`font-mono text-sm font-bold ${diffMetrics.fileCountDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {diffMetrics.fileCountDelta >= 0 ? `+${diffMetrics.fileCountDelta}` : diffMetrics.fileCountDelta} files
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-1">Size Delta</span>
                <span className={`font-mono text-sm font-bold ${diffMetrics.sizeDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {diffMetrics.sizeDelta >= 0 ? `+${(diffMetrics.sizeDelta / 1024).toFixed(1)}` : (diffMetrics.sizeDelta / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-1">New Branches in Active</span>
                <span className="font-mono text-amber-700 font-semibold">
                  {diffMetrics.newBranches.length > 0 ? diffMetrics.newBranches.join(', ') : 'None'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-1">Comparison Base</span>
                <span className="font-mono text-slate-700 truncate block font-medium">
                  {targetCompareSnapshot.versionTag} ({targetCompareSnapshot.indexedBranches.length} branches)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Version History List */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
          Version History Timeline ({snapshots.length} Snapshots)
        </h3>

        {snapshots.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 shadow-sm">
            No historical versions logged yet. Index a repository to create your initial version checkpoint.
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snap) => {
              const isActive = activeSnapshot?.id === snap.id;
              return (
                <div
                  key={snap.id}
                  className={`bg-white border rounded-xl p-5 transition-all space-y-3 shadow-sm ${
                    isActive
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <GitCommit className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {snap.versionTag}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                              Active Workspace
                            </span>
                          )}
                          <span className="text-xs text-slate-500 truncate">
                            {snap.fullName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-mono mt-0.5">
                          &quot;{snap.commitMessage}&quot;
                        </p>
                      </div>
                    </div>

                    {/* Revert / Switch Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isActive ? (
                        <button
                          onClick={() => onRevertToSnapshot(snap)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-300 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Revert to this State</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold px-2.5 py-1 bg-emerald-50 rounded border border-emerald-200">
                          <Check className="w-3.5 h-3.5" />
                          <span>Current Active</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata and Branch Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Indexed Files</span>
                      <span className="text-slate-800 font-semibold">{snap.totalFiles} files</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Size</span>
                      <span className="text-slate-800 font-semibold">{(snap.totalSize / 1024).toFixed(1)} KB</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Branches Covered</span>
                      <span className="text-amber-700 font-semibold">{snap.indexedBranches.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Indexed At</span>
                      <span className="text-slate-600">{new Date(snap.createdAt).toLocaleDateString()} {new Date(snap.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Associated Workspace Outputs & Versions */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                    {snap.googleSheetUrl && (
                      <a
                        href={snap.googleSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 hover:bg-emerald-100 transition-colors font-medium"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Google Sheet ({snap.versionTag})</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}

                    {snap.googleDocUrl && (
                      <a
                        href={snap.googleDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded text-sky-800 hover:bg-sky-100 transition-colors font-medium"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-600" />
                        <span>Google Doc ({snap.versionTag})</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}

                    {snap.prioritizedBranches.length > 0 && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <span className="text-slate-400">Prioritized:</span>
                        <span className="text-amber-800 font-semibold">[{snap.prioritizedBranches.join(', ')}]</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
