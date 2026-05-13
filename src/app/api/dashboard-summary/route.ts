import { NextRequest, NextResponse } from 'next/server';
import {
  CustodyStatus,
  DraftStatus,
  ItemStatus,
  ItemType,
  Prisma,
  RequestStatus,
  ReturnStatus,
  Role,
  Status,
  SuggestionStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

type GroupCountRow = Record<string, unknown> & {
  _count: {
    _all: number;
  };
};

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

  const effectiveRole = mapRole(
    decodeURIComponent(
      request.headers.get('x-active-role') ||
        request.cookies.get('server_active_role')?.value ||
        request.cookies.get('active_role')?.value ||
        request.cookies.get('user_role')?.value ||
        'user'
    ).trim()
  );

  let user = null;

  if (cookieId) {
    user = await prisma.user.findUnique({ where: { id: cookieId }, select: { id: true, status: true } });
  }

  if (!user && cookieEmail) {
    user = await prisma.user.findFirst({
      where: { email: { equals: cookieEmail, mode: 'insensitive' } },
      select: { id: true, status: true },
    });
  }

  if (!user && cookieEmployeeId) {
    user = await prisma.user.findUnique({ where: { employeeId: cookieEmployeeId }, select: { id: true, status: true } });
  }

  if (!user) throw new Error('Unable to resolve current user.');
  if (user.status !== Status.ACTIVE) throw new Error('User account is not active.');

  return { id: user.id, role: effectiveRole };
}

async function runDashboardQuery<T>(query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error: any) {
    const message = String(error?.message || '');
    const isTransientConnectionIssue =
      error?.code === 'P1017' ||
      message.includes('Server has closed the connection') ||
      message.includes("Can't reach database server");

    if (!isTransientConnectionIssue) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
    return query();
  }
}

function sumCounts(rows: GroupCountRow[]) {
  return rows.reduce((total, row) => total + (row._count?._all || 0), 0);
}

function countBy(rows: GroupCountRow[], key: string, value: string) {
  return rows
    .filter((row) => String(row[key]) === value)
    .reduce((total, row) => total + (row._count?._all || 0), 0);
}

function countCategoryByStatus(rows: GroupCountRow[], category: string, statuses?: string[]) {
  return rows
    .filter((row) => {
      const matchesCategory = String(row.category) === category;
      const matchesStatus = !statuses || statuses.includes(String(row.status));
      return matchesCategory && matchesStatus;
    })
    .reduce((total, row) => total + (row._count?._all || 0), 0);
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveSessionUser(request);
    // Dashboard cards are operational summaries, not row-level lists. Keep them
    // global so every role sees the platform state instead of an empty personal
    // slice; detailed pages still enforce their own role-based access rules.
    const requestWhere: Prisma.RequestWhereInput = {};
    const returnWhere: Prisma.ReturnRequestWhereInput = {};
    const suggestionWhere: Prisma.SuggestionWhereInput = {};
    const custodyWhere: Prisma.CustodyRecordWhereInput = {};
    const draftWhere: Prisma.EmailDraftWhereInput = {};

    // Keep these reads sequential. The production database can close the connection
    // when the dashboard fires too many aggregate queries at once.
    const inventoryStatusRows = await runDashboardQuery(() =>
      prisma.inventoryItem.groupBy({ by: ['status'], _count: { _all: true } })
    );
    const inventoryTypeRows = await runDashboardQuery(() =>
      prisma.inventoryItem.groupBy({ by: ['type'], _count: { _all: true } })
    );
    const requestStatusRows = await runDashboardQuery(() =>
      prisma.request.groupBy({ by: ['status'], where: requestWhere, _count: { _all: true } })
    );
    const requestItemsCount = await runDashboardQuery(() =>
      prisma.requestItem.count()
    );
    const returnStatusRows = await runDashboardQuery(() =>
      prisma.returnRequest.groupBy({ by: ['status'], where: returnWhere, _count: { _all: true } })
    );
    const custodyStatusRows = await runDashboardQuery(() =>
      prisma.custodyRecord.groupBy({ by: ['status'], where: custodyWhere, _count: { _all: true } })
    );
    const suggestionStatusRows = await runDashboardQuery(() =>
      prisma.suggestion.groupBy({ by: ['status'], where: suggestionWhere, _count: { _all: true } })
    );
    const suggestionCategoryRows = await runDashboardQuery(() =>
      prisma.suggestion.groupBy({ by: ['category', 'status'], where: suggestionWhere, _count: { _all: true } })
    );
    const emailDraftStatusRows = await runDashboardQuery(() =>
      prisma.emailDraft.groupBy({ by: ['status'], where: draftWhere, _count: { _all: true } })
    );
    const unreadNotifications = await runDashboardQuery(() =>
      prisma.notification.count({ where: { userId: session.id, isRead: false } })
    );
    const latestUpdates = await runDashboardQuery(() =>
      prisma.notification.findMany({ where: { userId: session.id }, orderBy: { createdAt: 'desc' }, take: 4 })
    );

    const totalInventory = sumCounts(inventoryStatusRows);
    const lowStock = countBy(inventoryStatusRows, 'status', ItemStatus.LOW_STOCK);
    const outOfStock = countBy(inventoryStatusRows, 'status', ItemStatus.OUT_OF_STOCK);
    const returnableItems = countBy(inventoryTypeRows, 'type', ItemType.RETURNABLE);
    const consumableItems = countBy(inventoryTypeRows, 'type', ItemType.CONSUMABLE);

    const materialRequestsTotal = sumCounts(requestStatusRows);
    const pendingRequests =
      countBy(requestStatusRows, 'status', RequestStatus.PENDING) +
      countBy(requestStatusRows, 'status', RequestStatus.APPROVED);
    const approvedRequests = countBy(requestStatusRows, 'status', RequestStatus.APPROVED);
    const issuedRequests = countBy(requestStatusRows, 'status', RequestStatus.ISSUED);
    const returnedRequests = countBy(requestStatusRows, 'status', RequestStatus.RETURNED);
    const rejectedRequests = countBy(requestStatusRows, 'status', RequestStatus.REJECTED);

    const returnRequestsTotal = sumCounts(returnStatusRows);
    const pendingReturns = countBy(returnStatusRows, 'status', ReturnStatus.PENDING);
    const approvedReturns = countBy(returnStatusRows, 'status', ReturnStatus.APPROVED);
    const rejectedReturns = countBy(returnStatusRows, 'status', ReturnStatus.REJECTED);

    const custodyTotal = sumCounts(custodyStatusRows);
    const activeCustody =
      countBy(custodyStatusRows, 'status', CustodyStatus.ACTIVE) +
      countBy(custodyStatusRows, 'status', CustodyStatus.OVERDUE) +
      countBy(custodyStatusRows, 'status', CustodyStatus.RETURN_REQUESTED);
    const returnedCustody = countBy(custodyStatusRows, 'status', CustodyStatus.RETURNED);
    const delayedCustody = countBy(custodyStatusRows, 'status', CustodyStatus.OVERDUE);

    const serviceRequestsTotal = sumCounts(suggestionStatusRows);
    const serviceUnderReview = countBy(suggestionStatusRows, 'status', SuggestionStatus.UNDER_REVIEW);
    const serviceApproved = countBy(suggestionStatusRows, 'status', SuggestionStatus.APPROVED);
    const serviceImplemented = countBy(suggestionStatusRows, 'status', SuggestionStatus.IMPLEMENTED);
    const serviceRejected = countBy(suggestionStatusRows, 'status', SuggestionStatus.REJECTED);

    const openServiceStatuses = [SuggestionStatus.PENDING, SuggestionStatus.UNDER_REVIEW];
    const maintenanceTotal = countCategoryByStatus(suggestionCategoryRows, 'MAINTENANCE');
    const maintenancePending = countCategoryByStatus(suggestionCategoryRows, 'MAINTENANCE', openServiceStatuses);
    const cleaningTotal = countCategoryByStatus(suggestionCategoryRows, 'CLEANING');
    const cleaningPending = countCategoryByStatus(suggestionCategoryRows, 'CLEANING', openServiceStatuses);
    const purchaseTotal = countCategoryByStatus(suggestionCategoryRows, 'PURCHASE');
    const purchasePending = countCategoryByStatus(suggestionCategoryRows, 'PURCHASE', openServiceStatuses);
    const otherTotal = countCategoryByStatus(suggestionCategoryRows, 'OTHER');
    const otherPending = countCategoryByStatus(suggestionCategoryRows, 'OTHER', openServiceStatuses);

    const emailDraftsTotal = sumCounts(emailDraftStatusRows);
    const activeEmailDrafts = countBy(emailDraftStatusRows, 'status', DraftStatus.DRAFT);
    const copiedEmailDrafts = countBy(emailDraftStatusRows, 'status', DraftStatus.COPIED);
    const sentEmailDrafts = countBy(emailDraftStatusRows, 'status', DraftStatus.SENT);

    return NextResponse.json(
      {
        metrics: {
          totalInventory,
          lowStock,
          outOfStock,
          availableInventory: Math.max(totalInventory - outOfStock, 0),
          returnableItems,
          consumableItems,
          materialRequestsTotal,
          pendingRequests,
          approvedRequests,
          issuedRequests,
          returnedRequests,
          rejectedRequests,
          returnRequestsTotal,
          pendingReturns,
          approvedReturns,
          rejectedReturns,
          custodyTotal,
          activeCustody,
          returnedCustody,
          delayedCustody,
          serviceRequestsTotal,
          serviceUnderReview,
          serviceApproved,
          serviceImplemented,
          serviceRejected,
          maintenanceTotal,
          maintenancePending,
          cleaningTotal,
          cleaningPending,
          purchaseTotal,
          purchasePending,
          otherTotal,
          otherPending,
          emailDraftsTotal,
          activeEmailDrafts,
          copiedEmailDrafts,
          sentEmailDrafts,
          unreadNotifications,
          requestItemsCount,
        },
        latestUpdates,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('[dashboard-summary] failed', error);
    const message = error?.message || 'Unable to load dashboard summary.';
    const statusCode = message.includes('Unable to resolve current user') || message.includes('not active') ? 401 : 500;
    return NextResponse.json(
      { error: message },
      {
        status: statusCode,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
