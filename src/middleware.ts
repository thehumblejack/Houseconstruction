import { NextRequest, NextResponse } from 'next/server';

/**
 * Auth-code safety net.
 *
 * Supabase email confirmations / magic links return a PKCE `?code=…`. When the
 * exact redirect URL isn't in the project's allowlist, Supabase falls back to the
 * configured Site URL and drops the code at `/?code=…` instead of `/auth/callback`.
 * This forwards any stray `?code=` to the callback route, which exchanges it for a
 * session — so confirmation works regardless of where Supabase lands.
 */
export function middleware(request: NextRequest) {
    const { searchParams, pathname, origin } = request.nextUrl;
    const code = searchParams.get('code');

    // ── Cookie-bloat circuit breaker (prevents HTTP 431 lockouts) ──
    // Repeated auth flows pile up chunked Supabase cookies + PKCE code-verifier
    // leftovers; past the server's header limit EVERY request is rejected and
    // the site becomes unreachable. Prune before that point:
    //  > ~9 KB: drop stale code-verifier cookies (safe outside the callback).
    //  > ~13 KB: drop all sb-* cookies — one forced re-login beats a dead site.
    const all = request.cookies.getAll();
    const cookieBytes = all.reduce((n, c) => n + c.name.length + c.value.length + 4, 0);
    if (cookieBytes > 9000 && pathname !== '/auth/callback' && !code) {
        const nukeAll = cookieBytes > 13000;
        const doomed = all.filter(c =>
            c.name.startsWith('sb-') && (nukeAll || c.name.includes('code-verifier'))
        );
        if (doomed.length > 0) {
            const res = NextResponse.redirect(request.nextUrl);
            for (const c of doomed) res.cookies.delete(c.name);
            return res;
        }
    }

    if (code && pathname !== '/auth/callback') {
        const next = searchParams.get('next') || '/expenses';
        const url = new URL('/auth/callback', origin);
        url.searchParams.set('code', code);
        url.searchParams.set('next', next);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    // Run on everything except static assets / image optimizer / favicon / API
    // routes (API is Bearer-authenticated and never carries the ?code= param).
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
