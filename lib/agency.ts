/**
 * Agency Execution Levels, 10 Modular Autonomous Agencies,
 * Token Constructor & Cryptographic Hash, and Instruction Set Schemas.
 */

export type AgencyExecutionLevel = 'none' | 'hybrid' | 'full_allow';

export interface AgencyDefinition {
  id: string;
  name: string;
  category: 'code_ast' | 'git_branches' | 'security' | 'database' | 'api' | 'testing' | 'devops' | 'mcp' | 'a2a' | 'workspace';
  badge: string;
  description: string;
  capabilities: string[];
  requiredLevel: AgencyExecutionLevel;
  activeByDefault: boolean;
}

export const TEN_AGENCIES: AgencyDefinition[] = [
  {
    id: 'ast_refactorer',
    name: '1. AST Structural Refactorer',
    category: 'code_ast',
    badge: 'AST / Syntax',
    description: 'Deconstructs source code into Abstract Syntax Trees, identifying design patterns, dead imports, and architectural smells across all branches.',
    capabilities: ['Parse TS/JS/Python ASTs', 'Detect cyclomatic complexity spikes', 'Synthesize code refactoring patches'],
    requiredLevel: 'hybrid',
    activeByDefault: true,
  },
  {
    id: 'cross_branch_synthesizer',
    name: '2. Cross-Branch Merge Synthesizer',
    category: 'git_branches',
    badge: 'Git Multi-Branch',
    description: 'Compares prioritized branch diffs against default branches, resolving merge collisions and constructing semantic patch summaries.',
    capabilities: ['Multi-branch semantic diffing', 'Pre-merge conflict prediction', 'Feature cherry-pick matrix generator'],
    requiredLevel: 'hybrid',
    activeByDefault: true,
  },
  {
    id: 'dep_vulnerability_auditor',
    name: '3. Dependency Vulnerability Auditor',
    category: 'security',
    badge: 'CVE / Supply-Chain',
    description: 'Scans package manifests (package.json, requirements.txt, go.mod, Cargo.toml) against vulnerability databases and suggests safe upgrade paths.',
    capabilities: ['Direct/Transitive dependency audit', 'License compliance inspection', 'Automated security patch suggestion'],
    requiredLevel: 'none',
    activeByDefault: true,
  },
  {
    id: 'schema_db_classifier',
    name: '4. Schema & DB Category Classifier',
    category: 'database',
    badge: 'DB / Schema',
    description: 'Discovers ORM models, SQL migration files, Firestore rule sets, and assigns automated persistence taxonomies to the database index.',
    capabilities: ['Relational & NoSQL schema extraction', 'Field-level sensitivity tagging', 'Database migration sequencing'],
    requiredLevel: 'hybrid',
    activeByDefault: true,
  },
  {
    id: 'api_surface_mapper',
    name: '5. Dynamic API Surface Mapper',
    category: 'api',
    badge: 'REST / GraphQL / gRPC',
    description: 'Detects Next.js API routes, Express endpoints, OpenAPI/Swagger specifications, and RPC schemas into a structured interactive catalog.',
    capabilities: ['Route discovery from filesystem', 'Method & payload schema synthesis', 'Mock client SDK generator'],
    requiredLevel: 'none',
    activeByDefault: true,
  },
  {
    id: 'test_suite_extractor',
    name: '6. Test Suite Coverage Extractor',
    category: 'testing',
    badge: 'QA / Coverage',
    description: 'Isolates unit, integration, and e2e test files across branches, evaluating test density, assertions, and uncovered code surfaces.',
    capabilities: ['Jest/Vitest/PyTest suite isolation', 'Assertion coverage approximation', 'Missing edge-case test generation'],
    requiredLevel: 'none',
    activeByDefault: false,
  },
  {
    id: 'ci_cd_rewriter',
    name: '7. CI/CD Pipeline Rewriter',
    category: 'devops',
    badge: 'GitHub Actions / Docker',
    description: 'Parses .github/workflows, Dockerfiles, and deployment configs to produce optimized multi-stage build pipelines and container definitions.',
    capabilities: ['Workflow action audit', 'Build caching optimization', 'Multi-architecture Dockerfile synthesizer'],
    requiredLevel: 'full_allow',
    activeByDefault: false,
  },
  {
    id: 'mcp_protocol_transformer',
    name: '8. MCP Protocol Transformer',
    category: 'mcp',
    badge: 'Model Context Protocol',
    description: 'Translates repository schemas and file tables directly into JSON-RPC 2.0 tool definitions for Claude Desktop, Cursor, and IDE agents.',
    capabilities: ['Dynamic tool declaration binding', 'Context window chunk optimizer', 'Resource URI protocol routing'],
    requiredLevel: 'hybrid',
    activeByDefault: true,
  },
  {
    id: 'a2a_task_delegator',
    name: '9. A2A Task Delegator',
    category: 'a2a',
    badge: 'Agent-to-Agent',
    description: 'Distributes indexing, summarization, and refactoring sub-tasks across downstream specialized LLM worker subagents with task lifecycle tracking.',
    capabilities: ['Subagent mesh communication', 'Hierarchical plan delegation', 'Consensus verification loop'],
    requiredLevel: 'full_allow',
    activeByDefault: false,
  },
  {
    id: 'workspace_publisher',
    name: '10. Workspace Synchronizer & Publisher',
    category: 'workspace',
    badge: 'Google Workspace',
    description: 'Autonomously syncs indexed branches and architecture updates to Google Docs, Sheets, and Drive without manual user intervention.',
    capabilities: ['Batch document reconciliation', 'Google Drive revision archiving', 'Spreadsheet cell matrix streaming'],
    requiredLevel: 'full_allow',
    activeByDefault: false,
  },
];

export interface InstructionSetTemplate {
  templateVersion: string;
  name: string;
  agencyTokenHash: string;
  agencyLevel: AgencyExecutionLevel;
  activeAgencies: string[];
  githubAuthType: 'oauth' | 'admin_pat' | 'anonymous';
  databaseCategories: {
    categoryName: string;
    description: string;
    filePatterns: string[];
    indexPriority: number;
    dbCollection: string;
  }[];
  parserInstructionSet: {
    maxFileSizeBytes: number;
    skipBinaries: boolean;
    extractSnippets: boolean;
    readmeAggregation: 'first_priority' | 'all_branches' | 'none';
    astExtractionRules: {
      enableFunctionSignatures: boolean;
      enableExportInspection: boolean;
    };
    mcpBindings: {
      toolPrefix: string;
      exposeRawContent: boolean;
    };
    a2aBindings: {
      agentRole: string;
      communicationFormat: 'json_rpc' | 'rest_manifest';
    };
  };
}

/**
 * Generate Default Instruction Set Template
 */
export function generateDefaultInstructionSet(
  repoFullName: string,
  level: AgencyExecutionLevel,
  activeAgencies: string[],
  tokenHash: string
): InstructionSetTemplate {
  return {
    templateVersion: '1.0.0-agency',
    name: `InstructionSet-${repoFullName.replace(/[^a-zA-Z0-9]/g, '_')}-${level}`,
    agencyTokenHash: tokenHash,
    agencyLevel: level,
    activeAgencies,
    githubAuthType: 'oauth',
    databaseCategories: [
      {
        categoryName: 'Documentation',
        description: 'Readmes, docs, specifications, and architecture notes',
        filePatterns: ['**/*.md', '**/*.rst', '**/docs/**', '**/LICENSE*'],
        indexPriority: 100,
        dbCollection: 'repo_snapshots_docs',
      },
      {
        categoryName: 'Architecture & Config',
        description: 'Package manifests, configs, tsconfig, env examples',
        filePatterns: ['package.json', 'tsconfig.json', 'Dockerfile', 'docker-compose*.yml', '.env.example'],
        indexPriority: 90,
        dbCollection: 'repo_snapshots_config',
      },
      {
        categoryName: 'Source Code',
        description: 'Primary application business logic and backend engines',
        filePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.rs'],
        indexPriority: 80,
        dbCollection: 'repo_snapshots_code',
      },
      {
        categoryName: 'Tests',
        description: 'Unit, integration, and e2e test specifications',
        filePatterns: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/tests/**'],
        indexPriority: 60,
        dbCollection: 'repo_snapshots_tests',
      },
      {
        categoryName: 'UI & Styles',
        description: 'Stylesheets, css modules, Tailwind tokens, and svg assets',
        filePatterns: ['**/*.css', '**/*.scss', '**/*.svg', '**/styles/**'],
        indexPriority: 50,
        dbCollection: 'repo_snapshots_ui',
      },
      {
        categoryName: 'Build & DevOps',
        description: 'CI/CD workflows, scripts, and deployment specs',
        filePatterns: ['**/.github/workflows/**', '**/scripts/**', '**/bin/**'],
        indexPriority: 40,
        dbCollection: 'repo_snapshots_devops',
      },
    ],
    parserInstructionSet: {
      maxFileSizeBytes: 524288, // 512KB
      skipBinaries: true,
      extractSnippets: true,
      readmeAggregation: 'all_branches',
      astExtractionRules: {
        enableFunctionSignatures: true,
        enableExportInspection: true,
      },
      mcpBindings: {
        toolPrefix: 'repo_indexer_',
        exposeRawContent: true,
      },
      a2aBindings: {
        agentRole: 'github_orchestrator',
        communicationFormat: 'json_rpc',
      },
    },
  };
}

/**
 * Generate Cryptographic Agency Token Hash (SHA-256)
 */
export async function generateAgencyTokenHash({
  level,
  activeAgencies,
  userUid,
  repoFullName,
  githubTokenHint,
  customSalt,
}: {
  level: AgencyExecutionLevel;
  activeAgencies: string[];
  userUid?: string;
  repoFullName: string;
  githubTokenHint?: string;
  customSalt?: string;
}): Promise<string> {
  const payload = [
    `level:${level}`,
    `agencies:${[...activeAgencies].sort().join(',')}`,
    `uid:${userUid || 'anonymous'}`,
    `repo:${repoFullName}`,
    `gh_secret:${githubTokenHint ? githubTokenHint.substring(0, 8) + '...' : 'none'}`,
    `salt:${customSalt || 'gh_smart_agency_salt_2026'}`,
  ].join('|');

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(payload);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `AGT_${level.toUpperCase()}_${hashHex.substring(0, 32)}`;
    } catch {
      // Fallback
    }
  }

  // Simple deterministic fallback hash
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `AGT_${level.toUpperCase()}_${hex}${Date.now().toString(16)}`;
}
