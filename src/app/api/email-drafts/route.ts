import { NextRequest, NextResponse } from 'next/server';
import { SuggestionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type JsonObject = Record<string, any>;
type SuggestionCategory = 'MAINTENANCE' | 'CLEANING' | 'PURCHASE' | 'OTHER';

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

function normalizeCategory(value: any): SuggestionCategory {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'MAINTENANCE') return 'MAINTENANCE';
  if (normalized === 'CLEANING') return 'CLEANING';
  if (normalized === 'PURCHASE') return 'PURCHASE';
  return 'OTHER';
}

function categoryLabel(category: SuggestionCategory) {
  switch (category) {
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

function recipientLabel(category: SuggestionCategory) {
  switch (category) {
    case 'MAINTENANCE':
    case 'CLEANING':
      return 'سعادة مدير الخدمات المساندة سلمه الله';
    case 'PURCHASE':
      return 'سعادة الأستاذ نواف المحارب سلمه الله';
    default:
      return 'إلى من يهمه الأمر';
  }
}

function detectAttachmentKind(value: string) {
  const lower = String(value || '').toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(lower) || lower.startsWith('image/')) return 'image';
  if (/\.(mp4|mov|avi|mkv|webm|m4v)$/.test(lower) || lower.startsWith('video/')) return 'video';
  if (/\.pdf$/.test(lower) || lower.startsWith('application/pdf')) return 'pdf';
  return 'file';
}

function toAttachmentLabels(attachments: any) {
  const list = Array.isArray(attachments) ? attachments : [];
  let imageCount = 0;
  let videoCount = 0;
  let pdfCount = 0;
  let fileCount = 0;

  return list.map((entry) => {
    const source = typeof entry === 'string'
      ? entry
      : String(entry?.name || entry?.filename || entry?.url || entry?.type || '');

    const kind = detectAttachmentKind(source);
    if (kind === 'image') return `صورة مرفقة ${++imageCount}`;
    if (kind === 'video') return `فيديو مرفق ${++videoCount}`;
    if (kind === 'pdf') return `ملف PDF مرفق ${++pdfCount}`;
    return `ملف مرفق ${++fileCount}`;
  });
}

function escapeHtml(value: any) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function buildEmailBody(params: {
  category: SuggestionCategory;
  requestCode: string;
  requestTitle: string;
  createdAt: Date | string;
  requesterName: string;
  requesterDepartment?: string | null;
  requesterEmail?: string | null;
  requesterMobile?: string | null;
  location?: string | null;
  itemName?: string | null;
  description?: string | null;
  justification?: string | null;
  adminNotes?: string | null;
  attachments?: string[];
}) {
  const rows: Array<[string, string]> = [
    ['رقم الطلب', params.requestCode || '—'],
    ['نوع الطلب', categoryLabel(params.category)],
    ['عنوان الطلب', params.requestTitle || categoryLabel(params.category)],
    ['التاريخ', new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(params.createdAt))],
    ['مقدم الطلب', params.requesterName || '—'],
    ['الإدارة', params.requesterDepartment || '—'],
    ['البريد الإلكتروني', params.requesterEmail || '—'],
    ['الجوال', params.requesterMobile || '—'],
    ['الموقع', params.location || '—'],
    ['العنصر المطلوب', params.itemName || '—'],
    ['سبب الطلب', params.description || '—'],
  ];

  if (params.justification) rows.push(['إيضاحات إضافية', params.justification]);
  if (params.adminNotes) rows.push(['توجيه المدير', params.adminNotes]);
  if (params.attachments?.length) rows.push(['المرفقات المرفوعة', params.attachments.join('، ')]);

  const tableRows = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 12px;border:1px solid #d6d7d4;font-weight:700;background:#f8fbfb;width:180px;">${escapeHtml(label)}</td>
        <td style="padding:10px 12px;border:1px solid #d6d7d4;">${escapeHtml(value)}</td>
      </tr>`)
    .join('');

  return `
    <div dir="rtl" style="font-family:Cairo,Tahoma,Arial,sans-serif;color:#1f2937;line-height:1.9;">
      <div style="font-size:18px;font-weight:700;margin-bottom:12px;">${escapeHtml(recipientLabel(params.category))}</div>
      <div style="margin-bottom:12px;">السلام عليكم ورحمة الله وبركاته،</div>
      <div style="margin-bottom:12px;">تهديكم إدارة عمليات التدريب أطيب التحيات، ونأمل التكرم بالاطلاع على الطلب الموضحة بياناته أدناه واتخاذ ما يلزم حيال معالجته، مع إمكانية التواصل المباشر مع مقدم الطلب عند الحاجة.</div>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">${tableRows}</table>
      <div style="margin-top:14px;">نأمل منكم التكرم بتوجيه من يلزم لمعالجة المطلوب، وتقبلوا خالص التحية.</div>
      <div style="margin-top:18px;font-weight:700;">فريق عمل إدارة عمليات التدريب<br/>وكالة الجامعة للتدريب</div>
    </div>`;
}

function asciiFilename(value: string) {
  const fallback = value
    .replace(/[^\x20-\x7E]+/g, '-')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
  return (fallback || 'email-draft').slice(0, 80);
}

async function resolveSuggestionForDraft(draftId: string, sourceId: string, sourceType: string) {
  const suggestions = await prisma.suggestion.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      justification: true,
      adminNotes: true,
      requesterId: true,
      status: true,
      createdAt: true,
    },
  });

  for (const suggestion of suggestions) {
    const adminData = parseJsonObject(suggestion.adminNotes);
    if (String(adminData.linkedDraftId || '') === draftId) return suggestion;
    if (sourceType.toLowerCase() === 'purchase') {
      if (String(adminData.linkedEntityType || '') === 'PurchaseRequest' && String(adminData.linkedEntityId || '') === sourceId) return suggestion;
    } else if (sourceType.toLowerCase() === 'maintenance') {
      if (String(adminData.linkedEntityType || '') === 'MaintenanceRequest' && String(adminData.linkedEntityId || '') === sourceId) return suggestion;
    } else if (suggestion.id === sourceId) {
      return suggestion;
    }
  }

  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const draft = await prisma.emailDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      return NextResponse.json({ error: 'المسودة غير موجودة' }, { status: 404 });
    }

    const suggestion = await resolveSuggestionForDraft(draft.id, draft.sourceId, draft.sourceType);
    const requester = suggestion
      ? await prisma.user.findUnique({
          where: { id: suggestion.requesterId },
          select: { fullName: true, email: true, mobile: true, department: true },
        })
      : null;

    const justification = parseJsonObject(suggestion?.justification);
    const adminData = parseJsonObject(suggestion?.adminNotes);
    const category = normalizeCategory(suggestion?.category || draft.sourceType);
    const requestCode = String(adminData.linkedCode || justification.publicCode || draft.subject || 'email-draft');
    const attachmentLabels = toAttachmentLabels(justification.attachments);
    const htmlBody = buildEmailBody({
      category,
      requestCode,
      requestTitle: suggestion?.title || draft.subject || categoryLabel(category),
      createdAt: suggestion?.createdAt || draft.createdAt,
      requesterName: requester?.fullName || '—',
      requesterDepartment: requester?.department || null,
      requesterEmail: requester?.email || null,
      requesterMobile: requester?.mobile || null,
      location: justification.location || null,
      itemName: justification.itemName || null,
      description: suggestion?.description || null,
      justification: justification.reason || justification.notes || null,
      adminNotes: adminData.adminNotes || null,
      attachments: attachmentLabels,
    });
    const textBody = stripHtmlToText(htmlBody);

    const boundary = `=_nauss_${Date.now()}_${id}`;
    const eml = [
      'X-Unsent: 1',
      `To: ${draft.recipient || ''}`,
      'MIME-Version: 1.0',
      `Subject: ${draft.subject || 'مسودة مراسلة'}`,
      `Date: ${new Date().toUTCString()}`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      textBody,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlBody,
      '',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: { status: 'COPIED', copiedAt: new Date() },
    });

    if (suggestion && suggestion.status !== SuggestionStatus.IMPLEMENTED) {
      await prisma.suggestion.update({
        where: { id: suggestion.id },
        data: {
          status: SuggestionStatus.IMPLEMENTED,
          justification: JSON.stringify({
            ...justification,
            attachments: [],
          }),
        },
      });
    }

    const safeFilename = `${asciiFilename(String(draft.subject || requestCode || 'email-draft'))}.eml`;
    const encodedFilename = encodeURIComponent(`${String(draft.subject || requestCode || 'email-draft').slice(0, 80)}.eml`);

    return new NextResponse(new TextEncoder().encode(eml), {
      status: 200,
      headers: {
        'Content-Type': 'message/rfc822; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'تعذر تصدير ملف EML' },
      { status: 500 }
    );
  }
}
