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

export async function GET(request: NextRequest) {
  try {
    const actor = await ensureManager(request);

    if (!actor) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: {
        undertaking: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      data: users.map(mapUser),
    });
  } catch {
    return NextResponse.json({ error: 'تعذر جلب المستخدمين' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await ensureManager(request);

    if (!actor) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول' }, { status: 403 });
    }

    const body = await request.json();

    const fullName = normalizeText(body?.fullName);
    const email = normalizeEmail(body?.email);
    const mobile = normalizeText(body?.mobile);
    const extension = normalizeText(body?.extension);
    const operationalProject = normalizeText(body?.operationalProject);
    const password = normalizeText(body?.password);

    if (!fullName || !email || !mobile || !password) {
      return NextResponse.json({ error: 'البيانات المطلوبة غير مكتملة' }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });

    if (exists) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم من قبل' }, { status: 409 });
    }

    const count = await prisma.user.count();
    const employeeId = `NAUSS-${String(count + 1).padStart(3, '0')}`;

    const user = await prisma.user.create({
      data: {
        employeeId,
        fullName,
        email,
        mobile,
        department: operationalProject || 'لا ينطبق',
        jobTitle: extension || '',
        passwordHash: password,
        role: 'USER',
        roles: ['USER'],
        status: 'ACTIVE',
      },
      include: {
        undertaking: true,
      },
    });

    return NextResponse.json({ data: mapUser(user) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'تعذر إنشاء المستخدم' }, { status: 500 });
  }
}
