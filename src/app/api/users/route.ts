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

function getUserRoles(user: any): AppRole[] {
  const rawRoles = Array.isArray(user?.roles) && user.roles.length > 0 ? user.roles : [user?.role || 'USER'];
  const normalized = Array.from(new Set(rawRoles.map((role: string) => mapPrismaRole(role))));

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

function mapUser(user: any) {
  const roles = getUserRoles(user);

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

export async function GET(request: NextRequest) {
  if (!isManagerRequest(request)) {
    return NextResponse.json({ error: 'غير مصرح لك بالوصول' }, { status: 403 });
  }

  try {
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
  if (!isManagerRequest(request)) {
    return NextResponse.json({ error: 'غير مصرح لك بالوصول' }, { status: 403 });
  }

  try {
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
