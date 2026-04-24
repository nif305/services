export type AttachmentPayload = {
  filename?: string;
  contentType?: string;
  base64Content?: string;
};

const DEFAULT_DEPARTMENT = 'إدارة عمليات التدريب';
const SUPPORT_RECIPIENTS = 'ssd@nauss.edu.sa,AAlosaimi@nauss.edu.sa';
const PURCHASE_RECIPIENT = 'wa.n1@nauss.edu.sa';

function escapeHtml(value?: string | null) {
  return String(value || '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatArabicDate(value?: Date | string | null) {
  if (!value) return '—';

  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Riyadh',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

export function stripHtmlToText(html?: string | null) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, '- ')
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

export function normalizeRequestType(sourceType?: string | null) {
  const normalized = String(sourceType || '').trim().toLowerCase();
  if (normalized === 'maintenance') return { code: 'MAINTENANCE', label: 'طلب صيانة' };
  if (normalized === 'cleaning') return { code: 'CLEANING', label: 'طلب نظافة' };
  if (normalized === 'purchase') return { code: 'PURCHASE', label: 'طلب شراء مباشر' };
  return { code: 'OTHER', label: 'طلب آخر' };
}

export function friendlyAttachmentName(item: AttachmentPayload, index: number) {
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

export function buildAttachmentSummary(attachments: AttachmentPayload[] = []) {
  return attachments.map((item, index) => friendlyAttachmentName(item, index)).join('، ');
}

export function buildRecipientsFromCategory(category?: string | null, provided?: string | null) {
  const normalized = String(category || '').trim().toUpperCase();
  if (normalized === 'PURCHASE') return PURCHASE_RECIPIENT;
  if (normalized === 'MAINTENANCE' || normalized === 'CLEANING') return SUPPORT_RECIPIENTS;
  return String(provided || '').trim();
}

export function buildRecipientLabel(category?: string | null) {
  const normalized = String(category || '').trim().toUpperCase();

  if (normalized === 'PURCHASE') {
    return 'سعادة الأستاذ/ نواف المحارب سلمه الله';
  }

  if (normalized === 'MAINTENANCE' || normalized === 'CLEANING') {
    return 'سعادة مدير إدارة الخدمات المساندة سلمه الله';
  }

  return 'إلى من يهمه الأمر';
}

export function buildExternalEmailHtml(params: {
  recipientLabel: string;
  requestCode: string;
  requestTitle: string;
  createdAt?: Date | string | null;
  requesterName: string;
  requesterDepartment?: string | null;
  requesterEmail: string;
  requesterMobile?: string | null;
  requesterExtension?: string | null;
  location?: string | null;
  itemName?: string | null;
  description: string;
  justification?: string | null;
  adminNotes?: string | null;
  attachmentsSummary?: string | null;
}) {
  const rows: Array<[string, string]> = [
    ['رقم الطلب', params.requestCode],
    ['نوع الطلب', params.requestTitle],
  ];

  if (params.createdAt) {
    rows.push(['التاريخ', formatArabicDate(params.createdAt)]);
  }

  rows.push(
    ['مقدم الطلب', params.requesterName || '—'],
    ['الإدارة', params.requesterDepartment || DEFAULT_DEPARTMENT],
    ['البريد الإلكتروني', params.requesterEmail || '—'],
    ['الجوال', params.requesterMobile || '—'],
    ['رقم التحويلة', params.requesterExtension || '—'],
    ['الموقع', params.location || '—'],
    ['العنصر المطلوب', params.itemName || '—'],
    ['سبب الطلب', params.description || '—']
  );

  if (String(params.justification || '').trim()) {
    rows.push(['إيضاحات إضافية', String(params.justification).trim()]);
  }

  if (String(params.adminNotes || '').trim()) {
    rows.push(['توجيه المدير', String(params.adminNotes).trim()]);
  }

  if (String(params.attachmentsSummary || '').trim()) {
    rows.push(['المرفقات المرفوعة', String(params.attachmentsSummary).trim()]);
  }

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 12px;border:1px solid #d6d7d4;font-weight:700;background:#f8fbfb;width:180px;">${escapeHtml(label)}</td><td style="padding:10px 12px;border:1px solid #d6d7d4;">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  return `
  <div dir="rtl" style="font-family:Cairo,Tahoma,Arial,sans-serif;color:#1f2937;line-height:2;">
    <div style="font-size:18px;font-weight:700;margin-bottom:12px;">${escapeHtml(params.recipientLabel)}</div>
    <div style="margin-bottom:12px;">السلام عليكم ورحمة الله وبركاته،</div>
    <div style="margin-bottom:12px;">تحية طيبة وبعد،</div>
    <div style="margin-bottom:12px;">تهديكم إدارة عمليات التدريب أطيب التحايا، وتفيدكم بأن الموظف/ <strong>${escapeHtml(params.requesterName || 'مقدم الطلب')}</strong> قد رفع ${escapeHtml(params.requestTitle)} بشأن <strong>${escapeHtml(params.itemName || params.requestTitle)}</strong>، ونأمل من سعادتكم التكرم بالاطلاع على التفاصيل الموضحة أدناه واتخاذ ما يلزم حيال معالجته في أقرب وقت ممكن.</div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">${tableRows}</table>
    <div style="margin-top:14px;">وتفضلوا بقبول خالص التحية والتقدير.</div>
    <div style="margin-top:18px;font-weight:700;">فريق عمل إدارة عمليات التدريب<br/>وكالة الجامعة للتدريب</div>
  </div>`.trim();
}
