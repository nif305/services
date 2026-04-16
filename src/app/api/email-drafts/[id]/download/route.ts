import { NextRequest, NextResponse } from 'next/server';
import { Role, Status, SuggestionStatus } from '@prisma/client';
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
  const activeRole = mapRole(decodeURIComponent(request.cookies.get('server_active_role')?.value || request.cookies.get('active_role')?.value || request.cookies.get('user_role')?.value || 'user').trim());
  let user = null as any;
  if (cookieId) user = await prisma.user.findUnique({ where: { id: cookieId }, select: { id: true, roles: true, status: true } });
  if (!user && cookieEmail) user = await prisma.user.findFirst({ where: { email: { equals: cookieEmail, mode: 'insensitive' } }, select: { id: true, roles: true, status: true } });
  if (!user && cookieEmployeeId) user = await prisma.user.findUnique({ where: { employeeId: cookieEmployeeId }, select: { id: true, roles: true, status: true } });
  if (!user) throw new Error('تعذر التحقق من المستخدم الحالي.');
  if (user.status !== Status.ACTIVE) throw new Error('الحساب غير نشط.');
  if (!Array.isArray(user.roles) || !user.roles.includes(activeRole)) throw new Error('الدور النشط غير صالح.');
  return { id: user.id, role: activeRole };
}
function sanitizeHeader(value?: string | null) { return String(value || '').replace(/[\r\n]+/g, ' ').trim(); }
function stripHtmlToText(html?: string | null) {
  return String(html || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/tr>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<li>/gi, '• ').replace(/<\/li>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}
function toBase64Lines(value: string) { return value.replace(/.{1,76}/g, '$&\r\n').trim(); }
function safeAsciiFilename(value: string) {
  const cleaned = value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  return (cleaned || 'email-draft').slice(0, 120);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await resolveSessionUser(_request);
    if (sessionUser.role !== Role.MANAGER) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const { id } = await params;
    const draft = await prisma.emailDraft.findUnique({ where: { id } });
    if (!draft) return NextResponse.json({ error: 'المسودة غير موجودة' }, { status: 404 });

    const suggestions = await prisma.suggestion.findMany({ select: { id: true, justification: true, adminNotes: true } });
    let attachments: AttachmentPayload[] = [];
    let linkedSuggestionId = '';
    for (const item of suggestions) {
      const admin = parseJsonObject(item.adminNotes);
      if (String(admin.linkedDraftId || '') === draft.id || item.id === draft.sourceId || String(admin.linkedEntityId || '') === draft.sourceId) {
        const justification = parseJsonObject(item.justification);
        attachments = Array.isArray(justification.attachments) ? justification.attachments as AttachmentPayload[] : [];
        linkedSuggestionId = item.id;
        break;
      }
    }

    const subject = sanitizeHeader(draft.subject || 'مسودة مراسلة');
    const to = sanitizeHeader(draft.recipient || '');
    const htmlBody = String(draft.body || '');
    const textBody = stripHtmlToText(htmlBody) || ' ';

    const mixedBoundary = `mixed_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const altBoundary = `alt_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const lines: string[] = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'X-Unsent: 1',
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      '',
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      '',
      `--${altBoundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      textBody,
      '',
      `--${altBoundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlBody || '<div></div>',
      '',
      `--${altBoundary}--`,
    ];

    for (const attachment of attachments) {
      const base64Content = String(attachment.base64Content || '').trim();
      if (!base64Content) continue;
      const filename = sanitizeHeader(attachment.filename || 'attachment.bin') || 'attachment.bin';
      const contentType = sanitizeHeader(attachment.contentType || 'application/octet-stream') || 'application/octet-stream';
      lines.push('', `--${mixedBoundary}`, `Content-Type: ${contentType}; name="${filename}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${filename}"`, '', toBase64Lines(base64Content));
    }

    lines.push('', `--${mixedBoundary}--`, '');
    const eml = lines.join('\r\n');
    const downloadName = `${safeAsciiFilename(subject)}.eml`;
    const encodedName = encodeURIComponent(`${subject || 'email-draft'}.eml`);

    await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: 'COPIED', copiedAt: new Date() } });
    if (linkedSuggestionId) {
      await prisma.suggestion.update({
        where: { id: linkedSuggestionId },
        data: { status: SuggestionStatus.IMPLEMENTED },
      });
    }

    const buffer = new TextEncoder().encode(eml);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'message/rfc822',
        'Content-Disposition': `attachment; filename="${downloadName}"; filename*=UTF-8''${encodedName}`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر تصدير ملف EML' }, { status: 500 });
  }
}
