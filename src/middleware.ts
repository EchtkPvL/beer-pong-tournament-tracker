import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { verifySession } from './lib/auth/session';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if this is an admin route (but not login)
  const adminPathPattern = /^\/(de|en)\/admin(?!\/login)/;
  if (adminPathPattern.test(pathname)) {
    const token = request.cookies.get('bptt-session')?.value;
    if (!token) {
      const locale = pathname.startsWith('/en') ? 'en' : 'de';
      return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url));
    }
    const valid = await verifySession(token);
    if (!valid) {
      const locale = pathname.startsWith('/en') ? 'en' : 'de';
      return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(de|en)/:path*'],
};
