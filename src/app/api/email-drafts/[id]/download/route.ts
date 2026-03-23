import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function sanitizeHeader(value?: string | null) {
  return String(value || '').replace(/\r/g, ' ').replace(/\n/g, ' ').trim();
}

function buildEmlContent(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const headers = [
    `To: ${sanitizeHeader(params.to)}`,
    `Subject: ${sanitizeHeader(params.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
  ];

  return `${headers.join('\r\n')}\r\n${params.html}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing draft id' }, { status: 400 });
    }

    const draft = await prisma.emailDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const emlContent = buildEmlContent({
      to: draft.recipient,
      subject: draft.subject,
      html: draft.body,
    });

    const safeFileName = `${String(draft.subject || 'email-draft')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || 'email-draft'}.eml`;

    return new NextResponse(emlContent, {
      status: 200,
      headers: {
        'Content-Type': 'message/rfc822; charset=UTF-8',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to download email draft' },
      { status: 500 }
    );
  }
}
