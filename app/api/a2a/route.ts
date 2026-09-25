import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SAMPLE_SNAPSHOT, DEFAULT_SAMPLE_FILES } from '@/lib/sampleData';
import { generateAgenticConstruct } from '@/lib/agentic-context';
import firebaseConfig from '@/firebase-applet-config.json';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const originUrl = `${proto}://${host}`;

  const { searchParams } = new URL(req.url);
  const repo = searchParams.get('repo');
  const format = searchParams.get('format');
  const action = searchParams.get('action');

  if (format === 'full' || action === 'get_context') {
    const construct = generateAgenticConstruct(DEFAULT_SAMPLE_SNAPSHOT, DEFAULT_SAMPLE_FILES, { originUrl });
    return NextResponse.json(construct);
  }

  return NextResponse.json({
    protocol: 'A2A',
    version: '1.0.0',
    specification: 'Agent-to-Agent Repository Context & Machine Protocol',
    handshakeEndpoint: `${originUrl}/api/a2a`,
    mcpEndpoint: `${originUrl}/api/mcp`,
    description: 'Autonomous protocol enabling LLM agents and multi-agent frameworks to ingest, query, and synchronize multi-branch repository architectures and persistent databases.',
    databaseMetadata: {
      provider: 'Google Cloud Firestore',
      firestoreDatabaseId: (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-githubsmartrepos-1e3eb2e0-ce07-469a-8d74-6230d6c9fd96',
      activeSnapshot: DEFAULT_SAMPLE_SNAPSHOT.fullName,
      versionTag: DEFAULT_SAMPLE_SNAPSHOT.versionTag,
    },
    capabilities: [
      'A2A-Context-Exchange',
      'A2A-Hierarchical-TOC',
      'A2A-Dependency-Audit',
      'A2A-GoogleDrive-Sync',
      'MCP-JSON-RPC-2024-11-05',
    ],
    sampleUsage: {
      getFullContext: `${originUrl}/api/a2a?format=full`,
      postQueryExample: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          action: 'get_context',
          query: 'entrypoints',
        },
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'get_context', query, branch, category } = body;

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const originUrl = `${proto}://${host}`;

    if (action === 'get_context') {
      const construct = generateAgenticConstruct(DEFAULT_SAMPLE_SNAPSHOT, DEFAULT_SAMPLE_FILES, { originUrl });
      return NextResponse.json({
        success: true,
        protocol: 'A2A-1.0',
        responseType: 'agentic_context_construct',
        data: construct,
      });
    }

    if (action === 'search') {
      const q = (query || '').toLowerCase();
      const matches = DEFAULT_SAMPLE_FILES.filter((f) => {
        const matchText = f.path.toLowerCase().includes(q) || (f.contentSnippet || '').toLowerCase().includes(q);
        const matchBranch = !branch || f.branch.toLowerCase() === branch.toLowerCase();
        const matchCategory = !category || f.category.toLowerCase() === category.toLowerCase();
        return matchText && matchBranch && matchCategory;
      });

      return NextResponse.json({
        success: true,
        protocol: 'A2A-1.0',
        responseType: 'search_results',
        totalMatches: matches.length,
        results: matches.slice(0, 20).map((m) => ({
          path: m.path,
          branch: m.branch,
          category: m.category,
          language: m.language,
          snippet: (m.contentSnippet || '').slice(0, 200),
          githubUrl: `https://github.com/${DEFAULT_SAMPLE_SNAPSHOT.fullName}/blob/${m.branch}/${m.path}`,
        })),
      });
    }

    if (action === 'get_architecture') {
      const construct = generateAgenticConstruct(DEFAULT_SAMPLE_SNAPSHOT, DEFAULT_SAMPLE_FILES, { originUrl });
      return NextResponse.json({
        success: true,
        protocol: 'A2A-1.0',
        responseType: 'architecture_specification',
        repository: DEFAULT_SAMPLE_SNAPSHOT.fullName,
        version: DEFAULT_SAMPLE_SNAPSHOT.versionTag,
        architecture: construct.architecture,
        agentDirectives: construct.agentDirectives,
      });
    }

    if (action === 'get_database') {
      return NextResponse.json({
        success: true,
        protocol: 'A2A-1.0',
        responseType: 'database_status',
        databaseProvider: 'Google Cloud Firestore',
        databaseId: (firebaseConfig as any).firestoreDatabaseId,
        collectionPath: `/repo_snapshots/${DEFAULT_SAMPLE_SNAPSHOT.id}`,
        documentId: DEFAULT_SAMPLE_SNAPSHOT.id,
        googleDriveExports: {
          folderId: DEFAULT_SAMPLE_SNAPSHOT.googleDriveFolderId || null,
          allResultsDriveUrl: DEFAULT_SAMPLE_SNAPSHOT.driveAllResultsUrl || null,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: `Unknown A2A action '${action}'. Supported: 'get_context', 'search', 'get_architecture', 'get_database'.`,
      },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process A2A request',
      },
      { status: 500 }
    );
  }
}
