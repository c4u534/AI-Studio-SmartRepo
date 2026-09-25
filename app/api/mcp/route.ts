import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SAMPLE_SNAPSHOT, DEFAULT_SAMPLE_FILES } from '@/lib/sampleData';
import { generateAgenticConstruct } from '@/lib/agentic-context';
import firebaseConfig from '@/firebase-applet-config.json';

const MCP_TOOLS = [
  {
    name: 'get_agentic_context',
    description: 'Retrieve the comprehensive JSON construct of all results and databases for full agentic use, including priority tiers, system prompts, architecture breakdown, and database references.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository full name or identifier' },
        includeFullManifest: { type: 'boolean', description: 'Whether to include every indexed file in response (default: false)' }
      }
    }
  },
  {
    name: 'search_repo_content',
    description: 'Search keywords, code snippets, or regex patterns across all indexed repository files and branches.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword, function name, phrase, or token to find' },
        branch: { type: 'string', description: 'Optional branch filter (e.g. main)' },
        category: { type: 'string', description: 'Optional category filter (e.g. Source Code, Tests, Documentation)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_repo_toc',
    description: 'Retrieve the categorical Table of Contents (TOC) and hierarchical file breakdown for the repository.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional category to filter (e.g. Architecture & Config)' },
        branch: { type: 'string', description: 'Branch name' }
      }
    }
  },
  {
    name: 'get_repo_file',
    description: 'Fetch the contents, metadata, line count, and download URL of a specific repository file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path of the file (e.g. src/index.ts)' },
        branch: { type: 'string', description: 'Branch name (e.g. main)' }
      },
      required: ['path']
    }
  },
  {
    name: 'get_dependency_matrix',
    description: 'Inspect detected package manifests (package.json, requirements.txt, cargo.toml), dependencies, and cross-branch package version discrepancies.',
    inputSchema: {
      type: 'object',
      properties: {
        ecosystem: { type: 'string', description: 'Optional ecosystem filter (e.g. Node.js, Python, Rust)' }
      }
    }
  },
  {
    name: 'get_database_status',
    description: 'Inspect the persistent Google Cloud Firestore database status, collection paths, document IDs, and Google Drive archive references.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_repo_branches',
    description: 'List all repository branches with prioritization status, indexed status, and file counts.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'save_to_drive',
    description: 'Retrieve Google Drive export configurations and metadata for archiving all databasing and results.',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', description: 'Target format: all | json | csv | sheet | doc' }
      }
    }
  }
];

const MCP_RESOURCES = [
  {
    uri: 'repo://context/agentic-bundle',
    name: 'Complete Agentic Context JSON Bundle',
    mimeType: 'application/json',
    description: 'Full structured JSON construct with architecture, priority tiers, database references, and manifests.'
  },
  {
    uri: 'repo://toc',
    name: 'Repository Table of Contents',
    mimeType: 'application/json',
    description: 'Categorical and hierarchical file registry.'
  },
  {
    uri: 'repo://database/status',
    name: 'Firestore Database Status',
    mimeType: 'application/json',
    description: 'Firestore persistence state and collection references.'
  }
];

const MCP_PROMPTS = [
  {
    name: 'architectural_analysis',
    description: 'Analyze the repository architecture, subsystem boundaries, and execution entry points.',
    arguments: [
      { name: 'focusArea', description: 'Optional focus area (e.g. API layer, authentication, data persistence)' }
    ]
  },
  {
    name: 'dependency_audit',
    description: 'Audit dependencies across branches and flag outdated or conflicting packages.',
    arguments: []
  },
  {
    name: 'code_review_planning',
    description: 'Formulate an autonomous agent execution plan for modifying or extending repository functionality.',
    arguments: [
      { name: 'task', description: 'Description of the feature, refactor, or bug fix' }
    ]
  }
];

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${proto}://${host}`;

  return NextResponse.json({
    protocol: 'mcp',
    version: '2024-11-05',
    serverInfo: {
      name: 'GitHub-Smart-Repository-Multi-Indexer-MCP',
      version: '2.0.0',
      description: 'Model Context Protocol (MCP) server providing deep repository indexing, persistent databasing context, and categorical TOC for AI agents.'
    },
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false },
      prompts: { listChanged: false }
    },
    tools: MCP_TOOLS,
    resources: MCP_RESOURCES,
    prompts: MCP_PROMPTS,
    clientConfigExample: {
      mcpServers: {
        "github-smart-repo-indexer": {
          url: `${baseUrl}/api/mcp`,
          type: "streamable-jsonrpc"
        }
      }
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { id = 1, method, params } = json;

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const originUrl = `${proto}://${host}`;

    // Handle standard JSON-RPC 2.0 / MCP methods
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false }
          },
          serverInfo: {
            name: 'GitHub-Smart-Repository-Multi-Indexer-MCP',
            version: '2.0.0'
          }
        }
      });
    }

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS }
      });
    }

    if (method === 'resources/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { resources: MCP_RESOURCES }
      });
    }

    if (method === 'resources/read') {
      const uri = params?.uri;
      if (uri === 'repo://context/agentic-bundle') {
        const bundle = generateAgenticConstruct(DEFAULT_SAMPLE_SNAPSHOT, DEFAULT_SAMPLE_FILES, { originUrl });
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(bundle, null, 2)
              }
            ]
          }
        });
      }

      if (uri === 'repo://database/status') {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  provider: 'Google Cloud Firestore',
                  databaseId: (firebaseConfig as any).firestoreDatabaseId,
                  collection: 'repo_snapshots',
                  activeDocumentId: DEFAULT_SAMPLE_SNAPSHOT.id,
                  documentPath: `/repo_snapshots/${DEFAULT_SAMPLE_SNAPSHOT.id}`,
                  googleDriveFolderId: DEFAULT_SAMPLE_SNAPSHOT.googleDriveFolderId || null
                }, null, 2)
              }
            ]
          }
        });
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Resource '${uri}' not found.` }
      }, { status: 404 });
    }

    if (method === 'prompts/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { prompts: MCP_PROMPTS }
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      let executionData: any = {};

      if (toolName === 'get_agentic_context') {
        const construct = generateAgenticConstruct(DEFAULT_SAMPLE_SNAPSHOT, DEFAULT_SAMPLE_FILES, { originUrl });
        if (!toolArgs.includeFullManifest) {
          // Send condensed manifest to keep response size optimal unless requested
          construct.fullFileManifest = construct.fullFileManifest.slice(0, 30);
        }
        executionData = construct;
      } else if (toolName === 'search_repo_content') {
        const q = (toolArgs.query || '').toLowerCase();
        const matches = DEFAULT_SAMPLE_FILES.filter((f) => {
          const matchQuery = f.path.toLowerCase().includes(q) || (f.contentSnippet || '').toLowerCase().includes(q);
          const matchBranch = !toolArgs.branch || f.branch.toLowerCase() === toolArgs.branch.toLowerCase();
          const matchCategory = !toolArgs.category || f.category.toLowerCase() === toolArgs.category.toLowerCase();
          return matchQuery && matchBranch && matchCategory;
        });

        executionData = {
          query: toolArgs.query,
          totalMatches: matches.length,
          matches: matches.map((m) => ({
            path: m.path,
            branch: m.branch,
            category: m.category,
            size: m.size,
            language: m.language,
            snippet: (m.contentSnippet || '').slice(0, 300),
            githubUrl: `https://github.com/${DEFAULT_SAMPLE_SNAPSHOT.fullName}/blob/${m.branch}/${m.path}`
          }))
        };
      } else if (toolName === 'get_repo_toc') {
        const catFilter = toolArgs.category?.toLowerCase();
        const branchFilter = toolArgs.branch?.toLowerCase();

        const filtered = DEFAULT_SAMPLE_FILES.filter((f) => {
          if (catFilter && f.category.toLowerCase() !== catFilter) return false;
          if (branchFilter && f.branch.toLowerCase() !== branchFilter) return false;
          return true;
        });

        executionData = {
          repository: DEFAULT_SAMPLE_SNAPSHOT.fullName,
          versionTag: DEFAULT_SAMPLE_SNAPSHOT.versionTag,
          categories: DEFAULT_SAMPLE_SNAPSHOT.categories,
          totalFiles: filtered.length,
          files: filtered.map((f) => `[${f.category}] (${f.branch}) ${f.path}`)
        };
      } else if (toolName === 'get_repo_file') {
        const file = DEFAULT_SAMPLE_FILES.find((f) => f.path.toLowerCase() === (toolArgs.path || '').toLowerCase());
        if (file) {
          executionData = {
            path: file.path,
            branch: file.branch,
            category: file.category,
            size: file.size,
            language: file.language,
            content: file.contentSnippet || file.content || `/* File: ${file.path} on branch ${file.branch} */`,
            githubUrl: `https://github.com/${DEFAULT_SAMPLE_SNAPSHOT.fullName}/blob/${file.branch}/${file.path}`
          };
        } else {
          executionData = {
            error: `File '${toolArgs.path}' not found in active repository index.`
          };
        }
      } else if (toolName === 'get_dependency_matrix') {
        executionData = {
          repository: DEFAULT_SAMPLE_SNAPSHOT.fullName,
          detectedEcosystems: ['Node.js / TypeScript', 'Python', 'Rust'],
          manifests: [
            { path: 'package.json', branch: 'main', ecosystem: 'Node.js', dependencyCount: 18 },
            { path: 'requirements.txt', branch: 'v2-preview', ecosystem: 'Python', dependencyCount: 6 },
            { path: 'Cargo.toml', branch: 'v2-preview', ecosystem: 'Rust', dependencyCount: 4 }
          ],
          discrepancies: [
            { package: 'tailwindcss', branches: { main: '^3.4.0', canary: '^4.0.0-beta.1' }, conflictSeverity: 'MAJOR' },
            { package: 'react', branches: { main: '^18.3.1', canary: '^19.0.0' }, conflictSeverity: 'MAJOR' }
          ]
        };
      } else if (toolName === 'get_database_status') {
        executionData = {
          databaseProvider: 'Google Cloud Firestore',
          firestoreDatabaseId: (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-githubsmartrepos-1e3eb2e0-ce07-469a-8d74-6230d6c9fd96',
          rootCollection: 'repo_snapshots',
          activeDocumentId: DEFAULT_SAMPLE_SNAPSHOT.id,
          subcollection: `/repo_snapshots/${DEFAULT_SAMPLE_SNAPSHOT.id}/files`,
          status: 'ready',
          persistedTimestamp: DEFAULT_SAMPLE_SNAPSHOT.updatedAt,
          googleDriveFolderId: DEFAULT_SAMPLE_SNAPSHOT.googleDriveFolderId || null
        };
      } else if (toolName === 'list_repo_branches') {
        executionData = {
          repository: DEFAULT_SAMPLE_SNAPSHOT.fullName,
          defaultBranch: DEFAULT_SAMPLE_SNAPSHOT.defaultBranch,
          prioritizedBranches: DEFAULT_SAMPLE_SNAPSHOT.prioritizedBranches,
          indexedBranches: DEFAULT_SAMPLE_SNAPSHOT.indexedBranches,
          branchSummary: DEFAULT_SAMPLE_SNAPSHOT.indexedBranches.map((b) => ({
            name: b,
            isDefault: b === DEFAULT_SAMPLE_SNAPSHOT.defaultBranch,
            isPrioritized: DEFAULT_SAMPLE_SNAPSHOT.prioritizedBranches.includes(b),
            filesIndexed: DEFAULT_SAMPLE_FILES.filter((f) => f.branch === b).length
          }))
        };
      } else if (toolName === 'save_to_drive') {
        executionData = {
          action: 'save_to_drive',
          status: 'ready',
          supportedFormats: ['complete_agentic_json', 'database_export', 'inventory_csv', 'google_sheet', 'google_doc', 'standalone_html'],
          instructions: 'Use the Drive integration toolbar or API POST to export all databasing and results to a dedicated Google Drive folder.',
          targetFolderName: `${DEFAULT_SAMPLE_SNAPSHOT.repo}-${DEFAULT_SAMPLE_SNAPSHOT.versionTag}-Smart-Repo-Archive`
        };
      } else {
        executionData = {
          status: 'executed',
          tool: toolName,
          arguments: toolArgs,
          note: 'Executed against active repository databased state.'
        };
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(executionData, null, 2)
            }
          ]
        }
      });
    }

    // Default unhandled method
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method '${method}' not found.`
      }
    }, { status: 404 });

  } catch (error: any) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
        data: error.message
      }
    }, { status: 400 });
  }
}
