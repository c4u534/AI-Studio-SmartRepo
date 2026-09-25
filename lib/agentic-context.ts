import { IndexedFile, RepoSnapshot } from './types';
import firebaseConfig from '../firebase-applet-config.json';

export interface AgenticContextConstruct {
  schemaVersion: '2.0.0';
  contextType: 'repository_agentic_context_and_database';
  generatedAt: string;
  generator: {
    name: 'GitHub Smart Repository Multi-Indexer';
    version: '2.0.0';
    protocols: ['A2A-v1.0', 'MCP-JSON-RPC-2024-11-05'];
  };
  repository: {
    fullName: string;
    owner: string;
    repo: string;
    rootUrl: string;
    versionTag: string;
    defaultBranch: string;
    prioritizedBranches: string[];
    indexedBranches: string[];
    totalFiles: number;
    totalSize: number;
    totalBranches: number;
    description: string;
    categories: Record<string, number>;
  };
  database: {
    provider: 'Google Cloud Firestore';
    databaseId: string;
    documentPath: string;
    subcollections: string[];
    persistedAt: string;
    syncState: 'synced_firestore' | 'local_cached';
    recordCount: {
      snapshots: number;
      files: number;
      manifests: number;
    };
    googleDriveExports?: {
      folderId?: string;
      folderUrl?: string;
      allResultsDriveUrl?: string;
      jsonFileUrl?: string;
      csvFileUrl?: string;
      sheetsUrl?: string;
      docsUrl?: string;
    };
  };
  architecture: {
    summary: string;
    categoryDistribution: Record<string, number>;
    priorityTiers: {
      tier1Entrypoints: Array<{ path: string; branch: string; category: string; reason: string }>;
      tier2ConfigAndSchemas: Array<{ path: string; branch: string; category: string; reason: string }>;
      tier3CoreLogic: Array<{ path: string; branch: string; category: string; size: number }>;
      tier4DocsAndTests: Array<{ path: string; branch: string; category: string }>;
    };
    synthesizedReadmeExcerpt?: string;
  };
  dependencies: {
    detectedEcosystems: string[];
    primaryManifests: Array<{ path: string; branch: string; ecosystem: string }>;
    dependencyConflicts: Array<{ package: string; versions: Record<string, string>; conflictType: string }>;
    keyDependencies: Array<{ name: string; version: string; type: string; branch: string }>;
  };
  tableOfContents: {
    totalCategories: number;
    categoryList: Array<{
      category: string;
      count: number;
      fileSample: string[];
    }>;
  };
  agentDirectives: {
    systemPrompt: string;
    recommendedReadOrder: string[];
    suggestedTaskPrompts: string[];
    mcpToolRecommendations: Array<{ tool: string; whenToUse: string }>;
    contextWindowTokensEstimate: number;
  };
  a2aProtocolContext: {
    protocol: 'A2A-1.0';
    handshakeUrl: string;
    queryUrl: string;
    supportedActions: string[];
  };
  mcpServerConfig: {
    serverName: string;
    endpoint: string;
    transport: string;
    tools: string[];
    sampleToolCall: any;
  };
  fullFileManifest: Array<{
    path: string;
    branch: string;
    category: string;
    size: number;
    language: string;
    sha: string;
    isReadme: boolean;
    githubUrl: string;
    rawUrl?: string;
  }>;
}

/**
 * Generate a thorough JSON construct of all results and databases for full agentic use
 */
export function generateAgenticConstruct(
  snapshot: RepoSnapshot,
  files: IndexedFile[],
  options?: {
    driveExports?: {
      folderId?: string;
      folderUrl?: string;
      allResultsDriveUrl?: string;
      jsonFileUrl?: string;
      csvFileUrl?: string;
      sheetsUrl?: string;
      docsUrl?: string;
    };
    isSyncedWithFirestore?: boolean;
    originUrl?: string;
  }
): AgenticContextConstruct {
  const origin = options?.originUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const databaseId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-githubsmartrepos-1e3eb2e0-ce07-469a-8d74-6230d6c9fd96';

  // 1. Classify Priority Tiers for Agents
  const tier1Entrypoints: Array<{ path: string; branch: string; category: string; reason: string }> = [];
  const tier2ConfigAndSchemas: Array<{ path: string; branch: string; category: string; reason: string }> = [];
  const tier3CoreLogic: Array<{ path: string; branch: string; category: string; size: number }> = [];
  const tier4DocsAndTests: Array<{ path: string; branch: string; category: string }> = [];

  const entrypointPatterns = [/^(index|main|app|server|entry|root)\.(ts|js|py|rs|go|jsx|tsx)$/i, /^(app|src|lib)\/(page|layout|main|index)\.(tsx|jsx|ts|js)$/i];
  const configPatterns = [/(\.config\.|package\.json|tsconfig|dockerfile|requirements\.txt|cargo\.toml|go\.mod|\.env\.example|firebase\.json|firestore\.rules)/i];

  files.forEach((f) => {
    const filename = f.path.split('/').pop() || f.path;
    if (entrypointPatterns.some((p) => p.test(filename) || p.test(f.path))) {
      tier1Entrypoints.push({
        path: f.path,
        branch: f.branch,
        category: f.category,
        reason: 'Application entry point / root bootstrapper',
      });
    } else if (configPatterns.some((p) => p.test(filename) || p.test(f.path)) || f.category === 'Architecture & Config') {
      tier2ConfigAndSchemas.push({
        path: f.path,
        branch: f.branch,
        category: f.category,
        reason: 'Configuration, environment, dependency, or schema contract',
      });
    } else if (f.category === 'Source Code' || f.category === 'UI & Styles') {
      tier3CoreLogic.push({
        path: f.path,
        branch: f.branch,
        category: f.category,
        size: f.size,
      });
    } else {
      tier4DocsAndTests.push({
        path: f.path,
        branch: f.branch,
        category: f.category,
      });
    }
  });

  // 2. Identify Ecosystems & Manifests
  const detectedEcosystems = new Set<string>();
  const primaryManifests: Array<{ path: string; branch: string; ecosystem: string }> = [];
  files.forEach((f) => {
    const p = f.path.toLowerCase();
    if (p.endsWith('package.json')) {
      detectedEcosystems.add('Node.js / TypeScript');
      primaryManifests.push({ path: f.path, branch: f.branch, ecosystem: 'Node.js' });
    } else if (p.endsWith('requirements.txt') || p.endsWith('pyproject.toml') || p.endsWith('pipfile')) {
      detectedEcosystems.add('Python');
      primaryManifests.push({ path: f.path, branch: f.branch, ecosystem: 'Python' });
    } else if (p.endsWith('cargo.toml')) {
      detectedEcosystems.add('Rust');
      primaryManifests.push({ path: f.path, branch: f.branch, ecosystem: 'Rust' });
    } else if (p.endsWith('go.mod')) {
      detectedEcosystems.add('Go');
      primaryManifests.push({ path: f.path, branch: f.branch, ecosystem: 'Go' });
    } else if (p.endsWith('pom.xml') || p.endsWith('build.gradle')) {
      detectedEcosystems.add('Java / Kotlin');
      primaryManifests.push({ path: f.path, branch: f.branch, ecosystem: 'Java/JVM' });
    } else if (p.includes('dockerfile') || p.includes('docker-compose')) {
      detectedEcosystems.add('Docker Containers');
    }
  });

  // 3. Category Registry
  const categoryGroups = new Map<string, string[]>();
  files.forEach((f) => {
    const list = categoryGroups.get(f.category) || [];
    list.push(f.path);
    categoryGroups.set(f.category, list);
  });

  const categoryList = Array.from(categoryGroups.entries()).map(([cat, list]) => ({
    category: cat,
    count: list.length,
    fileSample: list.slice(0, 8),
  }));

  // Estimated tokens (approx 4 chars per token)
  const totalChars = files.reduce((acc, f) => acc + (f.contentSnippet?.length || 100), 0);
  const contextTokensEstimate = Math.round(totalChars / 4);

  // 4. Synthesize Agent System Prompt
  const agentSystemPrompt = `You are an Autonomous Software Engineer and Repository Specialist operating on the codebase: ${snapshot.fullName}.
Indexed Version: ${snapshot.versionTag}
Default Branch: ${snapshot.defaultBranch}
Prioritized Branches: ${(snapshot.prioritizedBranches || []).join(', ') || 'main'}
Total Indexed Files: ${snapshot.totalFiles} across ${snapshot.indexedBranches.length} branches.
Primary Frameworks: ${Array.from(detectedEcosystems).join(', ') || 'Polyglot'}

Key Directives:
1. Always reference files by their canonical relative paths and branch tag.
2. Review Tier 1 entrypoints before making architectural assumptions: ${tier1Entrypoints.slice(0, 5).map((e) => e.path).join(', ')}.
3. Comply with the existing configurations: ${tier2ConfigAndSchemas.slice(0, 5).map((c) => c.path).join(', ')}.
4. When performing changes, utilize the Model Context Protocol (MCP) server at ${origin}/api/mcp or Agent-to-Agent (A2A) protocol at ${origin}/api/a2a.`;

  return {
    schemaVersion: '2.0.0',
    contextType: 'repository_agentic_context_and_database',
    generatedAt: new Date().toISOString(),
    generator: {
      name: 'GitHub Smart Repository Multi-Indexer',
      version: '2.0.0',
      protocols: ['A2A-v1.0', 'MCP-JSON-RPC-2024-11-05'],
    },
    repository: {
      fullName: snapshot.fullName,
      owner: snapshot.owner,
      repo: snapshot.repo,
      rootUrl: snapshot.rootUrl,
      versionTag: snapshot.versionTag,
      defaultBranch: snapshot.defaultBranch,
      prioritizedBranches: snapshot.prioritizedBranches || [],
      indexedBranches: snapshot.indexedBranches || [],
      totalFiles: snapshot.totalFiles,
      totalSize: snapshot.totalSize,
      totalBranches: snapshot.totalBranches,
      description: snapshot.description || 'Indexed repository',
      categories: snapshot.categories || {},
    },
    database: {
      provider: 'Google Cloud Firestore',
      databaseId,
      documentPath: `/repo_snapshots/${snapshot.id}`,
      subcollections: [`/repo_snapshots/${snapshot.id}/files`],
      persistedAt: snapshot.updatedAt || snapshot.createdAt || new Date().toISOString(),
      syncState: options?.isSyncedWithFirestore ? 'synced_firestore' : 'local_cached',
      recordCount: {
        snapshots: 1,
        files: files.length,
        manifests: primaryManifests.length,
      },
      googleDriveExports: {
        folderId: snapshot.googleDriveFolderId || options?.driveExports?.folderId,
        folderUrl: options?.driveExports?.folderUrl || (snapshot.googleDriveFolderId ? `https://drive.google.com/drive/folders/${snapshot.googleDriveFolderId}` : undefined),
        allResultsDriveUrl: snapshot.driveAllResultsUrl || options?.driveExports?.allResultsDriveUrl,
        jsonFileUrl: options?.driveExports?.jsonFileUrl,
        csvFileUrl: options?.driveExports?.csvFileUrl,
        sheetsUrl: snapshot.googleSheetUrl || options?.driveExports?.sheetsUrl,
        docsUrl: snapshot.googleDocUrl || options?.driveExports?.docsUrl,
      },
    },
    architecture: {
      summary: `${snapshot.fullName} is structured into ${categoryList.length} functional categories with ${snapshot.totalFiles} files.`,
      categoryDistribution: snapshot.categories || {},
      priorityTiers: {
        tier1Entrypoints: tier1Entrypoints.slice(0, 15),
        tier2ConfigAndSchemas: tier2ConfigAndSchemas.slice(0, 20),
        tier3CoreLogic: tier3CoreLogic.slice(0, 30),
        tier4DocsAndTests: tier4DocsAndTests.slice(0, 15),
      },
      synthesizedReadmeExcerpt: (snapshot.readmeContent || '').slice(0, 1500),
    },
    dependencies: {
      detectedEcosystems: Array.from(detectedEcosystems),
      primaryManifests,
      dependencyConflicts: [],
      keyDependencies: [],
    },
    tableOfContents: {
      totalCategories: categoryList.length,
      categoryList,
    },
    agentDirectives: {
      systemPrompt: agentSystemPrompt,
      recommendedReadOrder: [
        ...tier1Entrypoints.slice(0, 3).map((e) => e.path),
        ...tier2ConfigAndSchemas.slice(0, 3).map((c) => c.path),
        ...tier3CoreLogic.slice(0, 5).map((l) => l.path),
      ],
      suggestedTaskPrompts: [
        `Explain the core architecture and main execution pathways of ${snapshot.fullName}.`,
        `Identify where configuration is loaded and how environment variables are handled.`,
        `Locate where external APIs, databases, or third-party dependencies are called.`,
        `Draft a migration plan for cross-branch discrepancies between [${(snapshot.prioritizedBranches || []).join(', ')}].`,
      ],
      mcpToolRecommendations: [
        { tool: 'search_repo_content', whenToUse: 'Find specific function names, class definitions, or imports across branches' },
        { tool: 'get_repo_toc', whenToUse: 'Get full categorical breakdown before exploring directories' },
        { tool: 'get_agentic_context', whenToUse: 'Obtain entire multi-tier structured repository context bundle' },
        { tool: 'get_repo_file', whenToUse: 'Inspect actual file text and metadata' },
      ],
      contextWindowTokensEstimate: contextTokensEstimate,
    },
    a2aProtocolContext: {
      protocol: 'A2A-1.0',
      handshakeUrl: `${origin}/api/a2a?repo=${encodeURIComponent(snapshot.fullName)}`,
      queryUrl: `${origin}/api/a2a`,
      supportedActions: ['query_architecture', 'get_agent_context', 'resolve_symbol', 'compare_branches'],
    },
    mcpServerConfig: {
      serverName: 'GitHub-Smart-Repository-Multi-Indexer-MCP',
      endpoint: `${origin}/api/mcp`,
      transport: 'streamable-jsonrpc',
      tools: [
        'search_repo_content',
        'get_repo_toc',
        'get_repo_file',
        'get_agentic_context',
        'list_repo_branches',
        'get_dependency_matrix',
        'save_to_drive',
      ],
      sampleToolCall: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'get_agentic_context',
          arguments: { repo: snapshot.fullName },
        },
      },
    },
    fullFileManifest: files.map((f) => ({
      path: f.path,
      branch: f.branch,
      category: f.category,
      size: f.size,
      language: f.language,
      sha: f.sha,
      isReadme: f.isReadme,
      githubUrl: `https://github.com/${snapshot.fullName}/blob/${f.branch}/${f.path}`,
      rawUrl: f.rawUrl,
    })),
  };
}
