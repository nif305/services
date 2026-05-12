import { CustodyStatus, ItemType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const CustodyService = {
  getAll: async ({
    userId,
    role,
    page = 1,
    limit = 50,
    status,
    returnableOnly = false,
    excludeReturned = false,
  }: {
    userId: string;
    role: string;
    page?: number;
    limit?: number;
    status?: string | null;
    returnableOnly?: boolean;
    excludeReturned?: boolean;
  }) => {
    const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(1, Math.trunc(limit)), 200) : 50;
    const normalizedRole = String(role || '').toUpperCase();
    const normalizedStatus = String(status || '').trim().toUpperCase();
    const scopeFilters = [
      normalizedRole === 'USER' ? { userId } : {},
      returnableOnly ? { item: { type: ItemType.RETURNABLE } } : {},
      normalizedStatus
        ? { status: normalizedStatus as CustodyStatus }
        : excludeReturned
          ? {
              status: {
                in: [CustodyStatus.ACTIVE, CustodyStatus.OVERDUE, CustodyStatus.RETURN_REQUESTED],
              },
            }
          : {},
    ];

    const where = {
      AND: scopeFilters,
    };

    const statsWhere = {
      AND: [
        normalizedRole === 'USER' ? { userId } : {},
        returnableOnly ? { item: { type: ItemType.RETURNABLE } } : {},
        excludeReturned
          ? {
              status: {
                in: [CustodyStatus.ACTIVE, CustodyStatus.OVERDUE, CustodyStatus.RETURN_REQUESTED],
              },
            }
          : {},
      ],
    };

    const [records, total, active, overdue, returnRequested] = await Promise.all([
      prisma.custodyRecord.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          user: {
            select: {
              fullName: true,
              department: true,
            },
          },
          item: {
            select: {
              name: true,
              code: true,
              category: true,
              type: true,
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
        orderBy: [{ expectedReturn: 'asc' }, { issueDate: 'desc' }],
      }),
      prisma.custodyRecord.count({ where }),
      prisma.custodyRecord.count({ where: { ...statsWhere, AND: [...statsWhere.AND, { status: CustodyStatus.ACTIVE }] } }),
      prisma.custodyRecord.count({ where: { ...statsWhere, AND: [...statsWhere.AND, { status: CustodyStatus.OVERDUE }] } }),
      prisma.custodyRecord.count({
        where: { ...statsWhere, AND: [...statsWhere.AND, { status: CustodyStatus.RETURN_REQUESTED }] },
      }),
    ]);

    return {
      data: records,
      stats: {
        total: excludeReturned ? active + overdue + returnRequested : total,
        active,
        overdue,
        returnRequested,
      },
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  },
};
