import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type JsonObject = Record<string, any>;
type AttachmentPayload = {
  filename?: string;
  contentType?: string;
  base64Content?: string;
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

function recipientLabel(category: string) {
  switch (normalizeCategory(category)) {
    case 'PURCHASE':
      return 'سعادة الأستاذ نواف المحارب سلمه الله';
    case 'MAINTENANCE':
    case 'CLEANING':
      return 'سعادة مدير إدارة الخدمات المساندة سلمه الله';
    default:
      return 'إلى من يهمه الأمر';
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

function escapeHtml(value?: string | null) {
  return String(value || '—')
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
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function wrapBase64(input: string) {
  const value = String(input || '').replace(/\s+/g, '');
  return value.match(/.{1,76}/g)?.join('\r\n') || '';
}

function buildEmailHtml(params: {
  label: string;
  requestCode: string;
  requestType: string;
  title: string;
  createdAt: Date;
  requesterName: string;
  requesterDepartment: string;
  requesterEmail: string;
  requesterMobile: string;
  requesterJobTitle: string;
  location: string;
  itemName: string;
  description: string;
  adminNotes: string;
  attachmentLabels: string[];
}) {
  const dateText = new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(params.createdAt));

  const rows = [
    ['رقم الطلب', params.requestCode],
    ['نوع الطلب', params.requestType],
    ['عنوان الطلب', params.title],
    ['التاريخ', dateText],
    ['مقدم الطلب', params.requesterName],
    ['الإدارة', 'إدارة عمليات التدريب'],
    ['البريد الإلكتروني', params.requesterEmail],
    ['الجوال', params.requesterMobile],
    ['الصفة الوظيفية', params.requesterJobTitle],
    ['الموقع', params.location],
    ['العنصر المطلوب', params.itemName],
    ['وصف الطلب', params.description],
  ] as Array<[string, string]>;

  if (params.adminNotes) rows.push(['توجيه المدير', params.adminNotes]);
  if (params.attachmentLabels.length) rows.push(['المرفقات المرفوعة', params.attachmentLabels.join('، ')]);

  const tableRows = rows
    .map(
      ([field, value]) => `<tr>
        <td style="padding:10px 12px;border:1px solid #d6d7d4;font-weight:700;background:#f8fbfb;width:190px;vertical-align:top;">${escapeHtml(field)}</td>
        <td style="padding:10px 12px;border:1px solid #d6d7d4;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`
    )
    .join('');

  return `
  <div dir="rtl" style="font-family:Cairo,Tahoma,Arial,sans-serif;color:#1f2937;line-height:1.95;font-size:15px;">
    <div style="font-size:18px;font-weight:700;margin-bottom:14px;">${escapeHtml(params.label)}</div>
    <div style="margin-bottom:12px;">السلام عليكم ورحمة الله وبركاته،</div>
    <div style="margin-bottom:12px;">تحية طيبة وبعد،</div>
    <div style="margin-bottom:12px;">
      نرفع إلى سعادتكم هذا الطلب الوارد من الموظف <strong>${escapeHtml(params.requesterName)}</strong> بإدارة عمليات التدريب،
      والمتعلق بـ<strong>${escapeHtml(params.requestType)}</strong>، آملين التكرم بالاطلاع على التفاصيل أدناه واتخاذ ما ترونه مناسبًا حيال معالجته في أسرع وقت ممكن.
    </div>
    ${params.attachmentLabels.length ? `<div style="margin-bottom:12px;">وقد أُرفقت مع هذه المسودة المرفقات ذات الصلة التالية: <strong>${escapeHtml(params.attachmentLabels.join('، '))}</strong>.</div>` : ''}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">${tableRows}</table>
    <div style="margin-top:14px;">شاكرين لكم تعاونكم، وتفضلوا بقبول خالص التحية والتقدير.</div>
    <div style="margin-top:18px;font-weight:700;">فريق عمل إدارة عمليات التدريب<br/>وكالة الجامعة للتدريب</div>
  </div>`;
}

function buildEmailText(params: {
  label: string;
  requestCode: string;
  requestType: string;
  title: string;
  createdAt: Date;
  requesterName: string;
  requesterEmail: string;
  requesterMobile: string;
  requesterJobTitle: string;
  location: string;
  itemName: string;
  description: string;
  adminNotes: string;
  attachmentLabels: string[];
}) {
  const dateText = new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(params.createdAt));

  const lines = [
    params.label,
    '',
    'السلام عليكم ورحمة الله وبركاته،',
    '',
    'تحية طيبة وبعد،',
    '',
    `نرفع إلى سعادتكم هذا الطلب الوارد من الموظف ${params.requesterName} بإدارة عمليات التدريب، والمتعلق بـ${params.requestType}، آملين التكرم بالاطلاع على التفاصيل أدناه واتخاذ ما ترونه مناسبًا حيال معالجته.`,
    '',
    `رقم الطلب: ${params.requestCode}`,
    `نوع الطلب: ${params.requestType}`,
    `عنوان الطلب: ${params.title}`,
    `التاريخ: ${dateText}`,
    `مقدم الطلب: ${params.requesterName}`,
    'الإدارة: إدارة عمليات التدريب',
    `البريد الإلكتروني: ${params.requesterEmail}`,
    `الجوال: ${params.requesterMobile}`,
    `الصفة الوظيفية: ${params.requesterJobTitle}`,
    `الموقع: ${params.location}`,
    `العنصر المطلوب: ${params.itemName}`,
    `وصف الطلب: ${params.description}`,
  ];

  if (params.adminNotes) lines.push(`توجيه المدير: ${params.adminNotes}`);
  if (params.attachmentLabels.length) lines.push(`المرفقات المرفوعة: ${params.attachmentLabels.join('، ')}`);

  lines.push('', 'شاكرين لكم تعاونكم، وتفضلوا بقبول خالص التحية والتقدير.', '', 'فريق عمل إدارة عمليات التدريب', 'وكالة الجامعة للتدريب');
  return lines.join('\r\n');
}

function sanitizeSubject(value?: string | null) {
  return String(value || 'مسودة مراسلة').replace(/[\r\n]+/g, ' ').trim();
}

function safeAsciiFilename(value: string) {
  const cleaned = String(value || 'email-draft')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return cleaned || 'email-draft';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const draft = await prisma.emailDraft.findUnique({ where: { id } });
    if (!draft) {
      return NextResponse.json({ error: 'المسودة غير موجودة' }, { status: 404 });
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
    });

    const suggestion = suggestions.find((item) => {
      const adminData = parseJsonObject(item.adminNotes);
      return String(adminData.linkedDraftId || '') === id || item.id === draft.sourceId || String(adminData.linkedEntityId || '') === draft.sourceId;
    });

    const requester = suggestion
      ? await prisma.user.findUnique({
          where: { id: suggestion.requesterId },
          select: { fullName: true, email: true, mobile: true, jobTitle: true },
        })
      : null;

    const justification = parseJsonObject(suggestion?.justification);
    const adminData = parseJsonObject(suggestion?.adminNotes);
    const attachments = Array.isArray(justification.attachments) ? (justification.attachments as AttachmentPayload[]) : [];
    const attachmentLabels = attachments.map((file, index) => simplifyAttachmentName(file, index));
    const category = normalizeCategory(suggestion?.category || draft.sourceType);
    const requestCode = String(adminData.linkedCode || justification.publicCode || draft.sourceId || '').trim() || draft.id;
    const requestType = requestTypeLabel(category);
    const title = String(suggestion?.title || requestType || draft.subject || 'طلب تشغيلي').trim();
    const bodyHtml = buildEmailHtml({
      label: recipientLabel(category),
      requestCode,
      requestType,
      title,
      createdAt: suggestion?.createdAt || draft.createdAt,
      requesterName: requester?.fullName || '—',
      requesterDepartment: 'إدارة عمليات التدريب',
      requesterEmail: requester?.email || '—',
      requesterMobile: requester?.mobile || '—',
      requesterJobTitle: requester?.jobTitle || '—',
      location: String(justification.location || '—'),
      itemName: String(justification.itemName || suggestion?.title || '—'),
      description: String(suggestion?.description || '—'),
      adminNotes: String(adminData.adminNotes || '').trim(),
      attachmentLabels,
    });
    const bodyText = buildEmailText({
      label: recipientLabel(category),
      requestCode,
      requestType,
      title,
      createdAt: suggestion?.createdAt || draft.createdAt,
      requesterName: requester?.fullName || '—',
      requesterEmail: requester?.email || '—',
      requesterMobile: requester?.mobile || '—',
      requesterJobTitle: requester?.jobTitle || '—',
      location: String(justification.location || '—'),
      itemName: String(justification.itemName || suggestion?.title || '—'),
      description: String(suggestion?.description || '—'),
      adminNotes: String(adminData.adminNotes || '').trim(),
      attachmentLabels,
    });

    const subject = sanitizeSubject(`${requestType} - ${requestCode}`);
    const to = String(draft.recipient || '').trim();
    const outerBoundary = `mixed_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const altBoundary = `alt_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const parts: string[] = [
      `To: ${to}`,
      'MIME-Version: 1.0',
      'X-Unsent: 1',
      `Subject: ${subject}`,
      `Content-Type: multipart/mixed; boundary="${outerBoundary}"`,
      '',
      `--${outerBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      '',
      `--${altBoundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      bodyText,
      '',
      `--${altBoundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      bodyHtml,
      '',
      `--${altBoundary}--`,
    ];

    attachments.forEach((attachment, index) => {
      const base64Content = String(attachment?.base64Content || '').trim();
      if (!base64Content) return;
      const mime = String(attachment?.contentType || 'application/octet-stream').trim();
      const niceName = simplifyAttachmentName(attachment, index);
      const encodedName = encodeURIComponent(niceName);
      parts.push(
        `--${outerBoundary}`,
        `Content-Type: ${mime}; name*=UTF-8''${encodedName}`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename*=UTF-8''${encodedName}`,
        '',
        wrapBase64(base64Content),
        ''
      );
    });

    parts.push(`--${outerBoundary}--`, '');

    const eml = parts.join('\r\n');
    const bytes = new TextEncoder().encode(eml);

    await prisma.emailDraft.update({
      where: { id },
      data: {
        body: bodyHtml,
        subject,
        status: 'COPIED',
        copiedAt: new Date(),
      },
    });

    if (suggestion) {
      await prisma.suggestion.update({
        where: { id: suggestion.id },
        data: { status: 'IMPLEMENTED' },
      });
    }

    const downloadName = `${safeAsciiFilename(requestCode)}.eml`;
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'message/rfc822',
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `attachment; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'تعذر تنزيل ملف المراسلة حاليًا' },
      { status: 500 }
    );
  }
}
