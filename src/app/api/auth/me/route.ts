import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type SessionRole = 'user' | 'warehouse' | 'manager';

function normalizeRole(role: string): SessionRole {
  const value = role.toLowerCase();

  if (value === 'manager') return 'manager';
  if (value === 'warehouse') return 'warehouse';
  return 'user';
}

function normalizeRoles(roles: string[] | null | undefined): SessionRole[] {
  const normalized = Array.from(
    new Set((roles ?? []).map((role) => normalizeRole(role)))
  );

  if (!normalized.includes('user')) {
    normalized.unshift('user');
  }

  return normalized;
}

function getPrimaryRole(roles: SessionRole[]): SessionRole {
  if (roles.includes('manager')) return 'manager';
  if (roles.includes('warehouse')) return 'warehouse';
  return 'user';
}

function buildExpiredCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: true,
    path: '/',
    expires: new Date(0),
  };
}

function buildActiveCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}

function clearSessionResponse() {
  const response = NextResponse.json({ user: null }, { status: 401 });
  const cookieOptions = buildExpiredCookieOptions();

  response.cookies.set('inventory_platform_session', '', cookieOptions);
  response.cookies.set('user_id', '', cookieOptions);
  response.cookies.set('user_role', '', cookieOptions);
  response.cookies.set('user_roles', '', cookieOptions);
  response.cookies.set('user_status', '', cookieOptions);
  response.cookies.set('user_email', '', cookieOptions);
  response.cookies.set('user_name', '', cookieOptions);
  response.cookies.set('user_department', '', cookieOptions);
  response.cookies.set('user_employee_id', '', cookieOptions);

  return response;
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return clearSessionResponse();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        undertaking: true,
      },
    });

    if (!user || user.status === 'DISABLED') {
      return clearSessionResponse();
    }

    const roles = normalizeRoles(
      Array.isArray((user as any).roles)
        ? (user as any).roles
        : [String((user as any).role ?? 'USER')]
    );

    const primaryRole = getPrimaryRole(roles);
    const cookieOptions = buildActiveCookieOptions();

    const response = NextResponse.json({
      user: {
        id: user.id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        extension: user.jobTitle || '',
        department: user.department,
        jobTitle: user.jobTitle,
        operationalProject: user.department || '',
        role: primaryRole,
        roles,
        status: user.status.toLowerCase(),
        avatar: user.avatar,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: null,
        mustChangePassword: false,
        undertaking: {
          accepted: !!user.undertaking?.accepted,
          acceptedAt: user.undertaking?.acceptedAt
            ? user.undertaking.acceptedAt.toISOString()
            : null,
        },
      },
    });

    response.cookies.set('inventory_platform_session', 'active', cookieOptions);
    response.cookies.set('user_id', user.id, cookieOptions);
    response.cookies.set('user_role', primaryRole, cookieOptions);
    response.cookies.set('user_roles', JSON.stringify(roles), cookieOptions);
    response.cookies.set('user_status', user.status.toLowerCase(), cookieOptions);
    response.cookies.set('user_email', user.email, cookieOptions);
    response.cookies.set('user_name', user.fullName, cookieOptions);
    response.cookies.set('user_department', user.department || '', cookieOptions);
    response.cookies.set('user_employee_id', user.employeeId || '', cookieOptions);

    return response;
  } catch {
    return clearSessionResponse();
  }
}
