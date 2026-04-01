import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function sanitizeHeader(value?: string | null) { return String(value || '').replace(/\r/g, ' ').replace(/\n/g, ' ').trim(); }
function stripHtml(input: string) { return String(input || '').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim(); }
function encodeQuotedPrintable(input: string) {
  const bytes = Buffer.from(input || '', 'utf8'); let out = ''; let lineLength = 0;
  const push = (chunk: string) => { if (lineLength + chunk.length > 73) { out += '=\r\n'; lineLength = 0; } out += chunk; const idx = chunk.lastIndexOf('\r\n'); lineLength = idx >= 0 ? chunk.length - idx - 2 : lineLength + chunk.length; };
  for (let i=0;i<bytes.length;i+=1){ const byte=bytes[i]; if (byte===13 && bytes[i+1]===10){ out+='\r\n'; lineLength=0; i+=1; continue; } const safe=((byte>=33&&byte<=60)||(byte>=62&&byte<=126)||byte===9||byte===32); push(safe?String.fromCharCode(byte):`=${byte.toString(16).toUpperCase().padStart(2,'0')}`);} return out;
}
function buildHtmlDocument(body: string) { return ['<html>','<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>','<body dir="rtl" style="font-family:Cairo,Tahoma,Arial,sans-serif;">',body || '<div>—</div>','</body>','</html>'].join('\r\n'); }
function buildDraftEml(params: { from: string; to: string; subject: string; htmlBody: string; }) {
  const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const htmlDoc = buildHtmlDocument(params.htmlBody);
  const plainText = stripHtml(params.htmlBody || '');
  return [
    'X-Unsent: 1',
    `From: ${sanitizeHeader(params.from)}`,
    `To: ${sanitizeHeader(params.to)}`,
    `Subject: ${sanitizeHeader(params.subject)}`,
    `Thread-Topic: ${sanitizeHeader(params.subject)}`,
    'Content-Language: ar-SA','MIME-Version: 1.0',`Content-Type: multipart/alternative; boundary="${altBoundary}"`,'',
    `--${altBoundary}`,'Content-Type: text/plain; charset="UTF-8"','Content-Transfer-Encoding: quoted-printable','',encodeQuotedPrintable(plainText),'',
    `--${altBoundary}`,'Content-Type: text/html; charset="UTF-8"','Content-Transfer-Encoding: quoted-printable','',encodeQuotedPrintable(htmlDoc),'',
    `--${altBoundary}--`,''
  ].join('\r\n');
}
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const draft = await prisma.emailDraft.findUnique({ where: { id } });
    if (!draft) return NextResponse.json({ error: 'مسودة البريد غير موجودة' }, { status: 404 });
    const eml = buildDraftEml({ from: 'Naif Alshahrani <nalshahrani@nauss.edu.sa>', to: draft.recipient, subject: draft.subject, htmlBody: draft.body || '<div>—</div>' });
    const safeName = sanitizeHeader(draft.subject || `draft-${draft.id}`).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
    return new NextResponse(eml, { status: 200, headers: { 'Content-Type': 'message/rfc822; charset=UTF-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`${safeName}.eml`)}` } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر تنزيل ملف المراسلة حاليًا' }, { status: 500 });
  }
}
