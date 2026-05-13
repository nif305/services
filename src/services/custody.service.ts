import { CustodyStatus, ItemType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const CustodyService = {
  getAll: async ({
    userId,
    role,
    page = 1,
    limit = 50,
    status,
    openId,
    returnableOnly = false,
    excludeReturned = false,
  }: {
    userId: string;
    role: string;
    page?: number;
    limit?: number;
    status?: string | null;
    openId?: string | null;
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

    const include = {
      user: {
        select: {
          id: true,
          fullName: true,
          department: true,
          email: true,
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
      request: {
        select: {
          id: true,
          code: true,
          purpose: true,
          createdAt: true,
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
    } as const;

    const [records, openRecord, total, active, overdue, returnRequested, returned] = await Promise.all([
      prisma.custodyRecord.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include,
        orderBy: [{ expectedReturn: 'asc' }, { issueDate: 'desc' }],
      }),
      openId
        ? prisma.custodyRecord.findFirst({
            where: {
              AND: [
                { id: openId },
                normalizedRole === 'USER' ? { userId } : {},
                returnableOnly ? { item: { type: ItemType.RETURNABLE } } : {},
              ],
            },
            include,
          })
        : Promise.resolve(null),
      prisma.custodyRecord.count({ where }),
      prisma.custodyRecord.count({ where: { ...statsWhere, AND: [...statsWhere.AND, { status: CustodyStatus.ACTIVE }] } }),
      prisma.custodyRecord.count({ where: { ...statsWhere, AND: [...statsWhere.AND, { status: CustodyStatus.OVERDUE }] } }),
      prisma.custodyRecord.count({
        where: { ...statsWhere, AND: [...statsWhere.AND, { status: CustodyStatus.RETURN_REQUESTED }] },
      }),
      prisma.custodyRecord.count({ where: { ...statsWhere, AND: [...statsWhere.AND, { status: CustodyStatus.RETURNED }] } }),
    ]);

    const visibleRecords =
      openRecord && !records.some((record) => record.id === openRecord.id)
        ? [openRecord, ...records].slice(0, safeLimit)
        : records;

    return {
      data: visibleRecords,
      stats: {
        total: excludeReturned ? active + overdue + returnRequested : total,
        active,
        overdue,
        returnRequested,
        returned,
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
