import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json({
        isValid: false,
        tier: 'unauthenticated',
        scopes: [],
        rateLimit: { limit: 60, remaining: 60, reset: Math.floor(Date.now() / 1000) + 3600 },
        message: 'No token provided. Running in unauthenticated public tier (60 requests/hr).',
      });
    }

    const cleanToken = token.trim();
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${cleanToken}`,
        'User-Agent': 'GitHub-Smart-Repository-Multi-Indexer',
      },
    });

    const rateLimitLimit = Number(res.headers.get('x-ratelimit-limit') || '5000');
    const rateLimitRemaining = Number(res.headers.get('x-ratelimit-remaining') || '5000');
    const rateLimitReset = Number(res.headers.get('x-ratelimit-reset') || '0');
    const rawScopes = res.headers.get('x-oauth-scopes') || '';
    const scopes = rawScopes
      ? rawScopes.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({
          isValid: false,
          error: 'Bad credentials: The provided GitHub Personal Access Token is invalid or expired.',
          tier: 'invalid',
        }, { status: 401 });
      }
      return NextResponse.json({
        isValid: false,
        error: `GitHub API error: ${res.statusText}`,
        tier: 'error',
      }, { status: res.status });
    }

    const userData = await res.json();

    // Determine access tier based on scopes
    const hasRepo = scopes.includes('repo') || scopes.includes('public_repo');
    const hasFullRepo = scopes.includes('repo');
    const hasWorkflow = scopes.includes('workflow');
    const hasAdminOrg = scopes.includes('admin:org') || scopes.includes('read:org');
    const hasWrite = hasFullRepo || hasWorkflow;

    let tier: 'full' | 'partial' | 'read_only' = 'read_only';
    let tierDescription = 'Read-Only public access';

    if (hasFullRepo) {
      tier = 'full';
      tierDescription = 'Full read/write access to public & private repositories, branches, and code trees.';
    } else if (hasRepo) {
      tier = 'partial';
      tierDescription = 'Partial access to public repositories and metadata.';
    } else if (scopes.length > 0) {
      tier = 'partial';
      tierDescription = `Scoped partial access with permissions: ${scopes.join(', ')}`;
    }

    return NextResponse.json({
      isValid: true,
      tier,
      tierDescription,
      login: userData.login,
      name: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      scopes,
      hasFullRepo,
      hasWorkflow,
      hasAdminOrg,
      rateLimit: {
        limit: rateLimitLimit,
        remaining: rateLimitRemaining,
        reset: rateLimitReset,
      },
    });
  } catch (error: any) {
    console.error('Validate token error:', error);
    return NextResponse.json({
      isValid: false,
      error: error.message || 'Failed to validate GitHub token',
      tier: 'error',
    }, { status: 500 });
  }
}
