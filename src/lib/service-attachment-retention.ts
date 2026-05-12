import { prisma } from '@/lib/prisma';

const MAX_ATTACHMENT_COUNT = 8;
const MAX_SINGLE_BASE64_LENGTH = 950_000;
const MAX_TOTAL_BASE64_LENGTH = 3_600_000;
const ATTACHMENT_RETENTION_DAYS = 10;

type JsonObject = Record<string, any>;

export type StoredServiceAttachment = {
  filename: string;
  contentType: string;
  base64Content: string;
  uploadedAt: string;
  originalSize?: number;
  compressedSize?: number;
};

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

function sanitizeFilename(value: any, index: number) {
  const cleaned = String(value || `attachment-${index + 1}`)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return (cleaned || `attachment-${index + 1}`).slice(0, 140);
}

function sanitizeContentType(value: any) {
  const contentType = String(value || 'application/octet-stream')
    .replace(/[\r\n;]+/g, '')
    .trim()
    .toLowerCase();

  return contentType || 'application/octet-stream';
}

function isAllowedAttachment(filename: string, contentType: string) {
  const lowerName = filename.toLowerCase();
  return (
    contentType.startsWith('image/') ||
    contentType === 'application/pdf' ||
    /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|pdf)$/i.test(lowerName)
  );
}

function hasAttachmentBody(item: any) {
  return Boolean(String(item?.base64Content || '').replace(/\s+/g, '').trim());
}

export function attachmentDisplayName(item: any, index: number) {
  const contentType = String(item?.contentType || item?.type || '').toLowerCase();
  const filename = String(item?.filename || item?.name || '').toLowerCase();

  if (contentType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(filename)) {
    return `صورة مرفقة ${index + 1}`;
  }

  if (contentType.includes('pdf') || filename.endsWith('.pdf')) {
    return `ملف PDF مرفق ${index + 1}`;
  }

  return `مرفق ${index + 1}`;
}

export function normalizeServiceAttachments(rawAttachments: unknown): StoredServiceAttachment[] {
  if (!Array.isArray(rawAttachments) || rawAttachments.length === 0) return [];
  if (rawAttachments.length > MAX_ATTACHMENT_COUNT) {
    throw new Error(`يمكن رفع ${MAX_ATTACHMENT_COUNT} مرفقات كحد أقصى لكل طلب.`);
  }

  const uploadedAt = new Date().toISOString();
  let totalBase64Length = 0;

  return rawAttachments
    .map((item, index) => {
      const filename = sanitizeFilename(item?.filename || item?.name, index);
      const contentType = sanitizeContentType(item?.contentType || item?.type);
      const base64Content = String(item?.base64Content || '').replace(/\s+/g, '').trim();

      if (!base64Content) return null;
      if (!isAllowedAttachment(filename, contentType)) {
        throw new Error('نوع المرفق غير مدعوم. المسموح حاليًا الصور وملفات PDF الصغيرة فقط.');
      }
      if (base64Content.length > MAX_SINGLE_BASE64_LENGTH) {
        throw new Error('حجم أحد المرفقات كبير. حاول رفع صورة أصغر أو اترك النظام يضغط الصورة قبل الإرسال.');
      }

      totalBase64Length += base64Content.length;
      if (totalBase64Length > MAX_TOTAL_BASE64_LENGTH) {
        throw new Error('إجمالي حجم المرفقات كبير. قلل عدد الصور أو حجمها ثم حاول مرة أخرى.');
      }

      return {
        filename,
        contentType,
        base64Content,
        uploadedAt,
        originalSize: Number(item?.originalSize || item?.size || 0) || undefined,
        compressedSize: Number(item?.compressedSize || 0) || undefined,
      };
    })
    .filter(Boolean) as StoredServiceAttachment[];
}

export function removeAttachmentBodiesFromJustification(
  justification: any,
  reason: 'email-draft-downloaded' | 'expired-after-10-days'
) {
  const data = parseJsonObject(justification);
  const attachments = Array.isArray(data.attachments) ? data.attachments : [];
  const liveAttachments = attachments.filter(hasAttachmentBody);

  if (!liveAttachments.length) {
    return { changed: false, justification: typeof justification === 'string' ? justification : JSON.stringify(data), removedCount: 0 };
  }

  const removedSummary = attachments.map((item: any, index: number) => ({
    name: attachmentDisplayName(item, index),
    filename: sanitizeFilename(item?.filename || item?.name, index),
    contentType: sanitizeContentType(item?.contentType || item?.type),
    uploadedAt: item?.uploadedAt || null,
  }));

  const nextData = {
    ...data,
    attachments: [],
    attachmentsRemovedAt: new Date().toISOString(),
    attachmentsRemovedReason: reason,
    attachmentsRemovedCount: Number(data.attachmentsRemovedCount || 0) + liveAttachments.length,
    attachmentsRemovedSummary: removedSummary,
  };

  return {
    changed: true,
    justification: JSON.stringify(nextData),
    removedCount: liveAttachments.length,
  };
}

export async function clearSuggestionAttachmentBodies(
  suggestionId: string,
  reason: 'email-draft-downloaded' | 'expired-after-10-days'
) {
  const suggestion = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    select: { id: true, justification: true },
  });

  if (!suggestion) return { changed: false, removedCount: 0 };

  const result = removeAttachmentBodiesFromJustification(suggestion.justification, reason);
  if (!result.changed) return result;

  await prisma.suggestion.update({
    where: { id: suggestion.id },
    data: { justification: result.justification },
  });

  return result;
}

export async function pruneExpiredSuggestionAttachmentBodies(limit = 25) {
  const cutoff = new Date(Date.now() - ATTACHMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await prisma.suggestion.findMany({
    where: {
      createdAt: { lt: cutoff },
      justification: { contains: 'base64Content' },
    },
    select: { id: true, justification: true },
    take: limit,
  });

  let removedCount = 0;
  for (const suggestion of candidates) {
    const result = removeAttachmentBodiesFromJustification(suggestion.justification, 'expired-after-10-days');
    if (!result.changed) continue;

    await prisma.suggestion.update({
      where: { id: suggestion.id },
      data: { justification: result.justification },
    });
    removedCount += result.removedCount;
  }

  return { scanned: candidates.length, removedCount };
}
