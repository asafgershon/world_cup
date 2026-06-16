import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Defined inline — middleware runs in Edge runtime, can't import lib/kv (uses fs/path)
const SESSION_COOKIE = 'wc_session';
const PUBLIC_PATHS = ['/', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from login page
  if (pathname === '/') {
    const code = request.cookies.get(SESSION_COOKIE)?.value;
    if (code) return NextResponse.redirect(new URL('/matches', request.url));
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const code = request.cookies.get(SESSION_COOKIE)?.value;
  if (!code) {
    // API routes: return 401, page routes: redirect to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
