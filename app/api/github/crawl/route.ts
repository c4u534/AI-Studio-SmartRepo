import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubStartingPoint, prioritizeBranchList, categorizeFile } from '@/lib/github-crawler';
import { IndexedFile, RepoSnapshot } from '@/lib/types';
import { AgencyExecutionLevel, InstructionSetTemplate } from '@/lib/agency';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      repoUrl, 
      prioritizedBranches = [], 
      githubToken = '',
      maxFilesPerBranch = 1000,
      indexAllBranches = false,
      agencyLevel = 'hybrid' as AgencyExecutionLevel,
      agencyTokenHash = '',
      instructionSet,
    } = body;

    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL or identifier is required' }, { status: 400 });
    }

    // 1. Parse repository identity from any starting point (root, tree, blob, commit)
    const target = parseGitHubStartingPoint(repoUrl);
    if (!target.isValid) {
      return NextResponse.json({ error: target.error || 'Invalid GitHub repository location' }, { status: 400 });
    }

    const { owner, repo, fullName, cleanUrl, detectedBranch } = target;

    // Headers for GitHub API
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Smart-Repository-Multi-Indexer',
    };
    if (githubToken) {
      headers.Authorization = `Bearer ${githubToken}`;
    }

    // 2. Fetch Repository Details
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return NextResponse.json({ error: `Repository ${fullName} not found or is private.` }, { status: 404 });
      }
      if (repoRes.status === 403) {
        return NextResponse.json({ 
          error: 'GitHub API rate limit exceeded. Please provide a GitHub personal access token in settings to continue crawling deep repositories.' 
        }, { status: 403 });
      }
      return NextResponse.json({ error: `GitHub API error: ${repoRes.statusText}` }, { status: repoRes.status });
    }

    const repoInfo = await repoRes.json();
    const defaultBranch = repoInfo.default_branch || 'main';
    const description = repoInfo.description || '';

    // 3. Fetch all branches
    let allBranches: string[] = [defaultBranch];
    try {
      const branchesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, { headers });
      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        if (Array.isArray(branchesData)) {
          const names = branchesData.map((b: any) => b.name);
          if (names.length > 0) {
            allBranches = names;
          }
        }
      }
    } catch (err) {
      console.warn('Could not list all branches, falling back to default:', err);
    }

    // 4. Branch Prioritization
    // If the URL had a detectedBranch (e.g. user pointed to /tree/feature-x), prepend it to priority!
    const effectivePrioritized: string[] = [];
    if (detectedBranch && !effectivePrioritized.includes(detectedBranch)) {
      effectivePrioritized.push(detectedBranch);
    }
    if (Array.isArray(prioritizedBranches)) {
      prioritizedBranches.forEach((b: string) => {
        const tb = b.trim();
        if (tb && !effectivePrioritized.includes(tb)) {
          effectivePrioritized.push(tb);
        }
      });
    }

    const { orderedBranches, prioritizedFound } = prioritizeBranchList(allBranches, effectivePrioritized);

    // Determine which branches to crawl:
    let branchesToCrawl = orderedBranches;
    if (!indexAllBranches && effectivePrioritized.length > 0) {
      branchesToCrawl = orderedBranches.filter(b => 
        prioritizedFound.includes(b) || b === defaultBranch
      );
    }

    // Cap branch crawling to first 8 branches to stay performant and prevent timeout
    branchesToCrawl = branchesToCrawl.slice(0, 8);

    const indexedFiles: IndexedFile[] = [];
    const readmesByBranch: Record<string, string> = {};
    const categoryCounts: Record<string, number> = {
      'Documentation': 0,
      'Source Code': 0,
      'Architecture & Config': 0,
      'Tests': 0,
      'UI & Styles': 0,
      'Build & DevOps': 0,
      'Data & Assets': 0,
    };

    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const maxSizeBytes = instructionSet?.parserInstructionSet?.maxFileSizeBytes || 1048576; // 1MB default

    // 5. Deep crawl for each branch in priority order
    for (const branch of branchesToCrawl) {
      try {
        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
          { headers }
        );

        if (!treeRes.ok) {
          console.warn(`Git Tree API failed for branch ${branch}:`, treeRes.status);
          continue;
        }

        const treeData = await treeRes.json();
        const rawTree = Array.isArray(treeData.tree) ? treeData.tree : [];

        // Filter files only (type === 'blob')
        const blobs = rawTree.filter((item: any) => item.type === 'blob');

        for (const item of blobs.slice(0, maxFilesPerBranch)) {
          // If max file size is restricted by agency instructions
          if (item.size && item.size > maxSizeBytes) {
            continue;
          }

          const { category, language, isReadme } = categorizeFile(item.path);
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;

          // Compute raw download/preview URL
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${item.path}`;

          const fileObj: IndexedFile = {
            id: `${branch}_${item.sha}_${indexedFiles.length}`,
            path: item.path,
            branch,
            size: item.size || 0,
            type: 'blob',
            sha: item.sha,
            category,
            language,
            isReadme,
            snapshotId,
            userId: '',
            rawUrl
          };

          indexedFiles.push(fileObj);
        }

        // Fetch branch README
        try {
          const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme?ref=${encodeURIComponent(branch)}`, { headers });
          if (readmeRes.ok) {
            const readmeData = await readmeRes.json();
            if (readmeData.content) {
              const decoded = Buffer.from(readmeData.content, 'base64').toString('utf-8');
              readmesByBranch[branch] = decoded;
            }
          }
        } catch (e) {
          // ignore readme fetch error for branch
        }
      } catch (branchErr) {
        console.warn(`Error crawling branch ${branch}:`, branchErr);
      }
    }

    // Collate multi-branch READMEs into structured document
    let collatedReadme = '';
    const branchesWithReadme = Object.keys(readmesByBranch);
    if (branchesWithReadme.length === 1) {
      collatedReadme = readmesByBranch[branchesWithReadme[0]];
    } else if (branchesWithReadme.length > 1) {
      collatedReadme = [
        `# ${fullName} — Multi-Branch Documentation Index`,
        `> Collated across ${branchesWithReadme.length} branches: ${branchesWithReadme.join(', ')}`,
        '',
        ...branchesWithReadme.map((b) => [
          `---`,
          `## Branch: \`${b}\`${b === defaultBranch ? ' *(Default)*' : ''}${effectivePrioritized.includes(b) ? ' *(★ Prioritized)*' : ''}`,
          '',
          readmesByBranch[b]
        ].join('\n'))
      ].join('\n\n');
    }

    // 6. Assemble complete repository snapshot
    const totalBytes = indexedFiles.reduce((acc, f) => acc + f.size, 0);

    const snapshot: RepoSnapshot = {
      id: snapshotId,
      owner,
      repo,
      fullName,
      rootUrl: cleanUrl,
      detectedOriginPath: target.detectedSubpath,
      description,
      defaultBranch,
      versionTag: `v1.0.${Math.floor(Date.now() / 1000) % 10000}`,
      commitMessage: `Indexed ${indexedFiles.length} files prioritizing [${effectivePrioritized.join(', ') || defaultBranch}] (Agency: ${agencyLevel.toUpperCase()})`,
      prioritizedBranches: effectivePrioritized,
      indexedBranches: branchesToCrawl,
      totalFiles: indexedFiles.length,
      totalSize: totalBytes,
      totalBranches: allBranches.length,
      categories: categoryCounts,
      readmeContent: collatedReadme,
      userId: '',
      userEmail: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      snapshot,
      files: indexedFiles,
      allBranches,
      prioritizedFound,
      agencyTokenHash: agencyTokenHash || `AGT_${agencyLevel.toUpperCase()}_AUTO`,
      agencyLevel,
    });
  } catch (error: any) {
    console.error('Crawl repository error:', error);
    return NextResponse.json({ error: error.message || 'Internal crawler error' }, { status: 500 });
  }
}
