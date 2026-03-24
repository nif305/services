import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AppRole = 'manager' | 'warehouse' | 'user';

function normalizeText(value?: string | null) {
  return (value || '').trim();
}

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function mapPrismaRole(role?: string | null): AppRole {
  const value = (role || '').toLowerCase();
  if (value === 'manager') return 'manager';
  if (value === 'warehouse') return 'warehouse';
  return 'user';
}

function toPrismaRole(role: AppRole) {
  if (role === 'manager') return 'MANAGER';
  if (role === 'warehouse') return 'WAREHOUSE';
  return 'USER';
}

function toPrismaStatus(status?: string) {
  if ((status || '').toLowerCase() === 'disabled') return 'DISABLED';
  return 'ACTIVE';
}

function normalizeRoles(value: unknown): AppRole[] {
  const raw = Array.isArray(value) ? value : [];
  const normalized = Array.from(
    new Set(
      raw
        .map((role) => mapPrismaRole(typeof role === 'string' ? role : ''))
        .filter(Boolean)
    )
  ) as AppRole[];

  if (!normalized.includes('user')) {
    normalized.push('user');
  }

  if (normalized.includes('manager')) {
    return ['manager', ...normalized.filter((role) => role !== 'manager')];
  }

  if (normalized.includes('warehouse')) {
    return ['warehouse', ...normalized.filter((role) => role !== 'warehouse')];
  }

  return normalized.length > 0 ? normalized : ['user'];
}

function resolvePrimaryRole(roles: AppRole[], requestedRole?: string | null): AppRole {
  const normalizedRequested = mapPrismaRole(requestedRole || '');

  if (roles.includes(normalizedRequested)) {
    return normalizedRequested;
  }

  if (roles.includes('manager')) return 'manager';
  if (roles.includes('warehouse')) return 'warehouse';
  return 'user';
}

function mapUser(user: any) {
  const roles = normalizeRoles(user?.roles?.length ? user.roles : [user?.role || 'USER']);

  return {
    id: user.id,
    employeeId: user.employeeId,
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    extension: user.jobTitle || '',
    department: user.department,
    jobTitle: user.jobTitle,
    operationalProject: user.department,
    role: mapPrismaRole(user.role),
    roles,
    status: user.status.toLowerCase(),
    avatar: user.avatar,
    undertaking: {
      accepted: !!user.undertaking?.accepted,
      acceptedAt: user.undertaking?.acceptedAt
        ? user.undertaking.acceptedAt.toISOString()
        : null,
    },
    createdAt: user.createdAt?.toISOString?.() || null,
    lastLoginAt: null,
    mustChangePassword: false,
  };
}

function isManagerRequest(request: NextRequest) {
  return request.cookies.get('user_role')?.value === 'manager';
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isManagerRequest(request)) {
    return NextResponse.json({ error: 'غير مصرح لك بالوصول' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    const fullName = normalizeText(body?.fullName);
    const email = normalizeEmail(body?.email);
    const mobile = normalizeText(body?.mobile);
    const extension = normalizeText(body?.extension);
    const department = normalizeText(body?.department);
    const jobTitle = normalizeText(body?.jobTitle);
    const operationalProject = normalizeText(body?.operationalProject);
    const password = normalizeText(body?.password);
    const status = normalizeText(body?.status).toLowerCase();

    const currentUser = await prisma.user.findUnique({
      where: { id },
      include: {
        undertaking: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const roles = normalizeRoles(body?.roles ?? currentUser.roles ?? [currentUser.role]);
    const primaryRole = resolvePrimaryRole(roles, body?.role || currentUser.role);

    if (email && email !== currentUser.email) {
      const emailOwner = await prisma.user.findUnique({ where: { email } });
      if (emailOwner && emailOwner.id !== id) {
        return NextResponse.json({ error: 'البريد الإلكتروني مستخدم من قبل' }, { status: 409 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        fullName: fullName || currentUser.fullName,
        email: email || currentUser.email,
        mobile: mobile || currentUser.mobile,
        department: operationalProject || department || currentUser.department,
        jobTitle: extension || jobTitle || currentUser.jobTitle,
        passwordHash: password || currentUser.passwordHash,
        role: toPrismaRole(primaryRole),
        roles: roles.map(toPrismaRole),
        status: toPrismaStatus(status || currentUser.status.toLowerCase()),
      },
      include: {
        undertaking: true,
      },
    });

    return NextResponse.json({ data: mapUser(updatedUser) });
  } catch {
    return NextResponse.json({ error: 'تعذر تحديث المستخدم' }, { status: 500 });
  }
}
