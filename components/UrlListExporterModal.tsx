'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileText, 
  FileSpreadsheet, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Layers, 
  CheckSquare, 
  GitBranch,
  FolderTree
} from 'lucide-react';
import { RepoSnapshot, IndexedFile } from '@/lib/types';
import { exportUrlsToGoogleDocs, exportUrlsToGoogleSheets } from '@/lib/workspace';

interface UrlListExporterModalProps {
  snapshot: RepoSnapshot;
  selectedFiles: IndexedFile[];
  allFiles?: IndexedFile[];
  accessToken: string | null;
  onRequireSignIn?: () => void;
  onOpenSignIn?: () => void;
  onExportComplete?: (format: string) => void;
  onClose: () => void;
}

export function UrlListExporterModal({
  snapshot,
  selectedFiles,
  allFiles = [],
  accessToken,
  onRequireSignIn,
  onOpenSignIn,
  onExportComplete,
  onClose,
}: UrlListExporterModalProps) {
  const [scope, setScope] = useState<'selected' | 'all'>(
    selectedFiles.length > 0 ? 'selected' : 'all'
  );
  const [includeRawUrls, setIncludeRawUrls] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [createdDocUrl, setCreatedDocUrl] = useState<string | null>(null);
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);

  const handleSignIn = () => {
    if (onOpenSignIn) onOpenSignIn();
    else if (onRequireSignIn) onRequireSignIn();
  };

  // Files targeted based on scope
  const targetFiles = useMemo(() => {
    if (scope === 'selected') {
      return selectedFiles.length > 0 ? selectedFiles : allFiles;
    }
    return allFiles.length > 0 ? allFiles : selectedFiles;
  }, [scope, selectedFiles, allFiles]);

  // Formatted Text generation for preview and download
  const generatedText = useMemo(() => {
    let out = `# GITHUB REPOSITORY URL REGISTRY\n`;
    out += `# Repository: https://github.com/${snapshot.fullName}\n`;
    out += `# Snapshot Version: ${snapshot.versionTag}\n`;
    out += `# Total Files: ${targetFiles.length}\n`;
    out += `# Exported: ${new Date().toISOString()}\n`;
    out += `# Scope: ${scope === 'selected' ? `Selected Subset (${targetFiles.length} files)` : `All Repository Files (${targetFiles.length} files)`}\n`;
    out += `===============================================================================\n\n`;

    targetFiles.forEach((file, index) => {
      const blobUrl = `https://github.com/${snapshot.fullName}/blob/${file.branch}/${file.path}`;
      out += `${index + 1}. [${file.branch}] ${file.path}\n`;
      out += `   URL: ${blobUrl}\n`;
      if (includeRawUrls) {
        const rawUrl = file.rawUrl || `https://raw.githubusercontent.com/${snapshot.fullName}/${file.branch}/${file.path}`;
        out += `   RAW: ${rawUrl}\n`;
      }
      out += `   SIZE: ${file.size} bytes | CATEGORY: ${file.category}\n\n`;
    });

    return out;
  }, [snapshot, targetFiles, scope, includeRawUrls]);

  // Copy to Clipboard
  const handleCopyText = () => {
    navigator.clipboard.writeText(generatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Direct .txt file download
  const handleDownloadTxt = () => {
    const blob = new Blob([generatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const scopeLabel = scope === 'selected' ? 'selected' : 'all-repo';
    a.download = `${snapshot.repo}-${snapshot.versionTag}-${scopeLabel}-urls.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to Google Docs
  const handleExportToGoogleDocs = async () => {
    if (!accessToken) {
      handleSignIn();
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    setStatusMessage('Generating formatted Google Document of file URLs...');

    try {
      const scopeLabel = scope === 'selected' ? `Selected ${targetFiles.length} Files` : `All ${targetFiles.length} Files`;
      const title = `[File URLs] ${snapshot.fullName} - ${scopeLabel}`;
      const result = await exportUrlsToGoogleDocs({
        accessToken,
        snapshot,
        files: targetFiles,
        documentTitle: title,
      });

      setCreatedDocUrl(result.documentUrl);
      setStatusMessage('Google Document created successfully!');
      if (onExportComplete) {
        onExportComplete('Google Docs');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export URLs to Google Docs');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Google Sheets
  const handleExportToGoogleSheets = async () => {
    if (!accessToken) {
      handleSignIn();
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    setStatusMessage('Generating Google Sheet matrix of file URLs...');

    try {
      const scopeLabel = scope === 'selected' ? `Selected ${targetFiles.length} Files` : `All ${targetFiles.length} Files`;
      const title = `[File URLs] ${snapshot.fullName} - ${scopeLabel}`;
      const result = await exportUrlsToGoogleSheets({
        accessToken,
        snapshot,
        files: targetFiles,
        sheetTitle: title,
      });

      setCreatedSheetUrl(result.spreadsheetUrl);
      setStatusMessage('Google Sheet created successfully!');
      if (onExportComplete) {
        onExportComplete('Google Sheets');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export URLs to Google Sheets');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 text-slate-800 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Export File URL Registry
              </h2>
              <p className="text-xs text-slate-500">
                Export direct GitHub and Raw CDN URLs to Google Docs, Sheets, or plain text
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Scope Selector */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="font-semibold text-slate-700 block">Export Scope</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScope('selected')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all text-center ${
                  scope === 'selected'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                Selected Files ({selectedFiles.length})
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all text-center ${
                  scope === 'all'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                All Files ({allFiles.length || targetFiles.length})
              </button>
            </div>
          </div>

          {/* Raw URLs Option */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="font-semibold text-slate-700 block">Format Controls</label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 pt-1">
              <input
                type="checkbox"
                checked={includeRawUrls}
                onChange={(e) => setIncludeRawUrls(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span>Include Raw Content CDN URLs</span>
            </label>
          </div>
        </div>

        {/* Live Preview Snippet */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono">Payload Preview ({targetFiles.length} files targeted)</span>
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium"
            >
              {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied to Clipboard' : 'Copy List'}</span>
            </button>
          </div>
          <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-mono text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {generatedText.slice(0, 1500)}
            {generatedText.length > 1500 && '\n\n... [remaining files truncated in preview]'}
          </pre>
        </div>

        {/* Status or Error Notifications */}
        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              <span>{statusMessage}</span>
            </div>
            {createdDocUrl && (
              <a
                href={createdDocUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
              >
                Open Doc <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {createdSheetUrl && (
              <a
                href={createdSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
              >
                Open Sheet <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Plain Text Download */}
          <button
            onClick={handleDownloadTxt}
            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-300 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download .txt</span>
          </button>

          {/* Export to Google Docs */}
          <button
            onClick={handleExportToGoogleDocs}
            disabled={isExporting}
            className="py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>Export to Google Docs</span>
          </button>

          {/* Export to Google Sheets */}
          <button
            onClick={handleExportToGoogleSheets}
            disabled={isExporting}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>Export to Google Sheets</span>
          </button>
        </div>
      </div>
    </div>
  );
}
