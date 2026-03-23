import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AppRole = 'manager' | 'warehouse' | 'user';

function deriveRolesFromUser(user: { role?: string | null; roles?: string[] | null }): AppRole[] {
  const rawRoles = Array.isArray(user?.roles) ? user.roles : [];
  const normalized = rawRoles
    .map((role) => (role || '').toLowerCase())
    .filter((role): role is AppRole => role === 'manager' || role === 'warehouse' || role === 'user');

  if (normalized.length > 0) {
    return Array.from(new Set(normalized.includes('user') ? normalized : ['user', ...normalized]));
  }

  const fallbackRole = (user?.role || '').toLowerCase();
  if (fallbackRole === 'manager') return ['user', 'manager'];
  if (fallbackRole === 'warehouse') return ['user', 'warehouse'];
  return ['user'];
}

function getPrimaryRole(roles: AppRole[], fallbackRole?: string | null): AppRole {
  if (roles.includes('manager')) return 'manager';
  if (roles.includes('warehouse')) return 'warehouse';

  const fallback = (fallbackRole || '').toLowerCase();
  if (fallback === 'manager') return 'manager';
  if (fallback === 'warehouse') return 'warehouse';
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

    if (!user) {
      return clearSessionResponse();
    }

    if (user.status === 'DISABLED') {
      return clearSessionResponse();
    }

    const roles = deriveRolesFromUser({ role: user.role, roles: user.roles });
    const primaryRole = getPrimaryRole(roles, user.role);

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

    response.cookies.set('inventory_platform_session', 'active', {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set('user_role', primaryRole, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set('user_status', user.status.toLowerCase(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set('user_email', user.email, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set('user_name', user.fullName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set('user_department', user.department || '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set('user_employee_id', user.employeeId || '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return clearSessionResponse();
  }
}
