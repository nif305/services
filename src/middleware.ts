import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;

function getDefaultRouteForRole(role?: string) {
  if (role === 'manager') return '/services/dashboard';
  if (role === 'warehouse') return '/materials/dashboard';
  return '/materials/dashboard';
}

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
  const userRole = request.cookies.get('user_role')?.value as 'manager' | 'warehouse' | 'user' | undefined;
  const userStatus = request.cookies.get('user_status')?.value;

  const isAuthenticated = !!session;

  const legacyRedirects: Record<string, string> = {
    '/dashboard': getDefaultRouteForRole(userRole),
    '/inventory': '/materials/inventory',
    '/requests': '/materials/requests',
    '/returns': '/materials/returns',
    '/custody': '/materials/custody',
    '/maintenance': '/services/maintenance',
    '/cleaning': '/services/cleaning',
    '/purchases': '/services/purchases',
    '/other': '/services/other',
    '/service-requests': '/services/requests',
    '/service-approvals': '/services/approvals',
    '/email-drafts': '/services/email-drafts',
    '/users': '/services/users',
    '/reports': '/services/reports',
    '/archive': '/services/archive',
    '/audit-logs': '/services/audit-logs',
  };

  if (legacyRedirects[pathname]) {
    return NextResponse.redirect(new URL(legacyRedirects[pathname], request.url));
  }

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/request-account') || pathname.startsWith('/pending-approval');

  const protectedRoutes = [
    '/dashboard', '/inventory', '/requests', '/approvals', '/users', '/audit-logs', '/custody', '/returns', '/maintenance', '/email-drafts', '/notifications', '/reports', '/suggestions', '/purchases', '/messages', '/archive', '/materials', '/services'
  ];

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isAuthenticated && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && (userStatus === 'disabled' || userStatus === 'rejected')) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: true, path: '/', expires: new Date(0) } as const;
    for (const key of ['inventory_platform_session','user_id','user_role','user_status','user_email','user_name','user_department','user_employee_id']) {
      response.cookies.set(key, '', cookieOptions);
    }
    return response;
  }

  if (isAuthenticated && userStatus === 'pending' && !pathname.startsWith('/pending-approval')) {
    return NextResponse.redirect(new URL('/pending-approval', request.url));
  }

  if (isAuthenticated && isAuthPage && userStatus !== 'pending') {
    return NextResponse.redirect(new URL(getDefaultRouteForRole(userRole), request.url));
  }

  if (pathname.startsWith('/services') && userRole === 'warehouse') {
    return NextResponse.redirect(new URL('/materials/dashboard?error=unauthorized', request.url));
  }

  const managerOnlyRoutes = ['/users', '/audit-logs', '/approvals', '/email-drafts', '/services/users', '/services/reports', '/services/archive', '/services/audit-logs', '/materials/users', '/materials/reports', '/materials/archive', '/materials/audit-logs'];

  if (managerOnlyRoutes.some((route) => pathname.startsWith(route)) && userRole !== 'manager') {
    return NextResponse.redirect(new URL(getDefaultRouteForRole(userRole), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
