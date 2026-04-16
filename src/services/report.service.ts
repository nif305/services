import { ItemType, RequestStatus, ReturnStatus, CustodyStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type TopItemRow = {
  itemId: string;
  name: string;
  code: string;
  quantity: number;
};

type TopUserRow = {
  userId: string;
  fullName: string;
  department: string;
  quantity: number;
};

function startOfCurrentYear() {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}

function resolvePeriodStart(period?: string | null) {
  const value = String(period || 'year').toLowerCase();
  const now = new Date();
  if (value === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (value === '90d') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (value === 'all') return new Date(0);
  return startOfCurrentYear();
}

export const ReportService = {
  getMaterialsExecutiveSummary: async (period?: string | null) => {
    const yearStart = resolvePeriodStart(period);

    const [
      totalItems,
      lowStockItems,
      outOfStockItems,
      inventoryItems,
      requests,
      approvedReturns,
      activeCustodyCount,
      activeCustodyQty,
    ] = await Promise.all([
      prisma.inventoryItem.count(),
      prisma.inventoryItem.count({
        where: { status: 'LOW_STOCK' },
      }),
      prisma.inventoryItem.count({
        where: { status: 'OUT_OF_STOCK' },
      }),
      prisma.inventoryItem.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
      }),
      prisma.request.findMany({
        where: {
          createdAt: {
            gte: yearStart,
          },
        },
        select: {
          id: true,
          code: true,
          status: true,
          requesterId: true,
          createdAt: true,
          requester: {
            select: {
              id: true,
              fullName: true,
              department: true,
            },
          },
          items: {
            select: {
              itemId: true,
              quantity: true,
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      }),
      prisma.returnRequest.findMany({
        where: {
          status: ReturnStatus.APPROVED,
          processedAt: {
            gte: yearStart,
          },
        },
        select: {
          id: true,
          requesterId: true,
          custody: {
            select: {
              quantity: true,
              itemId: true,
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      }),
      prisma.custodyRecord.count({
        where: {
          status: {
            in: [CustodyStatus.ACTIVE, CustodyStatus.RETURN_REQUESTED, CustodyStatus.OVERDUE],
          },
        },
      }),
      prisma.custodyRecord.findMany({
        where: {
          status: {
            in: [CustodyStatus.ACTIVE, CustodyStatus.RETURN_REQUESTED, CustodyStatus.OVERDUE],
          },
        },
        select: {
          quantity: true,
        },
      }),
    ]);

    const issuedStatuses = new Set<RequestStatus>([RequestStatus.ISSUED, RequestStatus.RETURNED]);

    const issuedRequests = requests.filter((request) => issuedStatuses.has(request.status));
    const returnedRequests = requests.filter((request) => request.status === RequestStatus.RETURNED);
    const pendingRequests = requests.filter((request) => request.status === RequestStatus.PENDING).length;
    const rejectedRequests = requests.filter((request) => request.status === RequestStatus.REJECTED).length;

    let totalIssuedQuantityYTD = 0;
    let totalConsumedQuantityYTD = 0;

    const topConsumedItemsMap = new Map<string, TopItemRow>();
    const topIssuedUsersMap = new Map<string, TopUserRow>();
    const userConsumptionMap = new Map<string, TopUserRow>();

    for (const request of issuedRequests) {
      let requestTotalQty = 0;
      let requestConsumableQty = 0;

      for (const row of request.items) {
        const qty = Number(row.quantity || 0);
        totalIssuedQuantityYTD += qty;
        requestTotalQty += qty;

        if (row.item?.type === ItemType.CONSUMABLE) {
          totalConsumedQuantityYTD += qty;
          requestConsumableQty += qty;

          const currentItem = topConsumedItemsMap.get(row.itemId) || {
            itemId: row.itemId,
            name: row.item?.name || 'مادة',
            code: row.item?.code || '—',
            quantity: 0,
          };

          currentItem.quantity += qty;
          topConsumedItemsMap.set(row.itemId, currentItem);
        }
      }

      if (request.requesterId) {
        const currentUser = topIssuedUsersMap.get(request.requesterId) || {
          userId: request.requesterId,
          fullName: request.requester?.fullName || '—',
          department: request.requester?.department || '—',
          quantity: 0,
        };
        currentUser.quantity += requestTotalQty;
        topIssuedUsersMap.set(request.requesterId, currentUser);

        const consumptionUser = userConsumptionMap.get(request.requesterId) || {
          userId: request.requesterId,
          fullName: request.requester?.fullName || '—',
          department: request.requester?.department || '—',
          quantity: 0,
        };
        consumptionUser.quantity += requestConsumableQty;
        userConsumptionMap.set(request.requesterId, consumptionUser);
      }
    }

    let totalReturnedQuantityYTD = 0;

    for (const returnRow of approvedReturns) {
      totalReturnedQuantityYTD += Number(returnRow.custody?.quantity || 0);
    }

    const healthPercentage =
      totalItems > 0
        ? Math.max(0, Math.round(((totalItems - lowStockItems - outOfStockItems) / totalItems) * 100))
        : 0;

    return {
      system: 'materials',
      totalItems,
      lowStockItems,
      outOfStockItems,
      activeCustody: activeCustodyCount,
      activeCustodyQuantity: activeCustodyQty.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
      pendingRequests,
      rejectedRequests,
      totalIssuedRequests: issuedRequests.length,
      totalReturnedRequests: returnedRequests.length,
      totalIssuedQuantityYTD,
      totalConsumedQuantityYTD,
      totalReturnedQuantityYTD,
      healthPercentage,
      topConsumedItems: Array.from(topConsumedItemsMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10),
      topIssuedUsers: Array.from(topIssuedUsersMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10),
      userConsumption: Array.from(userConsumptionMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20),
      requestsByStatus: {
        pending: pendingRequests,
        rejected: rejectedRequests,
        issued: issuedRequests.length,
        returned: returnedRequests.length,
      },
      recentRequests: requests
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8)
        .map((request) => ({
          id: request.id,
          code: request.code,
          status: request.status,
          requesterName: request.requester?.fullName || '—',
          department: request.requester?.department || '—',
          createdAt: request.createdAt,
          itemCount: request.items.length,
        })),
    };
  },

  getServicesExecutiveSummary: async (period?: string | null) => {
    const start = resolvePeriodStart(period);
    const [suggestions, drafts, users] = await Promise.all([
      prisma.suggestion.findMany({
        where: { createdAt: { gte: start } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emailDraft.findMany({
        where: { createdAt: { gte: start } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        select: { id: true, fullName: true, department: true },
      }),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const countCategory = (category: string, statuses?: string[]) =>
      suggestions.filter((row) => row.category === category && (!statuses || statuses.includes(String(row.status)))).length;
    const activeRequests = suggestions.filter((row) => ['PENDING', 'UNDER_REVIEW', 'REJECTED'].includes(String(row.status)));
    const topRequestersMap = new Map<string, { userId: string; fullName: string; department: string; quantity: number }>();

    for (const row of suggestions) {
      const current = topRequestersMap.get(row.requesterId) || {
        userId: row.requesterId,
        fullName: userMap.get(row.requesterId)?.fullName || '—',
        department: userMap.get(row.requesterId)?.department || '—',
        quantity: 0,
      };
      current.quantity += 1;
      topRequestersMap.set(row.requesterId, current);
    }

    return {
      system: 'services',
      totalRequests: suggestions.length,
      activeRequests: activeRequests.length,
      pendingManager: suggestions.filter((row) => ['PENDING', 'UNDER_REVIEW'].includes(String(row.status))).length,
      rejectedRequests: suggestions.filter((row) => String(row.status) === 'REJECTED').length,
      activeDrafts: drafts.filter((row) => String(row.status) === 'DRAFT').length,
      archivedDrafts: drafts.filter((row) => ['COPIED', 'SENT'].includes(String(row.status))).length,
      categoryCounts: {
        maintenance: countCategory('MAINTENANCE'),
        cleaning: countCategory('CLEANING'),
        purchase: countCategory('PURCHASE'),
        other: countCategory('OTHER'),
      },
      categoryPending: {
        maintenance: countCategory('MAINTENANCE', ['PENDING', 'UNDER_REVIEW']),
        cleaning: countCategory('CLEANING', ['PENDING', 'UNDER_REVIEW']),
        purchase: countCategory('PURCHASE', ['PENDING', 'UNDER_REVIEW']),
        other: countCategory('OTHER', ['PENDING', 'UNDER_REVIEW']),
      },
      recentRequests: activeRequests.slice(0, 8).map((row) => ({
        id: row.id,
        code: (() => {
          try {
            const parsed = JSON.parse(String(row.justification || '{}'));
            return parsed.publicCode || row.id;
          } catch {
            return row.id;
          }
        })(),
        title: row.title,
        status: row.status,
        category: row.category,
        requesterName: userMap.get(row.requesterId)?.fullName || '—',
        department: userMap.get(row.requesterId)?.department || '—',
        createdAt: row.createdAt,
      })),
      topRequesters: Array.from(topRequestersMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10),
      externalDrafts: drafts
        .filter((row) => String(row.status) === 'DRAFT')
        .slice(0, 8)
        .map((row) => ({
          id: row.id,
          subject: row.subject,
          recipient: row.recipient,
          createdAt: row.createdAt,
        })),
    };
  },

  getExecutiveSummary: async (system?: string | null, period?: string | null) => {
    const normalized = String(system || 'materials').toLowerCase();
    if (normalized === 'services') {
      return ReportService.getServicesExecutiveSummary(period);
    }
    return ReportService.getMaterialsExecutiveSummary(period);
  },
};
