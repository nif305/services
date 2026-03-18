import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        department: user.department,
        jobTitle: user.jobTitle,
        role: user.role.toLowerCase(),
        status: user.status.toLowerCase(),
        avatar: user.avatar,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: null,
        undertaking: {
          accepted: true,
          acceptedAt: new Date().toISOString(),
        },
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}