import { NextRequest, NextResponse } from 'next/server';
import { DraftStatus, Role, Status } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type JsonObject = Record<string, any>;

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
  const activeRoleRaw = decodeURIComponent(
    request.headers.get('x-active-role') ||
      request.cookies.get('server_active_role')?.value ||
      request.cookies.get('active_role')?.value ||
      request.cookies.get('user_role')?.value ||
      'user'
  ).trim();

  const activeRole = mapRole(activeRoleRaw);

  let user = null;
  if (cookieId) {
    user = await prisma.user.findUnique({
      where: { id: cookieId },
      select: { id: true, roles: true, status: true },
    });
  }
  if (!user && cookieEmail) {
    user = await prisma.user.findFirst({
      where: { email: { equals: cookieEmail, mode: 'insensitive' } },
      select: { id: true, roles: true, status: true },
    });
  }
  if (!user && cookieEmployeeId) {
    user = await prisma.user.findUnique({
      where: { employeeId: cookieEmployeeId },
      select: { id: true, roles: true, status: true },
    });
  }

  if (!user) throw new Error('تعذر التحقق من المستخدم الحالي');
  if (user.status !== Status.ACTIVE) throw new Error('الحساب غير نشط');
  if (!Array.isArray(user.roles) || !user.roles.includes(activeRole)) throw new Error('الدور النشط غير صالح');

  return { ...user, role: activeRole };
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

function mapDraftStatus(status: DraftStatus) {
  if (status === DraftStatus.COPIED) return 'COPIED';
  if (status === DraftStatus.SENT) return 'SENT';
  return 'DRAFT';
}

function categoryLabel(category?: string | null) {
  switch (String(category || '').toUpperCase()) {
    case 'MAINTENANCE':
      return 'طلب صيانة';
    case 'CLEANING':
      return 'طلب نظافة';
    case 'PURCHASE':
      return 'طلب شراء مباشر';
    case 'OTHER':
      return 'طلب آخر';
    default:
      return 'طلب خدمي';
  }
}

function attachmentLabel(filename: string, index: number) {
  const lower = String(filename || '').toLowerCase();
  if (/\.(png|jpe?g|webp|gif|bmp|svg)$/.test(lower)) return `صورة مرفقة ${index}`;
  if (/\.(mp4|mov|avi|mkv|webm|m4v)$/.test(lower)) return `فيديو مرفق ${index}`;
  if (/\.(pdf)$/.test(lower)) return `ملف PDF مرفق ${index}`;
  if (/\.(doc|docx)$/.test(lower)) return `ملف Word مرفق ${index}`;
  if (/\.(xls|xlsx|csv)$/.test(lower)) return `ملف Excel مرفق ${index}`;
  if (/\.(ppt|pptx)$/.test(lower)) return `عرض تقديمي مرفق ${index}`;
  return `ملف مرفق ${index}`;
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser(request);
    if (sessionUser.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const drafts = await prisma.emailDraft.findMany({ orderBy: { createdAt: 'desc' } });
    const suggestionSourceIds = drafts
      .filter((draft) => ['maintenance', 'cleaning', 'purchase', 'other', 'suggestion'].includes(String(draft.sourceType || '').toLowerCase()))
      .map((draft) => draft.sourceId)
      .filter(Boolean);

    const suggestions = suggestionSourceIds.length
      ? await prisma.suggestion.findMany({
          where: {
            OR: [
              { id: { in: suggestionSourceIds } },
              { adminNotes: { contains: 'linkedDraftId' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const suggestionById = new Map(suggestions.map((suggestion) => [suggestion.id, suggestion]));
    const suggestionByDraftId = new Map<string, any>();

    for (const suggestion of suggestions) {
      const adminData = parseJsonObject(suggestion.adminNotes);
      const linkedDraftId = String(adminData.linkedDraftId || '').trim();
      if (linkedDraftId) suggestionByDraftId.set(linkedDraftId, suggestion);
    }

    const requesterIds = [...new Set(suggestions.map((suggestion) => suggestion.requesterId).filter(Boolean))];
    const users = requesterIds.length
      ? await prisma.user.findMany({
          where: { id: { in: requesterIds } },
          select: {
            id: true,
            fullName: true,
            department: true,
            email: true,
            employeeId: true,
          },
        })
      : [];

    const userById = new Map(users.map((user) => [user.id, user]));

    const data = drafts.map((draft) => {
      const suggestion = suggestionByDraftId.get(draft.id) || suggestionById.get(draft.sourceId) || null;
      const justificationData = parseJsonObject(suggestion?.justification);
      const adminData = parseJsonObject(suggestion?.adminNotes);
      const requester = suggestion ? userById.get(suggestion.requesterId) : null;
      const attachments = Array.isArray(justificationData.attachments) ? justificationData.attachments : [];
      const attachmentLabels = attachments.map((item: any, index: number) => {
        const rawName = String(item?.name || item?.filename || item || '');
        return attachmentLabel(rawName, index + 1);
      });

      const publicCode = String(justificationData.publicCode || adminData.linkedCode || suggestion?.id || draft.sourceId || draft.id);
      const rawCategory = String(suggestion?.category || draft.sourceType || '').toUpperCase();
      const requestTypeLabel = categoryLabel(rawCategory);
      const summaryText = String(suggestion?.description || '').trim();
      const shortSummary = summaryText.length > 160 ? `${summaryText.slice(0, 160)}...` : summaryText;

      return {
        id: draft.id,
        subject: draft.subject,
        to: draft.recipient,
        cc: requester?.email || null,
        body: draft.body,
        status: mapDraftStatus(draft.status),
        createdAt: draft.createdAt,
        copiedAt: draft.copiedAt,
        sourceType: draft.sourceType,
        sourceId: draft.sourceId,
        requestCode: publicCode,
        requestType: requestTypeLabel,
        requestCategory: rawCategory,
        requesterName: requester?.fullName || '—',
        requesterDepartment: requester?.department || '—',
        requesterEmail: requester?.email || '—',
        requesterExtension: '—',
        location: String(justificationData.location || '—'),
        itemName: String(justificationData.itemName || suggestion?.title || '—'),
        description: summaryText || '—',
        summary: shortSummary || '—',
        attachments: attachmentLabels,
      };
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر تحميل المراسلات الخارجية' }, { status: 500 });
  }
}
