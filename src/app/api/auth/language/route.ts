import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveSessionUser } from '@/lib/auth/session';

function normalizeLanguage(value: unknown) {
  return String(value || '').trim().toLowerCase() === 'en' ? 'en' : 'ar';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const preferredLanguage = normalizeLanguage(body?.preferredLanguage);

    let session = null as Awaited<ReturnType<typeof resolveSessionUser>> | null;
    try {
      session = await resolveSessionUser(request);
    } catch {
      const response = NextResponse.json({
        data: { preferredLanguage },
      });

      response.cookies.set('preferred_language', preferredLanguage, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });

      return response;
    }

    await prisma.user.update({
      where: { id: session.id },
      data: { preferredLanguage },
    });

    const response = NextResponse.json({
      data: { preferredLanguage },
    });

    response.cookies.set('preferred_language', preferredLanguage, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unable to update language preference' },
      { status: 400 }
    );
  }
}
