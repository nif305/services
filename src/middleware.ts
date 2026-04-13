
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get('inventory_platform_session')?.value;
  const userStatus = request.cookies.get('user_status')?.value;
  const isAuthenticated = !!session;

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/request-account') ||
    pathname.startsWith('/pending-approval');

  const protectedPrefixes = [
    '/portal',
    '/dashboard',
    '/materials',
    '/services',
    '/inventory',
    '/requests',
    '/returns',
    '/custody',
    '/maintenance',
    '/purchases',
    '/suggestions',
    '/service-approvals',
    '/service-requests',
    '/email-drafts',
    '/messages',
    '/users',
    '/archive',
    '/audit-logs',
    '/reports',
    '/notifications',
  ];

  const isProtected = protectedPrefixes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!isAuthenticated && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && (userStatus === 'disabled' || userStatus === 'rejected')) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    const cookieOptions = {
      httpOnly: true as const,
      sameSite: 'lax' as const,
      secure: true,
      path: '/',
      expires: new Date(0),
    };

    for (const name of ['inventory_platform_session','user_id','user_role','user_status','user_email','user_full_name','user_department','active_role']) {
      response.cookies.set(name, '', cookieOptions);
    }
    return response;
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
