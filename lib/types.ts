export type FileCategory = 
  | 'Documentation'
  | 'Source Code'
  | 'Architecture & Config'
  | 'Tests'
  | 'UI & Styles'
  | 'Build & DevOps'
  | 'Data & Assets';

export interface IndexedFile {
  id: string;
  path: string;
  branch: string;
  size: number;
  type: 'blob' | 'tree' | 'file';
  sha: string;
  category: FileCategory;
  language: string;
  contentSnippet?: string;
  content?: string;
  isReadme: boolean;
  lineCount?: number;
  snapshotId: string;
  userId: string;
  rawUrl?: string;
}

export interface BranchInfo {
  name: string;
  sha: string;
  isDefault: boolean;
  isPrioritized: boolean;
  fileCount: number;
  totalBytes: number;
}

export interface CategorySummary {
  category: FileCategory;
  count: number;
  totalBytes: number;
}

export interface RepoSnapshot {
  id: string;
  owner: string;
  repo: string;
  fullName: string; // e.g. "facebook/react"
  rootUrl: string;
  detectedOriginPath?: string; // If crawled from subfolder/blob
  description: string;
  defaultBranch: string;
  versionTag: string; // e.g. "v1.0.0"
  commitMessage: string;
  prioritizedBranches: string[];
  indexedBranches: string[];
  totalFiles: number;
  totalSize: number;
  totalBranches: number;
  categories: Record<string, number>;
  readmeContent?: string;
  googleSheetId?: string;
  googleSheetUrl?: string;
  googleDocId?: string;
  googleDocUrl?: string;
  googleDriveFolderId?: string;
  googleDriveFolderName?: string;
  driveAllResultsUrl?: string;
  agenticContext?: string;
  manifestSummary?: string;
  userId: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchMatch {
  file: IndexedFile;
  matchCount: number;
  matchingLines: {
    lineNumber: number;
    text: string;
  }[];
  snippet: string;
}

export interface DiffResult {
  addedFiles: IndexedFile[];
  removedFiles: IndexedFile[];
  modifiedFiles: {
    path: string;
    branch: string;
    oldSize: number;
    newSize: number;
    oldSha: string;
    newSha: string;
  }[];
  sizeDifference: number;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ContributorStat {
  login: string;
  avatarUrl: string;
  contributions: number;
  htmlUrl: string;
  type?: string;
}

export interface CommitActivityPoint {
  week: number;
  total: number;
  days: number[];
  label?: string;
}

export interface RecentCommit {
  sha: string;
  message: string;
  authorName: string;
  authorLogin?: string;
  authorAvatar?: string;
  date: string;
  htmlUrl: string;
}

export interface PullRequestMetric {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  createdAt: string;
  closedAt?: string;
  mergedAt?: string;
  userLogin: string;
  userAvatar?: string;
  htmlUrl: string;
  timeToMergeHours?: number;
}

export interface RepoInsightsData {
  owner: string;
  repo: string;
  fetchedAt: string;
  isMockOrFallback?: boolean;
  contributors: ContributorStat[];
  totalContributors: number;
  commitActivity: CommitActivityPoint[];
  recentCommits: RecentCommit[];
  recentPRs: PullRequestMetric[];
  velocity: {
    totalAnalyzedPRs: number;
    openCount: number;
    closedCount: number;
    mergedCount: number;
    mergeRatePercent: number;
    meanTimeToMergeHours: number;
    avgCommitsPerWeek: number;
  };
}
