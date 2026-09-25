'use client';

import React, { useState, useMemo } from 'react';
import { 
  Database, 
  HardDrive, 
  Bot, 
  FileCode, 
  Share2, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Sparkles, 
  FolderArchive,
  Layers,
  ArrowRight,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { RepoSnapshot, IndexedFile } from '@/lib/types';
import { generateAgenticConstruct, AgenticContextConstruct } from '@/lib/agentic-context';
import { saveAllDatabasingAndResultsToDrive, AllDriveResultsSummary } from '@/lib/workspace';
import firebaseConfig from '@/firebase-applet-config.json';

interface DatabaseHubProps {
  snapshot: RepoSnapshot | null;
  files: IndexedFile[];
  historicalSnapshots: RepoSnapshot[];
  onSelectHistoricalSnapshot: (snapshotId: string) => void;
  accessToken: string | null;
  onOpenSignIn: () => void;
  onPersistToFirestore: () => Promise<void>;
  isPersisting: boolean;
  onOpenAgenticModal: () => void;
  onUpdateSnapshotLinks: (updates: {
    googleSheetId?: string;
    googleSheetUrl?: string;
    googleDocId?: string;
    googleDocUrl?: string;
    googleDriveFolderId?: string;
    driveAllResultsUrl?: string;
  }) => void;
}

export function DatabaseHub({
  snapshot,
  files,
  historicalSnapshots,
  onSelectHistoricalSnapshot,
  accessToken,
  onOpenSignIn,
  onPersistToFirestore,
  isPersisting,
  onOpenAgenticModal,
  onUpdateSnapshotLinks,
}: DatabaseHubProps) {
  const [copiedConstruct, setCopiedConstruct] = useState(false);
  const [isExportingAllToDrive, setIsExportingAllToDrive] = useState(false);
  const [driveProgressStep, setDriveProgressStep] = useState<string>('');
  const [driveResults, setDriveResults] = useState<AllDriveResultsSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeJsonTab, setActiveJsonTab] = useState<'summary' | 'agentPrompt' | 'raw'>('summary');

  const construct: AgenticContextConstruct | null = useMemo(() => {
    if (!snapshot) return null;
    return generateAgenticConstruct(snapshot, files);
  }, [snapshot, files]);

  const jsonString = useMemo(() => {
    if (!construct) return '';
    return JSON.stringify(construct, null, 2);
  }, [construct]);

  const databaseId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-githubsmartrepos-1e3eb2e0-ce07-469a-8d74-6230d6c9fd96';

  const handleCopyConstruct = () => {
    if (!jsonString) return;
    navigator.clipboard.writeText(jsonString);
    setCopiedConstruct(true);
    setTimeout(() => setCopiedConstruct(false), 2000);
  };

  const handleDownloadConstruct = () => {
    if (!construct || !snapshot) return;
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.repo}-${snapshot.versionTag}-complete-agentic-context.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAllToDrive = async () => {
    if (!accessToken) {
      onOpenSignIn();
      return;
    }
    if (!snapshot || !construct) return;

    setIsExportingAllToDrive(true);
    setStatusMessage(null);
    setDriveProgressStep('Initializing Google Drive archive generator...');

    try {
      const summary = await saveAllDatabasingAndResultsToDrive({
        accessToken,
        snapshot,
        files,
        agenticConstruct: construct,
        onProgress: (step) => setDriveProgressStep(step),
      });

      setDriveResults(summary);
      onUpdateSnapshotLinks({
        googleDriveFolderId: summary.folderId,
        driveAllResultsUrl: summary.folderUrl,
        googleSheetId: summary.googleSheet?.spreadsheetId,
        googleSheetUrl: summary.googleSheet?.spreadsheetUrl,
        googleDocId: summary.googleDoc?.documentId,
        googleDocUrl: summary.googleDoc?.documentUrl,
      });

      setStatusMessage({
        type: 'success',
        message: `All databasing and results successfully saved to Google Drive folder "${summary.folderName}"!`,
      });
    } catch (err: any) {
      console.error('Error saving all databasing and results to Drive:', err);
      setStatusMessage({
        type: 'error',
        message: err.message || 'Failed to save all results to Google Drive. Check permissions.',
      });
    } finally {
      setIsExportingAllToDrive(false);
      setDriveProgressStep('');
    }
  };

  if (!snapshot) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm space-y-4">
        <Database className="w-12 h-12 mx-auto text-indigo-500 opacity-80" />
        <div>
          <h3 className="text-base font-bold text-slate-800">No Active Parsing to Database</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Crawl or select a repository to automatically initialize Firestore databasing, generate the thorough Agentic JSON construct, and backup all results to Google Drive.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Database, Agent Context & Google Drive Hub</h2>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono rounded-full font-semibold">
                  Firestore Connected
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono rounded-full font-semibold">
                  A2A & MCP v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Persist and context all repository parsings, generate thorough JSON constructs for AI agents, and save all databases and results to Google Drive.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onPersistToFirestore}
              disabled={isPersisting}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              {isPersisting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Sync All Parsings to Database</span>
            </button>

            <button
              onClick={handleSaveAllToDrive}
              disabled={isExportingAllToDrive}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-xs transition-colors"
            >
              {isExportingAllToDrive ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving All to Drive...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" />
                  <span>Save All to Google Drive</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress or Status Alerts */}
        {driveProgressStep && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-emerald-600" />
            <span className="font-medium">{driveProgressStep}</span>
          </div>
        )}

        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMessage.message}</span>
          </div>
        )}
      </div>

      {/* Grid: Database Status & Google Drive Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: Persistent Firestore Database Context */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Google Cloud Firestore Persistence</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Active & Indexed
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Database Instance</span>
              <span className="font-mono text-slate-800 text-[11px] truncate block font-medium mt-0.5" title={databaseId}>
                {databaseId}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Document Path</span>
              <span className="font-mono text-indigo-600 text-[11px] truncate block font-medium mt-0.5">
                /repo_snapshots/{snapshot.id}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Subcollection Files</span>
              <span className="font-mono text-slate-800 text-[11px] block font-medium mt-0.5">
                {files.length} documents tracked
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Snapshot Version</span>
              <span className="font-mono text-sky-600 text-[11px] block font-medium mt-0.5">
                {snapshot.versionTag} ({snapshot.indexedBranches.length} branches)
              </span>
            </div>
          </div>

          {/* Historical Saved Parsing Runs Selector */}
          {historicalSnapshots.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Saved Databased Parsing Runs ({historicalSnapshots.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {historicalSnapshots.map((snap) => (
                  <div
                    key={snap.id}
                    onClick={() => onSelectHistoricalSnapshot(snap.id)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      snap.id === snapshot.id
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[11px] text-indigo-600 font-bold">{snap.versionTag}</span>
                      <span className="truncate">{snap.fullName}</span>
                      <span className="text-slate-400 text-[10px]">({snap.totalFiles} files)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(snap.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Box 2: Google Drive All Results & Databasing Archive */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Google Drive Full Archive Hub</span>
            </div>
            {snapshot.googleDriveFolderId || driveResults?.folderId ? (
              <span className="text-[11px] font-mono text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Backed Up
              </span>
            ) : (
              <span className="text-[11px] font-mono text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Ready to Save
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            One-click automated creation of a dedicated Google Drive folder containing:
          </p>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span className="font-medium text-slate-800">1. Complete Agentic Context JSON</span>
              </div>
              {driveResults?.agenticJson?.webViewLink ? (
                <a
                  href={driveResults.agenticJson.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold text-[11px]"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">.json</span>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-600" />
                <span className="font-medium text-slate-800">2. Full Firestore Database Dump</span>
              </div>
              {driveResults?.databaseExport?.webViewLink ? (
                <a
                  href={driveResults.databaseExport.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 hover:text-sky-800 flex items-center gap-1 font-semibold text-[11px]"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">.json</span>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-800">3. File Inventory Matrix (CSV)</span>
              </div>
              {driveResults?.csvInventory?.webViewLink ? (
                <a
                  href={driveResults.csvInventory.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-semibold text-[11px]"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">.csv</span>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-slate-800">4. Offline Interactive HTML Web App</span>
              </div>
              {driveResults?.standaloneHtml?.webViewLink ? (
                <a
                  href={driveResults.standaloneHtml.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-600 hover:text-amber-800 flex items-center gap-1 font-semibold text-[11px]"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">.html</span>
              )}
            </div>
          </div>

          {(driveResults?.folderUrl || snapshot.driveAllResultsUrl || snapshot.googleDriveFolderId) && (
            <div className="pt-2">
              <a
                href={driveResults?.folderUrl || snapshot.driveAllResultsUrl || `https://drive.google.com/drive/folders/${snapshot.googleDriveFolderId}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FolderArchive className="w-4 h-4 text-emerald-600" />
                <span>Open Dedicated Drive Archive Folder</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Box 3: Thorough Agentic JSON Construct Preview & Inspector */}
      {construct && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Thorough JSON Construct for Full Agentic Use</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                  Schema v2.0.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Structured machine manifest incorporating priority tiers, architecture, database references, manifests, and A2A/MCP protocols.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setActiveJsonTab('summary')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    activeJsonTab === 'summary' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Architecture & Tiers
                </button>
                <button
                  onClick={() => setActiveJsonTab('agentPrompt')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    activeJsonTab === 'agentPrompt' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Agent Prompt
                </button>
                <button
                  onClick={() => setActiveJsonTab('raw')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    activeJsonTab === 'raw' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Raw JSON
                </button>
              </div>

              <button
                onClick={handleCopyConstruct}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                title="Copy Full Agentic JSON"
              >
                {copiedConstruct ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                onClick={handleDownloadConstruct}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                title="Download .json file"
              >
                <Download className="w-4 h-4 text-indigo-600" />
              </button>

              <button
                onClick={onOpenAgenticModal}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
              >
                <span>Full Modal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {activeJsonTab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  Tier 1: Entry Points ({construct.architecture.priorityTiers.tier1Entrypoints.length})
                </span>
                <ul className="space-y-1.5 font-mono text-[11px] text-slate-700">
                  {construct.architecture.priorityTiers.tier1Entrypoints.slice(0, 6).map((e, idx) => (
                    <li key={idx} className="flex items-center justify-between p-1.5 bg-white border border-slate-200 rounded">
                      <span className="truncate">{e.path}</span>
                      <span className="text-rose-600 font-sans text-[10px] shrink-0 font-medium">[{e.branch}]</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Tier 2: Configs & Manifests ({construct.architecture.priorityTiers.tier2ConfigAndSchemas.length})
                </span>
                <ul className="space-y-1.5 font-mono text-[11px] text-slate-700">
                  {construct.architecture.priorityTiers.tier2ConfigAndSchemas.slice(0, 6).map((c, idx) => (
                    <li key={idx} className="flex items-center justify-between p-1.5 bg-white border border-slate-200 rounded">
                      <span className="truncate">{c.path}</span>
                      <span className="text-amber-600 font-sans text-[10px] shrink-0 font-medium">[{c.branch}]</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeJsonTab === 'agentPrompt' && (
            <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
              {construct.agentDirectives.systemPrompt}
            </div>
          )}

          {activeJsonTab === 'raw' && (
            <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl overflow-x-auto max-h-96 border border-slate-800">
              <pre>{jsonString}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
