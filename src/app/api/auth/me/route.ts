import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AppRole = 'manager' | 'warehouse' | 'user';

function mapPrismaRole(role?: string | null): AppRole {
  const value = (role || '').toLowerCase();
  if (value === 'manager') return 'manager';
  if (value === 'warehouse') return 'warehouse';
  return 'user';
}

function normalizeRoles(roles: unknown, fallbackRole?: string | null): AppRole[] {
  const raw = Array.isArray(roles) && roles.length > 0 ? roles : [fallbackRole || 'USER'];
  const normalized = Array.from(new Set(raw.map((role) => mapPrismaRole(String(role)))));

  if (!normalized.includes('user')) {
    normalized.push('user');
  }

  if (normalized.includes('manager')) {
    return ['manager', ...normalized.filter((role) => role !== 'manager')];
  }

  if (normalized.includes('warehouse')) {
    return ['warehouse', ...normalized.filter((role) => role !== 'warehouse')];
  }

  return normalized;
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

  return response;
}

function setSessionCookies(response: NextResponse, user: any, activeRole: AppRole, roles: AppRole[]) {
  const maxAge = 60 * 60 * 24 * 7;
  const cookieOptions = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: true,
    path: '/',
    maxAge,
  };

  response.cookies.set('inventory_platform_session', 'active', cookieOptions);
  response.cookies.set('user_id', user.id, cookieOptions);
  response.cookies.set('user_role', activeRole, cookieOptions);
  response.cookies.set('user_roles', roles.join(','), cookieOptions);
  response.cookies.set('user_status', user.status.toLowerCase(), cookieOptions);
  response.cookies.set('user_email', user.email, cookieOptions);
  response.cookies.set('user_name', user.fullName, cookieOptions);
  response.cookies.set('user_department', user.department || '', cookieOptions);
  response.cookies.set('user_employee_id', user.employeeId || '', cookieOptions);
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

    const roles = normalizeRoles(user.roles, user.role);
    const cookieRole = mapPrismaRole(request.cookies.get('user_role')?.value || '');
    const activeRole = roles.includes(cookieRole)
      ? cookieRole
      : roles.includes('manager')
        ? 'manager'
        : roles.includes('warehouse')
          ? 'warehouse'
          : 'user';

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

    setSessionCookies(response, user, activeRole, roles);
    return response;
  } catch {
    return clearSessionResponse();
  }
}
