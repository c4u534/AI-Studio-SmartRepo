'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  writeBatch 
} from 'firebase/firestore';
import { 
  GitBranch, 
  Layers, 
  Search, 
  History, 
  FileSpreadsheet, 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HardDrive,
  BookOpen,
  Network,
  Cpu,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { auth, db, googleAuthProvider, handleFirestoreError, OperationType } from '@/lib/firebase';
import { RepoSnapshot, IndexedFile } from '@/lib/types';
import { 
  AgencyExecutionLevel, 
  InstructionSetTemplate, 
  generateAgencyTokenHash, 
  generateDefaultInstructionSet 
} from '@/lib/agency';
import { Header } from '@/components/Header';
import { RepoCrawlerForm } from '@/components/RepoCrawlerForm';
import { TableOfContentsView } from '@/components/TableOfContentsView';
import { ContentSearch } from '@/components/ContentSearch';
import { VersionControlPanel } from '@/components/VersionControlPanel';
import { WorkspaceIntegrations } from '@/components/WorkspaceIntegrations';
import { McpA2APanel } from '@/components/McpA2APanel';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { ReadmeSynthesizer } from '@/components/ReadmeSynthesizer';
import { RepoForceGraph } from '@/components/RepoForceGraph';
import { AgencyPanel } from '@/components/AgencyPanel';
import { DependenciesDashboard } from '@/components/DependenciesDashboard';
import { QuickExportModal } from '@/components/QuickExportModal';
import { UrlListExporterModal } from '@/components/UrlListExporterModal';
import { DatabaseHub } from '@/components/DatabaseHub';
import { AgenticJsonModal } from '@/components/AgenticJsonModal';
import { SandboxIdePanel } from '@/components/SandboxIdePanel';
import { GitHubTokenManager } from '@/components/GitHubTokenManager';
import { generateAgenticConstruct } from '@/lib/agentic-context';
import { openGooglePicker } from '@/lib/workspace';
import { DEFAULT_SAMPLE_SNAPSHOT, DEFAULT_SAMPLE_FILES } from '@/lib/sampleData';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('database');
  const [isAgenticModalOpen, setIsAgenticModalOpen] = useState<boolean>(false);
  const [isPersistingToFirestore, setIsPersistingToFirestore] = useState<boolean>(false);
  
  // GitHub PAT Token State
  const [gitHubToken, setGitHubToken] = useState<string>('');
  const [isTokenManagerOpen, setIsTokenManagerOpen] = useState<boolean>(false);

  // Crawler and Repository State
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  const [crawlProgress, setCrawlProgress] = useState<string>('');
  const [activeSnapshot, setActiveSnapshot] = useState<RepoSnapshot | null>(DEFAULT_SAMPLE_SNAPSHOT);
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>(DEFAULT_SAMPLE_FILES);
  const [historicalSnapshots, setHistoricalSnapshots] = useState<RepoSnapshot[]>([DEFAULT_SAMPLE_SNAPSHOT]);

  // Agency Execution State
  const [agencyLevel, setAgencyLevel] = useState<AgencyExecutionLevel>('hybrid');
  const [activeAgencies, setActiveAgencies] = useState<string[]>([
    'ast_refactorer',
    'cross_branch_synthesizer',
    'dep_vulnerability_auditor',
    'schema_db_classifier',
    'api_surface_mapper',
    'mcp_protocol_transformer'
  ]);
  const [agencyTokenHash, setAgencyTokenHash] = useState<string>('');
  const [instructionSet, setInstructionSet] = useState<InstructionSetTemplate | null>(null);

  // File Selection State for URL Exporter & Batch Ops
  const [selectedFiles, setSelectedFiles] = useState<IndexedFile[]>([]);
  const [isQuickExportOpen, setIsQuickExportOpen] = useState<boolean>(false);
  const [isUrlExporterOpen, setIsUrlExporterOpen] = useState<boolean>(false);
  const [urlExportFiles, setUrlExportFiles] = useState<IndexedFile[]>([]);
  
  // File inspection modal
  const [previewFile, setPreviewFile] = useState<IndexedFile | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Load PAT from local storage if previously saved
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('github_pat_token');
      if (saved) {
        setGitHubToken(saved);
      }
    }
  }, []);

  // Direct update of an existing file in the active snapshot
  const handleDirectUpdateFile = useCallback((updatedFile: IndexedFile) => {
    setIndexedFiles((prev) => 
      prev.map((f) => (f.path === updatedFile.path ? updatedFile : f))
    );
    notify('success', `Directly updated "${updatedFile.path}" in active repository snapshot.`);
  }, []);

  // Add evolved modular construct to repository indexed tree
  const handleAddConstructToFileTree = useCallback((newFile: IndexedFile) => {
    setIndexedFiles((prev) => [newFile, ...prev]);
    setActiveSnapshot((prev) => prev ? { ...prev, totalFiles: prev.totalFiles + 1 } : prev);
    notify('success', `Added modular construct "${newFile.path}" to repository index tree.`);
  }, []);

  // Show auto-dismiss notifications
  const notify = useCallback((type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Load Files for a snapshot from Firestore subcollection
  const loadSnapshotFiles = useCallback(async (snapshotId: string) => {
    try {
      const q = query(collection(db, 'repo_snapshots', snapshotId, 'files'));
      const querySnapshot = await getDocs(q);
      const filesList: IndexedFile[] = [];
      querySnapshot.forEach((d) => {
        filesList.push(d.data() as IndexedFile);
      });
      if (filesList.length > 0) {
        setIndexedFiles(filesList);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, `repo_snapshots/${snapshotId}/files`);
    }
  }, []);

  // Load User's Repository Snapshots from Firestore
  const loadUserSnapshots = useCallback(async (userId: string) => {
    try {
      const q = query(
        collection(db, 'repo_snapshots'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const list: RepoSnapshot[] = [];
      querySnapshot.forEach((d) => {
        list.push(d.data() as RepoSnapshot);
      });

      if (list.length > 0) {
        setHistoricalSnapshots(list);
        setActiveSnapshot((prev) => {
          if (!prev) {
            loadSnapshotFiles(list[0].id);
            return list[0];
          }
          return prev;
        });
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, 'repo_snapshots');
    }
  }, [loadSnapshotFiles]);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadUserSnapshots(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [loadUserSnapshots]);

  // Google Sign In with OAuth Workspace Scopes
  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      } else {
        const token = (result as any)._tokenResponse?.oauthAccessToken;
        if (token) {
          setAccessToken(token);
        }
      }
      notify('success', `Signed in as ${result.user.displayName || result.user.email}`);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      notify('error', `Sign in failed: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAccessToken(null);
      notify('info', 'Signed out of Google account');
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // Save Snapshot to Firestore
  const saveSnapshotToFirestore = async (snapshot: RepoSnapshot, files: IndexedFile[]) => {
    if (!user) return;
    try {
      const snapshotWithUser: RepoSnapshot = {
        ...snapshot,
        userId: user.uid,
        userEmail: user.email || '',
      };

      // 1. Save root snapshot document
      await setDoc(doc(db, 'repo_snapshots', snapshot.id), snapshotWithUser);

      // 2. Batch write up to 150 top files to subcollection
      const batch = writeBatch(db);
      files.slice(0, 150).forEach((file) => {
        const fileRef = doc(db, 'repo_snapshots', snapshot.id, 'files', file.id);
        batch.set(fileRef, {
          ...file,
          userId: user.uid,
        });
      });
      await batch.commit();

      setHistoricalSnapshots((prev) => [snapshotWithUser, ...prev.filter((s) => s.id !== snapshot.id)]);
      notify('success', `Snapshot ${snapshot.versionTag} backed up to persistent database.`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `repo_snapshots/${snapshot.id}`);
    }
  };

  // Complete Firestore Persistence of All Parsings & Agent Context
  const handlePersistToFirestore = async () => {
    if (!activeSnapshot) return;
    setIsPersistingToFirestore(true);
    try {
      const construct = generateAgenticConstruct(activeSnapshot, indexedFiles, {
        isSyncedWithFirestore: true
      });
      const snapshotToSave: RepoSnapshot = {
        ...activeSnapshot,
        userId: user?.uid || 'authenticated_session',
        userEmail: user?.email || 'user@example.com',
        updatedAt: new Date().toISOString(),
        agenticContext: JSON.stringify(construct.architecture),
        manifestSummary: JSON.stringify(construct.dependencies),
      };

      // 1. Persist master snapshot document
      await setDoc(doc(db, 'repo_snapshots', activeSnapshot.id), snapshotToSave);

      // 2. Batch write indexed files subcollection
      const batch = writeBatch(db);
      indexedFiles.slice(0, 150).forEach((file) => {
        const fileRef = doc(db, 'repo_snapshots', activeSnapshot.id, 'files', file.id);
        batch.set(fileRef, {
          ...file,
          userId: user?.uid || 'authenticated_session',
        });
      });
      await batch.commit();

      setActiveSnapshot(snapshotToSave);
      setHistoricalSnapshots((prev) => [snapshotToSave, ...prev.filter((s) => s.id !== activeSnapshot.id)]);
      notify('success', `Repository ${activeSnapshot.fullName} and ${indexedFiles.length} files successfully persisted to Firestore database!`);
    } catch (err: any) {
      console.error('Failed to persist parsing run to Firestore:', err);
      notify('error', `Firestore persistence error: ${err.message || err}`);
    } finally {
      setIsPersistingToFirestore(false);
    }
  };

  // Trigger Repository Crawl
  const handleStartCrawl = async ({
    repoUrl,
    prioritizedBranches,
    githubToken,
    indexAllBranches,
  }: {
    repoUrl: string;
    prioritizedBranches: string[];
    githubToken?: string;
    indexAllBranches: boolean;
  }) => {
    setIsCrawling(true);
    setCrawlProgress('Initiating multi-tier crawler and analyzing repo starting location...');

    try {
      setCrawlProgress(`Parsing branches and ordering priority queue [${prioritizedBranches.join(', ')}]...`);

      const res = await fetch('/api/github/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          prioritizedBranches,
          githubToken,
          indexAllBranches,
          agencyLevel,
          agencyTokenHash,
          instructionSet,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Crawler failed with status ${res.status}`);
      }

      setCrawlProgress('Synthesizing categorized file tree and collating README documents...');
      const data = await res.json();

      const newSnapshot: RepoSnapshot = {
        ...data.snapshot,
        userId: user?.uid || '',
        userEmail: user?.email || '',
      };

      setActiveSnapshot(newSnapshot);
      setIndexedFiles(data.files || []);
      setHistoricalSnapshots((prev) => [newSnapshot, ...prev.filter((s) => s.id !== newSnapshot.id)]);
      if (data.agencyTokenHash) {
        setAgencyTokenHash(data.agencyTokenHash);
      }

      // If user is authenticated, persist in cloud Firestore
      if (user) {
        await saveSnapshotToFirestore(newSnapshot, data.files || []);
      }

      notify('success', `Indexed ${data.files?.length || 0} files across ${newSnapshot.indexedBranches.length} branches!`);
      setActiveTab('toc');
    } catch (err: any) {
      console.error('Crawl failure:', err);
      notify('error', err.message || 'Crawl failed');
    } finally {
      setIsCrawling(false);
      setCrawlProgress('');
    }
  };

  // Multi-file selection handlers for URL export
  const handleToggleSelectFile = useCallback((file: IndexedFile) => {
    setSelectedFiles((prev) => {
      const exists = prev.some((f) => f.id === file.id);
      if (exists) {
        return prev.filter((f) => f.id !== file.id);
      } else {
        return [...prev, file];
      }
    });
  }, []);

  const handleSelectMultipleFiles = useCallback((filesToSelect: IndexedFile[]) => {
    setSelectedFiles((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      filesToSelect.forEach((f) => map.set(f.id, f));
      return Array.from(map.values());
    });
  }, []);

  const handleDeselectMultipleFiles = useCallback((filesToDeselect: IndexedFile[]) => {
    const idsToRemove = new Set(filesToDeselect.map((f) => f.id));
    setSelectedFiles((prev) => prev.filter((f) => !idsToRemove.has(f.id)));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const handleOpenUrlExporterForSelected = useCallback(() => {
    if (selectedFiles.length === 0 && indexedFiles.length > 0) {
      setUrlExportFiles(indexedFiles);
    } else {
      setUrlExportFiles(selectedFiles);
    }
    setIsUrlExporterOpen(true);
  }, [selectedFiles, indexedFiles]);

  // Version Revert Action
  const handleRevertToSnapshot = (snapshot: RepoSnapshot) => {
    setActiveSnapshot(snapshot);
    loadSnapshotFiles(snapshot.id);
    notify('info', `Reverted active workspace to version ${snapshot.versionTag} (${snapshot.commitMessage})`);
    setActiveTab('toc');
  };

  // Tag New Version Checkpoint Action
  const handleCreateSnapshotTag = async (tag: string, message: string) => {
    if (!activeSnapshot) return;
    const newSnapshot: RepoSnapshot = {
      ...activeSnapshot,
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      versionTag: tag,
      commitMessage: message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveSnapshot(newSnapshot);
    setHistoricalSnapshots((prev) => [newSnapshot, ...prev]);

    if (user) {
      await saveSnapshotToFirestore(newSnapshot, indexedFiles);
    }
    notify('success', `Created version tag ${tag}`);
  };

  // Update Snapshot Links (Google Sheet, Doc, Drive)
  const handleUpdateSnapshotLinks = async (updates: {
    googleSheetId?: string;
    googleSheetUrl?: string;
    googleDocId?: string;
    googleDocUrl?: string;
    googleDriveFolderId?: string;
  }) => {
    if (!activeSnapshot) return;
    const updated: RepoSnapshot = {
      ...activeSnapshot,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setActiveSnapshot(updated);
    setHistoricalSnapshots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

    if (user) {
      try {
        await setDoc(doc(db, 'repo_snapshots', updated.id), updated, { merge: true });
      } catch (e: any) {
        handleFirestoreError(e, OperationType.UPDATE, `repo_snapshots/${updated.id}`);
      }
    }
  };

  // Google Picker Launcher from Header
  const handleOpenPickerFromHeader = async () => {
    if (!accessToken) {
      handleSignIn();
      return;
    }
    try {
      await openGooglePicker({
        accessToken,
        viewType: 'all',
        onPick: (file) => {
          notify('success', `Selected "${file.name}" via Google Picker`);
          setActiveTab('workspace');
        },
      });
    } catch (err: any) {
      notify('error', err.message || 'Google Picker failed to launch');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Persistent App Header */}
      <Header
        user={user}
        activeSnapshot={activeSnapshot}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPicker={handleOpenPickerFromHeader}
        onOpenQuickExport={() => setIsQuickExportOpen(true)}
        gitHubToken={gitHubToken}
        onOpenTokenManager={() => setIsTokenManagerOpen(true)}
      />

      {/* Floating Notification Banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-medium ${
              notification.type === 'success'
                ? 'bg-white border-emerald-300 text-emerald-800'
                : notification.type === 'error'
                ? 'bg-white border-rose-300 text-rose-800'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Responsive Body Container with Framer Motion transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full"
          >
            {/* Tab 1: Universal Crawler & Branch Prioritization */}
            {activeTab === 'indexer' && (
              <div className="space-y-6">
                <RepoCrawlerForm
                  onStartCrawl={handleStartCrawl}
                  isLoading={isCrawling}
                  crawlProgress={crawlProgress}
                  githubToken={gitHubToken}
                  onOpenTokenManager={() => setIsTokenManagerOpen(true)}
                />

                {/* If snapshot exists, show quick summary metrics */}
                {activeSnapshot && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono shadow-sm">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Active Repository</span>
                      <strong className="text-slate-900 font-sans text-sm">{activeSnapshot.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Prioritized Branches</span>
                      <span className="text-amber-700 font-semibold">{activeSnapshot.prioritizedBranches.join(', ') || 'Default only'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Indexed Files</span>
                      <span className="text-emerald-700 font-bold">{activeSnapshot.totalFiles} files</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Version Tag</span>
                      <span className="text-sky-700 font-bold">{activeSnapshot.versionTag}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Dependencies Manifest Parsing & Conflict Analysis Dashboard */}
            {activeTab === 'dependencies' && (
              <DependenciesDashboard
                files={indexedFiles}
                snapshot={activeSnapshot}
                onPreviewFile={(file) => setPreviewFile(file)}
              />
            )}

            {/* Tab 2: Categorical Table of Contents & Branch Matrix */}
            {activeTab === 'toc' && (
              <TableOfContentsView
                snapshot={activeSnapshot}
                files={indexedFiles}
                onPreviewFile={(file) => setPreviewFile(file)}
                selectedFiles={selectedFiles}
                onToggleSelectFile={handleToggleSelectFile}
                onSelectMultipleFiles={handleSelectMultipleFiles}
                onDeselectMultipleFiles={handleDeselectMultipleFiles}
                onClearSelection={handleClearSelection}
                onOpenUrlExporter={handleOpenUrlExporterForSelected}
                onOpenQuickExport={() => setIsQuickExportOpen(true)}
              />
            )}

            {/* Tab 3: Content Search across files & branches */}
            {activeTab === 'search' && (
              <ContentSearch
                files={indexedFiles}
                activeSnapshot={activeSnapshot}
                onPreviewFile={(file) => setPreviewFile(file)}
              />
            )}

            {/* Tab 4: README Synthesizer & Multi-Branch Collator */}
            {activeTab === 'readme' && (
              <ReadmeSynthesizer
                snapshot={activeSnapshot}
                files={indexedFiles}
                accessToken={accessToken}
                onRequireSignIn={handleSignIn}
                onPreviewFile={(file) => setPreviewFile(file)}
              />
            )}

            {/* Tab 5: Interactive D3 Force-Directed Repository Graph */}
            {activeTab === 'graph' && (
              <RepoForceGraph
                snapshot={activeSnapshot}
                files={indexedFiles}
                onPreviewFile={(file) => setPreviewFile(file)}
              />
            )}

            {/* Tab 6: 10-Level Agency Engine & Instruction Sets */}
            {activeTab === 'agency' && (
              <AgencyPanel
                snapshot={activeSnapshot}
                user={user}
                onSaveInstructionSet={(inst) => {
                  setInstructionSet(inst);
                  setAgencyLevel(inst.agencyLevel);
                  setActiveAgencies(inst.activeAgencies);
                  setAgencyTokenHash(inst.agencyTokenHash);
                  notify('success', `Agency instruction set "${inst.name}" applied with token ${inst.agencyTokenHash.substring(0, 16)}...`);
                }}
              />
            )}

            {/* Tab 7: Version Control & Historical Snapshots */}
            {activeTab === 'versioning' && (
              <VersionControlPanel
                snapshots={historicalSnapshots}
                activeSnapshot={activeSnapshot}
                onRevertToSnapshot={handleRevertToSnapshot}
                onCreateSnapshotTag={handleCreateSnapshotTag}
                files={indexedFiles}
              />
            )}

            {/* Tab: Database, Agentic Context & Drive Archive Hub */}
            {activeTab === 'database' && (
              <DatabaseHub
                snapshot={activeSnapshot}
                files={indexedFiles}
                historicalSnapshots={historicalSnapshots}
                onSelectHistoricalSnapshot={(snapId) => {
                  const target = historicalSnapshots.find((s) => s.id === snapId);
                  if (target) {
                    setActiveSnapshot(target);
                    loadSnapshotFiles(target.id);
                    notify('info', `Loaded databased snapshot: ${target.versionTag}`);
                  }
                }}
                accessToken={accessToken}
                onOpenSignIn={handleSignIn}
                onPersistToFirestore={handlePersistToFirestore}
                isPersisting={isPersistingToFirestore}
                onOpenAgenticModal={() => setIsAgenticModalOpen(true)}
                onUpdateSnapshotLinks={handleUpdateSnapshotLinks}
              />
            )}

            {/* Tab 8: Google Workspace Integration (Sheets, Docs, Drive, Picker) */}
            {activeTab === 'workspace' && (
              <WorkspaceIntegrations
                accessToken={accessToken}
                snapshot={activeSnapshot}
                files={indexedFiles}
                onUpdateSnapshotLinks={handleUpdateSnapshotLinks}
                onOpenSignIn={handleSignIn}
                onOpenAgenticModal={() => setIsAgenticModalOpen(true)}
              />
            )}

            {/* Tab: Secure IDE Sandbox, Process/Connection Telemetry & Modular Assembly */}
            {activeTab === 'sandbox' && (
              <SandboxIdePanel
                files={indexedFiles}
                snapshot={activeSnapshot}
                onPreviewFile={(file) => setPreviewFile(file)}
                onDirectUpdateFile={handleDirectUpdateFile}
                onAddConstructToFileTree={handleAddConstructToFileTree}
              />
            )}

            {/* Tab 9: Model Context Protocol (MCP) & Agent-to-Agent (A2A) Gateway */}
            {activeTab === 'mcp' && (
              <McpA2APanel
                snapshot={activeSnapshot}
                files={indexedFiles}
                onOpenAgenticModal={() => setIsAgenticModalOpen(true)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* GitHub Personal Access Token (PAT) Manager Modal */}
      {isTokenManagerOpen && (
        <GitHubTokenManager
          token={gitHubToken}
          onTokenChange={(tok) => {
            setGitHubToken(tok);
            notify('success', tok ? 'GitHub Personal Access Token updated & verified' : 'GitHub Token cleared');
          }}
          isOpen={isTokenManagerOpen}
          onClose={() => setIsTokenManagerOpen(false)}
        />
      )}

      {/* Thorough Agentic JSON Construct Modal */}
      {isAgenticModalOpen && activeSnapshot && (
        <AgenticJsonModal
          isOpen={isAgenticModalOpen}
          onClose={() => setIsAgenticModalOpen(false)}
          snapshot={activeSnapshot}
          files={indexedFiles}
          accessToken={accessToken}
          onOpenSignIn={handleSignIn}
          onDriveExported={(link) => notify('success', `Exported Agentic JSON to Google Drive!`)}
        />
      )}

      {/* Quick Export to Google Drive Modal */}
      {isQuickExportOpen && activeSnapshot && (
        <QuickExportModal
          snapshot={activeSnapshot}
          files={indexedFiles}
          accessToken={accessToken}
          onClose={() => setIsQuickExportOpen(false)}
          onOpenSignIn={handleSignIn}
          onSuccess={(fileTitle) => {
            notify('success', `Exported "${fileTitle}" to Google Drive`);
          }}
        />
      )}

      {/* Multi-Option URL List Exporter Modal */}
      {isUrlExporterOpen && activeSnapshot && (
        <UrlListExporterModal
          snapshot={activeSnapshot}
          selectedFiles={urlExportFiles.length > 0 ? urlExportFiles : indexedFiles}
          accessToken={accessToken}
          onClose={() => setIsUrlExporterOpen(false)}
          onOpenSignIn={handleSignIn}
          onExportComplete={(format) => {
            notify('success', `Exported URLs via ${format.toUpperCase()}`);
          }}
        />
      )}

      {/* Code Inspector / File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
