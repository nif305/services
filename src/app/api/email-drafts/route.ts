import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const draft = await prisma.emailDraft.findUnique({ where: { id } });
    if (!draft) return NextResponse.json({ error: 'المسودة غير موجودة' }, { status: 404 });

    const content = `To: ${draft.recipient}
Subject: ${draft.subject}

${draft.body}`;
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="email-draft-${id}.txt"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر تنزيل المسودة' }, { status: 500 });
  }
}
