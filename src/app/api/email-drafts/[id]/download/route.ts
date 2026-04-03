import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

function buildDraftEml(params: { to: string; cc?: string; subject: string; htmlBody: string; textBody: string }) {
  const boundary = `----=_NextDraft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const headers = [
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

  return headers.join('\r\n');
}

function parseJsonObject(value?: string | null): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function fileKindFromName(filename?: string | null) {
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'صورة';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(ext)) return 'فيديو';
  if (ext === 'pdf') return 'ملف PDF';
  if (['doc', 'docx'].includes(ext)) return 'ملف Word';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'ملف Excel';
  if (['ppt', 'pptx'].includes(ext)) return 'عرض تقديمي';
  return 'ملف مرفق';
}

function formatAttachmentLabels(attachments: Array<{ name?: string; filename?: string; url?: string }> = []) {
  const counters: Record<string, number> = {};
  return attachments.map((attachment) => {
    const kind = fileKindFromName(attachment?.name || attachment?.filename || attachment?.url || '');
    counters[kind] = (counters[kind] || 0) + 1;
    return `${kind} ${counters[kind]}`;
  });
}

function sanitizeBodyForDisplay(html?: string | null, attachmentLabels?: string[]) {
  let body = String(html || '').trim();
  if (!body) return '<div dir="rtl">—</div>';

  body = body.replace(
    /<div[^>]*>\s*المرفقات المرفوعه[^<]*<\/div>\s*<div[^>]*>[\s\S]*?<\/div>/i,
    ''
  );

  if (attachmentLabels?.length) {
    const attachmentHtml = `
      <div style="margin-top:16px;font-weight:700;">المرفقات المرفوعة</div>
      <div style="margin-top:8px;">${attachmentLabels.join('، ')}</div>
    `;

    if (body.includes('فريق عمل إدارة عمليات التدريب')) {
      body = body.replace(/<div[^>]*>\s*فريق عمل إدارة عمليات التدريب[\s\S]*$/i, `${attachmentHtml}$&`);
    } else {
      body += attachmentHtml;
    }
  }

  return body;
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
          { adminNotes: { contains: draft.id } },
          draft.sourceType === 'suggestion' || draft.sourceType === 'other'
            ? { id: draft.sourceId }
            : undefined,
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        justification: true,
      },
    });

    const justification = parseJsonObject(relatedSuggestion?.justification);
    const attachmentLabels = formatAttachmentLabels(
      Array.isArray(justification.attachments) ? justification.attachments : []
    );

    const htmlBody = sanitizeBodyForDisplay(draft.body, attachmentLabels);
    const textBody = stripHtmlToText(htmlBody);
    const eml = buildDraftEml({
      to: draft.recipient || '',
      subject: draft.subject || 'مسودة مراسلة',
      htmlBody,
      textBody,
    });

    const filename = `${sanitizeHeader(draft.subject || 'email-draft')}.eml`
      .replace(/[\\/:*?"<>|]+/g, '-')
      .slice(0, 120);

    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        status: 'COPIED',
        copiedAt: new Date(),
      },
    });

    if (relatedSuggestion) {
      const current = parseJsonObject(relatedSuggestion.justification);
      await prisma.suggestion.update({
        where: { id: relatedSuggestion.id },
        data: {
          status: 'IMPLEMENTED',
          justification: JSON.stringify({
            ...current,
            attachments: [],
          }),
        },
      });
    }

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
