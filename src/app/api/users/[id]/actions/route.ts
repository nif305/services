import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeText(value?: string | null) {
  return (value || '').trim();
}

function normalizeRoles(input: unknown): Array<'USER' | 'WAREHOUSE' | 'MANAGER'> {
  const values = Array.isArray(input) ? input : input ? [input] : [];

  const mapped = values
    .map((value) => String(value || '').trim().toLowerCase())
    .map((value) => {
      if (value === 'manager' || value === 'مدير') return 'MANAGER' as const;
      if (value === 'warehouse' || value === 'مسؤول مخزن') return 'WAREHOUSE' as const;
      return 'USER' as const;
    });

  const unique = Array.from(new Set(mapped));

  if (!unique.includes('USER')) {
    unique.unshift('USER');
  }

  return unique;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = body?.action;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (action === 'activate' || action === 'approve') {
      await prisma.user.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'disable' || action === 'archive' || action === 'reject') {
      await prisma.user.update({
        where: { id },
        data: { status: 'DISABLED' },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'change-role') {
      const roles = normalizeRoles(body?.roles ?? body?.role);

      await prisma.user.update({
        where: { id },
        data: { roles },
      });

      return NextResponse.json({ ok: true, roles });
    }

    if (action === 'reset-password') {
      const password = normalizeText(body?.password);

      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'كلمة المرور الجديدة غير صالحة' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id },
        data: { passwordHash: password },
      });

      return NextResponse.json({ ok: true, password });
    }

    return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'تعذر تنفيذ العملية' }, { status: 500 });
  }
}
