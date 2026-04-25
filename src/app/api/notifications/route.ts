import { NextRequest, NextResponse } from 'next/server';
import { Role, Status } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AlertService } from '@/services/alert.service';

function mapRole(role: string): Role {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'manager') return Role.MANAGER;
  if (normalized === 'warehouse') return Role.WAREHOUSE;
  return Role.USER;
}

async function resolveSessionUser(request: NextRequest) {
  const cookieId = decodeURIComponent(request.cookies.get('user_id')?.value || '').trim();
  const cookieEmail = decodeURIComponent(request.cookies.get('user_email')?.value || '').trim();
  const cookieEmployeeId = decodeURIComponent(request.cookies.get('user_employee_id')?.value || '').trim();
  const activeRole = mapRole(
    decodeURIComponent(
      request.headers.get('x-active-role') ||
        request.cookies.get('server_active_role')?.value ||
        request.cookies.get('active_role')?.value ||
        request.cookies.get('user_role')?.value ||
        'user'
    ).trim()
  );

  let user = null as null | { id: string; status: Status; roles: Role[] };

  if (cookieId) {
    user = await prisma.user.findUnique({
      where: { id: cookieId },
      select: { id: true, status: true, roles: true },
    });
  }

  if (!user && cookieEmail) {
    user = await prisma.user.findFirst({
      where: { email: { equals: cookieEmail, mode: 'insensitive' } },
      select: { id: true, status: true, roles: true },
    });
  }

  if (!user && cookieEmployeeId) {
    user = await prisma.user.findUnique({
      where: { employeeId: cookieEmployeeId },
      select: { id: true, status: true, roles: true },
    });
  }

  if (!user) {
    throw new Error('تعذر التحقق من المستخدم الحالي. أعد تسجيل الدخول ثم حاول مرة أخرى.');
  }

  if (user.status !== Status.ACTIVE) {
    throw new Error('الحساب غير نشط.');
  }

  if (!Array.isArray(user.roles) || !user.roles.includes(activeRole)) {
    throw new Error('الدور النشط غير صالح لهذا المستخدم.');
  }

  return {
    id: user.id,
    status: user.status,
    role: activeRole,
    roles: user.roles,
  };
}

function authStatusCode(error: any) {
  const message = String(error?.message || '');
  if (
    message === 'تعذر التحقق من المستخدم الحالي. أعد تسجيل الدخول ثم حاول مرة أخرى.' ||
    message === 'الحساب غير نشط.' ||
    message === 'الدور النشط غير صالح لهذا المستخدم.'
  ) {
    return 401;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser(request);
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
    const limit = Math.min(Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 100)), 200);
    const skip = (page - 1) * limit;

    await AlertService.syncWarehouseAlerts();

    const where = { userId: sessionUser.id };
    const [data, unread, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId: sessionUser.id, isRead: false } }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      data,
      stats: { unread, total },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'تعذر جلب الإشعارات' },
      { status: authStatusCode(error) || 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser(request);
    const body = await request.json();
    const notification = await prisma.notification.findUnique({
      where: { id: String(body.id || '') },
    });

    if (!notification || notification.userId !== sessionUser.id) {
      return NextResponse.json({ error: 'الإشعار غير موجود أو غير مصرح' }, { status: 404 });
    }

    const result = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'تعذر تحديث الإشعار' },
      { status: authStatusCode(error) || 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser(request);
    const body = await request.json();
    const action = String(body.action || '').trim();

    if (action !== 'create-manager-request') {
      return NextResponse.json({ error: 'الإجراء غير صالح' }, { status: 400 });
    }

    const notificationId = String(body.id || '').trim();
    if (!notificationId) {
      return NextResponse.json({ error: 'رقم الإشعار مطلوب' }, { status: 400 });
    }

    const data = await AlertService.createManagerRequestFromNotification({
      notificationId,
      actorId: sessionUser.id,
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'تعذر تحويل التذكير إلى طلب مدير' },
      { status: authStatusCode(error) || 400 }
    );
  }
}
