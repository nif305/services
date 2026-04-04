import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type JsonObject = Record<string, any>;
type AttachmentPayload = {
  filename?: string;
  contentType?: string;
  base64Content?: string;
};

type SuggestionLite = {
  id: string;
  title: string;
  description: string;
  category: string;
  requesterId: string;
  createdAt: Date;
  justification: string;
  adminNotes: string | null;
};

function parseJsonObject(value: unknown): JsonObject {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as JsonObject;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeCategory(value?: string | null) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'MAINTENANCE') return 'MAINTENANCE';
  if (normalized === 'CLEANING') return 'CLEANING';
  if (normalized === 'PURCHASE') return 'PURCHASE';
  return 'OTHER';
}

function requestTypeLabel(category: string) {
  switch (normalizeCategory(category)) {
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

function simplifyAttachmentName(file: AttachmentPayload, index: number) {
  const mime = String(file?.contentType || '').toLowerCase();
  const name = String(file?.filename || '').toLowerCase();
  const kind = mime || name;
  if (kind.includes('image/')) return `صورة مرفقة ${index + 1}`;
  if (kind.includes('video/')) return `فيديو مرفق ${index + 1}`;
  if (kind.includes('pdf')) return `ملف PDF مرفق ${index + 1}`;
  return `مرفق ${index + 1}`;
}

function sanitizeRichHtml(html?: string | null) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .trim();
}

function findSuggestionForDraft(draft: { id: string; sourceId: string }, suggestions: SuggestionLite[]) {
  for (const suggestion of suggestions) {
    const adminData = parseJsonObject(suggestion.adminNotes);
    if (String(adminData.linkedDraftId || '') === draft.id) return suggestion;
    if (suggestion.id === draft.sourceId) return suggestion;
    if (String(adminData.linkedEntityId || '') === draft.sourceId) return suggestion;
  }
  return null;
}

export async function GET(_request: NextRequest) {
  try {
    const drafts = await prisma.emailDraft.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!drafts.length) {
      return NextResponse.json({ data: [] });
    }

    const suggestions = await prisma.suggestion.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        requesterId: true,
        createdAt: true,
        justification: true,
        adminNotes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const requesterIds = Array.from(new Set(suggestions.map((item) => item.requesterId).filter(Boolean)));
    const users = requesterIds.length
      ? await prisma.user.findMany({
          where: { id: { in: requesterIds } },
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            department: true,
            jobTitle: true,
          },
        })
      : [];

    const userMap = new Map(users.map((user) => [user.id, user]));

    const data = drafts.map((draft) => {
      const suggestion = findSuggestionForDraft(draft, suggestions);
      const justification = parseJsonObject(suggestion?.justification);
      const adminData = parseJsonObject(suggestion?.adminNotes);
      const requester = suggestion ? userMap.get(suggestion.requesterId) : null;
      const attachments = Array.isArray(justification.attachments) ? (justification.attachments as AttachmentPayload[]) : [];
      const requestCode = String(adminData.linkedCode || justification.publicCode || draft.sourceId || '').trim() || draft.id;
      const category = normalizeCategory(suggestion?.category || draft.sourceType);
      const recipient = String(draft.recipient || '').trim();

      return {
        id: draft.id,
        subject: draft.subject,
        to: recipient,
        body: sanitizeRichHtml(draft.body),
        status: draft.status,
        createdAt: draft.createdAt,
        copiedAt: draft.copiedAt,
        requestCode,
        requestType: requestTypeLabel(category),
        requesterName: requester?.fullName || '—',
        requesterEmail: requester?.email || '—',
        requesterMobile: requester?.mobile || '—',
        requesterDepartment: 'إدارة عمليات التدريب',
        requesterJobTitle: requester?.jobTitle || '—',
        location: String(justification.location || '—'),
        itemName: String(justification.itemName || suggestion?.title || '—'),
        description: String(suggestion?.description || '—'),
        recipientLabel:
          category === 'PURCHASE'
            ? 'سعادة الأستاذ نواف المحارب سلمه الله'
            : category === 'MAINTENANCE' || category === 'CLEANING'
              ? 'سعادة مدير إدارة الخدمات المساندة سلمه الله'
              : 'إلى من يهمه الأمر',
        attachments: attachments.map((file, index) => ({
          label: simplifyAttachmentName(file, index),
          originalName: String(file?.filename || '').trim() || simplifyAttachmentName(file, index),
          contentType: String(file?.contentType || '').trim() || 'application/octet-stream',
          hasContent: Boolean(String(file?.base64Content || '').trim()),
        })),
      };
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'تعذر تحميل المراسلات الخارجية' },
      { status: 500 }
    );
  }
}
