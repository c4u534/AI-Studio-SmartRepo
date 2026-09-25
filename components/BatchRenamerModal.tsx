'use client';

import React, { useState, useMemo } from 'react';
import { 
  FolderTree, 
  Edit3, 
  ArrowRight, 
  Check, 
  Copy, 
  Download, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Filter, 
  X, 
  Terminal, 
  Sparkles,
  Search,
  Sliders,
  FileCode
} from 'lucide-react';
import { IndexedFile, RepoSnapshot, FileCategory } from '@/lib/types';

interface BatchRenamerModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: IndexedFile[];
  snapshot: RepoSnapshot | null;
  selectedFiles?: IndexedFile[];
  onApplyRenaming: (updatedFiles: IndexedFile[]) => void;
}

type ScopeType = 'all' | 'selected' | 'category' | 'branch' | 'regex';
type CaseTransformType = 'none' | 'kebab' | 'snake' | 'camel' | 'pascal' | 'upper' | 'lower';

export function BatchRenamerModal({
  isOpen,
  onClose,
  files,
  snapshot,
  selectedFiles = [],
  onApplyRenaming,
}: BatchRenamerModalProps) {
  // Scope State
  const [scope, setScope] = useState<ScopeType>(selectedFiles.length > 0 ? 'selected' : 'all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [pathPatternFilter, setPathPatternFilter] = useState<string>('');

  // Transformation Rules State
  const [caseTransform, setCaseTransform] = useState<CaseTransformType>('none');
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>('');
  const [findPattern, setFindPattern] = useState<string>('');
  const [replacePattern, setReplacePattern] = useState<string>('');
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [matchCase, setMatchCase] = useState<boolean>(false);

  // Directory Organization
  const [directoryMode, setDirectoryMode] = useState<'none' | 'prefix' | 'byCategory' | 'flatten'>('none');
  const [directoryPrefix, setDirectoryPrefix] = useState<string>('src/');

  // Extension Normalization
  const [targetExtension, setTargetExtension] = useState<string>('');

  // Numbering
  const [addNumbering, setAddNumbering] = useState<boolean>(false);
  const [numberPadding, setNumberPadding] = useState<number>(2);

  // Diff Search
  const [diffSearchQuery, setDiffSearchQuery] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Distinct categories and branches for filters
  const categories = useMemo(() => {
    const s = new Set<string>();
    files.forEach((f) => s.add(f.category));
    return Array.from(s);
  }, [files]);

  const branches = useMemo(() => {
    const s = new Set<string>();
    files.forEach((f) => s.add(f.branch));
    return Array.from(s);
  }, [files]);

  // Case transformation helpers
  const applyCaseTransform = (filenameWithoutExt: string, transform: CaseTransformType): string => {
    if (transform === 'none') return filenameWithoutExt;
    if (transform === 'lower') return filenameWithoutExt.toLowerCase();
    if (transform === 'upper') return filenameWithoutExt.toUpperCase();

    // Split words by dashes, underscores, spaces, or camelCase transitions
    const words = filenameWithoutExt
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .trim()
      .split(/\s+/);

    if (words.length === 0 || (words.length === 1 && words[0] === '')) return filenameWithoutExt;

    if (transform === 'kebab') {
      return words.map((w) => w.toLowerCase()).join('-');
    }
    if (transform === 'snake') {
      return words.map((w) => w.toLowerCase()).join('_');
    }
    if (transform === 'camel') {
      return words
        .map((w, idx) => (idx === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join('');
    }
    if (transform === 'pascal') {
      return words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');
    }
    return filenameWithoutExt;
  };

  // Compute Renaming Map
  const previewData = useMemo(() => {
    const selectedIds = new Set(selectedFiles.map((f) => f.id));

    // 1. Filter files in scope
    const matchedFiles = files.filter((f) => {
      if (scope === 'selected') {
        return selectedIds.has(f.id);
      }
      if (scope === 'category') {
        return filterCategory === 'all' || f.category === filterCategory;
      }
      if (scope === 'branch') {
        return filterBranch === 'all' || f.branch === filterBranch;
      }
      if (scope === 'regex' && pathPatternFilter) {
        try {
          const reg = new RegExp(pathPatternFilter, 'i');
          return reg.test(f.path);
        } catch {
          return f.path.toLowerCase().includes(pathPatternFilter.toLowerCase());
        }
      }
      return true;
    });

    // 2. Apply transformations
    const items = matchedFiles.map((f, index) => {
      const fullPath = f.path;
      const lastSlashIdx = fullPath.lastIndexOf('/');
      let dir = lastSlashIdx !== -1 ? fullPath.substring(0, lastSlashIdx) : '';
      const filenameWithExt = lastSlashIdx !== -1 ? fullPath.substring(lastSlashIdx + 1) : fullPath;

      // Extract name and extension
      const dotIdx = filenameWithExt.lastIndexOf('.');
      let name = dotIdx !== -1 ? filenameWithExt.substring(0, dotIdx) : filenameWithExt;
      let ext = dotIdx !== -1 ? filenameWithExt.substring(dotIdx) : '';

      // Rule 1: Find & Replace on filename
      if (findPattern) {
        try {
          if (isRegex) {
            const regex = new RegExp(findPattern, matchCase ? 'g' : 'gi');
            name = name.replace(regex, replacePattern);
          } else {
            const searchStr = matchCase ? findPattern : findPattern.toLowerCase();
            if (matchCase) {
              name = name.split(findPattern).join(replacePattern);
            } else {
              const regex = new RegExp(findPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              name = name.replace(regex, replacePattern);
            }
          }
        } catch (e) {
          // invalid regex, ignore
        }
      }

      // Rule 2: Case transformation
      name = applyCaseTransform(name, caseTransform);

      // Rule 3: Prefix & Suffix
      if (prefix) {
        name = `${prefix}${name}`;
      }
      if (suffix) {
        name = `${name}${suffix}`;
      }

      // Rule 4: Numbering
      if (addNumbering) {
        const numStr = String(index + 1).padStart(numberPadding, '0');
        name = `${numStr}_${name}`;
      }

      // Rule 5: Extension override
      if (targetExtension) {
        ext = targetExtension.startsWith('.') ? targetExtension : `.${targetExtension}`;
      }

      // Rule 6: Directory Reorganization
      if (directoryMode === 'prefix' && directoryPrefix) {
        const cleanPrefix = directoryPrefix.endsWith('/') ? directoryPrefix : `${directoryPrefix}/`;
        dir = dir ? `${cleanPrefix}${dir}` : cleanPrefix.slice(0, -1);
      } else if (directoryMode === 'byCategory') {
        const catSlug = f.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        dir = dir ? `${catSlug}/${dir}` : catSlug;
      } else if (directoryMode === 'flatten') {
        dir = '';
      }

      const newPath = dir ? `${dir}/${name}${ext}` : `${name}${ext}`;
      const isChanged = newPath !== f.path;

      return {
        file: f,
        originalPath: f.path,
        newPath,
        isChanged,
        branch: f.branch,
        category: f.category,
      };
    });

    // 3. Collision Detection (duplicate newPath within same branch)
    const pathBranchSet = new Set<string>();
    const collisions = new Set<string>();

    items.forEach((item) => {
      const key = `${item.branch}:::${item.newPath}`;
      if (pathBranchSet.has(key)) {
        collisions.add(key);
      } else {
        pathBranchSet.add(key);
      }
    });

    const itemsWithCollision = items.map((item) => ({
      ...item,
      hasCollision: collisions.has(`${item.branch}:::${item.newPath}`),
    }));

    return {
      items: itemsWithCollision,
      totalMatched: itemsWithCollision.length,
      totalChanged: itemsWithCollision.filter((i) => i.isChanged).length,
      hasCollisions: collisions.size > 0,
    };
  }, [
    files,
    selectedFiles,
    scope,
    filterCategory,
    filterBranch,
    pathPatternFilter,
    caseTransform,
    prefix,
    suffix,
    findPattern,
    replacePattern,
    isRegex,
    matchCase,
    directoryMode,
    directoryPrefix,
    targetExtension,
    addNumbering,
    numberPadding,
  ]);

  if (!isOpen) return null;

  // Filtered diff list
  const filteredDiffItems = previewData.items.filter((item) => {
    if (!diffSearchQuery) return true;
    const q = diffSearchQuery.toLowerCase();
    return item.originalPath.toLowerCase().includes(q) || item.newPath.toLowerCase().includes(q);
  });

  const handleApply = () => {
    const updatedMap = new Map<string, string>();
    previewData.items.forEach((item) => {
      if (item.isChanged) {
        updatedMap.set(item.file.id, item.newPath);
      }
    });

    const nextFiles = files.map((file) => {
      if (updatedMap.has(file.id)) {
        const nextPath = updatedMap.get(file.id)!;
        const filename = nextPath.split('/').pop() || nextPath;
        return {
          ...file,
          path: nextPath,
          name: filename,
        };
      }
      return file;
    });

    onApplyRenaming(nextFiles);
    onClose();
  };

  // Generate Git MV migration script
  const generateGitScript = () => {
    const lines = [
      '#!/bin/bash',
      `# Batch file rename script generated by GitHub Smart Repository Multi-Indexer`,
      `# Repository: ${snapshot?.fullName || 'repository'}`,
      `# Generated: ${new Date().toISOString()}`,
      '',
    ];

    previewData.items
      .filter((i) => i.isChanged)
      .forEach((i) => {
        // Ensure parent directory exists before git mv
        const lastSlash = i.newPath.lastIndexOf('/');
        if (lastSlash !== -1) {
          const targetDir = i.newPath.substring(0, lastSlash);
          lines.push(`mkdir -p "${targetDir}"`);
        }
        lines.push(`git mv "${i.originalPath}" "${i.newPath}"`);
      });

    return lines.join('\n');
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(generateGitScript());
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadScript = () => {
    const script = generateGitScript();
    const blob = new Blob([script], { type: 'text/x-shellscript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `git_mv_rename_${snapshot?.repo || 'repo'}.sh`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetRules = () => {
    setCaseTransform('none');
    setPrefix('');
    setSuffix('');
    setFindPattern('');
    setReplacePattern('');
    setDirectoryMode('none');
    setDirectoryPrefix('src/');
    setTargetExtension('');
    setAddNumbering(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">
                  Batch File Renaming & Organization Tool
                </h3>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                  TOC Pattern Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Apply standardized naming conventions, case conversions, prefixes, sequential indices, and directory reorganization across indexed tree nodes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Controls, Right Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/50">
          {/* Left Column: Scope & Transformation Rule Controls (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-5 overflow-y-auto max-h-[75vh] bg-white">
            {/* Scope Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. Target Scope</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    scope === 'all'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  All Indexed Files ({files.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  disabled={selectedFiles.length === 0}
                  className={`p-2 rounded-lg border text-left transition-all disabled:opacity-40 ${
                    scope === 'selected'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Selected ({selectedFiles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('category')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    scope === 'category'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  By Category
                </button>
                <button
                  type="button"
                  onClick={() => setScope('regex')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    scope === 'regex'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Regex / Path Pattern
                </button>
              </div>

              {scope === 'category' && (
                <div className="pt-1">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {scope === 'regex' && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={pathPatternFilter}
                    onChange={(e) => setPathPatternFilter(e.target.value)}
                    placeholder="e.g. ^src/components/ or \.(ts|tsx)$"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:border-indigo-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Pattern Transformations */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Naming Conventions & Case</span>
                </span>
                <button
                  onClick={handleResetRules}
                  className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 font-normal"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </label>

              {/* Case Transformation */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Case Conversion
                </label>
                <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
                  {[
                    { id: 'none', label: 'Keep Original' },
                    { id: 'kebab', label: 'kebab-case' },
                    { id: 'snake', label: 'snake_case' },
                    { id: 'camel', label: 'camelCase' },
                    { id: 'pascal', label: 'PascalCase' },
                    { id: 'lower', label: 'lowercase' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCaseTransform(item.id as CaseTransformType)}
                      className={`p-1.5 rounded border text-center transition-all ${
                        caseTransform === item.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prefix & Suffix */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Add Prefix
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g. v2_ or mod_"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Add Suffix
                  </label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="e.g. _legacy"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Find and Replace */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-slate-700 block text-[11px]">
                  Find & Replace Text
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={findPattern}
                    onChange={(e) => setFindPattern(e.target.value)}
                    placeholder="Find string / token"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono text-xs outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    value={replacePattern}
                    onChange={(e) => setReplacePattern(e.target.value)}
                    placeholder="Replace with"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-600 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRegex}
                      onChange={(e) => setIsRegex(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Regular Expression</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={matchCase}
                      onChange={(e) => setMatchCase(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Match Case</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Directory Reorganization & Structure */}
            <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-amber-600" />
                <span>3. Directory Reorganization</span>
              </label>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDirectoryMode('none')}
                    className={`p-2 rounded border text-left transition-all ${
                      directoryMode === 'none'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Keep Folders
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectoryMode('prefix')}
                    className={`p-2 rounded border text-left transition-all ${
                      directoryMode === 'prefix'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Add Folder Prefix
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectoryMode('byCategory')}
                    className={`p-2 rounded border text-left transition-all ${
                      directoryMode === 'byCategory'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Group by Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectoryMode('flatten')}
                    className={`p-2 rounded border text-left transition-all ${
                      directoryMode === 'flatten'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Flatten into Root
                  </button>
                </div>

                {directoryMode === 'prefix' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={directoryPrefix}
                      onChange={(e) => setDirectoryPrefix(e.target.value)}
                      placeholder="e.g. src/ or modules/v2/"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:border-amber-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Numbering Option */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={addNumbering}
                    onChange={(e) => setAddNumbering(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Add Sequential Numbering ({numberPadding === 2 ? '01_' : '001_'})</span>
                </label>
                {addNumbering && (
                  <select
                    value={numberPadding}
                    onChange={(e) => setNumberPadding(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded px-2 py-0.5 text-[11px]"
                  >
                    <option value={2}>2 Digits (01)</option>
                    <option value={3}>3 Digits (001)</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Diff Matrix Preview & Action Bar (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full bg-slate-50/50">
            {/* Diff Summary Bar */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900">
                  Renaming Diff Matrix
                </span>
                <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-100 text-slate-700">
                  {previewData.totalMatched} in scope
                </span>
                <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-100 text-emerald-800 font-bold">
                  {previewData.totalChanged} modified
                </span>
                {previewData.hasCollisions && (
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Path Collisions Detected!
                  </span>
                )}
              </div>

              {/* Filter diff input */}
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={diffSearchQuery}
                  onChange={(e) => setDiffSearchQuery(e.target.value)}
                  placeholder="Filter paths..."
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Diff Table List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[58vh]">
              {filteredDiffItems.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  No files match current scope filter.
                </div>
              ) : (
                filteredDiffItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                      item.hasCollision
                        ? 'bg-rose-50 border-rose-300'
                        : item.isChanged
                        ? 'bg-white border-emerald-200 shadow-xs'
                        : 'bg-white/60 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-slate-400">
                          [{item.branch}]
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                        {item.isChanged && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                            RENAMED
                          </span>
                        )}
                        {item.hasCollision && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1 rounded">
                            COLLISION
                          </span>
                        )}
                      </div>

                      {/* Before / After Paths */}
                      <div className="font-mono text-[11px] flex flex-col sm:flex-row sm:items-center gap-1.5 truncate">
                        <span className="text-slate-500 truncate" title={item.originalPath}>
                          {item.originalPath}
                        </span>
                        {item.isChanged && (
                          <>
                            <ArrowRight className="w-3 h-3 text-emerald-600 shrink-0 hidden sm:inline" />
                            <span className="text-emerald-800 font-bold truncate" title={item.newPath}>
                              {item.newPath}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  disabled={previewData.totalChanged === 0}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200 disabled:opacity-50"
                  title="Copy bash script of 'git mv' commands"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Script Copied' : 'Copy git mv Script'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadScript}
                  disabled={previewData.totalChanged === 0}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200 disabled:opacity-50"
                  title="Download .sh shell script with git mv commands"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Download .sh</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={previewData.totalChanged === 0 || previewData.hasCollisions}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply Renaming to Tree ({previewData.totalChanged})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
