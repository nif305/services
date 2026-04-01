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

const SUPPORT_EMAIL = 'test@nauss.edu.sa';
const PURCHASE_HANDLER_EMAIL = 'wa.n1@nauss.edu.sa';

type SuggestionCategory = 'MAINTENANCE' | 'CLEANING' | 'PURCHASE' | 'OTHER';

function mapRole(role: string): Role {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'manager') return Role.MANAGER;
  if (normalized === 'warehouse') return Role.WAREHOUSE;
  return Role.USER;
}

function normalizeCategory(value: any): SuggestionCategory {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'MAINTENANCE') return 'MAINTENANCE';
  if (normalized === 'CLEANING') return 'CLEANING';
  if (normalized === 'PURCHASE') return 'PURCHASE';
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
  if (['SUPPORT_SERVICES', 'PURCHASES', 'PROCUREMENT', 'FINANCE', 'OTHER'].includes(normalized)) {
    return normalized;
  }
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
  const cookieEmployeeId = decodeURIComponent(request.cookies.get('user_employee_id')?.value || '').trim();
  const activeRoleValue = decodeURIComponent(
    request.headers.get('x-active-role') ||
      request.cookies.get('server_active_role')?.value ||
      request.cookies.get('active_role')?.value ||
      request.cookies.get('user_role')?.value ||
      'user'
  ).trim();

  const activeRole = mapRole(activeRoleValue);

  let user = null;
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
  if (!Array.isArray(user.roles) || !user.roles.includes(activeRole)) throw new Error('الدور النشط غير صالح لهذا المستخدم.');

  return { ...user, activeRole };
}

function getSuggestionPrefix(category: SuggestionCategory) {
  if (category === 'MAINTENANCE') return 'MNT';
  if (category === 'CLEANING') return 'CLN';
  if (category === 'PURCHASE') return 'PRC';
  return 'OTH';
}

async function buildSuggestionCodeMap() {
  const rows = await prisma.suggestion.findMany({
    select: { id: true, category: true, createdAt: true, adminNotes: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const counters = new Map<string, number>();
  const codeMap = new Map<string, string>();

  for (const row of rows) {
    const category = normalizeCategory(row.category);
    const linkedCode = parseJsonObject(row.adminNotes).linkedCode;
    if (linkedCode) {
      codeMap.set(row.id, String(linkedCode));
      continue;
    }

    const year = new Date(row.createdAt).getFullYear();
    const key = `${category}-${year}`;
    const next = (counters.get(key) || 0) + 1;
    counters.set(key, next);
    codeMap.set(row.id, `${getSuggestionPrefix(category)}-${year}-${String(next).padStart(4, '0')}`);
  }

  return codeMap;
}

async function generateMaintenanceCode(category: SuggestionCategory) {
  const prefix = category === 'CLEANING' ? 'CLN' : 'MNT';
  const year = new Date().getFullYear();
  const rows = await prisma.maintenanceRequest.findMany({
    where: { code: { startsWith: `${prefix}-${year}-` } },
    select: { code: true },
    orderBy: { createdAt: 'asc' },
  });
  return `${prefix}-${year}-${String(rows.length + 1).padStart(4, '0')}`;
}

async function generatePurchaseCode() {
  const prefix = 'PRC';
  const year = new Date().getFullYear();
  const rows = await prisma.purchaseRequest.findMany({
    where: { code: { startsWith: `${prefix}-${year}-` } },
    select: { code: true },
    orderBy: { createdAt: 'asc' },
  });
  return `${prefix}-${year}-${String(rows.length + 1).padStart(4, '0')}`;
}

async function generateOtherCode() {
  const prefix = 'OTH';
  const year = new Date().getFullYear();
  const rows = await prisma.emailDraft.findMany({
    where: { subject: { contains: `${prefix}-${year}-` } },
    select: { id: true },
  });
  return `${prefix}-${year}-${String(rows.length + 1).padStart(4, '0')}`;
}

function getCategoryLabel(category: SuggestionCategory) {
  if (category === 'MAINTENANCE') return 'طلب صيانة';
  if (category === 'CLEANING') return 'طلب نظافة';
  if (category === 'PURCHASE') return 'طلب شراء مباشر';
  return 'طلب آخر';
}

function getRecipientDisplayName(category: SuggestionCategory) {
  if (category === 'PURCHASE') return 'الأستاذ نواف المحارب';
  if (category === 'MAINTENANCE' || category === 'CLEANING') return 'سعادة مدير الخدمات المساندة';
  return 'سعادة مدير الجهة المختصة';
}

function resolveRecipients(category: SuggestionCategory, externalRecipient?: string | null) {
  if (category === 'PURCHASE') return PURCHASE_HANDLER_EMAIL;
  if (category === 'MAINTENANCE' || category === 'CLEANING') return SUPPORT_EMAIL;
  return String(externalRecipient || SUPPORT_EMAIL).trim() || SUPPORT_EMAIL;
}

function escapeHtml(value: any) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatArabicDate(value: Date | string) {
  return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
}

function buildFormalBody(params: {
  category: SuggestionCategory;
  requestCode: string;
  createdAt: Date | string;
  title: string;
  description: string;
  requesterName: string;
  requesterDepartment: string;
  requesterEmail: string;
  itemName?: string;
  quantity?: number;
  location?: string;
  requestSource?: string;
  attachmentsText?: string;
  adminNotes?: string;
}) {
  const recipientName = getRecipientDisplayName(params.category);
  const intro =
    params.category === 'PURCHASE'
      ? 'تهديكم إدارة عمليات التدريب أطيب التحيات، ونفيدكم بأنه ورد طلب شراء مباشر من الموظف الموضح أدناه، ونأمل التكرم برفعه على نظام الجامعة حسب الإجراء المعتمد.'
      : 'تهديكم إدارة عمليات التدريب أطيب التحيات، وبناءً على إفادة الموظف الموضح أدناه وبعد اعتماد الطلب من المدير المختص، نأمل التكرم بتوجيه من يلزم لمعالجة الطلب وفق البيانات التالية.';

  const rows = [
    ['رقم الطلب', params.requestCode],
    ['نوع الطلب', getCategoryLabel(params.category)],
    ['مقدم الطلب', params.requesterName],
    ['الإدارة', params.requesterDepartment || '—'],
    ['البريد الإلكتروني', params.requesterEmail || '—'],
    ['التاريخ', formatArabicDate(params.createdAt)],
    ['الموقع', params.location || '—'],
    ['البند/العنصر', params.itemName || '—'],
    ['الكمية', params.quantity ? String(params.quantity) : '—'],
    ['وصف الطلب', params.description || '—'],
    ['مصدر الحاجة', params.requestSource || '—'],
    ['المرفقات', params.attachmentsText || 'لا يوجد'],
  ];

  return `
  <div dir="rtl" style="font-family:Cairo,Tahoma,Arial,sans-serif;color:#1f2937;line-height:1.9;background:#ffffff;padding:24px;">
    <div style="font-size:18px;font-weight:700;color:#016564;margin-bottom:14px;">${escapeHtml(recipientName)} سلمه الله</div>
    <div style="margin-bottom:12px;">السلام عليكم ورحمة الله وبركاته،</div>
    <div style="margin-bottom:16px;">${escapeHtml(intro)}</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #d6d7d4;margin:12px 0 18px 0;">
      <tbody>
        ${rows
          .map(
            ([label, value]) => `<tr><td style="width:28%;padding:10px 12px;border:1px solid #d6d7d4;background:#f8fbfb;font-weight:700;color:#016564;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:10px 12px;border:1px solid #d6d7d4;vertical-align:top;">${escapeHtml(value)}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
    ${params.adminNotes ? `<div style="margin-bottom:16px;"><strong>ملاحظة المدير:</strong> ${escapeHtml(params.adminNotes)}</div>` : ''}
    <div style="margin-top:8px;">نأمل منكم التكرم باتخاذ ما يلزم حيال الطلب، ولكم خالص الشكر والتقدير.</div>
    <div style="margin-top:18px;">فريق إدارة عمليات التدريب</div>
  </div>`;
}

async function notifyManagersAboutSuggestion(input: { suggestionId: string; category: SuggestionCategory; code: string; title: string; requesterName: string }) {
  const managers = await prisma.user.findMany({
    where: { roles: { has: Role.MANAGER }, status: Status.ACTIVE },
    select: { id: true },
  });
  const label = getCategoryLabel(input.category);
  await prisma.notification.createMany({
    data: managers.map((user) => ({
      userId: user.id,
      type: `NEW_${input.category}`,
      title: `${label} جديد`,
      message: `تم رفع ${label} برقم ${input.code} من ${input.requesterName}`,
      link: `/suggestions?open=${input.suggestionId}`,
      entityId: input.suggestionId,
      entityType: 'suggestion',
      isRead: false,
    })),
    skipDuplicates: false,
  });
}

async function notifyRequesterAboutSuggestion(input: { requesterId: string; suggestionId: string; category: SuggestionCategory; code: string; action: 'APPROVED' | 'REJECTED'; reason?: string }) {
  const label = getCategoryLabel(input.category);
  await prisma.notification.create({
    data: {
      userId: input.requesterId,
      type: `${input.action}_${input.category}`,
      title: input.action === 'APPROVED' ? `${label} تم اعتماده` : `${label} تم رفضه`,
      message:
        input.action === 'APPROVED'
          ? `تم اعتماد ${label} برقم ${input.code}`
          : `تم رفض ${label} برقم ${input.code}${input.reason ? ` — السبب: ${input.reason}` : ''}`,
      link: `/suggestions?open=${input.suggestionId}`,
      entityId: input.suggestionId,
      entityType: 'suggestion',
      isRead: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser(request);
    const categoryParam = request.nextUrl.searchParams.get('category');
    const where: any = {};
    if (categoryParam) where.category = normalizeCategory(categoryParam);
    if (sessionUser.activeRole !== Role.MANAGER) where.requesterId = sessionUser.id;

    const [suggestions, users, codeMap] = await Promise.all([
      prisma.suggestion.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({
        where: { id: { in: (await prisma.suggestion.findMany({ where, select: { requesterId: true } })).map((s) => s.requesterId) } },
        select: { id: true, fullName: true, department: true, email: true },
      }),
      buildSuggestionCodeMap(),
    ]);

    const usersMap = new Map(users.map((u) => [u.id, u]));
    return NextResponse.json({
      data: suggestions.map((item) => ({
        ...item,
        code: codeMap.get(item.id) || item.id,
        requester: usersMap.get(item.requesterId) || null,
      })),
      stats: {
        total: suggestions.length,
        pending: suggestions.filter((s) => s.status === SuggestionStatus.PENDING || s.status === SuggestionStatus.UNDER_REVIEW).length,
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
    let title = String(body.title || '').trim() || getCategoryLabel(category);

    if (!description) {
      return NextResponse.json({ error: 'يرجى إدخال وصف واضح للطلب' }, { status: 400 });
    }
    if ((category === 'MAINTENANCE' || category === 'CLEANING') && !area) {
      return NextResponse.json({ error: `أكمل حقول ${getCategoryLabel(category)} المطلوبة` }, { status: 400 });
    }
    if (category === 'PURCHASE' && !itemName) {
      return NextResponse.json({ error: 'أكمل حقول طلب الشراء المباشر المطلوبة' }, { status: 400 });
    }
    if (category === 'OTHER' && !title) {
      title = 'طلب آخر';
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        title,
        description,
        justification: JSON.stringify({
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

    const codeMap = await buildSuggestionCodeMap();
    const code = codeMap.get(suggestion.id) || suggestion.id;

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: 'CREATE_SUGGESTION',
        entity: 'Suggestion',
        entityId: suggestion.id,
        details: JSON.stringify({ code, title, category }),
      },
    });

    await notifyManagersAboutSuggestion({
      suggestionId: suggestion.id,
      category,
      code,
      title,
      requesterName: sessionUser.fullName || 'مستخدم النظام',
    });

    return NextResponse.json({ data: { ...suggestion, code } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'تعذر إنشاء الطلب' }, { status: 400 });
  }
}

async function processSuggestionAction(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionUser = await resolveSessionUser(request);
    if (sessionUser.activeRole !== Role.MANAGER) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const suggestionId = String(body.suggestionId || '').trim();
    const action = String(body.action || '').trim().toLowerCase();
    const adminNotes = String(body.adminNotes || '').trim();
    const targetDepartment = normalizeTargetDepartment(body.targetDepartment);

    if (!suggestionId || !action) return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });

    const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
    if (!suggestion) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const requester = await prisma.user.findUnique({
      where: { id: suggestion.requesterId },
      select: { fullName: true, department: true, email: true },
    });

    const justificationData = parseJsonObject(suggestion.justification);
    const category = normalizeCategory(suggestion.category);
    const existingCode = (await buildSuggestionCodeMap()).get(suggestion.id) || suggestion.id;

    if (action === 'reject') {
      const updated = await prisma.suggestion.update({
        where: { id: suggestionId },
        data: { status: SuggestionStatus.REJECTED, adminNotes: JSON.stringify({ adminNotes, linkedCode: existingCode }) },
      });
      await notifyRequesterAboutSuggestion({ requesterId: suggestion.requesterId, suggestionId, category, code: existingCode, action: 'REJECTED', reason: adminNotes });
      return NextResponse.json({ data: { ...updated, code: existingCode } });
    }

    if (action !== 'approve') return NextResponse.json({ error: 'الإجراء غير صالح' }, { status: 400 });

    const itemName = String(justificationData.itemName || '').trim() || String(justificationData.area || '').trim();
    const quantity = Math.max(1, Number(justificationData.quantity || 1));
    const location = String(justificationData.location || '').trim();
    const requestSource = String(justificationData.requestSource || '').trim();
    const attachments = Array.isArray(justificationData.attachments) ? justificationData.attachments : [];
    const attachmentsText = attachments.length > 0 ? attachments.map((a: any) => a.filename || a.name).filter(Boolean).join(' ، ') : 'لا يوجد';

    let linkedCode = existingCode;
    let recipient = resolveRecipients(category, justificationData.externalRecipient);

    if (category === 'MAINTENANCE' || category === 'CLEANING') {
      linkedCode = await generateMaintenanceCode(category);
      await prisma.maintenanceRequest.create({
        data: {
          code: linkedCode,
          requesterId: suggestion.requesterId,
          category: category === 'CLEANING' ? 'CLEANING' : 'TECHNICAL',
          description: suggestion.description,
          priority: suggestion.priority,
          status: MaintenanceStatus.APPROVED,
          notes: [itemName, quantity ? `الكمية: ${quantity}` : '', location ? `الموقع: ${location}` : '', adminNotes ? `ملاحظة المدير: ${adminNotes}` : ''].filter(Boolean).join(' | '),
        },
      });
    } else if (category === 'PURCHASE') {
      linkedCode = await generatePurchaseCode();
      recipient = PURCHASE_HANDLER_EMAIL;
      await prisma.purchaseRequest.create({
        data: {
          code: linkedCode,
          requesterId: suggestion.requesterId,
          items: itemName ? `${itemName} × ${quantity}` : suggestion.title,
          reason: suggestion.description,
          budgetNote: adminNotes || null,
          targetDepartment,
          status: PurchaseStatus.APPROVED,
        },
      });
    } else {
      linkedCode = await generateOtherCode();
    }

    await prisma.emailDraft.create({
      data: {
        sourceType: category.toLowerCase(),
        sourceId: suggestion.id,
        recipient,
        subject: `${getCategoryLabel(category)} - ${linkedCode}`,
        body: buildFormalBody({
          category,
          requestCode: linkedCode,
          createdAt: suggestion.createdAt,
          title: suggestion.title,
          description: suggestion.description,
          requesterName: requester?.fullName || '—',
          requesterDepartment: requester?.department || '—',
          requesterEmail: requester?.email || '—',
          itemName,
          quantity,
          location,
          requestSource,
          attachmentsText,
          adminNotes,
        }),
        status: 'DRAFT',
      },
    });

    const updated = await prisma.suggestion.update({
      where: { id: suggestionId },
      data: { status: SuggestionStatus.APPROVED, adminNotes: JSON.stringify({ adminNotes, targetDepartment, linkedCode }) },
    });

    await notifyRequesterAboutSuggestion({ requesterId: suggestion.requesterId, suggestionId, category, code: linkedCode, action: 'APPROVED' });
    return NextResponse.json({ data: { ...updated, code: linkedCode }, linkedCode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'تعذر معالجة الطلب' }, { status: 400 });
  }
}

export const PATCH = processSuggestionAction;
export const PUT = processSuggestionAction;
