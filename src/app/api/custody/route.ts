import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 401 });
    }

    const custodyRecords = await prisma.custodyRecord.findMany({
      where: {
        userId,
        status: {
          in: ['ACTIVE', 'OVERDUE', 'RETURN_REQUESTED'],
        },
        item: {
          type: 'RETURNABLE',
        },
      },
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            type: true,
          },
        },
        user: {
          select: {
            fullName: true,
            department: true,
          },
        },
        returnRequests: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            code: true,
            status: true,
            conditionNote: true,
            rejectionReason: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { issueDate: 'desc' },
      ],
    });

    return NextResponse.json({
      data: custodyRecords.map((record) => ({
        id: record.id,
        issueDate: record.issueDate,
        dueDate: record.dueDate,
        notes: record.notes,
        status: record.status,
        userId,
        user: record.user,
        item: record.item,
        returnRequests: record.returnRequests.map((request) => ({
          ...request,
          createdAt: request.createdAt.toISOString(),
        })),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'تعذر جلب العهد' }, { status: 500 });
  }
}