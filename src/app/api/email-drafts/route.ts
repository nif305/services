import { NextRequest, NextResponse } from 'next/server';
import { DraftStatus, Role, Status } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type DraftRow = {
  id: string;
  sourceType: string;
  sourceId: string;
  subject: string;
  to: string;
  cc?: string | null;
  body?: string | null;
  status: DraftStatus;
  createdAt: Date;
  updatedAt: Date;
  requester?: {
    fullName?: string | null;
    department?: string | null;
    email?: string | null;
  } | null;
  summary?: string | null;
  requestTypeLabel?: string | null;
  requestCode?: string | null;
  location?: string | null;
  itemName?: string | null;
};

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

  let user = null as any;
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

  if (!user) throw new Error('تعذر التحقق من المستخدم الحالي.');
  if (user.status !== Status.ACTIVE) throw new Error('الحساب غير نشط.');
  if (!Array.isArray(user.roles) || !user.roles.includes(activeRole)) {
    throw new Error('الدور النشط غير صالح لهذا المستخدم.');
  }

  return { ...user, role: activeRole };
}

function parseJsonObject(value: any) {
  if (!value) return {} as Record<string, any>;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {} as Record<string, any>;
  }
}

function requestTypeLabel(category: string) {
  switch (String(category || '').toUpperCase()) {
    case 'MAINTENANCE':
      return 'طلب صيانة';
    case 'CLEANING':
      return 'طلب نظافة';
    case 'PURCHASE':
      return 'طلب شراء مباشر';
    default:
      return 'طلب آخر';
  }
}

function summarizeAttachmentName(name: string, index: number) {
  const lower = String(name || '').toLowerCase();
  if (/(png|jpg|jpeg|webp|gif|svg)$/.test(lower)) return `صورة مرفقة ${index}`;
  if (/(mp4|mov|avi|mkv|webm)$/.test(lower)) return `فيديو مرفق ${index}`;
  if (/pdf$/.test(lower)) return `ملف PDF مرفق ${index}`;
  return `ملف مرفق ${index}`;
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser(request);
    if (sessionUser.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const drafts = await prisma.emailDraft.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const suggestions = await prisma.suggestion.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const draftToSuggestionMap = new Map<string, any>();
    const requesterIds = new Set<string>();

    for (const suggestion of suggestions) {
      const adminData = parseJsonObject(suggestion.adminNotes);
      const draftId = String(adminData.linkedDraftId || '').trim();
      if (!draftId) continue;
      draftToSuggestionMap.set(draftId, suggestion);
      if (suggestion.requesterId) requesterIds.add(suggestion.requesterId);
    }

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(requesterIds) } },
      select: { id: true, fullName: true, department: true, email: true },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    const data: DraftRow[] = drafts
      .map((draft) => {
        const suggestion = draftToSuggestionMap.get(draft.id) || null;
        const justificationData = parseJsonObject(suggestion?.justification);
        const requester = suggestion ? userMap.get(suggestion.requesterId) || null : null;
        const attachments = Array.isArray(justificationData.attachments) ? justificationData.attachments : [];
        const attachmentSummary = attachments
          .map((item: any, index: number) => summarizeAttachmentName(item?.filename || '', index + 1))
          .join('، ');

        return {
          id: draft.id,
          sourceType: draft.sourceType,
          sourceId: draft.sourceId,
          subject: draft.subject,
          to: draft.recipient,
          cc: null,
          body: draft.body,
          status: draft.status,
          createdAt: draft.createdAt,
          updatedAt: draft.copiedAt || draft.createdAt,
          requester: requester
            ? {
                fullName: requester.fullName,
                department: requester.department,
                email: requester.email,
              }
            : null,
          summary: suggestion?.description || attachmentSummary || null,
          requestTypeLabel: suggestion ? requestTypeLabel(suggestion.category) : null,
          requestCode: String(parseJsonObject(suggestion?.adminNotes).linkedCode || parseJsonObject(suggestion?.justification).publicCode || '') || null,
          location: justificationData.location || null,
          itemName: justificationData.itemName || null,
        };
      })
      .filter((row) => Boolean(row.subject || row.to));

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر جلب المراسلات الخارجية' }, { status: 500 });
  }
}
