import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AppRole = 'manager' | 'warehouse' | 'user';

function normalizeText(value?: string | null) {
  return (value || '').trim();
}

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

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

function mapUser(user: any) {
  const roles = deriveRolesFromUser({ role: user.role, roles: user.roles });

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
    role: user.role.toLowerCase(),
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

function toPrismaRole(role: AppRole) {
  if (role === 'manager') return 'MANAGER';
  if (role === 'warehouse') return 'WAREHOUSE';
  return 'USER';
}

function toPrismaStatus(status?: string) {
  if (status === 'disabled') return 'DISABLED';
  return 'ACTIVE';
}

function normalizeIncomingRoles(body: any): AppRole[] {
  const incoming = Array.isArray(body?.roles)
    ? body.roles
    : body?.role
      ? [body.role]
      : ['user'];

  const normalized = incoming
    .map((role) => normalizeText(role).toLowerCase())
    .filter((role): role is AppRole => role === 'manager' || role === 'warehouse' || role === 'user');

  if (!normalized.includes('user')) {
    normalized.unshift('user');
  }

  return Array.from(new Set(normalized));
}

function getPrimaryRole(roles: AppRole[]) {
  if (roles.includes('manager')) return 'manager' as const;
  if (roles.includes('warehouse')) return 'warehouse' as const;
  return 'user' as const;
}

async function ensureManager(request: NextRequest) {
  const userId = request.cookies.get('user_id')?.value;

  if (!userId) {
    return null;
  }

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      roles: true,
      status: true,
    },
  });

  if (!actor || actor.status !== 'ACTIVE') {
    return null;
  }

  const actorRoles = deriveRolesFromUser({ role: actor.role, roles: actor.roles });
  if (!actorRoles.includes('manager')) {
    return null;
  }

  return actor;
}

async function updateUserHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await ensureManager(request);

    if (!actor) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول' }, { status: 403 });
    }

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
    const roles = normalizeIncomingRoles(body);
    const primaryRole = getPrimaryRole(roles);

    const currentUser = await prisma.user.findUnique({
      where: { id },
      include: {
        undertaking: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (email) {
      const duplicated = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
      });

      if (duplicated) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني مستخدم من حساب آخر' },
          { status: 409 }
        );
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
        status: status ? toPrismaStatus(status) : currentUser.status,
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await ensureManager(request);

    if (!actor) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول' }, { status: 403 });
    }

    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        undertaking: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ data: mapUser(user) });
  } catch {
    return NextResponse.json({ error: 'تعذر جلب المستخدم' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return updateUserHandler(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return updateUserHandler(request, context);
}
