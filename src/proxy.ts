import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'themuno_session';

export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isHealthCheck = request.nextUrl.pathname === '/api/health';

  if (!hasSessionCookie && !isLoginPage && !isHealthCheck) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-themuno-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|themuno_logo.png).*)'],
};
