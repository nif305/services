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

  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'الجلسة غير صالحة' }, { status: 401 });
    }

    const body = await request.json();
    const nextRole = mapPrismaRole(body?.role || '');

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status === 'DISABLED') {
      return NextResponse.json({ error: 'الجلسة غير صالحة' }, { status: 401 });
    }

    const roles = normalizeRoles(user.roles, user.role);

    if (!roles.includes(nextRole)) {
      return NextResponse.json({ error: 'هذا الدور غير متاح لهذا المستخدم' }, { status: 403 });
    }

    const response = NextResponse.json({ ok: true, role: nextRole, roles });

    response.cookies.set('user_role', nextRole, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set('user_roles', roles.join(','), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'تعذر تبديل الدور' }, { status: 500 });
  }
}
