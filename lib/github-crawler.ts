import { FileCategory, IndexedFile, BranchInfo } from './types';

export interface ParsedRepoTarget {
  owner: string;
  repo: string;
  fullName: string;
  cleanUrl: string;
  detectedBranch?: string;
  detectedSubpath?: string;
  isValid: boolean;
  error?: string;
}

/**
 * Universal GitHub identity and determinant parser.
 * Locates the root repository identity from any starting point:
 * root repo, tree subfolder, blob file, commit, or raw URL.
 */
export function parseGitHubStartingPoint(input: string): ParsedRepoTarget {
  const trimmed = input.trim();
  if (!trimmed) {
    return { owner: '', repo: '', fullName: '', cleanUrl: '', isValid: false, error: 'Empty repository URL or name.' };
  }

  // Handle shorthand: "owner/repo"
  const shorthandMatch = trimmed.match(/^([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)$/);
  if (shorthandMatch) {
    const owner = shorthandMatch[1];
    const repo = shorthandMatch[2].replace(/\.git$/, '');
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      cleanUrl: `https://github.com/${owner}/${repo}`,
      isValid: true
    };
  }

  try {
    const parsedUrl = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsedUrl.hostname.toLowerCase();

    // Standard github.com URL
    if (host === 'github.com' || host === 'www.github.com') {
      const parts = parsedUrl.pathname.split('/').filter(Boolean);
      if (parts.length < 2) {
        return { owner: '', repo: '', fullName: '', cleanUrl: '', isValid: false, error: 'Incomplete GitHub URL.' };
      }

      const owner = parts[0];
      const repo = parts[1].replace(/\.git$/, '');
      let detectedBranch: string | undefined = undefined;
      let detectedSubpath: string | undefined = undefined;

      // Check if starting point is tree or blob
      if (parts.length >= 4 && (parts[2] === 'tree' || parts[2] === 'blob')) {
        detectedBranch = parts[3];
        if (parts.length > 4) {
          detectedSubpath = parts.slice(4).join('/');
        }
      } else if (parts.length >= 4 && parts[2] === 'commit') {
        detectedBranch = parts[3];
      }

      return {
        owner,
        repo,
        fullName: `${owner}/${repo}`,
        cleanUrl: `https://github.com/${owner}/${repo}`,
        detectedBranch,
        detectedSubpath,
        isValid: true
      };
    }

    // raw.githubusercontent.com URL
    if (host === 'raw.githubusercontent.com') {
      const parts = parsedUrl.pathname.split('/').filter(Boolean);
      if (parts.length >= 3) {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[2];
        const subpath = parts.slice(3).join('/');
        return {
          owner,
          repo,
          fullName: `${owner}/${repo}`,
          cleanUrl: `https://github.com/${owner}/${repo}`,
          detectedBranch: branch,
          detectedSubpath: subpath,
          isValid: true
        };
      }
    }

    return { owner: '', repo: '', fullName: '', cleanUrl: '', isValid: false, error: 'Not a recognized GitHub URL.' };
  } catch (e) {
    return { owner: '', repo: '', fullName: '', cleanUrl: '', isValid: false, error: 'Invalid URL format.' };
  }
}

/**
 * Categorize a file based on path and extension
 */
export function categorizeFile(filePath: string): { category: FileCategory; language: string; isReadme: boolean } {
  const lower = filePath.toLowerCase();
  const filename = lower.split('/').pop() || '';
  const ext = filename.includes('.') ? filename.split('.').pop() || '' : '';

  const isReadme = filename.startsWith('readme');

  // Documentation
  if (
    isReadme ||
    filename.startsWith('license') ||
    filename.startsWith('contributing') ||
    filename.startsWith('changelog') ||
    filename.startsWith('code_of_conduct') ||
    lower.startsWith('docs/') ||
    lower.includes('/docs/') ||
    ['md', 'mdx', 'rst', 'adoc', 'txt', 'pdf'].includes(ext)
  ) {
    return { category: 'Documentation', language: ext.toUpperCase() || 'Markdown', isReadme };
  }

  // Tests
  if (
    lower.includes('test') ||
    lower.includes('spec') ||
    lower.includes('__tests__') ||
    lower.includes('e2e') ||
    lower.includes('cypress') ||
    filename.includes('.test.') ||
    filename.includes('.spec.')
  ) {
    return { category: 'Tests', language: getLanguageFromExt(ext), isReadme: false };
  }

  // Architecture & Config
  if (
    filename === 'package.json' ||
    filename === 'tsconfig.json' ||
    filename === 'dockerfile' ||
    filename === 'docker-compose.yml' ||
    filename === 'cargo.toml' ||
    filename === 'go.mod' ||
    filename === 'pyproject.toml' ||
    filename === 'gemfile' ||
    filename === 'pom.xml' ||
    filename.startsWith('.env') ||
    lower.startsWith('.github/') ||
    filename.startsWith('.eslintrc') ||
    filename.startsWith('prettier') ||
    filename.startsWith('vite.config') ||
    filename.startsWith('next.config') ||
    filename.startsWith('webpack') ||
    filename.startsWith('tailwind.config') ||
    filename.startsWith('babel.config')
  ) {
    return { category: 'Architecture & Config', language: getLanguageFromExt(ext), isReadme: false };
  }

  // Build & DevOps
  if (
    ['sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd'].includes(ext) ||
    filename === 'makefile' ||
    lower.startsWith('k8s/') ||
    lower.startsWith('terraform/') ||
    lower.includes('ci') ||
    lower.includes('deploy')
  ) {
    return { category: 'Build & DevOps', language: ext.toUpperCase() || 'Shell', isReadme: false };
  }

  // UI & Styles
  if (['css', 'scss', 'sass', 'less', 'styl', 'svg', 'html'].includes(ext)) {
    return { category: 'UI & Styles', language: ext.toUpperCase(), isReadme: false };
  }

  // Data & Assets
  if (['json', 'yaml', 'yml', 'xml', 'csv', 'sql', 'graphql', 'gql', 'proto', 'toml', 'ini'].includes(ext)) {
    return { category: 'Data & Assets', language: ext.toUpperCase(), isReadme: false };
  }

  // Source Code Default
  return { category: 'Source Code', language: getLanguageFromExt(ext), isReadme: false };
}

function getLanguageFromExt(ext: string): string {
  const map: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript (React)',
    js: 'JavaScript',
    jsx: 'JavaScript (React)',
    py: 'Python',
    go: 'Go',
    rs: 'Rust',
    java: 'Java',
    kt: 'Kotlin',
    c: 'C',
    cpp: 'C++',
    h: 'C/C++ Header',
    hpp: 'C++ Header',
    cs: 'C#',
    rb: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    scala: 'Scala',
    r: 'R',
    dart: 'Dart',
    lua: 'Lua',
    zig: 'Zig',
    vue: 'Vue',
    svelte: 'Svelte',
    json: 'JSON',
    md: 'Markdown',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sql: 'SQL',
    sh: 'Shell'
  };
  return map[ext] || (ext ? ext.toUpperCase() : 'Plain Text');
}

/**
 * Sorts branches according to user-defined prioritized list
 */
export function prioritizeBranchList(availableBranches: string[], prioritizedInputs: string[]): {
  orderedBranches: string[];
  prioritizedFound: string[];
  remainingBranches: string[];
} {
  const prioritizedSet = new Set(
    prioritizedInputs.map(b => b.trim().toLowerCase()).filter(Boolean)
  );

  const prioritizedFound: string[] = [];
  const remainingBranches: string[] = [];

  // Match available against prioritized list preserving user's input priority order
  for (const prio of prioritizedInputs) {
    const trimmed = prio.trim();
    if (!trimmed) continue;
    const match = availableBranches.find(b => b.toLowerCase() === trimmed.toLowerCase());
    if (match && !prioritizedFound.includes(match)) {
      prioritizedFound.push(match);
    }
  }

  // Remaining available branches
  for (const b of availableBranches) {
    if (!prioritizedFound.includes(b)) {
      remainingBranches.push(b);
    }
  }

  return {
    orderedBranches: [...prioritizedFound, ...remainingBranches],
    prioritizedFound,
    remainingBranches
  };
}
