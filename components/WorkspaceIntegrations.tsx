'use client';

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  HardDrive, 
  FolderSearch, 
  ExternalLink, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  Sparkles, 
  Lock,
  Download, 
  FolderArchive,
  Database,
  Bot,
  FileCode
} from 'lucide-react';
import { RepoSnapshot, IndexedFile } from '@/lib/types';
import { 
  exportToGoogleSheets, 
  exportToGoogleDocs, 
  saveToGoogleDrive, 
  openGooglePicker,
  saveAllDatabasingAndResultsToDrive,
  AllDriveResultsSummary
} from '@/lib/workspace';
import { generateAgenticConstruct } from '@/lib/agentic-context';

interface WorkspaceIntegrationsProps {
  accessToken: string | null;
  snapshot: RepoSnapshot | null;
  files: IndexedFile[];
  onUpdateSnapshotLinks: (updates: {
    googleSheetId?: string;
    googleSheetUrl?: string;
    googleDocId?: string;
    googleDocUrl?: string;
    googleDriveFolderId?: string;
    driveAllResultsUrl?: string;
  }) => void;
  onOpenSignIn: () => void;
  onOpenAgenticModal?: () => void;
}

export function WorkspaceIntegrations({
  accessToken,
  snapshot,
  files,
  onUpdateSnapshotLinks,
  onOpenSignIn,
  onOpenAgenticModal,
}: WorkspaceIntegrationsProps) {
  const [isExportingSheet, setIsExportingSheet] = useState(false);
  const [isExportingDoc, setIsExportingDoc] = useState(false);
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [isSavingAllToDrive, setIsSavingAllToDrive] = useState(false);
  const [savingAllStep, setSavingAllStep] = useState('');
  const [allDriveResults, setAllDriveResults] = useState<AllDriveResultsSummary | null>(null);
  const [pickedFile, setPickedFile] = useState<{ id: string; name: string; mimeType: string; url: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSaveAllToDrive = async () => {
    if (!accessToken) {
      onOpenSignIn();
      return;
    }
    if (!snapshot) return;

    setIsSavingAllToDrive(true);
    setStatusMessage(null);
    setSavingAllStep('Generating complete Agentic Context construct...');

    try {
      const construct = generateAgenticConstruct(snapshot, files);
      const summary = await saveAllDatabasingAndResultsToDrive({
        accessToken,
        snapshot,
        files,
        agenticConstruct: construct,
        onProgress: (step) => setSavingAllStep(step),
      });

      setAllDriveResults(summary);
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
      console.error('Save all to Drive error:', err);
      setStatusMessage({
        type: 'error',
        message: err.message || 'Failed to save all databasing and results to Google Drive.',
      });
    } finally {
      setIsSavingAllToDrive(false);
      setSavingAllStep('');
    }
  };

  // Destructive / Overwrite Confirmation Modal State (Mandatory per Workspace Skill)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  const handleExportSheet = async (isOverwrite = false) => {
    if (!accessToken) {
      onOpenSignIn();
      return;
    }
    if (!snapshot) return;

    // Check if an existing sheet link exists and this isn't already a confirmed overwrite
    if (snapshot.googleSheetId && !isOverwrite) {
      setConfirmModal({
        isOpen: true,
        title: 'Overwrite Existing Google Sheet?',
        description: `A Google Sheet already exists for this repository index ("${snapshot.repo} - Table of Contents"). Re-exporting will rewrite data into a newly synchronized sheet.`,
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await handleExportSheet(true);
        },
      });
      return;
    }

    setIsExportingSheet(true);
    setStatusMessage(null);
    try {
      const result = await exportToGoogleSheets({ accessToken, snapshot, files });
      onUpdateSnapshotLinks({
        googleSheetId: result.spreadsheetId,
        googleSheetUrl: result.spreadsheetUrl,
      });
      setStatusMessage({
        type: 'success',
        message: `Successfully synchronized Google Sheet! ID: ${result.spreadsheetId}`,
      });
    } catch (err: any) {
      console.error('Google Sheet Export Error:', err);
      setStatusMessage({
        type: 'error',
        message: err.message || 'Failed to export Google Sheet. Verify Workspace permissions.',
      });
    } finally {
      setIsExportingSheet(false);
    }
  };

  const handleExportDoc = async (isOverwrite = false) => {
    if (!accessToken) {
      onOpenSignIn();
      return;
    }
    if (!snapshot) return;

    if (snapshot.googleDocId && !isOverwrite) {
      setConfirmModal({
        isOpen: true,
        title: 'Overwrite Existing Google Doc?',
        description: `A Google Doc already exists for this repository index. Re-exporting will create a newly formatted document.`,
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await handleExportDoc(true);
        },
      });
      return;
    }

    setIsExportingDoc(true);
    setStatusMessage(null);
    try {
      const result = await exportToGoogleDocs({ accessToken, snapshot, files });
      onUpdateSnapshotLinks({
        googleDocId: result.documentId,
        googleDocUrl: result.documentUrl,
      });
      setStatusMessage({
        type: 'success',
        message: `Successfully generated Google Doc! Document ID: ${result.documentId}`,
      });
    } catch (err: any) {
      console.error('Google Doc Export Error:', err);
      setStatusMessage({
        type: 'error',
        message: err.message || 'Failed to export Google Doc. Verify Workspace permissions.',
      });
    } finally {
      setIsExportingDoc(false);
    }
  };

  const handleSaveToDrive = async () => {
    if (!accessToken) {
      onOpenSignIn();
      return;
    }
    if (!snapshot) return;

    setIsSavingDrive(true);
    setStatusMessage(null);
    try {
      const result = await saveToGoogleDrive({
        accessToken,
        snapshot,
        files,
      });
      setStatusMessage({
        type: 'success',
        message: `Saved complete repository index archive to Google Drive (${snapshot.repo})!`,
      });
    } catch (err: any) {
      console.error('Google Drive Save Error:', err);
      setStatusMessage({
        type: 'error',
        message: err.message || 'Failed to save to Google Drive.',
      });
    } finally {
      setIsSavingDrive(false);
    }
  };

  // Google Picker Integration
  const handleOpenGooglePicker = async () => {
    if (!accessToken) {
      onOpenSignIn();
      return;
    }

    try {
      await openGooglePicker({
        accessToken,
        onPick: (file) => {
          setPickedFile(file);
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            onUpdateSnapshotLinks({ googleDriveFolderId: file.id });
          }
          setStatusMessage({
            type: 'success',
            message: `Selected file via Google Picker: "${file.name}"`,
          });
        },
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', message: err.message || 'Google Picker failed to open' });
    }
  };

  if (!snapshot) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 shadow-sm">
        <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Repository Indexed Yet</h3>
        <p className="text-xs text-slate-500 mt-1">
          Crawl a repository first to export structured Google Sheets, Google Docs, and Google Drive offline archives.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-600" />
              <span>Google Workspace Ecosystem Sync</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Synchronize multi-branch repository indexes directly with Google Sheets, Google Docs, and Google Drive with version control.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenAgenticModal && (
              <button
                onClick={onOpenAgenticModal}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Bot className="w-4 h-4 text-indigo-600" />
                <span>Agentic JSON Construct</span>
              </button>
            )}

            <button
              onClick={handleSaveAllToDrive}
              disabled={isSavingAllToDrive}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-xs transition-colors"
            >
              {isSavingAllToDrive ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving All to Drive...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" />
                  <span>Save All Databasing & Results to Drive</span>
                </>
              )}
            </button>
          </div>
        </div>

        {savingAllStep && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-emerald-600" />
            <span className="font-semibold">{savingAllStep}</span>
          </div>
        )}

        {allDriveResults && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Archive Saved to Drive Folder: {allDriveResults.folderName}</span>
              </span>
              <a
                href={allDriveResults.folderUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 underline"
              >
                <span>Open Folder</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <a
                href={allDriveResults.agenticJson.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white rounded border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50 flex items-center justify-between"
              >
                <span>Agentic JSON</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href={allDriveResults.databaseExport.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white rounded border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50 flex items-center justify-between"
              >
                <span>Database Export</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href={allDriveResults.csvInventory.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white rounded border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50 flex items-center justify-between"
              >
                <span>CSV Inventory</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href={allDriveResults.standaloneHtml.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white rounded border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50 flex items-center justify-between"
              >
                <span>Interactive HTML</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
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
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMessage.message}</span>
          </div>
        )}
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Google Sheets */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Sheets API v4
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Google Sheets Indexer</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Builds multi-tab spreadsheets with categorized tabs, branch indicators, sizes, raw links, and direct GitHub references.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {snapshot.googleSheetUrl && (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate mr-2">Linked Sheet ({snapshot.versionTag})</span>
                <a
                  href={snapshot.googleSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0 font-semibold"
                >
                  <span>Open Sheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <button
              onClick={() => handleExportSheet(false)}
              disabled={isExportingSheet}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              {isExportingSheet ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Syncing Google Sheets...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{snapshot.googleSheetUrl ? 'Update Google Sheet' : 'Export to Google Sheets'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Google Docs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Docs API v1
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Google Docs Specification</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Formats clean executive summaries, prioritized branch listings, and synthesized documentation for team sharing.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {snapshot.googleDocUrl && (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate mr-2">Linked Doc ({snapshot.versionTag})</span>
                <a
                  href={snapshot.googleDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-700 hover:text-sky-800 flex items-center gap-1 shrink-0 font-semibold"
                >
                  <span>Open Doc</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <button
              onClick={() => handleExportDoc(false)}
              disabled={isExportingDoc}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              {isExportingDoc ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Google Doc...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>{snapshot.googleDocUrl ? 'Update Google Doc' : 'Export to Google Docs'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 3: Google Drive & Picker */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Drive & Picker
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Google Drive & Picker</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload JSON snapshot archives, organize folders, or pick specific files/folders with the native Google Picker.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {pickedFile && (
              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-700 truncate">
                Selected: <span className="font-semibold text-slate-900">{pickedFile.name}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenGooglePicker}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 border border-slate-300 transition-colors"
              >
                <FolderSearch className="w-3.5 h-3.5 text-sky-600" />
                <span>Open Picker</span>
              </button>

              <button
                onClick={handleSaveToDrive}
                disabled={isSavingDrive}
                className="py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                {isSavingDrive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Save to Drive</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Overwrite Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.description}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
              >
                Confirm Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
