import { NextRequest, NextResponse } from 'next/server';
import { DraftStatus, SuggestionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type JsonObject = Record<string, any>;

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

function buildDraftEml(params: { to: string; cc?: string; subject: string; htmlBody: string; textBody: string }) {
  const boundary = `----=_Draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const lines = [
    'X-Unsent: 1',
    `To: ${sanitizeHeader(params.to)}`,
    params.cc ? `Cc: ${sanitizeHeader(params.cc)}` : '',
    `Subject: ${sanitizeHeader(params.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.htmlBody,
    '',
    `--${boundary}--`,
    '',
  ].filter(Boolean);

  return lines.join('\r\n');
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

    const relatedSuggestion = await prisma.suggestion.findFirst({
      where: {
        OR: [
          { id: draft.sourceId },
          { adminNotes: { contains: draft.id } },
        ],
      },
    });

    const subject = sanitizeHeader(draft.subject || 'مسودة مراسلة');
    const to = sanitizeHeader(draft.recipient || '');
    const htmlBody = String(draft.body || '');
    const textBody = stripHtmlToText(htmlBody);
    const cc = relatedSuggestion
      ? await prisma.user
          .findUnique({
            where: { id: relatedSuggestion.requesterId },
            select: { email: true },
          })
          .then((user) => String(user?.email || '').trim())
      : '';

    const eml = buildDraftEml({ to, cc, subject, htmlBody, textBody });

    const filename = `${subject || 'email-draft'}.eml`
      .replace(/[\\/:*?"<>|]+/g, '-')
      .slice(0, 120);

    await prisma.$transaction(async (tx) => {
      await tx.emailDraft.update({
        where: { id: draft.id },
        data: {
          status: DraftStatus.COPIED,
          copiedAt: new Date(),
        },
      });

      if (relatedSuggestion) {
        const justificationData = parseJsonObject(relatedSuggestion.justification);
        await tx.suggestion.update({
          where: { id: relatedSuggestion.id },
          data: {
            status: SuggestionStatus.IMPLEMENTED,
            justification: JSON.stringify({
              ...justificationData,
              attachments: [],
            }),
          },
        });
      }
    });

    return new NextResponse(eml, {
      status: 200,
      headers: {
        'Content-Type': 'message/rfc822; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'تعذر تصدير ملف EML' },
      { status: 500 }
    );
  }
}
