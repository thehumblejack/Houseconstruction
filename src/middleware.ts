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
