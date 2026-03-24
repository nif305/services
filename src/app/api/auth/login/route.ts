import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AppRole = 'manager' | 'warehouse' | 'user';

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function normalizeText(value?: string | null) {
  return (value || '').trim();
}

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

function resolvePrimaryRole(roles: AppRole[], role?: string | null): AppRole {
  const current = mapPrismaRole(role || '');
  if (roles.includes(current)) return current;
  if (roles.includes('manager')) return 'manager';
  if (roles.includes('warehouse')) return 'warehouse';
  return 'user';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body?.email);
    const password = normalizeText(body?.password);

    if (!email) {
      return NextResponse.json({ error: 'يرجى إدخال البريد الإلكتروني' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'يرجى إدخال كلمة المرور' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        undertaking: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    if (user.status === 'DISABLED') {
      return NextResponse.json({ error: 'الحساب موقوف' }, { status: 403 });
    }

    if (user.passwordHash !== password) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    const roles = normalizeRoles(user.roles, user.role);
    const activeRole = resolvePrimaryRole(roles, user.role);
    const nowIso = new Date().toISOString();

    const response = NextResponse.json({
      ok: true,
      data: {
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
        lastLoginAt: nowIso,
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
    return NextResponse.json({ error: 'تعذر تسجيل الدخول' }, { status: 500 });
  }
}
