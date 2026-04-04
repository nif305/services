import { NextRequest, NextResponse } from 'next/server';
import { SuggestionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type JsonObject = Record<string, any>;

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

function sanitizeHeader(value?: string | null) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
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

function foldBase64(value: string) {
  return String(value || '').replace(/(.{76})/g, '$1\r\n');
}

function attachmentLabel(file: any, index: number) {
  const type = String(file?.contentType || file?.type || '').toLowerCase();
  const name = String(file?.filename || '').toLowerCase();
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return `image-${index + 1}`;
  if (type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|wmv)$/i.test(name)) return `video-${index + 1}`;
  if (type.includes('pdf') || /\.pdf$/i.test(name)) return `document-${index + 1}.pdf`;
  return sanitizeHeader(file?.filename || `attachment-${index + 1}`) || `attachment-${index + 1}`;
}

function buildAsciiFilename(subject: string, requestCode: string) {
  const safeBase = sanitizeHeader(`${requestCode || 'request'}-draft`)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${safeBase || 'email-draft'}.eml`;
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

    const suggestions = await prisma.suggestion.findMany();
    const suggestion = suggestions.find((item) => {
      const adminData = parseJsonObject(item.adminNotes);
      return String(adminData.linkedDraftId || '') === String(draft.id) || String(item.id) === String(draft.sourceId);
    }) || null;

    const justificationData = parseJsonObject(suggestion?.justification);
    const adminData = parseJsonObject(suggestion?.adminNotes);
    const requestCode = String(adminData.linkedCode || justificationData.publicCode || suggestion?.id || draft.sourceId || draft.id);

    const htmlBody = String(draft.body || '');
    const textBody = stripHtmlToText(htmlBody);
    const to = sanitizeHeader(draft.recipient || '');
    const subject = sanitizeHeader(draft.subject || `مراسلة خارجية - ${requestCode}`);

    const boundaryMixed = `mixed_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const boundaryAlt = `alt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const attachments = Array.isArray(justificationData.attachments) ? justificationData.attachments : [];

    const parts: string[] = [
      `To: ${to}`,
      'MIME-Version: 1.0',
      'X-Unsent: 1',
      `Subject: ${subject}`,
      `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`,
      '',
      `--${boundaryMixed}`,
      `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
      '',
      `--${boundaryAlt}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      textBody,
      '',
      `--${boundaryAlt}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlBody,
      '',
      `--${boundaryAlt}--`,
    ];

    attachments.forEach((file: any, index: number) => {
      const base64Content = String(file?.base64Content || '').trim();
      if (!base64Content) return;
      const contentType = sanitizeHeader(file?.contentType || 'application/octet-stream');
      const filename = attachmentLabel(file, index);
      parts.push(
        '',
        `--${boundaryMixed}`,
        `Content-Type: ${contentType}; name="${filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${filename}"`,
        '',
        foldBase64(base64Content)
      );
    });

    parts.push('', `--${boundaryMixed}--`, '');
    const eml = parts.join('\r\n');
    const body = new TextEncoder().encode(eml);
    const filename = buildAsciiFilename(subject, requestCode);

    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: { status: 'COPIED', copiedAt: new Date() },
    });

    if (suggestion) {
      await prisma.suggestion.update({
        where: { id: suggestion.id },
        data: { status: SuggestionStatus.IMPLEMENTED },
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'message/rfc822',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(body.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر تنزيل ملف المراسلة حاليًا' }, { status: 500 });
  }
}
