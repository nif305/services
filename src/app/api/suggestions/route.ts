import { NextRequest, NextResponse } from 'next/server';
import {
  MaintenanceStatus,
  Priority,
  PurchaseStatus,
  Role,
  Status,
  SuggestionStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

const CATEGORY_VALUES = ['MAINTENANCE', 'CLEANING', 'PURCHASE', 'OTHER'] as const;
type SuggestionCategory = (typeof CATEGORY_VALUES)[number];

function mapRole(role: string): Role {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'manager') return Role.MANAGER;
  if (normalized === 'warehouse') return Role.WAREHOUSE;
  return Role.USER;
}

function normalizeCategory(value: any): SuggestionCategory {
  const normalized = String(value || '').trim().toUpperCase();
  if (CATEGORY_VALUES.includes(normalized as SuggestionCategory)) {
    return normalized as SuggestionCategory;
  }
  return 'OTHER';
}

function normalizePriority(value: any): Priority {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'LOW') return Priority.LOW;
  if (normalized === 'HIGH') return Priority.HIGH;
  if (normalized === 'URGENT') return Priority.URGENT;
  return Priority.NORMAL;
}

function normalizeTargetDepartment(value: any) {
  const normalized = String(value || '').trim().toUpperCase();
  if (['SUPPORT_SERVICES', 'FINANCE', 'OTHER'].includes(normalized)) return normalized;
  return 'OTHER';
}

function parseJsonObject(value?: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function resolveSessionUser(request: NextRequest) {
  const cookieId = decodeURIComponent(request.cookies.get('user_id')?.value || '').trim();
  const cookieEmail = decodeURIComponent(request.cookies.get('user_email')?.value || '').trim();
  const cookieName = decodeURIComponent(request.cookies.get('user_name')?.value || 'مستخدم النظام').trim();
  const cookieDepartment = decodeURIComponent(request.cookies.get('user_department')?.value || 'إدارة عمليات التدريب').trim();
  const cookieEmployeeId = decodeURIComponent(request.cookies.get('user_employee_id')?.value || '').trim();
  const activeRole = decodeURIComponent(
    request.headers.get('x-active-role') ||
      request.cookies.get('server_active_role')?.value ||
      request.cookies.get('active_role')?.value ||
      request.cookies.get('user_role')?.value ||
      'user'
  ).trim();

  const role = mapRole(activeRole);

  let user: any = null;

  if (cookieId) {
    user = await prisma.user.findUnique({
      where: { id: cookieId },
      select: { id: true, roles: true, fullName: true, department: true, email: true, employeeId: true, status: true },
    });
  }

  if (!user && cookieEmail) {
    user = await prisma.user.findFirst({
      where: { email: { equals: cookieEmail, mode: 'insensitive' } },
      select: { id: true, roles: true, fullName: true, department: true, email: true, employeeId: true, status: true },
    });
  }

  if (!user && cookieEmployeeId) {
    user = await prisma.user.findUnique({
      where: { employeeId: cookieEmployeeId },
      select: { id: true, roles: true, fullName: true, department: true, email: true, employeeId: true, status: true },
    });
  }

  if (!user) throw new Error('تعذر التحقق من المستخدم الحالي. أعد تسجيل الدخول ثم حاول مرة أخرى.');
  if (user.status !== Status.ACTIVE) throw new Error('الحساب غير نشط.');
  if (!Array.isArray(user.roles) || !user.roles.includes(role)) throw new Error('غير مصرح.');

  return {
    id: user.id,
    fullName: user.fullName || cookieName,
    department: user.department || cookieDepartment,
    email: user.email || cookieEmail,
    employeeId: user.employeeId || cookieEmployeeId,
    role,
    roles: user.roles,
  };
}

function buildFormalBody(input: {
  category: SuggestionCategory;
  requestCode: string;
  createdAt: Date;
  title: string;
  description: string;
  requesterName: string;
  requesterDepartment: string;
  requesterEmail: string;
  itemName?: string;
  quantity?: number;
  location?: string;
  extraMeta?: string;
  adminNotes?: string;
}) {
  const subjectLabel =
    input.category === 'MAINTENANCE'
      ? 'طلب صيانة'
      : input.category === 'CLEANING'
      ? 'طلب نظافة'
      : input.category === 'PURCHASE'
      ? 'طلب شراء مباشر'
      : 'طلب آخر';

  return [
    `السلام عليكم ورحمة الله وبركاته،`,
    ``,
    `نفيدكم بأنه تم اعتماد ${subjectLabel} وإحالته للجهة المختصة، وفق البيانات التالية:`,
    ``,
    `رقم الطلب: ${input.requestCode}`,
    `عنوان الطلب: ${input.title}`,
    `التاريخ: ${new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(input.createdAt))}`,
    `مقدم الطلب: ${input.requesterName}`,
    `الإدارة: ${input.requesterDepartment}`,
    input.requesterEmail ? `البريد الإلكتروني: ${input.requesterEmail}` : '',
    input.itemName ? `العنصر/الجزء: ${input.itemName}` : '',
    input.quantity ? `الكمية: ${input.quantity}` : '',
    input.location ? `الموقع: ${input.location}` : '',
    ``,
    `وصف الطلب:`,
    input.description,
    input.extraMeta ? `\nتفاصيل مساندة: ${input.extraMeta}` : '',
    input.adminNotes ? `\nملاحظة المدير: ${input.adminNotes}` : '',
    ``,
    `وتقبلوا خالص التحية.`,
  ]
    .filter(Boolean)
    .join('\n');
}

function uniqueEmails(values: Array<string | null | undefined>) {
  return [...new Set(values.flatMap((value) => String(value || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean)))].join(',');
}

function resolveRecipients(category: SuggestionCategory, requesterEmail?: string | null, externalRecipient?: string | null) {
  if (category === 'MAINTENANCE' || category === 'CLEANING') {
    return uniqueEmails(['ssd@nauss.edu.sa', 'AAlosaimi@nauss.edu.sa', externalRecipient, requesterEmail]);
  }
  if (category === 'PURCHASE') {
    return uniqueEmails(['finance@nauss.edu.sa', 'aalaraj@nauss.edu.sa', 'YAlqaoud@nauss.edu.sa', 'Procurement@nauss.edu.sa', externalRecipient, requesterEmail]);
  }
  return uniqueEmails([externalRecipient, requesterEmail]);
}

async function generateNextCode(prefix: string, model: 'maintenanceRequest' | 'purchaseRequest') {
  const year = new Date().getFullYear();
  const latest = await (prisma as any)[model].findFirst({
    orderBy: { createdAt: 'desc' },
    select: { code: true },
  });
  const num = Number(String(latest?.code || '').split('-').pop() || 0) + 1;
  return `${prefix}-${year}-${String(num).padStart(4, '0')}`;
}

function generateOtherCode() {
  const now = new Date();
  return `OTH-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`;
}

async function notifyManagersAboutSuggestion(input: { suggestionId: string; category: SuggestionCategory; title: string; requesterName: string }) {
  const managers = await prisma.user.findMany({
    where: { roles: { has: Role.MANAGER }, status: Status.ACTIVE },
    select: { id: true },
  });
  if (!managers.length) return;
  await prisma.notification.createMany({
    data: managers.map((user) => ({
      userId: user.id,
      type: 'NEW_SUGGESTION',
      title: 'طلب خدمي جديد',
      message: `تم رفع ${input.title} من ${input.requesterName}`,
      link: '/suggestions',
      entityId: input.suggestionId,
      entityType: 'suggestion',
    })),
  });
}

async function notifyRequesterAboutSuggestion(input: {
  requesterId: string;
  suggestionId: string;
  category: SuggestionCategory;
  title: string;
  action: 'APPROVED' | 'REJECTED';
  reason?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: input.requesterId,
      type: input.action === 'APPROVED' ? 'SUGGESTION_APPROVED' : 'SUGGESTION_REJECTED',
      title: input.action === 'APPROVED' ? 'تم اعتماد الطلب' : 'تم رفض الطلب',
      message: input.action === 'APPROVED' ? `تم اعتماد ${input.title}` : `تم رفض ${input.title}${input.reason ? ` - ${input.reason}` : ''}`,
      link: '/suggestions',
      entityId: input.suggestionId,
      entityType: 'suggestion',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser(request);
    const category = request.nextUrl.searchParams.get('category');

    const where: any = sessionUser.role === Role.MANAGER ? {} : { requesterId: sessionUser.id };
    if (category) where.category = normalizeCategory(category);

    const suggestions = await prisma.suggestion.findMany({ where, orderBy: { createdAt: 'desc' } });

    const users = await prisma.user.findMany({
      where: { id: { in: [...new Set(suggestions.map((s) => s.requesterId))] } },
      select: { id: true, fullName: true, department: true, roles: true, email: true },
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      data: suggestions.map((item) => ({
        ...item,
        requester: usersMap.get(item.requesterId)
          ? {
              fullName: usersMap.get(item.requesterId)?.fullName,
              department: usersMap.get(item.requesterId)?.department,
              email: usersMap.get(item.requesterId)?.email,
            }
          : null,
      })),
      stats: {
        total: suggestions.length,
        pending: suggestions.filter((s) => s.status === SuggestionStatus.PENDING).length,
        approved: suggestions.filter((s) => s.status === SuggestionStatus.APPROVED || s.status === SuggestionStatus.IMPLEMENTED).length,
        rejected: suggestions.filter((s) => s.status === SuggestionStatus.REJECTED).length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'تعذر جلب الطلبات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionUser = await resolveSessionUser(request);

    const category = normalizeCategory(body.category);
    const priority = normalizePriority(body.priority);
    const itemName = String(body.itemName || '').trim();
    const quantity = Math.max(1, Number(body.quantity || 1));
    const location = String(body.location || '').trim();
    const externalRecipient = String(body.externalRecipient || '').trim();
    const requestSource = String(body.requestSource || '').trim();
    const programName = String(body.programName || '').trim();
    const area = String(body.area || '').trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    const description = String(body.description || '').trim();
    const extraMeta = String(body.justification || '').trim();
    const title =
      String(body.title || '').trim() ||
      (category === 'MAINTENANCE'
        ? 'طلب صيانة'
        : category === 'CLEANING'
        ? 'طلب نظافة'
        : category === 'PURCHASE'
        ? 'طلب شراء مباشر'
        : 'طلب آخر');

    if (!description) {
      return NextResponse.json({ error: 'سبب الطلب أو الملاحظة حقل مطلوب' }, { status: 400 });
    }

    if ((category === 'MAINTENANCE' || category === 'CLEANING') && !itemName) {
      return NextResponse.json({ error: category === 'MAINTENANCE' ? 'حدد الجزء المطلوب صيانته' : 'حدد الموقع أو الجزء المطلوب تنظيفه' }, { status: 400 });
    }

    if (category === 'PURCHASE' && !itemName) {
      return NextResponse.json({ error: 'اسم الصنف المطلوب حقل مطلوب' }, { status: 400 });
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        title,
        description,
        justification: JSON.stringify({
          extraMeta,
          itemName,
          quantity,
          location,
          externalRecipient,
          requestSource,
          programName,
          area,
          attachments,
        }),
        category,
        priority,
        requesterId: sessionUser.id,
        status: SuggestionStatus.PENDING,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: 'CREATE_SUGGESTION',
        entity: 'Suggestion',
        entityId: suggestion.id,
        details: JSON.stringify({ title, category, itemName, quantity, location }),
      },
    });

    await notifyManagersAboutSuggestion({
      suggestionId: suggestion.id,
      category,
      title,
      requesterName: sessionUser.fullName || 'مستخدم النظام',
    });

    return NextResponse.json({ data: suggestion }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'تعذر إنشاء الطلب' }, { status: 400 });
  }
}

async function handleDecision(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionUser = await resolveSessionUser(request);

    if (sessionUser.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const suggestionId = String(body.suggestionId || '').trim();
    const action = String(body.action || '').trim().toLowerCase();
    const adminNotes = String(body.adminNotes || '').trim();
    const targetDepartment = normalizeTargetDepartment(body.targetDepartment);
    const managerRecipient = String(body.managerRecipient || '').trim();

    if (!suggestionId || !action) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
    if (!suggestion) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const requester = await prisma.user.findUnique({
      where: { id: suggestion.requesterId },
      select: { id: true, fullName: true, department: true, email: true },
    });

    const meta = parseJsonObject(suggestion.justification);

    if (action === 'reject') {
      const updated = await prisma.suggestion.update({
        where: { id: suggestionId },
        data: { status: SuggestionStatus.REJECTED, adminNotes },
      });

      await prisma.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: 'REJECT_SUGGESTION',
          entity: 'Suggestion',
          entityId: suggestion.id,
          details: JSON.stringify({ adminNotes }),
        },
      });

      await notifyRequesterAboutSuggestion({
        requesterId: suggestion.requesterId,
        suggestionId: suggestion.id,
        category: normalizeCategory(suggestion.category),
        title: suggestion.title,
        action: 'REJECTED',
        reason: adminNotes,
      });

      return NextResponse.json({ data: updated });
    }

    if (action !== 'approve') {
      return NextResponse.json({ error: 'الإجراء غير صالح' }, { status: 400 });
    }

    const category = normalizeCategory(suggestion.category);
    const itemName = String(meta.itemName || '').trim();
    const quantity = Math.max(1, Number(meta.quantity || 1));
    const location = String(meta.location || '').trim();
    const externalRecipient = String(meta.externalRecipient || '').trim();
    const extraMeta = String(meta.extraMeta || '').trim();

    let linkedEntityType = '';
    let linkedEntityId = '';
    let linkedCode = '';

    if (category === 'MAINTENANCE' || category === 'CLEANING') {
      const code = await generateNextCode('MNT', 'maintenanceRequest');
      const maintenance = await prisma.maintenanceRequest.create({
        data: {
          code,
          requesterId: suggestion.requesterId,
          category: category === 'CLEANING' ? 'CLEANING' : 'TECHNICAL',
          description: suggestion.description,
          priority: suggestion.priority,
          status: MaintenanceStatus.APPROVED,
          notes: [
            itemName ? `العنصر/الجزء: ${itemName}` : '',
            location ? `الموقع: ${location}` : '',
            extraMeta ? `تفاصيل مساندة: ${extraMeta}` : '',
            adminNotes ? `ملاحظة المدير: ${adminNotes}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
        },
      });

      const recipient = resolveRecipients(category, requester?.email, externalRecipient);
      await prisma.emailDraft.create({
        data: {
          sourceType: category === 'CLEANING' ? 'cleaning' : 'maintenance',
          sourceId: maintenance.id,
          recipient,
          subject: `${category === 'CLEANING' ? 'طلب نظافة' : 'طلب صيانة'} - ${maintenance.code}`,
          body: buildFormalBody({
            category,
            requestCode: maintenance.code,
            createdAt: suggestion.createdAt,
            title: suggestion.title,
            description: suggestion.description,
            requesterName: requester?.fullName || '—',
            requesterDepartment: requester?.department || '—',
            requesterEmail: requester?.email || '',
            itemName,
            quantity,
            location,
            extraMeta,
            adminNotes,
          }),
          status: 'DRAFT',
        },
      });

      linkedEntityType = 'MaintenanceRequest';
      linkedEntityId = maintenance.id;
      linkedCode = maintenance.code;
    } else if (category === 'PURCHASE') {
      const code = await generateNextCode('PUR', 'purchaseRequest');
      const purchase = await prisma.purchaseRequest.create({
        data: {
          code,
          requesterId: suggestion.requesterId,
          items: itemName ? `${itemName} × ${quantity}` : suggestion.title,
          reason: suggestion.description,
          budgetNote: [extraMeta ? `تفاصيل مساندة: ${extraMeta}` : '', location ? `الموقع: ${location}` : '', adminNotes ? `ملاحظة المدير: ${adminNotes}` : '']
            .filter(Boolean)
            .join(' | '),
          status: PurchaseStatus.APPROVED,
          targetDepartment,
        },
      });

      const recipient = resolveRecipients(category, requester?.email, externalRecipient);
      await prisma.emailDraft.create({
        data: {
          sourceType: 'purchase',
          sourceId: purchase.id,
          recipient,
          subject: `طلب شراء مباشر - ${purchase.code}`,
          body: buildFormalBody({
            category,
            requestCode: purchase.code,
            createdAt: suggestion.createdAt,
            title: suggestion.title,
            description: suggestion.description,
            requesterName: requester?.fullName || '—',
            requesterDepartment: requester?.department || '—',
            requesterEmail: requester?.email || '',
            itemName,
            quantity,
            location,
            extraMeta,
            adminNotes,
          }),
          status: 'DRAFT',
        },
      });

      linkedEntityType = 'PurchaseRequest';
      linkedEntityId = purchase.id;
      linkedCode = purchase.code;
    } else {
      const code = generateOtherCode();
      const recipient = resolveRecipients(category, requester?.email, managerRecipient || externalRecipient);
      const draft = await prisma.emailDraft.create({
        data: {
          sourceType: 'other',
          sourceId: suggestion.id,
          recipient,
          subject: `${suggestion.title} - ${code}`,
          body: buildFormalBody({
            category,
            requestCode: code,
            createdAt: suggestion.createdAt,
            title: suggestion.title,
            description: suggestion.description,
            requesterName: requester?.fullName || '—',
            requesterDepartment: requester?.department || '—',
            requesterEmail: requester?.email || '',
            itemName,
            quantity,
            location,
            extraMeta,
            adminNotes,
          }),
          status: 'DRAFT',
        },
      });

      linkedEntityType = 'EmailDraft';
      linkedEntityId = draft.id;
      linkedCode = code;
    }

    const updated = await prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        status: SuggestionStatus.APPROVED,
        adminNotes: JSON.stringify({ adminNotes, targetDepartment, linkedEntityType, linkedEntityId, linkedCode }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: 'APPROVE_SUGGESTION',
        entity: 'Suggestion',
        entityId: suggestion.id,
        details: JSON.stringify({ category, linkedEntityType, linkedEntityId, linkedCode }),
      },
    });

    await notifyRequesterAboutSuggestion({
      requesterId: suggestion.requesterId,
      suggestionId: suggestion.id,
      category,
      title: suggestion.title,
      action: 'APPROVED',
    });

    return NextResponse.json({ data: updated, linkedEntityType, linkedEntityId, linkedCode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'تعذر معالجة الطلب' }, { status: 400 });
  }
}

export const PATCH = handleDecision;
export const PUT = handleDecision;
