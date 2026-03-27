import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeRoles(roleOrRoles: unknown): string[] {
  if (Array.isArray(roleOrRoles)) {
    return roleOrRoles
      .map((role) => String(role).toLowerCase())
      .filter(Boolean);
  }

  if (typeof roleOrRoles === 'string' && roleOrRoles.trim()) {
    return [roleOrRoles.toLowerCase()];
  }

  return ['user'];
}

function getPrimaryRole(roles: string[]): string {
  if (roles.includes('manager')) return 'manager';
  if (roles.includes('warehouse')) return 'warehouse';
  return 'user';
}

function clearSessionResponse() {
  const response = NextResponse.json({ user: null }, { status: 401 });

  const cookieOptions = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: true,
    path: '/',
    expires: new Date(0),
  };

  response.cookies.set('inventory_platform_session', '', cookieOptions);
  response.cookies.set('user_id', '', cookieOptions);
  response.cookies.set('user_role', '', cookieOptions);
  response.cookies.set('user_roles', '', cookieOptions);
  response.cookies.set('user_status', '', cookieOptions);
  response.cookies.set('user_email', '', cookieOptions);
  response.cookies.set('user_name', '', cookieOptions);
  response.cookies.set('user_department', '', cookieOptions);
  response.cookies.set('user_employee_id', '', cookieOptions);
  response.cookies.set('active_role', '', cookieOptions);

  return response;
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    const activeRoleFromCookie = request.cookies.get('active_role')?.value?.toLowerCase();

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

    const roles = normalizeRoles((user as { roles?: string[]; role?: string }).roles ?? user.role);
    const primaryRole = getPrimaryRole(roles);
    const activeRole = activeRoleFromCookie && roles.includes(activeRoleFromCookie)
      ? activeRoleFromCookie
      : primaryRole;

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
        role: activeRole,
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

    const cookieOptions = {
      httpOnly: true as const,
      sameSite: 'lax' as const,
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    };

    response.cookies.set('inventory_platform_session', 'active', cookieOptions);
    response.cookies.set('user_id', user.id, cookieOptions);
    response.cookies.set('user_role', activeRole, cookieOptions);
    response.cookies.set('user_roles', JSON.stringify(roles), cookieOptions);
    response.cookies.set('active_role', activeRole, cookieOptions);
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
