'use client';

import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileJson, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  HardDrive,
  FolderSearch,
  Sparkles
} from 'lucide-react';
import { RepoSnapshot, IndexedFile } from '@/lib/types';
import { uploadJsonToDrive, uploadCsvToDrive, openGooglePicker } from '@/lib/workspace';

interface QuickExportModalProps {
  snapshot: RepoSnapshot;
  files: IndexedFile[];
  accessToken: string | null;
  onClose: () => void;
  onRequireSignIn?: () => void;
  onOpenSignIn?: () => void;
  onSuccess?: (fileTitle: string) => void;
}

export function QuickExportModal({
  snapshot,
  files,
  accessToken,
  onClose,
  onRequireSignIn,
  onOpenSignIn,
  onSuccess,
}: QuickExportModalProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'both'>('both');
  const [targetFolderId, setTargetFolderId] = useState<string>(snapshot.googleDriveFolderId || '');
  const [targetFolderName, setTargetFolderName] = useState<string>(snapshot.googleDriveFolderName || 'Google Drive Root');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedLinks, setUploadedLinks] = useState<Array<{ name: string; url: string; type: string }>>([]);

  const handleSignIn = () => {
    if (onOpenSignIn) onOpenSignIn();
    else if (onRequireSignIn) onRequireSignIn();
  };

  // Select target folder using Google Picker
  const handlePickFolder = async () => {
    if (!accessToken) {
      handleSignIn();
      return;
    }
    try {
      await openGooglePicker({
        accessToken,
        viewType: 'folders',
        onPick: (item) => {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            setTargetFolderId(item.id);
            setTargetFolderName(item.name);
          } else {
            setErrorMsg('Please select a folder, not a regular file.');
          }
        },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Picker could not be loaded.');
    }
  };

  // Trigger Google Drive Upload
  const handleDriveBatchUpload = async () => {
    if (!accessToken) {
      handleSignIn();
      return;
    }

    setIsUploading(true);
    setUploadStatus('Initiating Drive upload...');
    setErrorMsg(null);
    setUploadedLinks([]);

    const newLinks: Array<{ name: string; url: string; type: string }> = [];

    try {
      // 1. Upload JSON if requested
      if (exportFormat === 'json' || exportFormat === 'both') {
        setUploadStatus('Exporting repository metadata JSON payload...');
        const jsonResult = await uploadJsonToDrive({
          accessToken,
          snapshot,
          files,
          folderId: targetFolderId || undefined,
        });
        newLinks.push({
          name: jsonResult.fileName,
          url: jsonResult.webViewLink,
          type: 'JSON Archive',
        });
      }

      // 2. Upload CSV if requested
      if (exportFormat === 'csv' || exportFormat === 'both') {
        setUploadStatus('Generating tabular Table of Contents CSV...');
        const csvResult = await uploadCsvToDrive({
          accessToken,
          snapshot,
          files,
          folderId: targetFolderId || undefined,
        });
        newLinks.push({
          name: csvResult.fileName,
          url: csvResult.webViewLink,
          type: 'CSV Spreadsheet',
        });
      }

      setUploadedLinks(newLinks);
      setUploadStatus(`Upload completed successfully! (${newLinks.length} file${newLinks.length > 1 ? 's' : ''})`);
      if (onSuccess) {
        onSuccess(newLinks.map((l) => l.name).join(', '));
      }
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      setErrorMsg(err.message || 'Drive batch upload failed. Check OAuth scopes and retry.');
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger browser download without Drive
  const handleLocalDownload = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const payload = {
        repository: snapshot,
        indexedAt: new Date().toISOString(),
        totalFiles: files.length,
        files: files.map((f) => ({
          path: f.path,
          category: f.category,
          branch: f.branch,
          size: f.size,
          sha: f.sha,
          rawUrl: f.rawUrl,
        })),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${snapshot.repo}-${snapshot.versionTag}-metadata.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV
      let csv = 'Path,Category,Branch,Size (Bytes),Language,Raw URL,HTML URL\n';
      files.forEach((f) => {
        const row = [
          `"${f.path.replace(/"/g, '""')}"`,
          `"${f.category}"`,
          `"${f.branch}"`,
          f.size,
          `"${f.language || ''}"`,
          `"${f.rawUrl || ''}"`,
          `"https://github.com/${snapshot.fullName}/blob/${f.branch}/${f.path}"`,
        ];
        csv += row.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${snapshot.repo}-${snapshot.versionTag}-toc.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Quick Drive & File Export</h3>
              <p className="text-xs text-slate-500">
                Direct export to Google Drive root or designated team folder
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Destination & Format Selector */}
        <div className="space-y-4 text-xs">
          {/* Format Options */}
          <div>
            <label className="block text-slate-700 font-semibold mb-2">Export Format(s)</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setExportFormat('both')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  exportFormat === 'both'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">JSON + CSV</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-[10px] text-slate-500">Metadata & tabular CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('json')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  exportFormat === 'json'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <FileJson className="w-3.5 h-3.5 text-amber-600" />
                  <span>JSON File</span>
                </div>
                <span className="text-[10px] text-slate-500">Structured repository object</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  exportFormat === 'csv'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                  <span>CSV File</span>
                </div>
                <span className="text-[10px] text-slate-500">Spreadsheet ready table</span>
              </button>
            </div>
          </div>

          {/* Drive Folder Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                <span>Destination Folder in Drive</span>
              </span>
              <button
                type="button"
                onClick={handlePickFolder}
                className="text-[11px] text-sky-600 hover:text-sky-700 flex items-center gap-1 font-semibold"
              >
                <FolderSearch className="w-3 h-3" />
                Change Folder
              </button>
            </div>
            <div className="text-xs text-slate-800 font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center justify-between truncate">
              <span className="truncate">{targetFolderName}</span>
              {targetFolderId && (
                <span className="text-[10px] text-slate-400 ml-2 shrink-0">ID: {targetFolderId.substring(0, 8)}...</span>
              )}
            </div>
          </div>

          {/* Summary metrics */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono">
            <div>
              <span className="text-slate-400 block">Repository:</span>
              <span className="text-slate-800 font-sans truncate block font-medium">{snapshot.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Total Files:</span>
              <span className="text-emerald-700 font-semibold">{files.length} indexed</span>
            </div>
            <div>
              <span className="text-slate-400 block">Branches:</span>
              <span className="text-amber-700 font-semibold">{snapshot.indexedBranches.length} branch(es)</span>
            </div>
          </div>
        </div>

        {/* Status / Errors / Success Results */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block">Upload notice</strong>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {uploadStatus && !errorMsg && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2 text-xs text-slate-700">
            {isUploading ? (
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{uploadStatus}</span>
          </div>
        )}

        {uploadedLinks.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
            <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Direct Google Drive Links
            </span>
            <div className="space-y-1.5">
              {uploadedLinks.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white border border-emerald-200 px-3 py-2 rounded-lg text-xs shadow-xs"
                >
                  <span className="text-slate-800 font-mono truncate mr-2 font-medium">{link.name}</span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 shrink-0 text-[11px]"
                  >
                    Open in Drive
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] text-slate-500 font-medium">Local Download:</span>
            <button
              type="button"
              onClick={() => handleLocalDownload('json')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] flex items-center gap-1 transition-colors border border-slate-300 font-medium"
            >
              <Download className="w-3 h-3" />
              JSON
            </button>
            <button
              type="button"
              onClick={() => handleLocalDownload('csv')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] flex items-center gap-1 transition-colors border border-slate-300 font-medium"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 rounded-lg transition-colors font-medium"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={handleDriveBatchUpload}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to Drive...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload to Google Drive</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
