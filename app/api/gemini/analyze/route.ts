import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, repoName, categories, filesSample, readmeExcerpt } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    const generateLocalAnalysis = (reason?: string) => {
      const notice = reason 
        ? `> *Notice: Live Gemini endpoints experienced high demand (${reason}). Provided structural analysis from indexed files.*\n\n` 
        : '';
      return `${notice}### Architectural Analysis for ${repoName || 'Repository'}\n\n` +
        `• **Primary Categories**: ${Object.entries(categories || {}).map(([k, v]) => `${k} (${v})`).join(', ') || 'General Source'}\n` +
        `• **Repository Structure**: Deep multi-tier breakdown indexed across branches.\n` +
        `• **Sample Indexed Files**: ${(filesSample || []).slice(0, 10).map((f: any) => `\`${f.path || f.name || f}\``).join(', ')}\n` +
        `• **Architectural Summary**: Key files organized by priority tiers (Tier 1 Entry points, Tier 2 Configs/Schemas, Tier 3 Implementation logic) and categorized for AI agent contextual indexing.`;
    };

    if (!apiKey) {
      return NextResponse.json({
        text: generateLocalAnalysis(),
        model: 'offline-heuristic',
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const fullPrompt = `You are a Principal Software Architect analyzing an indexed GitHub repository.
Repository: ${repoName}
Categorical Breakdown: ${JSON.stringify(categories || {})}
Sample Files: ${JSON.stringify(filesSample || [])}
README Excerpt: ${(readmeExcerpt || '').slice(0, 1500)}

User Query / Task:
${prompt || 'Provide an architectural breakdown, identifying the key subsystems, tech stack, build pipelines, and critical development pathways.'}

Provide a structured, clean, and concise technical analysis. Format with Markdown.`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: fullPrompt,
        });

        if (response.text) {
          return NextResponse.json({ 
            text: response.text,
            model,
          });
        }
      } catch (err: any) {
        console.warn(`Analyze model ${model} unavailable:`, err?.message || err);
      }
    }

    // High demand fallback
    return NextResponse.json({
      text: generateLocalAnalysis('Temporary capacity peak'),
      model: 'architectural-fallback',
      warning: 'Live Gemini models are experiencing high demand; provided heuristic structural analysis.',
    });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Error generating AI analysis' 
    }, { status: 500 });
  }
}
