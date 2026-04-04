import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type JsonObject = Record<string, any>;

type AttachmentPayload = {
  filename?: string;
  contentType?: string;
  base64Content?: string;
};

function parseJsonObject(value: any): JsonObject {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as JsonObject;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function stripHtmlToText(html?: string | null) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizeRequestType(sourceType?: string | null) {
  const normalized = String(sourceType || '').trim().toLowerCase();
  if (normalized === 'maintenance') return { code: 'MAINTENANCE', label: 'طلب صيانة' };
  if (normalized === 'cleaning') return { code: 'CLEANING', label: 'طلب نظافة' };
  if (normalized === 'purchase') return { code: 'PURCHASE', label: 'طلب شراء مباشر' };
  return { code: 'OTHER', label: 'طلب آخر' };
}

function friendlyAttachmentName(item: AttachmentPayload, index: number) {
  const contentType = String(item?.contentType || '').toLowerCase();
  const filename = String(item?.filename || '').toLowerCase();
  if (contentType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(filename)) {
    return `صورة مرفقة ${index + 1}`;
  }
  if (contentType.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/.test(filename)) {
    return `فيديو مرفق ${index + 1}`;
  }
  if (contentType.includes('pdf') || filename.endsWith('.pdf')) {
    return `ملف PDF مرفق ${index + 1}`;
  }
  return `ملف مرفق ${index + 1}`;
}

function extractCodeCandidates(draft: { subject?: string | null; body?: string | null }) {
  const text = `${draft.subject || ''} ${stripHtmlToText(draft.body || '')}`;
  const matches = text.match(/[A-Z]{3}-\d{4}-\d{4}/g) || [];
  return Array.from(new Set(matches));
}

function findLinkedSuggestion(
  draft: { id: string; sourceId: string; subject?: string | null; body?: string | null },
  suggestions: Array<{ id: string; title: string; description: string; justification: string; category: string; requesterId: string; status: string; createdAt: Date; updatedAt: Date; adminNotes: string | null }>
) {
  const codes = extractCodeCandidates(draft);

  let suggestion = suggestions.find((item) => {
    const admin = parseJsonObject(item.adminNotes);
    return String(admin.linkedDraftId || '') === draft.id;
  });
  if (suggestion) return suggestion;

  suggestion = suggestions.find((item) => item.id === draft.sourceId);
  if (suggestion) return suggestion;

  suggestion = suggestions.find((item) => {
    const admin = parseJsonObject(item.adminNotes);
    return String(admin.linkedEntityId || '') === draft.sourceId;
  });
  if (suggestion) return suggestion;

  suggestion = suggestions.find((item) => {
    const admin = parseJsonObject(item.adminNotes);
    const justification = parseJsonObject(item.justification);
    const linkedCode = String(admin.linkedCode || '');
    const publicCode = String(justification.publicCode || '');
    return codes.includes(linkedCode) || codes.includes(publicCode);
  });

  return suggestion || null;
}

export async function GET() {
  try {
    const [drafts, suggestions, users] = await Promise.all([
      prisma.emailDraft.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.suggestion.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          justification: true,
          category: true,
          requesterId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          adminNotes: true,
        },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          mobile: true,
          department: true,
          jobTitle: true,
        },
      }),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));

    const data = drafts.map((draft) => {
      const linkedSuggestion = findLinkedSuggestion(draft, suggestions);
      const requester = linkedSuggestion ? userMap.get(linkedSuggestion.requesterId) : null;
      const admin = parseJsonObject(linkedSuggestion?.adminNotes);
      const justification = parseJsonObject(linkedSuggestion?.justification);
      const attachments = Array.isArray(justification.attachments) ? (justification.attachments as AttachmentPayload[]) : [];
      const requestType = normalizeRequestType(linkedSuggestion?.category || draft.sourceType);
      const requestCode = String(admin.linkedCode || justification.publicCode || draft.sourceId || draft.id);
      const mappedStatus = draft.status === 'COPIED' ? 'READY' : draft.status === 'SENT' ? 'SENT' : 'DRAFT';

      return {
        id: draft.id,
        subject: draft.subject,
        to: draft.recipient,
        cc: null,
        body: draft.body,
        status: mappedStatus,
        createdAt: draft.createdAt,
        updatedAt: draft.copiedAt || draft.createdAt,
        createdBy: requester
          ? {
              fullName: requester.fullName,
            }
          : null,
        requestCode,
        requestType: requestType.code,
        requestTypeLabel: requestType.label,
        requesterName: requester?.fullName || '—',
        requesterEmail: requester?.email || '—',
        requesterMobile: requester?.mobile || '—',
        requesterDepartment: 'إدارة عمليات التدريب',
        requesterJobTitle: requester?.jobTitle || '—',
        location: String(justification.location || admin.location || '—'),
        itemName: String(justification.itemName || admin.itemName || linkedSuggestion?.title || '—'),
        description: linkedSuggestion?.description || stripHtmlToText(draft.body),
        attachments: attachments.map((item, index) => ({
          name: friendlyAttachmentName(item, index),
        })),
      };
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'تعذر جلب المراسلات الخارجية' },
      { status: 500 }
    );
  }
}
