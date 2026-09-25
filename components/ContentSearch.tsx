'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  FileCode, 
  GitBranch, 
  Filter, 
  Layers, 
  ExternalLink, 
  Eye, 
  Check, 
  Copy, 
  Sparkles, 
  Loader2, 
  FileText 
} from 'lucide-react';
import { IndexedFile, RepoSnapshot, SearchMatch } from '@/lib/types';

interface ContentSearchProps {
  files: IndexedFile[];
  activeSnapshot: RepoSnapshot | null;
  onPreviewFile: (file: IndexedFile) => void;
}

export function ContentSearch({ files, activeSnapshot, onPreviewFile }: ContentSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [isSearchingDeep, setIsSearchingDeep] = useState(false);
  const [fetchedContentMap, setFetchedContentMap] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Available branches & categories in current files
  const branches = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => set.add(f.branch));
    return Array.from(set);
  }, [files]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => set.add(f.category));
    return Array.from(set);
  }, [files]);

  // Primary filtering and matching
  const searchResults = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return [];

    const effectiveQuery = caseSensitive ? query : query.toLowerCase();

    const matches: SearchMatch[] = [];

    for (const file of files) {
      if (selectedBranch !== 'all' && file.branch !== selectedBranch) continue;
      if (selectedCategory !== 'all' && file.category !== selectedCategory) continue;

      const pathToCheck = caseSensitive ? file.path : file.path.toLowerCase();
      const content = fetchedContentMap[file.id] || file.content || file.contentSnippet || '';
      const contentToCheck = caseSensitive ? content : content.toLowerCase();

      const pathMatches = pathToCheck.includes(effectiveQuery);
      const contentMatches = contentToCheck.includes(effectiveQuery);

      if (pathMatches || contentMatches) {
        const matchingLines: { lineNumber: number; text: string }[] = [];
        let snippet = '';

        if (content) {
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            const lineToCheck = caseSensitive ? line : line.toLowerCase();
            if (lineToCheck.includes(effectiveQuery)) {
              if (matchingLines.length < 5) {
                matchingLines.push({ lineNumber: idx + 1, text: line.trim() });
              }
            }
          });

          if (matchingLines.length === 0) {
            snippet = content.slice(0, 180);
          }
        } else {
          snippet = `Path match in file: ${file.path}`;
        }

        matches.push({
          file,
          matchCount: matchingLines.length || 1,
          matchingLines,
          snippet,
        });
      }
    }

    return matches;
  }, [files, searchQuery, selectedBranch, selectedCategory, caseSensitive, fetchedContentMap]);

  // Trigger Deep Raw Fetch for unindexed blob files
  const handleDeepContentScan = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingDeep(true);

    try {
      const candidates = files
        .filter((f) => !f.content && !fetchedContentMap[f.id] && f.rawUrl)
        .slice(0, 20); // Batch scan up to 20 files

      const newContents: Record<string, string> = { ...fetchedContentMap };

      for (const file of candidates) {
        if (file.rawUrl) {
          try {
            const res = await fetch(file.rawUrl);
            if (res.ok) {
              const text = await res.text();
              newContents[file.id] = text;
            }
          } catch (e) {
            // ignore individual raw fetch errors
          }
        }
      }

      setFetchedContentMap(newContents);
    } finally {
      setIsSearchingDeep(false);
    }
  };

  const copySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search Header & Query Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-600" />
              <span>Multi-Tier Content Search</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Search keywords, package specifiers, identifiers, or phrases across all indexed files and branches
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeepContentScan}
              disabled={isSearchingDeep || !searchQuery.trim()}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 border border-slate-200 transition-colors shadow-xs"
            >
              {isSearchingDeep ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Scanning Raw Contents...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Scan Deep Code Content</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type keyword, package name, function, API endpoint, or config key..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none font-mono"
          />
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 flex items-center gap-1 font-medium">
              <GitBranch className="w-3.5 h-3.5 text-amber-600" />
              <span>Branch:</span>
            </span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 outline-none focus:border-emerald-500 font-mono"
            >
              <option value="all">All Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 flex items-center gap-1 font-medium">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>Category:</span>
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 outline-none focus:border-emerald-500 font-mono"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Case Sensitivity */}
          <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none ml-auto font-medium">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            <span>Match Case</span>
          </label>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            {searchQuery ? (
              <>
                Found <strong className="text-emerald-700 font-semibold">{searchResults.length}</strong> matching files
                {selectedBranch !== 'all' && ` on branch '${selectedBranch}'`}
              </>
            ) : (
              `Enter a search term above to search across ${files.length} indexed files`
            )}
          </span>
          {activeSnapshot && (
            <span className="font-mono text-[11px] text-slate-400">
              Snapshot: {activeSnapshot.fullName} ({activeSnapshot.versionTag})
            </span>
          )}
        </div>

        {searchQuery && searchResults.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 space-y-2 shadow-sm">
            <Search className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-800">No matches found for &quot;{searchQuery}&quot;</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try clicking &quot;Scan Deep Code Content&quot; to inspect raw contents of code files, or adjust branch and category filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {searchResults.map((match) => (
              <div
                key={`${match.file.branch}_${match.file.path}`}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition-all space-y-3 shadow-sm"
              >
                {/* File Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-mono text-sm font-semibold text-slate-900 truncate">
                      {match.file.path}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 shrink-0 font-medium">
                      {match.file.branch}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-sans shrink-0 hidden sm:inline font-medium">
                      {match.file.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-slate-500">
                      {(match.file.size / 1024).toFixed(1)} KB • {match.file.language}
                    </span>
                    <button
                      onClick={() => onPreviewFile(match.file)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-md flex items-center gap-1 border border-slate-200 transition-colors font-medium"
                    >
                      <Eye className="w-3 h-3 text-sky-600" />
                      <span>Inspect</span>
                    </button>
                    {match.file.rawUrl && (
                      <a
                        href={match.file.rawUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                        title="View Raw Source"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Content Snippet where keyword was found */}
                <div className="relative bg-slate-900 text-slate-100 rounded-lg p-3 border border-slate-800 font-mono text-xs">
                  <button
                    onClick={() => copySnippet(match.file.id, match.snippet)}
                    className="absolute top-2 right-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    title="Copy snippet"
                  >
                    {copiedId === match.file.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <div className="space-y-1 text-slate-300 pr-8 overflow-x-auto whitespace-pre">
                    {match.matchingLines.length > 0 ? (
                      match.matchingLines.map((m, idx) => (
                        <div key={idx} className="flex gap-3">
                          <span className="text-slate-500 select-none w-10 text-right shrink-0">
                            {m.lineNumber}
                          </span>
                          <span className="text-slate-100">
                            {highlightQuery(m.text, searchQuery, caseSensitive)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 italic">
                        {match.snippet}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to highlight matching keyword in snippet
function highlightQuery(text: string, query: string, caseSensitive: boolean) {
  if (!query) return text;
  const flags = caseSensitive ? 'g' : 'gi';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, flags);
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-emerald-500/40 text-emerald-200 font-semibold px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
