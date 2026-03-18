import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function normalizeText(value?: string | null) {
  return (value || '').trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const fullName = normalizeText(body?.fullName);
    const email = normalizeEmail(body?.email);
    const mobile = normalizeText(body?.mobile);
    const extension = normalizeText(body?.extension);
    const operationalProject = normalizeText(body?.operationalProject);
    const password = normalizeText(body?.password);
    const undertakingAccepted = Boolean(body?.undertakingAccepted);

    if (!fullName || !email || !mobile || !operationalProject || !password) {
      return NextResponse.json({ error: 'البيانات المطلوبة غير مكتملة' }, { status: 400 });
    }

    if (!undertakingAccepted) {
      return NextResponse.json({ error: 'يجب قبول التعهد قبل إرسال الطلب' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'يوجد حساب أو طلب سابق بهذا البريد الإلكتروني' },
        { status: 409 }
      );
    }

    const usersCount = await prisma.user.count();
    const employeeId = `NAUSS-${String(usersCount + 1).padStart(3, '0')}`;

    const user = await prisma.user.create({
      data: {
        employeeId,
        fullName,
        email,
        mobile,
        department:
          operationalProject && operationalProject !== 'لا ينطبق'
            ? operationalProject
            : 'وكالة التدريب',
        jobTitle: 'موظف',
        passwordHash: password,
        role: 'USER',
        status: 'PENDING',
      },
    });

    await prisma.undertaking.create({
      data: {
        userId: user.id,
        accepted: true,
        acceptedAt: new Date(),
        version: '1.0',
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'تعذر إرسال الطلب' }, { status: 500 });
  }
}