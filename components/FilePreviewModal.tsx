'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  FileCode, 
  Download, 
  Loader2 
} from 'lucide-react';
import { IndexedFile } from '@/lib/types';

interface FilePreviewModalProps {
  file: IndexedFile | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [rawFetchedContent, setRawFetchedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(() => !file?.content && !!file?.rawUrl);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!file || file.content) return;

    if (file.rawUrl) {
      let isMounted = true;
      fetch(file.rawUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Could not fetch raw file content');
          return res.text();
        })
        .then((text) => {
          if (isMounted) setRawFetchedContent(text);
        })
        .catch((err) => {
          if (isMounted) {
            setRawFetchedContent(`// Error loading raw file preview: ${err.message}\n// View on GitHub: ${file.rawUrl}`);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [file]);

  if (!file) return null;

  const content = file.content || rawFetchedContent || file.contentSnippet || '// No preview available';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = content.split('\n');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCode className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-mono text-xs sm:text-sm font-bold text-slate-900 truncate">
                {file.path}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                <span className="font-mono text-amber-700 font-semibold">branch: {file.branch}</span>
                <span>•</span>
                <span>{file.category}</span>
                <span>•</span>
                <span>{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs flex items-center gap-1 border border-slate-300 transition-colors font-medium shadow-xs"
              title="Copy contents"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs flex items-center gap-1 border border-slate-300 transition-colors font-medium shadow-xs"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {file.rawUrl && (
              <a
                href={file.rawUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs flex items-center gap-1 border border-slate-300 transition-colors shadow-xs"
                title="View on GitHub"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Code Viewer */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4 font-mono text-xs text-slate-800">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Fetching source code from branch &apos;{file.branch}&apos;...</span>
            </div>
          ) : (
            <div className="table w-full">
              {lines.map((line, idx) => (
                <div key={idx} className="table-row hover:bg-slate-100/80 leading-5">
                  <span className="table-cell text-right pr-4 text-slate-400 select-none w-10 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="table-cell whitespace-pre font-mono pr-4 text-slate-800">
                    {line}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
