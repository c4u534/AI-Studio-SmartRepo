import { IndexedFile } from './types';

export type DependencyEcosystem = 'npm' | 'pypi' | 'cargo' | 'golang' | 'rubygems' | 'composer' | 'unknown';
export type DependencyType = 'production' | 'development' | 'peer' | 'optional';

export interface ParsedPackage {
  name: string;
  version: string;
  type: DependencyType;
  ecosystem: DependencyEcosystem;
  manifestPath: string;
  branch: string;
  rawSpec: string;
  description?: string;
  isConflict?: boolean;
}

export interface ParsedManifest {
  id: string;
  filename: string;
  path: string;
  branch: string;
  ecosystem: DependencyEcosystem;
  packages: ParsedPackage[];
  rawContent?: string;
  productionCount: number;
  devCount: number;
  peerCount: number;
}

export type ConflictSeverity = 'major' | 'minor' | 'branch_divergence';

export interface PackageConflict {
  packageName: string;
  ecosystem: DependencyEcosystem;
  severity: ConflictSeverity;
  branches: Array<{
    branch: string;
    version: string;
    type: DependencyType;
    manifestPath: string;
  }>;
  explanation: string;
  recommendedResolution?: string;
}

export interface DependencyAnalysisReport {
  manifests: ParsedManifest[];
  allPackages: ParsedPackage[];
  uniquePackageNames: string[];
  conflicts: PackageConflict[];
  metrics: {
    totalManifests: number;
    totalDependencies: number;
    uniqueCount: number;
    productionCount: number;
    devCount: number;
    peerCount: number;
    conflictsCount: number;
    divergenceCount: number;
  };
  ecosystemBreakdown: Record<DependencyEcosystem, number>;
}

/**
 * Check if a file is a recognized dependency manifest
 */
export function isManifestFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  const filename = lower.split('/').pop() || '';

  return (
    filename === 'package.json' ||
    filename === 'requirements.txt' ||
    filename.endsWith('.requirements.txt') ||
    filename === 'pyproject.toml' ||
    filename === 'pipfile' ||
    filename === 'cargo.toml' ||
    filename === 'go.mod' ||
    filename === 'gemfile' ||
    filename === 'composer.json'
  );
}

/**
 * Detect ecosystem from file path
 */
export function detectEcosystem(filePath: string): DependencyEcosystem {
  const filename = filePath.toLowerCase().split('/').pop() || '';
  if (filename === 'package.json') return 'npm';
  if (filename === 'requirements.txt' || filename.endsWith('.requirements.txt') || filename === 'pyproject.toml' || filename === 'pipfile') return 'pypi';
  if (filename === 'cargo.toml') return 'cargo';
  if (filename === 'go.mod') return 'golang';
  if (filename === 'gemfile') return 'rubygems';
  if (filename === 'composer.json') return 'composer';
  return 'unknown';
}

/**
 * Parse package.json content
 */
function parsePackageJson(content: string, path: string, branch: string): ParsedPackage[] {
  const list: ParsedPackage[] = [];
  try {
    const json = JSON.parse(content);

    if (json.dependencies && typeof json.dependencies === 'object') {
      Object.entries(json.dependencies).forEach(([name, spec]) => {
        list.push({
          name,
          version: String(spec),
          type: 'production',
          ecosystem: 'npm',
          manifestPath: path,
          branch,
          rawSpec: `${name}: ${spec}`,
        });
      });
    }

    if (json.devDependencies && typeof json.devDependencies === 'object') {
      Object.entries(json.devDependencies).forEach(([name, spec]) => {
        list.push({
          name,
          version: String(spec),
          type: 'development',
          ecosystem: 'npm',
          manifestPath: path,
          branch,
          rawSpec: `${name}: ${spec}`,
        });
      });
    }

    if (json.peerDependencies && typeof json.peerDependencies === 'object') {
      Object.entries(json.peerDependencies).forEach(([name, spec]) => {
        list.push({
          name,
          version: String(spec),
          type: 'peer',
          ecosystem: 'npm',
          manifestPath: path,
          branch,
          rawSpec: `${name}: ${spec}`,
        });
      });
    }
  } catch (e) {
    // Fallback regex parser for partial or malformed package.json
    const depRegex = /"([^"]+)"\s*:\s*"([^"]+)"/g;
    let match;
    while ((match = depRegex.exec(content)) !== null) {
      const name = match[1];
      const version = match[2];
      if (!['name', 'version', 'description', 'scripts', 'main', 'types', 'author', 'license'].includes(name)) {
        list.push({
          name,
          version,
          type: 'production',
          ecosystem: 'npm',
          manifestPath: path,
          branch,
          rawSpec: `${name}: ${version}`,
        });
      }
    }
  }
  return list;
}

/**
 * Parse requirements.txt content
 */
function parseRequirementsTxt(content: string, path: string, branch: string): ParsedPackage[] {
  const list: ParsedPackage[] = [];
  const lines = content.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('-r') || line.startsWith('-i')) {
      continue;
    }

    // Split on ==, >=, <=, ~=, >, <, !=
    const match = line.match(/^([a-zA-Z0-9_\-\.]+)\s*([=><~!].+)?$/);
    if (match) {
      const name = match[1];
      const spec = match[2] ? match[2].trim() : '*';
      const isDev = name.includes('test') || name.includes('flake') || name.includes('black') || name.includes('mypy') || name.includes('ruff');
      list.push({
        name,
        version: spec,
        type: isDev ? 'development' : 'production',
        ecosystem: 'pypi',
        manifestPath: path,
        branch,
        rawSpec: line,
      });
    }
  }
  return list;
}

/**
 * Parse pyproject.toml content
 */
function parsePyprojectToml(content: string, path: string, branch: string): ParsedPackage[] {
  const list: ParsedPackage[] = [];
  const lines = content.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed;
      continue;
    }

    if (currentSection.includes('dependencies') || currentSection.includes('project')) {
      const match = trimmed.match(/^"([a-zA-Z0-9_\-\.]+)([><=~!^].*)?",?$/) || trimmed.match(/^([a-zA-Z0-9_\-\.]+)\s*=\s*"([^"]+)"/);
      if (match) {
        const name = match[1];
        const version = match[2] || '*';
        const isDev = currentSection.includes('dev') || currentSection.includes('optional');
        list.push({
          name,
          version,
          type: isDev ? 'development' : 'production',
          ecosystem: 'pypi',
          manifestPath: path,
          branch,
          rawSpec: trimmed,
        });
      }
    }
  }
  return list;
}

/**
 * Parse Cargo.toml content
 */
function parseCargoToml(content: string, path: string, branch: string): ParsedPackage[] {
  const list: ParsedPackage[] = [];
  const lines = content.split('\n');
  let inDependencies = false;
  let inDevDependencies = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '[dependencies]') {
      inDependencies = true;
      inDevDependencies = false;
      continue;
    } else if (trimmed === '[dev-dependencies]') {
      inDependencies = false;
      inDevDependencies = true;
      continue;
    } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      inDependencies = false;
      inDevDependencies = false;
      continue;
    }

    if ((inDependencies || inDevDependencies) && trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([a-zA-Z0-9_\-\.]+)\s*=\s*(.+)$/);
      if (match) {
        const name = match[1];
        let version = match[2].trim();
        // Remove quotes or extract version = "..."
        const verMatch = version.match(/version\s*=\s*"([^"]+)"/) || version.match(/^"([^"]+)"/);
        if (verMatch) {
          version = verMatch[1];
        }
        list.push({
          name,
          version,
          type: inDevDependencies ? 'development' : 'production',
          ecosystem: 'cargo',
          manifestPath: path,
          branch,
          rawSpec: trimmed,
        });
      }
    }
  }
  return list;
}

/**
 * Helper to clean semver specs (strips ^, ~, >=, ==, v)
 */
function extractMajorVersion(ver: string): number | null {
  const clean = ver.replace(/[\^~><=!v]/g, '').trim();
  const parts = clean.split('.');
  const num = parseInt(parts[0], 10);
  return isNaN(num) ? null : num;
}

/**
 * Compare versions across branches to identify conflicts and divergences
 */
function analyzeConflicts(allPackages: ParsedPackage[]): PackageConflict[] {
  const packageMap = new Map<string, ParsedPackage[]>();

  for (const pkg of allPackages) {
    const key = `${pkg.ecosystem}:${pkg.name.toLowerCase()}`;
    const existing = packageMap.get(key) || [];
    existing.push(pkg);
    packageMap.set(key, existing);
  }

  const conflicts: PackageConflict[] = [];

  for (const [key, instances] of packageMap.entries()) {
    // Only check if present across multiple branches or manifests
    const branchesWithPkg = Array.from(new Set(instances.map(i => i.branch)));
    const versions = Array.from(new Set(instances.map(i => i.version.trim())));

    if (branchesWithPkg.length > 1 && versions.length > 1) {
      // Check if versions have major divergence
      const majors = instances.map(i => ({
        branch: i.branch,
        version: i.version,
        major: extractMajorVersion(i.version),
      }));

      const distinctMajors = Array.from(new Set(majors.map(m => m.major).filter(m => m !== null)));

      let severity: ConflictSeverity = 'minor';
      let explanation = `Branches specify different version constraints (${versions.join(' vs ')}).`;

      if (distinctMajors.length > 1) {
        severity = 'major';
        explanation = `Breaking change detected! Branches specify different major versions (${distinctMajors.map(m => `v${m}`).join(' vs ')}). Merging may cause runtime incompatibility.`;
      } else {
        explanation = `Minor version divergence across branches (${versions.join(' vs ')}). Recommended to align before merging.`;
      }

      const conflictItem: PackageConflict = {
        packageName: instances[0].name,
        ecosystem: instances[0].ecosystem,
        severity,
        branches: instances.map(i => ({
          branch: i.branch,
          version: i.version,
          type: i.type,
          manifestPath: i.manifestPath,
        })),
        explanation,
        recommendedResolution: `Harmonize ${instances[0].name} to latest stable (${versions.sort().reverse()[0]}) across all branch manifests.`,
      };

      conflicts.push(conflictItem);
    }
  }

  return conflicts;
}

/**
 * Main repository dependency analyzer
 */
export function analyzeRepoDependencies(files: IndexedFile[]): DependencyAnalysisReport {
  const manifests: ParsedManifest[] = [];
  const allPackages: ParsedPackage[] = [];

  const manifestFiles = files.filter(f => isManifestFile(f.path));

  for (const file of manifestFiles) {
    const rawContent = file.content || file.contentSnippet || '';
    const ecosystem = detectEcosystem(file.path);
    let packages: ParsedPackage[] = [];

    if (ecosystem === 'npm') {
      packages = parsePackageJson(rawContent, file.path, file.branch);
    } else if (ecosystem === 'pypi') {
      if (file.path.toLowerCase().endsWith('pyproject.toml')) {
        packages = parsePyprojectToml(rawContent, file.path, file.branch);
      } else {
        packages = parseRequirementsTxt(rawContent, file.path, file.branch);
      }
    } else if (ecosystem === 'cargo') {
      packages = parseCargoToml(rawContent, file.path, file.branch);
    }

    // Tag file reference
    allPackages.push(...packages);

    const productionCount = packages.filter(p => p.type === 'production').length;
    const devCount = packages.filter(p => p.type === 'development').length;
    const peerCount = packages.filter(p => p.type === 'peer').length;

    manifests.push({
      id: `${file.branch}_${file.path}`,
      filename: file.path.split('/').pop() || file.path,
      path: file.path,
      branch: file.branch,
      ecosystem,
      packages,
      rawContent,
      productionCount,
      devCount,
      peerCount,
    });
  }

  const uniquePackageNames = Array.from(new Set(allPackages.map(p => p.name)));
  const conflicts = analyzeConflicts(allPackages);

  // Mark packages that have conflicts
  const conflictingNames = new Set(conflicts.map(c => c.packageName.toLowerCase()));
  allPackages.forEach(pkg => {
    if (conflictingNames.has(pkg.name.toLowerCase())) {
      pkg.isConflict = true;
    }
  });

  const ecosystemBreakdown: Record<DependencyEcosystem, number> = {
    npm: 0,
    pypi: 0,
    cargo: 0,
    golang: 0,
    rubygems: 0,
    composer: 0,
    unknown: 0,
  };

  allPackages.forEach(p => {
    ecosystemBreakdown[p.ecosystem] = (ecosystemBreakdown[p.ecosystem] || 0) + 1;
  });

  const majorConflictsCount = conflicts.filter(c => c.severity === 'major').length;
  const minorDivergencesCount = conflicts.filter(c => c.severity === 'minor').length;

  return {
    manifests,
    allPackages,
    uniquePackageNames,
    conflicts,
    metrics: {
      totalManifests: manifests.length,
      totalDependencies: allPackages.length,
      uniqueCount: uniquePackageNames.length,
      productionCount: allPackages.filter(p => p.type === 'production').length,
      devCount: allPackages.filter(p => p.type === 'development').length,
      peerCount: allPackages.filter(p => p.type === 'peer').length,
      conflictsCount: majorConflictsCount,
      divergenceCount: minorDivergencesCount,
    },
    ecosystemBreakdown,
  };
}
