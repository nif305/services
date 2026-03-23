import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AttachmentLike = {
  filename?: string;
  name?: string;
  contentType?: string;
  type?: string;
  base64Content?: string;
  base64?: string;
  data?: string;
};

function sanitizeHeader(value?: string | null) {
  return String(value || '').replace(/\r/g, ' ').replace(/\n/g, ' ').trim();
}

function toQuotedPrintable(input: string) {
  const utf8 = Buffer.from(input, 'utf8');
  let out = '';

  for (let i = 0; i < utf8.length; i += 1) {
    const byte = utf8[i];
    if (
      (byte >= 33 && byte <= 60) ||
      (byte >= 62 && byte <= 126) ||
      byte === 9 ||
      byte === 32
    ) {
      out += String.fromCharCode(byte);
    } else if (byte === 13 && utf8[i + 1] === 10) {
      out += '\r\n';
      i += 1;
    } else {
      out += `=${byte.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }

  return out.replace(/(.{1,72})(?=.{73,})/g, '$1=\r\n');
}

function normalizeAttachments(value: any): Array<{ filename: string; contentType: string; base64Content: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: AttachmentLike | string) => {
      if (typeof item === 'string') {
        return null;
      }

      const filename = String(item.filename || item.name || '').trim();
      const contentType = String(item.contentType || item.type || 'application/octet-stream').trim();
      const base64Content = String(item.base64Content || item.base64 || item.data || '').trim();

      if (!filename || !base64Content) return null;

      return {
        filename,
        contentType,
        base64Content: base64Content.replace(/\s+/g, ''),
      };
    })
    .filter(Boolean) as Array<{ filename: string; contentType: string; base64Content: string }>;
}

async function findRelatedAttachments(draftId: string) {
  const suggestion = await prisma.suggestion.findFirst({
    where: {
      adminNotes: {
        contains: draftId,
      },
    },
    select: {
      justification: true,
    },
  });

  if (!suggestion?.justification) return [];

  try {
    const parsed = JSON.parse(suggestion.justification);
    return normalizeAttachments(parsed?.attachments);
  } catch {
    return [];
  }
}

function buildDraftEml(params: {
  to: string;
  cc?: string | null;
  subject: string;
  htmlBody: string;
  attachments?: Array<{ filename: string; contentType: string; base64Content: string }>;
}) {
  const mixedBoundary = `----=_Mixed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const headers = [
    `To: ${sanitizeHeader(params.to)}`,
    params.cc ? `Cc: ${sanitizeHeader(params.cc)}` : '',
    `Subject: ${sanitizeHeader(params.subject)}`,
    'MIME-Version: 1.0',
    'X-Unsent: 1',
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    '',
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    toQuotedPrintable('يرجى فتح هذه المسودة في Outlook أو عميل بريد يدعم HTML.'),
    '',
    `--${altBoundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    toQuotedPrintable(params.htmlBody || '<div dir="rtl">—</div>'),
    '',
    `--${altBoundary}--`,
    '',
  ].filter(Boolean);

  const attachmentParts = (params.attachments || []).flatMap((attachment) => [
    `--${mixedBoundary}`,
    `Content-Type: ${sanitizeHeader(attachment.contentType)}; name="${sanitizeHeader(attachment.filename)}"`,
    `Content-Disposition: attachment; filename="${sanitizeHeader(attachment.filename)}"`,
    'Content-Transfer-Encoding: base64',
    '',
    attachment.base64Content,
    '',
  ]);

  return [
    ...headers,
    ...attachmentParts,
    `--${mixedBoundary}--`,
    '',
  ].join('\r\n');
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const draft = await prisma.emailDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      return NextResponse.json({ error: 'مسودة البريد غير موجودة' }, { status: 404 });
    }

    const attachments = await findRelatedAttachments(draft.id);

    const eml = buildDraftEml({
      to: draft.recipient,
      cc: null,
      subject: draft.subject,
      htmlBody: draft.body || '<div dir="rtl">—</div>',
      attachments,
    });

    const safeName = sanitizeHeader(draft.subject || `draft-${draft.id}`)
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    return new NextResponse(eml, {
      status: 200,
      headers: {
        'Content-Type': 'message/rfc822; charset=UTF-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`${safeName}.eml`)}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'تعذر تنزيل ملف المراسلة حاليًا' },
      { status: 500 }
    );
  }
}
