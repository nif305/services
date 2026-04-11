import { NextRequest, NextResponse } from 'next/server';
import { Priority, PurchaseStatus, Role, Status, SuggestionStatus, MaintenanceStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const SUPPORT_RECIPIENTS = 'ssd@nauss.edu.sa,AAlosaimi@nauss.edu.sa';
const PURCHASE_RECIPIENT = 'wa.n1@nauss.edu.sa';

type SuggestionCategory = 'MAINTENANCE' | 'CLEANING' | 'PURCHASE' | 'OTHER';
type JsonObject = Record<string, any>;
type AttachmentPayload = { filename?: string; contentType?: string; base64Content?: string };

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
  if (!normalized) return null;
  return normalized;
}
function parseJsonObject(value: any): JsonObject {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function sanitizeAttachments(value: any): AttachmentPayload[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      filename: String(item?.filename || item?.name || '').trim(),
      contentType: String(item?.contentType || item?.type || 'application/octet-stream').trim(),
      base64Content: String(item?.base64Content || '').trim(),
    }))
    .filter((item) => item.filename || item.base64Content);
}
function normalizeServiceItems(value: any, fallback?: string) {
  const list = Array.isArray(value) ? value : [];
  const normalized = list.map((item) => String(item || '').trim()).filter(Boolean);
  if (!normalized.length && fallback) normalized.push(String(fallback).trim());
  return Array.from(new Set(normalized));
}
function buildItemLabel(justificationData: JsonObject, title?: string) {
  const serviceItems = normalizeServiceItems(justificationData.serviceItems, justificationData.itemName || justificationData.area || title || '');
  return serviceItems.length ? serviceItems.join('، ') : '—';
}
function buildAttachmentPreview(file: AttachmentPayload, index: number) {
  const type = String(file?.contentType || '').toLowerCase();
  const filename = String(file?.filename || file?.name || `attachment-${index + 1}`);
  const previewUrl = file?.base64Content ? `data:${file.contentType || 'application/octet-stream'};base64,${file.base64Content}` : null;
  let kind = 'file';
  if (type.startsWith('image/')) kind = 'image';
  else if (type.startsWith('video/')) kind = 'video';
  else if (type.includes('pdf') || filename.toLowerCase().endswith('.pdf')) kind = 'pdf';
  return { name: filename, filename, contentType: file.contentType || 'application/octet-stream', previewUrl, kind };
}

async function resolveSessionUser(request: NextRequest) {
  const cookieId = decodeURIComponent(request.cookies.get('user_id')?.value || '').trim();
  const cookieEmail = decodeURIComponent(request.cookies.get('user_email')?.value || '').trim();
  const cookieEmployeeId = decodeURIComponent(request.cookies.get('user_employee_id')?.value || '').trim();
  const activeRoleRaw = decodeURIComponent(
    request.headers.get('x-active-role') ||
      request.cookies.get('server_active_role')?.value ||
      request.cookies.get('active_role')?.value ||
      request.cookies.get('user_role')?.value ||
      'user'
  ).trim();
  const activeRole = mapRole(activeRoleRaw);
  let user = null as any;
  if (cookieId) user = await prisma.user.findUnique({ where: { id: cookieId }, select: { id: true, roles: true, fullName: true, department: true, email: true, employeeId: true, mobile: true, jobTitle: true, status: true } });
  if (!user && cookieEmail) user = await prisma.user.findFirst({ where: { email: { equals: cookieEmail, mode: 'insensitive' } }, select: { id: true, roles: true, fullName: true, department: true, email: true, employeeId: true, mobile: true, jobTitle: true, status: true } });
  if (!user && cookieEmployeeId) user = await prisma.user.findUnique({ where: { employeeId: cookieEmployeeId }, select: { id: true, roles: true, fullName: true, department: true, email: true, employeeId: true, mobile: true, jobTitle: true, status: true } });
  if (!user) throw new Error('تعذر التحقق من المستخدم الحالي. أعد تسجيل الدخول ثم حاول مرة أخرى.');
  if (user.status !== Status.ACTIVE) throw new Error('الحساب غير نشط.');
  if (!Array.isArray(user.roles) || !user.roles.includes(activeRole)) throw new Error('الدور النشط غير صالح لهذا المستخدم.');
  return { ...user, role: activeRole };
}

function categoryMeta(category: SuggestionCategory) {
  switch (category) {
    case 'MAINTENANCE': return { prefix: 'MNT', label: 'طلب صيانة', notification: 'طلب صيانة' };
    case 'CLEANING': return { prefix: 'CLN', label: 'طلب نظافة', notification: 'طلب نظافة' };
    case 'PURCHASE': return { prefix: 'PRC', label: 'طلب شراء مباشر', notification: 'طلب شراء مباشر' };
    default: return { prefix: 'OTH', label: 'طلب آخر', notification: 'طلب آخر' };
  }
}
async function generatePublicCode(category: SuggestionCategory) {
  const year = new Date().getFullYear();
  const prefix = categoryMeta(category).prefix;
  const existing = await prisma.suggestion.findMany({ where: { category }, select: { justification: true } });
  let maxSerial = 0;
  for (const row of existing) {
    const parsed = parseJsonObject(row.justification);
    const code = String(parsed.publicCode || '');
    const match = code.match(/-(\d{4})$/);
    if (match) maxSerial = Math.max(maxSerial, Number(match[1]));
  }
  return `${prefix}-${year}-${String(maxSerial + 1).padStart(4, '0')}`;
}
async function generateLinkedCode(category: SuggestionCategory) {
  const year = new Date().getFullYear();
  const prefix = categoryMeta(category).prefix;
  const existing = await prisma.suggestion.findMany({ where: { category }, select: { adminNotes: true } });
  let maxSerial = 0;
  for (const row of existing) {
    const parsed = parseJsonObject(row.adminNotes);
    const code = String(parsed.linkedCode || '');
    const match = code.match(/-(\d{4})$/);
    if (match) maxSerial = Math.max(maxSerial, Number(match[1]));
  }
  return `${prefix}-${year}-${String(maxSerial + 1).padStart(4, '0')}`;
}
function buildRecipients(category: SuggestionCategory, provided?: string | null) {
  if (category === 'PURCHASE') return PURCHASE_RECIPIENT;
  if (category === 'MAINTENANCE' || category === 'CLEANING') return SUPPORT_RECIPIENTS;
  return String(provided || '').trim();
}
function buildNotificationTitle(category: SuggestionCategory) { return `${categoryMeta(category).notification} جديد`; }
async function notifyManagersAboutSuggestion(params: { suggestionId: string; category: SuggestionCategory; title: string; requesterName: string; code: string; }) {
  const managers = await prisma.user.findMany({ where: { status: Status.ACTIVE, roles: { has: Role.MANAGER } }, select: { id: true } });
  if (!managers.length) return;
  await prisma.notification.createMany({ data: managers.map((manager) => ({ userId: manager.id, type: 'SUGGESTION_PENDING', title: buildNotificationTitle(params.category), message: `تم رفع ${categoryMeta(params.category).label} برقم ${params.code} من ${params.requesterName}`, link: '/suggestions', entityId: params.suggestionId, entityType: 'suggestion' })) });
}
async function notifyRequester(params: { requesterId: string; suggestionId: string; category: SuggestionCategory; title: string; type: string; message: string; }) {
  await prisma.notification.create({ data: { userId: params.requesterId, type: params.type, title: params.title, message: params.message, link: '/suggestions', entityId: params.suggestionId, entityType: 'suggestion' } });
}
function buildExternalEmailHtml(params: { recipientLabel: string; requestCode: string; requestTitle: string; createdAt: Date; requesterName: string; requesterDepartment: string; requesterEmail: string; requesterMobile?: string; requesterExtension?: string; location?: string; itemName?: string; description: string; justification?: string; adminNotes?: string; attachmentsSummary?: string; }) {
  const rows = [
    ['رقم الطلب', params.requestCode], ['نوع الطلب', params.requestTitle], ['التاريخ', new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(params.createdAt))], ['مقدم الطلب', params.requesterName], ['الإدارة', params.requesterDepartment || 'إدارة عمليات التدريب'], ['البريد الإلكتروني', params.requesterEmail || '—'], ['الجوال', params.requesterMobile || '—'], ['رقم التحويلة', params.requesterExtension || '—'], ['الموقع', params.location || '—'], ['البنود المطلوبة', params.itemName || '—'], ['الوصف', params.description || '—'], ['التفاصيل الإضافية', params.justification || '—'], ['ملاحظات المدير', params.adminNotes || '—'], ['المرفقات', params.attachmentsSummary || 'لا توجد مرفقات'],
  ];
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9;color:#1f2937;font-size:14px"><p style="margin:0 0 12px 0">${params.recipientLabel}</p><p style="margin:0 0 16px 0">السلام عليكم ورحمة الله وبركاته، وبعد:</p><p style="margin:0 0 18px 0">نفيدكم بأنه وردنا ${params.requestTitle}، ونأمل التكرم بالاطلاع واتخاذ ما يلزم وفق البيانات أدناه:</p><table style="width:100%;border-collapse:collapse;border:1px solid #d6d7d4"><tbody>${rows.map(([label, value]) => `<tr><td style="width:180px;padding:10px;border:1px solid #d6d7d4;background:#f8fbfb;font-weight:700;color:#016564">${label}</td><td style="padding:10px;border:1px solid #d6d7d4">${String(value || '—')}</td></tr>`).join('')}</tbody></table><p style="margin:18px 0 0 0">وتقبلوا خالص التحية والتقدير.</p><p style="margin:8px 0 0 0">فريق عمل إدارة عمليات التدريب وكالة الجامعة للتدريب</p></div>`;
}

function mapSuggestionRow(item: any, requesterMap: Map<string, any>) {
  const justificationData = parseJsonObject(item.justification);
  const adminData = parseJsonObject(item.adminNotes);
  const requester = requesterMap.get(item.requesterId) || null;
  const attachmentPayload = sanitizeAttachments(justificationData.attachments);
  const serviceItems = normalizeServiceItems(justificationData.serviceItems, justificationData.itemName || justificationData.area || item.title);
  return {
    ...item,
    code: justificationData.publicCode || adminData.linkedCode || item.id,
    requester,
    itemName: buildItemLabel(justificationData, item.title),
    serviceItems,
    quantity: justificationData.quantity || null,
    location: justificationData.location || '',
    requestSource: justificationData.requestSource || '',
    programName: justificationData.programName || '',
    area: justificationData.area || '',
    attachments: attachmentPayload.map(buildAttachmentPreview),
    adminNotesText: adminData.adminNotes || '',
    targetDepartment: adminData.targetDepartment || justificationData.targetDepartment || null,
    targetRecipient: adminData.targetRecipient || justificationData.externalRecipient || '',
    linkedDraftId: adminData.linkedDraftId || null,
    linkedCode: adminData.linkedCode || null,
    returnReason: adminData.returnReason || '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser(request);
    const categoryParam = request.nextUrl.searchParams.get('category') || request.nextUrl.searchParams.get('type') || '';
    const category = categoryParam ? normalizeCategory(categoryParam) : null;
    const where: any = { ...(category ? { category } : {}), ...(sessionUser.role === Role.MANAGER ? {} : { requesterId: sessionUser.id }) };
    const suggestions = await prisma.suggestion.findMany({ where, orderBy: { createdAt: 'desc' } });
    const users = await prisma.user.findMany({ where: { id: { in: [...new Set(suggestions.map((s) => s.requesterId))] } }, select: { id: true, fullName: true, department: true, email: true, mobile: true, jobTitle: true, roles: true } });
    const requesterMap = new Map(users.map((u) => [u.id, { ...u, role: u.roles?.[0] || Role.USER, extension: u.jobTitle || '' }]));
    const rows = suggestions.map((item) => mapSuggestionRow(item, requesterMap));
    const statsBase = sessionUser.role === Role.MANAGER ? suggestions : suggestions.filter((s) => s.requesterId === sessionUser.id);
    const countBy = (cat: SuggestionCategory, status?: SuggestionStatus) => statsBase.filter((row) => row.category === cat && (!status || row.status === status)).length;
    return NextResponse.json({ data: rows, stats: { total: statsBase.length, pending: statsBase.filter((row) => row.status === SuggestionStatus.PENDING || row.status === SuggestionStatus.UNDER_REVIEW).length, approved: statsBase.filter((row) => row.status === SuggestionStatus.APPROVED || row.status === SuggestionStatus.IMPLEMENTED).length, rejected: statsBase.filter((row) => row.status === SuggestionStatus.REJECTED).length, maintenancePending: countBy('MAINTENANCE', SuggestionStatus.PENDING), cleaningPending: countBy('CLEANING', SuggestionStatus.PENDING), purchasePending: countBy('PURCHASE', SuggestionStatus.PENDING), otherPending: countBy('OTHER', SuggestionStatus.PENDING) } });
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
    const location = String(body.location || '').trim();
    const externalRecipient = String(body.externalRecipient || '').trim();
    const requestSource = String(body.requestSource || '').trim();
    const programName = String(body.programName || '').trim();
    const attachments = sanitizeAttachments(body.attachments);
    const description = String(body.description || '').trim();
    const title = String(body.title || '').trim() || categoryMeta(category).label;
    const itemName = String(body.itemName || '').trim();
    const area = String(body.area || '').trim();
    const serviceItems = normalizeServiceItems(body.serviceItems, itemName || area || title);
    const quantity = Math.max(1, Number(body.quantity || 1));

    if (!description) return NextResponse.json({ error: 'يرجى كتابة سبب الطلب أو الملاحظة' }, { status: 400 });
    if ((category === 'MAINTENANCE' || category === 'CLEANING') && !serviceItems.length) return NextResponse.json({ error: 'اختر بند خدمة واحدًا على الأقل' }, { status: 400 });
    if (category === 'PURCHASE' && !itemName) return NextResponse.json({ error: 'أدخل اسم الصنف المطلوب' }, { status: 400 });

    const publicCode = await generatePublicCode(category);
    const suggestion = await prisma.suggestion.create({ data: { title, description, justification: JSON.stringify({ publicCode, itemName, quantity, location, externalRecipient, requestSource, programName, area, serviceItems, attachments }), category, priority, requesterId: sessionUser.id, status: SuggestionStatus.PENDING } });
    await prisma.auditLog.create({ data: { userId: sessionUser.id, action: 'CREATE_SUGGESTION', entity: 'Suggestion', entityId: suggestion.id, details: JSON.stringify({ title, category, publicCode, itemName, quantity, location, serviceItemsCount: serviceItems.length, attachmentsCount: attachments.length }) } });
    await notifyManagersAboutSuggestion({ suggestionId: suggestion.id, category, title, requesterName: sessionUser.fullName || 'مستخدم النظام', code: publicCode });
    return NextResponse.json({ data: { ...suggestion, code: publicCode } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'تعذر إنشاء الطلب' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionUser = await resolveSessionUser(request);
    if (sessionUser.role !== Role.MANAGER) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const suggestionId = String(body.suggestionId || '').trim();
    const action = String(body.action || '').trim().toLowerCase();
    const adminNotes = String(body.adminNotes || '').trim();
    const targetDepartment = normalizeTargetDepartment(body.targetDepartment);
    const targetRecipient = String(body.targetRecipient || '').trim();
    if (!suggestionId || !action) return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });

    const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
    if (!suggestion) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const requester = await prisma.user.findUnique({ where: { id: suggestion.requesterId }, select: { id: true, fullName: true, department: true, email: true, mobile: true, jobTitle: true } });
    const justificationData = parseJsonObject(suggestion.justification);
    const adminData = parseJsonObject(suggestion.adminNotes);
    const category = normalizeCategory(suggestion.category);
    const publicCode = String(justificationData.publicCode || adminData.publicCode || await generatePublicCode(category));
    const location = String(justificationData.location || '').trim();
    const requestSource = String(justificationData.requestSource || '').trim();
    const programName = String(justificationData.programName || '').trim();
    const externalRecipient = String(justificationData.externalRecipient || '').trim();
    const serviceItems = normalizeServiceItems(justificationData.serviceItems, justificationData.itemName || justificationData.area || suggestion.title);
    const attachments = sanitizeAttachments(justificationData.attachments);

    if (action === 'reject') {
      const updated = await prisma.suggestion.update({ where: { id: suggestionId }, data: { status: SuggestionStatus.REJECTED, adminNotes: JSON.stringify({ ...adminData, adminNotes, publicCode, targetDepartment, targetRecipient }) } });
      await notifyRequester({ requesterId: suggestion.requesterId, suggestionId, category, title: `${categoryMeta(category).label} تم رفضه`, type: 'SUGGESTION_REJECTED', message: `تم رفض ${suggestion.title}${adminNotes ? `: ${adminNotes}` : ''}` });
      return NextResponse.json({ data: { ...updated, code: publicCode } });
    }

    if (action === 'return') {
      const updated = await prisma.suggestion.update({ where: { id: suggestionId }, data: { status: SuggestionStatus.UNDER_REVIEW, adminNotes: JSON.stringify({ ...adminData, adminNotes, publicCode, targetDepartment, targetRecipient, returnReason: adminNotes }) } });
      await notifyRequester({ requesterId: suggestion.requesterId, suggestionId, category, title: `${categoryMeta(category).label} أُعيدت للاستكمال`, type: 'SUGGESTION_RETURNED', message: `تمت إعادة ${suggestion.title} لاستكمال المبررات أو المرفقات${adminNotes ? `: ${adminNotes}` : ''}` });
      return NextResponse.json({ data: { ...updated, code: publicCode } });
    }

    if (action !== 'approve') return NextResponse.json({ error: 'الإجراء غير صالح' }, { status: 400 });

    const resolvedRecipient = buildRecipients(category, targetRecipient || externalRecipient);
    if (!resolvedRecipient) return NextResponse.json({ error: 'حدد الجهة المستلمة قبل اعتماد الطلب' }, { status: 400 });

    let linkedEntityType = String(adminData.linkedEntityType || 'Suggestion');
    let linkedEntityId = String(adminData.linkedEntityId || suggestionId);
    let linkedCode = String(adminData.linkedCode || '') || await generateLinkedCode(category);

    if (category === 'MAINTENANCE' || category === 'CLEANING') {
      if (linkedEntityId && linkedEntityId !== suggestionId) {
        const existing = await prisma.maintenanceRequest.findUnique({ where: { id: linkedEntityId } });
        if (existing) linkedCode = existing.code || linkedCode;
        else linkedEntityId = '';
      }
      if (!linkedEntityId || linkedEntityId === suggestionId) {
        const maintenance = await prisma.maintenanceRequest.create({ data: { code: linkedCode, requesterId: suggestion.requesterId, category: category === 'CLEANING' ? 'CLEANING' : 'TECHNICAL', description: `${suggestion.description}\n\nالبنود: ${serviceItems.join('، ')}`, priority: suggestion.priority, status: MaintenanceStatus.APPROVED, notes: adminNotes || null } });
        linkedEntityType = 'MaintenanceRequest'; linkedEntityId = maintenance.id; linkedCode = maintenance.code;
      }
    } else if (category === 'PURCHASE') {
      if (linkedEntityId && linkedEntityId !== suggestionId) {
        const existing = await prisma.purchaseRequest.findUnique({ where: { id: linkedEntityId } });
        if (existing) linkedCode = existing.code || linkedCode;
        else linkedEntityId = '';
      }
      if (!linkedEntityId || linkedEntityId === suggestionId) {
        const purchase = await prisma.purchaseRequest.create({ data: { code: linkedCode, requesterId: suggestion.requesterId, items: buildItemLabel(justificationData, suggestion.title), reason: suggestion.description, budgetNote: adminNotes || null, estimatedValue: null, targetDepartment, status: PurchaseStatus.APPROVED } });
        linkedEntityType = 'PurchaseRequest'; linkedEntityId = purchase.id; linkedCode = purchase.code;
      }
    }

    const recipientLabel = category === 'PURCHASE' ? 'سعادة الأستاذ/ نواف المحارب سلمه الله' : (category === 'MAINTENANCE' || category === 'CLEANING') ? 'سعادة مدير إدارة الخدمات المساندة سلمه الله' : 'إلى الجهة المختصة';
    const attachmentsSummary = attachments.length ? attachments.map((item) => item.filename || 'مرفق').join('، ') : '';
    const draftBody = buildExternalEmailHtml({ recipientLabel, requestCode: linkedCode, requestTitle: suggestion.title, createdAt: suggestion.createdAt, requesterName: requester?.fullName || '—', requesterDepartment: 'إدارة عمليات التدريب', requesterEmail: requester?.email || '—', requesterMobile: requester?.mobile || '—', requesterExtension: requester?.jobTitle || '—', location, itemName: buildItemLabel(justificationData, suggestion.title), description: suggestion.description, justification: requestSource || programName || '', adminNotes, attachmentsSummary });

    let draft = null as any;
    const linkedDraftId = String(adminData.linkedDraftId || '');
    if (linkedDraftId) draft = await prisma.emailDraft.findUnique({ where: { id: linkedDraftId } });
    if (!draft) draft = await prisma.emailDraft.findFirst({ where: { OR: [{ sourceType: category.toLowerCase(), sourceId: linkedEntityId }, { sourceType: category.toLowerCase(), sourceId: suggestion.id }] } });

    if (draft) draft = await prisma.emailDraft.update({ where: { id: draft.id }, data: { recipient: resolvedRecipient, subject: `${suggestion.title} - ${linkedCode}`, body: draftBody, status: 'DRAFT' } });
    else draft = await prisma.emailDraft.create({ data: { sourceType: category.toLowerCase(), sourceId: linkedEntityId || suggestion.id, recipient: resolvedRecipient, subject: `${suggestion.title} - ${linkedCode}`, body: draftBody, status: 'DRAFT' } });

    const updated = await prisma.suggestion.update({ where: { id: suggestionId }, data: { status: SuggestionStatus.APPROVED, adminNotes: JSON.stringify({ ...adminData, adminNotes, targetDepartment, targetRecipient: resolvedRecipient, linkedEntityType, linkedEntityId, linkedCode, linkedDraftId: draft.id, publicCode }) } });
    await notifyRequester({ requesterId: suggestion.requesterId, suggestionId, category, title: `${categoryMeta(category).label} تمت الموافقة عليه`, type: 'SUGGESTION_APPROVED', message: `تم اعتماد ${suggestion.title} وتحويله إلى المراسلات الخارجية` });
    return NextResponse.json({ data: { ...updated, code: publicCode }, linkedEntityType, linkedEntityId, linkedCode, linkedDraftId: draft.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'تعذر معالجة الطلب' }, { status: 400 });
  }
}

export const PUT = PATCH;
