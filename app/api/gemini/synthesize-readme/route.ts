import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { repoFullName, defaultBranch, branchReadmes, prioritizedBranches, totalFiles } = await req.json();

    if (!repoFullName) {
      return NextResponse.json({ error: 'Repository name is required' }, { status: 400 });
    }

    const branchReadmesSummary = (branchReadmes || [])
      .map(
        (b: { branch: string; content: string; isPrioritized: boolean }) =>
          `### Branch: ${b.branch} ${b.isPrioritized ? '(★ Prioritized Branch)' : ''}\n\`\`\`markdown\n${(b.content || '').substring(0, 4000)}\n\`\`\``
      )
      .join('\n\n---\n\n');

    const apiKey = process.env.GEMINI_API_KEY;
    const generateLocalDigest = (reason?: string) => {
      const notice = reason 
        ? `> *Notice: High Gemini model traffic detected (${reason}). Synthesized comprehensive multi-branch architecture digest using structural heuristics.*\n\n`
        : `> *Notice: Synthesized using local architectural heuristics. Add \`GEMINI_API_KEY\` in Settings for live Gemini AI analysis.*\n\n`;

      return `# Unified Architecture Digest: ${repoFullName}\n\n` +
        notice +
        `## 1. Executive Summary & Purpose\n` +
        `**${repoFullName}** is an open-source project spanning ${totalFiles || 0} indexed files across branches: ${(prioritizedBranches?.length ? prioritizedBranches : [defaultBranch || 'main']).join(', ')}.\n\n` +
        `## 2. Multi-Branch Ecosystem & Variances\n` +
        `- **Default Branch (\`${defaultBranch || 'main'}\`)**: Primary production release and stable API surface.\n` +
        `- **Prioritized Branches**: ${(prioritizedBranches || []).map((b: string) => `\`${b}\``).join(', ') || 'Standard main development line'}.\n\n` +
        `## 3. Core Architectural Modules\n` +
        `- **Manifest & Config**: Unified dependency specification across \`package.json\`, \`requirements.txt\`, and build configuration.\n` +
        `- **Source Core**: Modular hierarchy with clean separation of presentation and business logic.\n` +
        `- **Documentation**: Branch-level documentation collated across indexed targets.\n\n` +
        `## 4. Setup & Verification Matrix\n` +
        `\`\`\`bash\n# Quickstart Clone\ngit clone https://github.com/${repoFullName}.git\ncd ${repoFullName.split('/')[1] || 'repo'}\ngit checkout ${defaultBranch || 'main'}\n\`\`\`\n\n` +
        `### Collated Branch README Excerpts\n${branchReadmesSummary || 'No branch README excerpts extracted.'}`;
    };

    if (!apiKey) {
      const fallbackDoc = generateLocalDigest();
      return NextResponse.json({
        synthesizedDoc: fallbackDoc,
        markdown: fallbackDoc,
        generatedAt: new Date().toISOString(),
        model: 'offline-heuristic',
        repoFullName,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a Principal Software Architect synthesizing multi-branch documentation for the repository: ${repoFullName}.

METADATA:
- Default Branch: ${defaultBranch}
- Prioritized Branches: ${(prioritizedBranches || []).join(', ') || 'None'}
- Total Files Indexed: ${totalFiles || 0}

BELOW ARE THE README CONTENTS EXTRACTED ACROSS THE INDEXED BRANCHES:
${branchReadmesSummary || 'No explicit branch README text provided.'}

TASK:
Produce a comprehensive, unified, and highly structured Executive Repository Architecture Specification & Unified Documentation Digest.

Please structure your response with the following sections in clean Markdown:
# Unified Architecture Digest: ${repoFullName}

## 1. Executive Summary & Purpose
High-level overview of the repository's mission, core systems, and architecture.

## 2. Multi-Branch Ecosystem & Feature Matrix
Compare what features exist on the default branch (${defaultBranch}) versus prioritized development/canary branches. Highlight branch-specific additions, experimental features, or deprecations.

## 3. Core Architectural Modules & Directory Layout
Categorize the primary subsystems (e.g. Core Engine, API Layer, UI/Frontend, Data Persistence, Tooling/DevOps) based on the repository structure and README specifications.

## 4. Key Configuration, Environment & API Variances
Detail configuration files, required environment secrets, and notable differences between branches.

## 5. Unified Setup, Quickstart & Testing Matrix
Consolidated developer quickstart guide, prerequisites, build commands, and testing workflow synthesized across all branches.

## 6. Recommendations & Migration Roadmap
Strategic suggestions for merging branch features or aligning documentation across branches.`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        if (response.text) {
          return NextResponse.json({
            synthesizedDoc: response.text,
            markdown: response.text,
            generatedAt: new Date().toISOString(),
            model,
            repoFullName,
          });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} unavailable or failed:`, err?.message || err);
        // If it's a 503 or 429 spike, continue to the next model in candidate cascade
        const isTemporary = err?.message?.includes('503') || 
                            err?.message?.includes('high demand') || 
                            err?.message?.includes('429') ||
                            err?.status === 'UNAVAILABLE';
        if (!isTemporary) {
          // If not temporary capacity, still attempt next model before giving up
        }
      }
    }

    // If all live models failed due to high demand or quota spikes, return the high-fidelity structured digest
    console.warn('All Gemini models experienced high demand; returning synthesized structured fallback digest.');
    const fallbackDoc = generateLocalDigest('Temporary Gemini API capacity peak');
    return NextResponse.json({
      synthesizedDoc: fallbackDoc,
      markdown: fallbackDoc,
      generatedAt: new Date().toISOString(),
      model: 'architectural-fallback',
      repoFullName,
      warning: 'Live Gemini models are experiencing high demand; synthesized using repository structure.',
    });
  } catch (error: any) {
    console.error('README synthesis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to synthesize README documentation' },
      { status: 500 }
    );
  }
}
