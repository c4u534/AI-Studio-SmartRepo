'use client';

import React, { useState, useEffect } from 'react';
import { 
  GitPullRequest, 
  GitCommit, 
  Users, 
  TrendingUp, 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  GitMerge, 
  Calendar, 
  Activity, 
  Sparkles,
  BarChart3,
  Award
} from 'lucide-react';
import { RepoSnapshot, RepoInsightsData } from '@/lib/types';

interface RepositoryInsightsProps {
  snapshot: RepoSnapshot | null;
  githubToken?: string;
}

export function RepositoryInsights({ snapshot, githubToken = '' }: RepositoryInsightsProps) {
  const [insights, setInsights] = useState<RepoInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  const owner = snapshot?.owner || 'facebook';
  const repo = snapshot?.repo || 'react';

  const fetchInsightsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/github/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          githubToken,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to load insights: ${res.statusText}`);
      }

      const data: RepoInsightsData = await res.json();
      setInsights(data);
    } catch (err: any) {
      console.error('Error loading repository insights:', err);
      setError(err.message || 'Unable to retrieve GitHub insights.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsightsData();
  }, [owner, repo]);

  const maxCommitTotal = Math.max(...(insights?.commitActivity.map((c) => c.total) || [1]), 10);

  return (
    <div className="space-y-6">
      {/* Top Insights Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Repository Insights & Engineering Velocity
                </h3>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-violet-50 text-violet-700 border border-violet-200 font-semibold">
                  GitHub Live Analytics
                </span>
                {insights?.isMockOrFallback && (
                  <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                    Sample Baseline
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time telemetry for <span className="font-mono font-medium text-slate-700">{owner}/{repo}</span> tracking contributor activity, weekly commit cadence, and PR merge turnaround.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchInsightsData}
              disabled={isLoading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-violet-600' : 'text-slate-600'}`} />
              <span>{isLoading ? 'Syncing...' : 'Refresh Metrics'}</span>
            </button>
            <a
              href={`https://github.com/${owner}/${repo}/pulse`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 border border-slate-200 shadow-xs transition-colors"
            >
              <span>GitHub Pulse</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* KPI Velocity Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contributor Count */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-600" />
              Active Contributors
            </span>
            <span className="text-[10px] font-mono text-slate-400">Ranked</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {insights?.contributors.length || 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">core devs</span>
          </div>
          <div className="flex items-center -space-x-1.5 mt-3 overflow-hidden py-0.5">
            {(insights?.contributors || []).slice(0, 5).map((c, i) => (
              <img
                key={i}
                src={c.avatarUrl}
                alt={c.login}
                title={`${c.login} (${c.contributions} commits)`}
                className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-xs"
              />
            ))}
            {(insights?.contributors.length || 0) > 5 && (
              <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600">
                +{(insights?.contributors.length || 0) - 5}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Commit Velocity */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <GitCommit className="w-4 h-4 text-emerald-600" />
              Commit Velocity
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {insights?.velocity.avgCommitsPerWeek || 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">commits / wk</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Consistent cadence across branches</span>
          </div>
        </div>

        {/* PR Turnaround (Mean Time to Merge) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              Mean Time to Merge (MTTM)
            </span>
            <span className="text-[10px] font-mono text-slate-400">Velocity</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {insights?.velocity.meanTimeToMergeHours || 24}
            <span className="text-xs font-normal text-slate-400 ml-1.5">hours</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Average pull request turnaround</span>
          </div>
        </div>

        {/* PR Merge Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <GitMerge className="w-4 h-4 text-violet-600" />
              PR Merge Rate
            </span>
            <span className="text-[10px] font-mono text-violet-600 font-semibold bg-violet-50 px-1.5 py-0.5 rounded">
              {insights?.velocity.mergeRatePercent || 0}%
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {insights?.velocity.mergedCount || 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              of {insights?.velocity.totalAnalyzedPRs || 0} merged
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-violet-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${insights?.velocity.mergeRatePercent || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Commit Frequency Chart & Contributor Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Commit Frequency Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-slate-900 text-sm">Weekly Commit Frequency & Cadence</h4>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Past 12–16 Weeks</span>
          </div>

          {/* Interactive Bar Chart */}
          <div className="pt-2">
            <div className="h-44 flex items-end gap-2 sm:gap-3 px-2">
              {(insights?.commitActivity || []).map((point, idx) => {
                const heightPct = Math.max(8, Math.round((point.total / maxCommitTotal) * 100));
                const isHovered = hoveredWeek === idx;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer relative h-full justify-end"
                    onMouseEnter={() => setHoveredWeek(idx)}
                    onMouseLeave={() => setHoveredWeek(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                        <div className="font-bold">{point.total} commits</div>
                        <div className="text-slate-400">Week of {point.label}</div>
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isHovered ? 'bg-emerald-500' : 'bg-emerald-600/80 hover:bg-emerald-600'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />

                    {/* X-axis Label */}
                    <span className="text-[10px] font-mono text-slate-400 rotate-0 truncate max-w-[34px]">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Daily Distribution Indicator */}
            {hoveredWeek !== null && insights?.commitActivity[hoveredWeek] && (
              <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between animate-in fade-in">
                <span className="text-slate-600 font-medium">
                  Daily breakdown for week {insights.commitActivity[hoveredWeek].label}:
                </span>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dIdx) => (
                    <span
                      key={dIdx}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700"
                    >
                      {day}: {insights.commitActivity[hoveredWeek].days[dIdx] || 0}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Commits Stream */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-700 block mb-2">Recent Commit Log</span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {(insights?.recentCommits || []).map((commit, i) => (
                <div
                  key={i}
                  className="p-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[11px] text-indigo-600 font-semibold px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded shrink-0">
                      {commit.sha}
                    </span>
                    <span className="truncate text-slate-800 font-medium">{commit.message}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400 font-mono">
                    <span>{commit.authorName}</span>
                    <a
                      href={commit.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Contributor Statistics & Rankings */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <h4 className="font-bold text-slate-900 text-sm">Top Contributors</h4>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">By Commits</span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[360px] pr-1">
            {(insights?.contributors || []).map((contrib, index) => {
              const topContribCount = insights?.contributors[0]?.contributions || 1;
              const pct = Math.round((contrib.contributions / topContribCount) * 100);

              return (
                <div
                  key={contrib.login}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-all text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 text-slate-400 font-mono font-bold text-[10px]">
                        #{index + 1}
                      </span>
                      <img
                        src={contrib.avatarUrl}
                        alt={contrib.login}
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                      <a
                        href={contrib.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-slate-800 hover:text-indigo-600 truncate text-xs"
                      >
                        {contrib.login}
                      </a>
                    </div>
                    <span className="font-mono text-slate-600 text-[11px] font-semibold shrink-0">
                      {contrib.contributions} commits
                    </span>
                  </div>

                  {/* Relative contribution bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PR Velocity & Turnaround Stream */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-violet-600" />
            <h4 className="font-bold text-slate-900 text-sm">Pull Request Velocity & Turnaround</h4>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-violet-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-violet-600" />
              Merged ({insights?.velocity.mergedCount || 0})
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Open ({insights?.velocity.openCount || 0})
            </span>
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Closed ({insights?.velocity.closedCount || 0})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {(insights?.recentPRs || []).map((pr) => {
            const isMerged = pr.state === 'merged';
            const isOpen = pr.state === 'open';

            return (
              <div
                key={pr.number}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-indigo-600 font-bold text-xs">
                      #{pr.number}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                        isMerged
                          ? 'bg-violet-100 text-violet-800 border border-violet-200'
                          : isOpen
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pr.state.toUpperCase()}
                    </span>
                  </div>
                  <h5 className="font-semibold text-slate-900 line-clamp-1" title={pr.title}>
                    {pr.title}
                  </h5>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
                  <span>@{pr.userLogin}</span>
                  {pr.timeToMergeHours ? (
                    <span className="text-violet-700 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Merged in {pr.timeToMergeHours}h
                    </span>
                  ) : (
                    <span>{isOpen ? 'In Review' : 'Closed'}</span>
                  )}
                  <a
                    href={pr.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
