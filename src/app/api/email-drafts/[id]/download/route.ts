import { NextRequest, NextResponse } from 'next/server';
import { Role, Status, SuggestionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  AttachmentPayload,
  buildAttachmentSummary,
  buildExternalEmailHtml,
  buildRecipientLabel,
  normalizeRequestType,
  stripHtmlToText,
} from '@/lib/external-email';
import { clearSuggestionAttachmentBodies } from '@/lib/service-attachment-retention';

type JsonObject = Record<string, any>;

type SuggestionRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  requesterId: string;
  createdAt: Date;
  justification: string;
  adminNotes: string | null;
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

function mapRole(role: string): Role {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'manager') return Role.MANAGER;
  if (normalized === 'warehouse') return Role.WAREHOUSE;
  return Role.USER;
}

async function resolveSessionUser(request: NextRequest) {
  const cookieId = decodeURIComponent(request.cookies.get('user_id')?.value || '').trim();
  const cookieEmail = decodeURIComponent(request.cookies.get('user_email')?.value || '').trim();
  const cookieEmployeeId = decodeURIComponent(request.cookies.get('user_employee_id')?.value || '').trim();
  const activeRole = mapRole(
    decodeURIComponent(
      request.cookies.get('server_active_role')?.value ||
        request.cookies.get('active_role')?.value ||
        request.cookies.get('user_role')?.value ||
        'user'
    ).trim()
  );

  let user = null as any;
  if (cookieId) {
    user = await prisma.user.findUnique({
      where: { id: cookieId },
      select: { id: true, roles: true, status: true },
    });
  }
  if (!user && cookieEmail) {
    user = await prisma.user.findFirst({
      where: { email: { equals: cookieEmail, mode: 'insensitive' } },
      select: { id: true, roles: true, status: true },
    });
  }
  if (!user && cookieEmployeeId) {
    user = await prisma.user.findUnique({
      where: { employeeId: cookieEmployeeId },
      select: { id: true, roles: true, status: true },
    });
  }

  if (!user) throw new Error('تعذر التحقق من المستخدم الحالي.');
  if (user.status !== Status.ACTIVE) throw new Error('الحساب غير نشط.');
  if (!Array.isArray(user.roles) || !user.roles.includes(activeRole)) {
    throw new Error('الدور النشط غير صالح.');
  }

  return { id: user.id, role: activeRole };
}

function sanitizeHeader(value?: string | null) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function parseRecipientList(value?: string | null) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBase64Lines(value: string) {
  return value.replace(/.{1,76}/g, '$&\r\n').trim();
}

function toBase64Text(value: string) {
  return toBase64Lines(Buffer.from(value, 'utf8').toString('base64'));
}

function encodeMimeWord(value?: string | null) {
  const safeValue = sanitizeHeader(value);
  if (!safeValue) return '';
  if (/^[\x20-\x7E]*$/.test(safeValue)) return safeValue;
  return `=?UTF-8?B?${Buffer.from(safeValue, 'utf8').toString('base64')}?=`;
}

function safeAsciiFilename(value: string) {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return (cleaned || 'email-draft').slice(0, 120);
}

function findLinkedSuggestion(
  draft: { id: string; sourceId: string; subject?: string | null; body?: string | null },
  suggestions: SuggestionRecord[]
) {
  const draftText = `${draft.subject || ''} ${stripHtmlToText(draft.body || '')}`;

  return (
    suggestions.find((item) => {
      const admin = parseJsonObject(item.adminNotes);
      const justification = parseJsonObject(item.justification);
      const requestCode = String(justification.publicCode || admin.linkedCode || '').trim();

      return (
        String(admin.linkedDraftId || '') === draft.id ||
        item.id === draft.sourceId ||
        String(admin.linkedEntityId || '') === draft.sourceId ||
        (!!requestCode && draftText.includes(requestCode))
      );
    }) || null
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await resolveSessionUser(request);
    if (sessionUser.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

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

    const linkedSuggestion = findLinkedSuggestion(draft, suggestions);
    const justification = parseJsonObject(linkedSuggestion?.justification);
    const admin = parseJsonObject(linkedSuggestion?.adminNotes);
    const attachments = Array.isArray(justification.attachments)
      ? (justification.attachments as AttachmentPayload[])
      : [];

    const requester = linkedSuggestion
      ? await prisma.user.findUnique({
          where: { id: linkedSuggestion.requesterId },
          select: {
            fullName: true,
            email: true,
            mobile: true,
            jobTitle: true,
          },
        })
      : null;

    const requestCode = String(
      justification.publicCode || admin.linkedCode || draft.sourceId || draft.id
    ).trim();
    const requestType = normalizeRequestType(linkedSuggestion?.category || draft.sourceType);
    const serviceItems = Array.isArray(justification.serviceItems) ? justification.serviceItems : [];
    const itemName = String(
      justification.itemName || serviceItems.join('، ') || linkedSuggestion?.title || '—'
    );
    const attachmentsSummary = buildAttachmentSummary(attachments);

    const recipient = parseRecipientList(draft.recipient).join(', ') || sanitizeHeader(draft.recipient || '');
    const subject = sanitizeHeader(
      linkedSuggestion ? `${linkedSuggestion.title} - ${requestCode}` : draft.subject || 'مسودة مراسلة'
    );
    const htmlBody = linkedSuggestion
      ? buildExternalEmailHtml({
          recipientLabel: buildRecipientLabel(linkedSuggestion.category),
          requestCode,
          requestTitle: requestType.label,
          createdAt: linkedSuggestion.createdAt,
          requesterName: requester?.fullName || '—',
          requesterDepartment: 'إدارة عمليات التدريب',
          requesterEmail: requester?.email || '—',
          requesterMobile: requester?.mobile || '—',
          requesterExtension: requester?.jobTitle || '—',
          location: String(justification.location || admin.location || '—'),
          itemName,
          description: linkedSuggestion.description || '—',
          justification: String(justification.requestSource || justification.programName || '').trim(),
          adminNotes: String(admin.adminNotes || '').trim(),
          attachmentsSummary,
        })
      : String(draft.body || '');
    const textBody = stripHtmlToText(htmlBody) || ' ';

    const mixedBoundary = `mixed_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const altBoundary = `alt_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const lines: string[] = [
      `To: ${parseRecipientList(recipient).join(', ')}`,
      `Subject: ${encodeMimeWord(subject || 'مسودة مراسلة')}`,
      'MIME-Version: 1.0',
      'X-Unsent: 1',
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      '',
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      '',
      `--${altBoundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      toBase64Text(textBody),
      '',
      `--${altBoundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      toBase64Text(htmlBody || '<div></div>'),
      '',
      `--${altBoundary}--`,
    ];

    for (const attachment of attachments) {
      const base64Content = String(attachment.base64Content || '').replace(/\s+/g, '').trim();
      if (!base64Content) continue;

      const filename = sanitizeHeader(attachment.filename || 'attachment.bin') || 'attachment.bin';
      const contentType =
        sanitizeHeader(attachment.contentType || 'application/octet-stream') ||
        'application/octet-stream';

      lines.push(
        '',
        `--${mixedBoundary}`,
        `Content-Type: ${contentType}; name="${filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${filename}"`,
        '',
        toBase64Lines(base64Content)
      );
    }

    lines.push('', `--${mixedBoundary}--`, '');

    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        recipient,
        subject,
        body: htmlBody,
        status: 'COPIED',
        copiedAt: new Date(),
      },
    });

    if (linkedSuggestion) {
      await prisma.suggestion.update({
        where: { id: linkedSuggestion.id },
        data: { status: SuggestionStatus.IMPLEMENTED },
      });
      try {
        await clearSuggestionAttachmentBodies(linkedSuggestion.id, 'email-draft-downloaded');
      } catch (cleanupError) {
        console.error('Failed to clear downloaded service attachments', cleanupError);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: 'DOWNLOAD_EMAIL_DRAFT',
        entity: 'EmailDraft',
        entityId: draft.id,
        details: JSON.stringify({
          subject,
          sourceType: draft.sourceType,
          sourceId: draft.sourceId,
        }),
      },
    });

    const eml = lines.join('\r\n');
    const buffer = Buffer.from(eml, 'utf8');
    const downloadName = `${safeAsciiFilename(subject)}.eml`;
    const encodedName = encodeURIComponent(`${subject || 'email-draft'}.eml`);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'message/rfc822; charset=utf-8',
        'Content-Disposition': `attachment; filename="${downloadName}"; filename*=UTF-8''${encodedName}`,
        'Content-Length': String(buffer.byteLength),
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
