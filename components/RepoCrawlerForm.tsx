'use client';

import React, { useState } from 'react';
import { 
  GitBranch, 
  Search, 
  Sparkles, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowDownNarrowWide, 
  Key, 
  Globe2,
  Compass
} from 'lucide-react';
import { parseGitHubStartingPoint } from '@/lib/github-crawler';

interface RepoCrawlerFormProps {
  onStartCrawl: (config: {
    repoUrl: string;
    prioritizedBranches: string[];
    githubToken?: string;
    indexAllBranches: boolean;
  }) => Promise<void>;
  isLoading: boolean;
  crawlProgress: string;
  githubToken?: string;
  onOpenTokenManager?: () => void;
}

export function RepoCrawlerForm({ 
  onStartCrawl, 
  isLoading, 
  crawlProgress,
  githubToken: externalToken = '',
  onOpenTokenManager
}: RepoCrawlerFormProps) {
  const [repoInput, setRepoInput] = useState('https://github.com/shadcn-ui/ui');
  const [prioritizedBranches, setPrioritizedBranches] = useState<string[]>(['main', 'canary', 'v2-preview']);
  const [newBranchInput, setNewBranchInput] = useState('');
  const [githubToken, setGithubToken] = useState(externalToken);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [indexAllBranches, setIndexAllBranches] = useState(true);
  const [validationError, setValidationError] = useState('');

  React.useEffect(() => {
    if (externalToken) {
      setGithubToken(externalToken);
    }
  }, [externalToken]);

  // Live parsed identity
  const parsedTarget = parseGitHubStartingPoint(repoInput);

  const handleAddBranch = () => {
    const trimmed = newBranchInput.trim();
    if (!trimmed) return;
    if (prioritizedBranches.includes(trimmed)) {
      setValidationError(`Branch '${trimmed}' is already in priority list.`);
      return;
    }
    setPrioritizedBranches([...prioritizedBranches, trimmed]);
    setNewBranchInput('');
    setValidationError('');
  };

  const handleRemoveBranch = (branchToRemove: string) => {
    setPrioritizedBranches(prioritizedBranches.filter(b => b !== branchToRemove));
  };

  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    const newArr = [...prioritizedBranches];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newArr.length) return;
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setPrioritizedBranches(newArr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedTarget.isValid) {
      setValidationError(parsedTarget.error || 'Please enter a valid GitHub repository URL.');
      return;
    }

    setValidationError('');
    onStartCrawl({
      repoUrl: repoInput.trim(),
      prioritizedBranches: prioritizedBranches.length > 0 
        ? prioritizedBranches 
        : (parsedTarget.detectedBranch ? [parsedTarget.detectedBranch] : ['main', 'master']),
      githubToken: githubToken.trim() || undefined,
      indexAllBranches,
    });
  };

  const sampleRepos = [
    { label: 'shadcn/ui', url: 'https://github.com/shadcn-ui/ui' },
    { label: 'vercel/next.js', url: 'https://github.com/vercel/next.js' },
    { label: 'facebook/react', url: 'https://github.com/facebook/react' },
    { label: 'tailwind subpath', url: 'https://github.com/tailwindlabs/tailwindcss/tree/main/packages' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-600" />
            <span>Universal Repository Crawler & Multi-Branch Indexer</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Accepts any GitHub link (root repo, subfolder tree, blob file, or branch) and indexes file hierarchies & dependencies.
          </p>
        </div>

        {/* Quick sample buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Load:</span>
          {sampleRepos.map(sample => (
            <button
              key={sample.label}
              type="button"
              onClick={() => {
                setRepoInput(sample.url);
                setValidationError('');
              }}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors font-medium"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Repository Starting Point Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Starting Location (URL or owner/repo)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Globe2 className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={repoInput}
              onChange={(e) => {
                setRepoInput(e.target.value);
                setValidationError('');
              }}
              placeholder="e.g. https://github.com/owner/repo or deep tree/blob url"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none font-mono"
            />
          </div>

          {/* Parsed Identity Badge */}
          {parsedTarget.isValid ? (
            <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Detected Root Identity: <strong className="font-mono text-emerald-900 font-bold">{parsedTarget.fullName}</strong>
                {parsedTarget.detectedBranch && (
                  <span className="ml-2 text-slate-600">
                    Starting Branch: <strong className="text-amber-800 font-mono">{parsedTarget.detectedBranch}</strong>
                  </span>
                )}
                {parsedTarget.detectedSubpath && (
                  <span className="ml-2 text-slate-600">
                    Subpath: <strong className="text-sky-800 font-mono">{parsedTarget.detectedSubpath}</strong>
                  </span>
                )}
              </span>
            </div>
          ) : repoInput.trim() ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-md">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{parsedTarget.error || 'Invalid repository format'}</span>
            </div>
          ) : null}
        </div>

        {/* Branch Prioritization Module */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ArrowDownNarrowWide className="w-4 h-4 text-amber-600" />
                <span>Branch Prioritization Queue</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Branches processed first in this order. Critical development lines are fully mapped and documented before others.
              </p>
            </div>

            {/* Branch Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
              <input
                type="checkbox"
                checked={indexAllBranches}
                onChange={(e) => setIndexAllBranches(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Crawl remaining branches after priority</span>
            </label>
          </div>

          {/* Priority Branch Chips */}
          <div className="flex flex-wrap gap-2 items-center min-h-[38px] p-2 bg-white rounded-lg border border-slate-200">
            {prioritizedBranches.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No specific priority branches added yet. Default branch will be prioritized.</span>
            ) : (
              prioritizedBranches.map((branch, idx) => (
                <div
                  key={branch}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono group shadow-xs"
                >
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold">{branch}</span>
                  
                  {/* Reorder Buttons */}
                  <div className="flex items-center ml-1 text-slate-400 group-hover:text-amber-700">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMovePriority(idx, 'up')}
                        title="Move Up in Priority"
                        className="hover:text-amber-900 px-0.5"
                      >
                        ▲
                      </button>
                    )}
                    {idx < prioritizedBranches.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMovePriority(idx, 'down')}
                        title="Move Down in Priority"
                        className="hover:text-amber-900 px-0.5"
                      >
                        ▼
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveBranch(branch)}
                    className="ml-1 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Branch Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newBranchInput}
              onChange={(e) => setNewBranchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddBranch();
                }
              }}
              placeholder="Add branch name (e.g. develop, release/v2.0, staging)..."
              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 font-mono outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddBranch}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md flex items-center gap-1 border border-slate-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Add to Priority</span>
            </button>
          </div>
        </div>

        {/* GitHub Token / Rate Limit Section */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors font-medium"
          >
            <Key className="w-3.5 h-3.5 text-slate-500" />
            <span>{showTokenInput ? 'Hide' : 'Configure'} GitHub Personal Access Token (for high rate limits)</span>
          </button>

          {showTokenInput && (
            <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Optional for public repos, increases limit from 60 to 5,000/hr)"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-mono outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500">
                Without a token, GitHub limits unauthenticated requests to 60/hr. A personal access token increases this to 5,000/hr.
              </p>
            </div>
          )}
        </div>

        {validationError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Action Button & Progress */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {isLoading ? (
              <span className="flex items-center gap-2 text-emerald-700 font-semibold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>{crawlProgress || 'Executing deep repository multi-indexer...'}</span>
              </span>
            ) : (
              <span>Ready to index tree, extract dependencies, collate READMEs, and generate versioned outputs.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !parsedTarget.isValid}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Crawling Repository...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Index Full Repository</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
