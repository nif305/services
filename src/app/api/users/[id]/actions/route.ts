import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeText(value?: string | null) {
  return (value || '').trim();
}

function toPrismaRole(role?: string) {
  if (role === 'manager') return 'MANAGER';
  if (role === 'warehouse') return 'WAREHOUSE';
  return 'USER';
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

    if (action === 'approve') {
      await prisma.user.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'reject') {
      await prisma.user.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'activate') {
      await prisma.user.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'disable') {
      await prisma.user.update({
        where: { id },
        data: { status: 'DISABLED' },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'archive') {
      await prisma.user.update({
        where: { id },
        data: { status: 'DISABLED' },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'change-role') {
      await prisma.user.update({
        where: { id },
        data: { role: toPrismaRole(body?.role) },
      });
      return NextResponse.json({ ok: true });
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