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


function buildRecipientsFromCategory(category?: string | null, provided?: string | null) {
  const normalized = String(category || '').trim().toUpperCase();
  if (normalized === 'PURCHASE') return 'wa.n1@nauss.edu.sa';
  if (normalized === 'MAINTENANCE' || normalized === 'CLEANING') return 'ssd@nauss.edu.sa,AAlosaimi@nauss.edu.sa';
  return String(provided || '').trim();
}

function buildFallbackExternalDraftHtml(params: {
  recipientLabel: string;
  requestCode: string;
  requestTitle: string;
  requesterName: string;
  requesterEmail: string;
  requesterMobile?: string;
  location?: string;
  itemName?: string;
  description: string;
  attachmentsSummary?: string;
}) {
  const rows = [
    ['رقم الطلب', params.requestCode],
    ['نوع الطلب', params.requestTitle],
    ['مقدم الطلب', params.requesterName],
    ['الإدارة', 'إدارة عمليات التدريب'],
    ['البريد الإلكتروني', params.requesterEmail || '—'],
    ['الجوال', params.requesterMobile || '—'],
    ['الموقع', params.location || '—'],
    ['العناصر المطلوبة', params.itemName || '—'],
    ['الوصف', params.description || '—'],
  ];
  if (params.attachmentsSummary) rows.push(['المرفقات', params.attachmentsSummary]);
  const tableRows = rows.map(([label, value]) => `<tr><td style="padding:10px 12px;border:1px solid #d6d7d4;font-weight:700;background:#f8fbfb;width:180px;">${label}</td><td style="padding:10px 12px;border:1px solid #d6d7d4;">${value}</td></tr>`).join('');
  return `<div dir="rtl" style="font-family:Cairo,Tahoma,Arial,sans-serif;color:#1f2937;line-height:2;"><div style="font-size:18px;font-weight:700;margin-bottom:12px;">${params.recipientLabel}</div><div style="margin-bottom:12px;">السلام عليكم ورحمة الله وبركاته،</div><div style="margin-bottom:12px;">تحية طيبة وبعد،</div><div style="margin-bottom:12px;">نأمل التكرم بالاطلاع على الطلب المرفوع أدناه واتخاذ ما يلزم حيال معالجته.</div><table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">${tableRows}</table><div style="margin-top:14px;">وتفضلوا بقبول خالص التحية والتقدير.</div><div style="margin-top:18px;font-weight:700;">فريق عمل إدارة عمليات التدريب<br/>وكالة الجامعة للتدريب</div></div>`;
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = String(url.searchParams.get('scope') || 'active').toLowerCase();
    const suggestions = await prisma.suggestion.findMany({
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
    });

    const approvedSuggestions = suggestions.filter((item) => item.status === 'APPROVED' || item.status === 'IMPLEMENTED');
    for (const suggestion of approvedSuggestions) {
      const admin = parseJsonObject(suggestion.adminNotes);
      const justification = parseJsonObject(suggestion.justification);
      const linkedDraftId = String(admin.linkedDraftId || '');
      const linkedEntityId = String(admin.linkedEntityId || suggestion.id);
      let existingDraft = linkedDraftId ? await prisma.emailDraft.findUnique({ where: { id: linkedDraftId } }) : null;
      if (!existingDraft) {
        existingDraft = await prisma.emailDraft.findFirst({
          where: {
            OR: [
              { sourceId: linkedEntityId },
              { sourceId: suggestion.id },
            ],
          },
        });
      }
      if (existingDraft) continue;

      const requester = await prisma.user.findUnique({ where: { id: suggestion.requesterId }, select: { fullName: true, email: true, mobile: true } });
      const requestCode = String(admin.linkedCode || justification.publicCode || suggestion.id);
      const serviceItems = Array.isArray(justification.serviceItems) ? justification.serviceItems : [];
      const itemName = String(justification.itemName || serviceItems.join('، ') || suggestion.title || '—');
      const attachments = Array.isArray(justification.attachments) ? justification.attachments : [];
      const attachmentsSummary = attachments.map((item: any, index: number) => friendlyAttachmentName(item, index)).join('، ');
      const recipient = buildRecipientsFromCategory(suggestion.category, justification.externalRecipient);
      const recipientLabel = suggestion.category === 'PURCHASE' ? 'سعادة الأستاذ/ نواف المحارب سلمه الله' : (suggestion.category === 'MAINTENANCE' || suggestion.category === 'CLEANING') ? 'سعادة مدير إدارة الخدمات المساندة سلمه الله' : 'إلى من يهمه الأمر';
      const draft = await prisma.emailDraft.create({
        data: {
          sourceType: String(suggestion.category || 'other').toLowerCase(),
          sourceId: linkedEntityId,
          recipient,
          subject: `${suggestion.title} - ${requestCode}`,
          body: buildFallbackExternalDraftHtml({
            recipientLabel,
            requestCode,
            requestTitle: normalizeRequestType(suggestion.category).label,
            requesterName: requester?.fullName || '—',
            requesterEmail: requester?.email || '—',
            requesterMobile: requester?.mobile || '—',
            location: String(justification.location || '—'),
            itemName,
            description: suggestion.description || '—',
            attachmentsSummary,
          }),
          status: 'DRAFT',
        },
      });
      await prisma.suggestion.update({ where: { id: suggestion.id }, data: { adminNotes: JSON.stringify({ ...admin, linkedDraftId: draft.id }) } });
    }

    const draftWhere =
      scope === 'archived'
        ? { status: { in: ['COPIED', 'SENT'] as const } }
        : scope === 'all'
          ? {}
          : { status: 'DRAFT' as const };

    const [drafts, users] = await Promise.all([
      prisma.emailDraft.findMany({
        where: draftWhere,
        orderBy: { createdAt: 'desc' },
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
      const mappedStatus = draft.status === 'COPIED' ? 'COPIED' : draft.status === 'SENT' ? 'SENT' : 'DRAFT';

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
        itemName: String(justification.itemName || (Array.isArray(justification.serviceItems) ? justification.serviceItems.join('، ') : '') || admin.itemName || linkedSuggestion?.title || '—'),
        description: linkedSuggestion?.description || stripHtmlToText(draft.body),
        attachments: attachments.map((item, index) => ({
          name: friendlyAttachmentName(item, index),
        })),
      };
    });

    const sorted = data.sort((a, b) => {
      const aDate = new Date((a.updatedAt || a.createdAt || 0) as any).getTime();
      const bDate = new Date((b.updatedAt || b.createdAt || 0) as any).getTime();
      return bDate - aDate;
    });

    return NextResponse.json({ data: sorted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'تعذر جلب المراسلات الخارجية' },
      { status: 500 }
    );
  }
}
