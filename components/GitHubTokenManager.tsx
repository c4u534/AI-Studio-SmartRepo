'use client';

import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  Copy, 
  ExternalLink, 
  Loader2, 
  Lock, 
  Unlock, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  Info,
  X
} from 'lucide-react';

interface GitHubTokenManagerProps {
  token: string;
  onTokenChange: (token: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export interface TokenValidationResult {
  isValid: boolean;
  tier: 'full' | 'partial' | 'read_only' | 'unauthenticated' | 'invalid' | 'error';
  tierDescription?: string;
  login?: string;
  name?: string;
  avatarUrl?: string;
  scopes?: string[];
  hasFullRepo?: boolean;
  hasWorkflow?: boolean;
  hasAdminOrg?: boolean;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
  error?: string;
}

export function GitHubTokenManager({
  token,
  onTokenChange,
  isOpen = false,
  onClose,
}: GitHubTokenManagerProps) {
  const [inputVal, setInputVal] = useState(token);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<TokenValidationResult | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setInputVal(token);
    if (token) {
      validateToken(token);
    }
  }, [token]);

  const validateToken = async (patToTest: string) => {
    setIsValidating(true);
    try {
      const res = await fetch('/api/github/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: patToTest }),
      });
      const data: TokenValidationResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        isValid: false,
        tier: 'error',
        error: err.message || 'Validation request failed',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    const trimmed = inputVal.trim();
    onTokenChange(trimmed);
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('github_pat_token', trimmed);
      } else {
        localStorage.removeItem('github_pat_token');
      }
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    validateToken(trimmed);
  };

  const handleClear = () => {
    setInputVal('');
    onTokenChange('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('github_pat_token');
    }
    setResult(null);
  };

  if (!isOpen) return null;

  const rateLimitPct = result?.rateLimit?.limit
    ? Math.round((result.rateLimit.remaining / result.rateLimit.limit) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Key className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  GitHub Personal Access Token (PAT)
                </h3>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-slate-200 text-slate-700 font-semibold">
                  Granular Access
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your PAT for Full or Partial GitHub integration according to granted permissions.
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Token Input Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Personal Access Token (classic or fine-grained)
              </label>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <span>Generate token on GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxxxx"
                className="w-full pl-3 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded font-medium"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Tokens are stored securely in your browser&apos;s local storage and used directly for authenticated GitHub API requests.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={!inputVal && !token}
              className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors font-medium disabled:opacity-40"
            >
              Clear Token
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => validateToken(inputVal)}
                disabled={isValidating || !inputVal}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200 disabled:opacity-50"
              >
                {isValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Test Permissions</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isValidating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {savedSuccess ? <Check className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{savedSuccess ? 'Saved & Verified' : 'Save & Apply'}</span>
              </button>
            </div>
          </div>

          {/* Live Validation Results Card */}
          {result && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div
                className={`p-4 rounded-xl border text-xs space-y-3 ${
                  result.tier === 'full'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : result.tier === 'partial'
                    ? 'bg-sky-50/70 border-sky-200 text-sky-950'
                    : result.tier === 'read_only'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                {/* Header status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {result.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      {result.tier === 'full'
                        ? 'Full Access Integration Tier'
                        : result.tier === 'partial'
                        ? 'Partial Access Integration Tier'
                        : result.tier === 'read_only'
                        ? 'Read-Only Integration Tier'
                        : 'Invalid Token'}
                    </span>
                  </div>

                  {result.login && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {result.avatarUrl && (
                        <img src={result.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                      )}
                      <span>@{result.login}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs leading-relaxed opacity-90">
                  {result.tierDescription || result.error || 'Token validated.'}
                </p>

                {/* Rate Limit Stats */}
                {result.rateLimit && (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>GitHub API Rate Limit</span>
                      <span className="font-bold text-slate-800">
                        {result.rateLimit.remaining.toLocaleString()} / {result.rateLimit.limit.toLocaleString()} requests
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          rateLimitPct > 30 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${rateLimitPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Granted Scopes Badge List */}
                {result.scopes && result.scopes.length > 0 && (
                  <div>
                    <span className="font-semibold block text-[11px] mb-1.5">
                      Granted Scopes ({result.scopes.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-700"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Access Tiers Guide Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              Integration Tiers Reference
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-emerald-700 block mb-0.5">Full Access Tier</span>
                <p className="text-slate-500">
                  Includes <code className="font-mono text-slate-700">repo</code> scope. Unlocks private repositories, deep multi-branch tree crawls, and 5,000 req/hr.
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-sky-700 block mb-0.5">Partial Access Tier</span>
                <p className="text-slate-500">
                  Includes <code className="font-mono text-slate-700">public_repo</code> or <code className="font-mono text-slate-700">read:user</code>. Sufficient for public indexation and telemetry with 5,000 req/hr.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
