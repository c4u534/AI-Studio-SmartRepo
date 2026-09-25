'use client';

import React from 'react';
import Image from 'next/image';
import { User } from 'firebase/auth';
import { 
  GitBranch, 
  Layers, 
  FileSpreadsheet, 
  Bot, 
  History, 
  Search, 
  LogOut, 
  FolderSearch,
  BookOpen,
  Network,
  Cpu,
  Share2,
  Package,
  Database,
  FlaskConical,
  Key
} from 'lucide-react';
import { RepoSnapshot } from '@/lib/types';

interface HeaderProps {
  user: User | null;
  activeSnapshot: RepoSnapshot | null;
  onSignIn: () => void;
  onSignOut: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenPicker: () => void;
  onOpenQuickExport?: () => void;
  gitHubToken?: string;
  onOpenTokenManager?: () => void;
}

export function Header({
  user,
  activeSnapshot,
  onSignIn,
  onSignOut,
  activeTab,
  setActiveTab,
  onOpenPicker,
  onOpenQuickExport,
  gitHubToken,
  onOpenTokenManager,
}: HeaderProps) {
  const tabs = [
    { id: 'indexer', label: 'Crawler', icon: GitBranch },
    { id: 'dependencies', label: 'Dependencies', icon: Package },
    { id: 'database', label: 'Database & Agent', icon: Database, highlight: true },
    { id: 'sandbox', label: 'IDE Sandbox', icon: FlaskConical, highlight: true },
    { id: 'toc', label: 'TOC', icon: Layers },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'readme', label: 'README', icon: BookOpen },
    { id: 'graph', label: 'Graph', icon: Network },
    { id: 'agency', label: 'Agency', icon: Cpu },
    { id: 'versioning', label: 'Versions', icon: History },
    { id: 'workspace', label: 'Workspace', icon: FileSpreadsheet },
    { id: 'mcp', label: 'MCP/A2A', icon: Bot },
  ];

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm shrink-0">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base tracking-tight truncate">
                  GitHub Smart Multi-Indexer
                </span>
                {activeSnapshot && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 font-semibold">
                    {activeSnapshot.versionTag}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                Deep branch crawler, dependency conflict analyzer, Workspace sync & MCP gateway
              </p>
            </div>
          </div>

          {/* Desktop Nav Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-lg text-xs font-medium">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.highlight ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Auth & Quick Picker Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {activeSnapshot && onOpenQuickExport && (
              <button
                onClick={onOpenQuickExport}
                title="Quick Export metadata to Google Drive (JSON / CSV)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Quick Export</span>
              </button>
            )}

            {onOpenTokenManager && (
              <button
                onClick={onOpenTokenManager}
                title="Manage GitHub Personal Access Token (PAT)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              >
                <Key className={`w-3.5 h-3.5 ${gitHubToken ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">GitHub PAT</span>
                {gitHubToken ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="PAT Active" />
                ) : null}
              </button>
            )}

            {user && (
              <button
                onClick={onOpenPicker}
                title="Open Google Picker to select Drive files or Sheets"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition-colors"
              >
                <FolderSearch className="w-3.5 h-3.5 text-amber-600" />
                <span>Google Picker</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    width={24}
                    height={24}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full border border-slate-300"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-xs text-slate-700 font-medium max-w-[120px] truncate hidden sm:inline">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={onSignOut}
                  title="Sign out"
                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex lg:hidden items-center py-2 border-t border-slate-200 text-xs overflow-x-auto gap-1.5 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded whitespace-nowrap flex items-center gap-1 text-xs transition-colors ${
                  isActive 
                    ? 'bg-emerald-600 text-white font-bold' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
