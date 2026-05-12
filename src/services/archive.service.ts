import {
  CustodyStatus,
  DraftStatus,
  ItemType,
  RequestStatus,
  ReturnSourceType,
  ReturnStatus,
  SuggestionStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { stripHtmlToText } from '@/lib/external-email';

export type ArchiveSource = 'materials' | 'service';
export type ArchiveFolderKey =
  | 'service-correspondence'
  | 'service-maintenance'
  | 'service-cleaning'
  | 'service-purchase'
  | 'service-other'
  | 'material-consumable'
  | 'material-returnable'
  | 'material-custody-returned';

export type ArchiveRow = {
  id: string;
  source: ArchiveSource;
  folder: ArchiveFolderKey;
  title: string;
  code: string;
  status: string;
  requesterName: string;
  requesterDepartment: string;
  description: string;
  createdAt?: string | null;
  extra?: string;
};

type ArchiveFolderCounts = Record<ArchiveFolderKey, number>;
type ArchiveRequester = {
  id: string;
  fullName: string;
  department: string;
};

function parseJsonObject(value: unknown) {
  if (!value) return {} as Record<string, any>;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeSearch(search: string | null | undefined) {
  return String(search || '').trim();
}

function categoryLabel(category: string) {
  const normalized = String(category || '').trim().toUpperCase();
  if (normalized === 'MAINTENANCE') return 'طلب صيانة';
  if (normalized === 'CLEANING') return 'طلب نظافة';
  if (normalized === 'PURCHASE') return 'طلب شراء مباشر';
  return 'طلب آخر';
}

async function findMatchingUsers(search: string): Promise<ArchiveRequester[]> {
  if (!search) return [];

  return prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      department: true,
    },
  });
}

async function getRequesterMap(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map<string, ArchiveRequester>();

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      fullName: true,
      department: true,
    },
  });

  return new Map(users.map((user) => [user.id, user]));
}

function extractCodeCandidates(input: { subject?: string | null; body?: string | null }) {
  const text = `${input.subject || ''} ${stripHtmlToText(input.body || '')}`;
  const matches = text.match(/[A-Z]{3}-\d{4}-\d{4}/g) || [];
  return Array.from(new Set(matches));
}

function buildRequestSearchWhere(
  search: string,
  itemType: ItemType,
  requesterIds: string[]
) {
  if (!search) return {};

  return {
    OR: [
      { code: { contains: search, mode: 'insensitive' as const } },
      { purpose: { contains: search, mode: 'insensitive' as const } },
      { notes: { contains: search, mode: 'insensitive' as const } },
      { department: { contains: search, mode: 'insensitive' as const } },
      ...(requesterIds.length ? [{ requesterId: { in: requesterIds } }] : []),
      {
        items: {
          some: {
            item: {
              type: itemType,
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { code: { contains: search, mode: 'insensitive' as const } },
                { category: { contains: search, mode: 'insensitive' as const } },
              ],
            },
          },
        },
      },
    ],
  };
}

function buildRejectedReturnSearchWhere(search: string, requesterIds: string[]) {
  if (!search) return {};

  return {
    OR: [
      { code: { contains: search, mode: 'insensitive' as const } },
      { conditionNote: { contains: search, mode: 'insensitive' as const } },
      { rejectionReason: { contains: search, mode: 'insensitive' as const } },
      ...(requesterIds.length ? [{ requesterId: { in: requesterIds } }] : []),
      {
        requestItem: {
          item: { name: { contains: search, mode: 'insensitive' as const } },
        },
      },
      {
        requestItem: {
          item: { code: { contains: search, mode: 'insensitive' as const } },
        },
      },
      {
        custody: {
          item: { name: { contains: search, mode: 'insensitive' as const } },
        },
      },
      {
        custody: {
          item: { code: { contains: search, mode: 'insensitive' as const } },
        },
      },
    ],
  };
}

function buildCustodySearchWhere(search: string, userIds: string[]) {
  if (!search) return {};

  return {
    OR: [
      { notes: { contains: search, mode: 'insensitive' as const } },
      { returnCondition: { contains: search, mode: 'insensitive' as const } },
      ...(userIds.length ? [{ userId: { in: userIds } }] : []),
      { item: { name: { contains: search, mode: 'insensitive' as const } } },
      { item: { code: { contains: search, mode: 'insensitive' as const } } },
      { item: { category: { contains: search, mode: 'insensitive' as const } } },
    ],
  };
}

function buildSuggestionSearchWhere(search: string, requesterIds: string[]) {
  if (!search) return {};

  return {
    OR: [
      { title: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
      { justification: { contains: search, mode: 'insensitive' as const } },
      { adminNotes: { contains: search, mode: 'insensitive' as const } },
      ...(requesterIds.length ? [{ requesterId: { in: requesterIds } }] : []),
    ],
  };
}

function buildDraftSearchWhere(
  search: string,
  suggestionIds: string[],
  linkedEntityIds: string[]
) {
  if (!search) return {};

  return {
    OR: [
      { subject: { contains: search, mode: 'insensitive' as const } },
      { recipient: { contains: search, mode: 'insensitive' as const } },
      { body: { contains: search, mode: 'insensitive' as const } },
      { sourceId: { contains: search, mode: 'insensitive' as const } },
      ...(suggestionIds.length ? [{ sourceId: { in: suggestionIds } }] : []),
      ...(linkedEntityIds.length ? [{ sourceId: { in: linkedEntityIds } }] : []),
    ],
  };
}

function toIso(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function mapRequestRow(
  row: {
    id: string;
    code: string;
    purpose: string;
    notes: string | null;
    department: string;
    status: RequestStatus;
    createdAt: Date;
    processedAt: Date | null;
    items: Array<{ id: string }>;
    requester: { fullName: string; department: string };
  },
  folder: ArchiveFolderKey
): ArchiveRow {
  return {
    id: `request-${folder}-${row.id}`,
    source: 'materials',
    folder,
    title: row.purpose || 'طلب مواد',
    code: row.code || row.id,
    status: row.status,
    requesterName: row.requester?.fullName || '—',
    requesterDepartment: row.requester?.department || row.department || '—',
    description: row.notes || row.purpose || '—',
    createdAt: toIso(
      folder === 'material-returnable' ? row.processedAt || row.createdAt : row.createdAt
    ),
    extra: `عدد البنود: ${row.items.length}`,
  };
}

function mapRejectedReturnRow(
  row: {
    id: string;
    code: string;
    sourceType: ReturnSourceType;
    status: ReturnStatus;
    conditionNote: string | null;
    rejectionReason: string | null;
    createdAt: Date;
    processedAt: Date | null;
    requester: { fullName: string; department: string };
  },
  folder: ArchiveFolderKey
): ArchiveRow {
  return {
    id: `return-rejected-${row.id}`,
    source: 'materials',
    folder,
    title: 'طلب إرجاع مرفوض',
    code: row.code || row.id,
    status: row.status,
    requesterName: row.requester?.fullName || '—',
    requesterDepartment: row.requester?.department || '—',
    description: row.rejectionReason || row.conditionNote || '—',
    createdAt: toIso(row.processedAt || row.createdAt),
    extra: `المصدر: ${row.sourceType}`,
  };
}

function mapCustodyRow(row: {
  id: string;
  quantity: number;
  issueDate: Date;
  updatedAt: Date;
  actualReturn: Date | null;
  returnCondition: string | null;
  notes: string | null;
  status: CustodyStatus;
  user: { fullName: string; department: string };
  item: { name: string; code: string };
}): ArchiveRow {
  return {
    id: `custody-returned-${row.id}`,
    source: 'materials',
    folder: 'material-custody-returned',
    title: row.item?.name || 'عهدة معادة',
    code: row.item?.code || row.id,
    status: row.status,
    requesterName: row.user?.fullName || '—',
    requesterDepartment: row.user?.department || '—',
    description: row.notes || row.returnCondition || '—',
    createdAt: toIso(row.actualReturn || row.updatedAt || row.issueDate),
    extra: `الكمية: ${row.quantity ?? '—'}`,
  };
}

function mapRejectedSuggestionRow(row: {
  id: string;
  title: string;
  description: string;
  category: string;
  status: SuggestionStatus;
  createdAt: Date;
  requesterName: string;
  requesterDepartment: string;
}): ArchiveRow {
  const categoryKey = String(row.category || '').trim().toUpperCase();
  const folder: ArchiveFolderKey =
    categoryKey === 'MAINTENANCE'
      ? 'service-maintenance'
      : categoryKey === 'CLEANING'
        ? 'service-cleaning'
        : categoryKey === 'PURCHASE'
          ? 'service-purchase'
          : 'service-other';

  return {
    id: `suggestion-${row.id}`,
    source: 'service',
    folder,
    title: row.title || 'طلب خدمي',
    code: row.id,
    status: row.status,
    requesterName: row.requesterName || '—',
    requesterDepartment: row.requesterDepartment || '—',
    description: row.description || '—',
    createdAt: toIso(row.createdAt),
    extra: `النوع: ${categoryLabel(row.category)}`,
  };
}

function findSuggestionForDraft(
  draft: { id: string; sourceId: string; subject: string; body: string },
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    justification: string;
    adminNotes: string | null;
    requesterId: string;
  }>
) {
  const draftCodes = extractCodeCandidates(draft);

  return (
    suggestions.find((item) => item.id === draft.sourceId) ||
    suggestions.find(
      (item) =>
        String(parseJsonObject(item.adminNotes).linkedDraftId || '').trim() === draft.id
    ) ||
    suggestions.find(
      (item) =>
        String(parseJsonObject(item.adminNotes).linkedEntityId || '').trim() === draft.sourceId
    ) ||
    suggestions.find((item) => {
      const admin = parseJsonObject(item.adminNotes);
      const justification = parseJsonObject(item.justification);
      const linkedCode = String(admin.linkedCode || '').trim();
      const publicCode = String(justification.publicCode || '').trim();

      return (
        (!!linkedCode && draftCodes.includes(linkedCode)) ||
        (!!publicCode && draftCodes.includes(publicCode))
      );
    }) ||
    null
  );
}

async function getServiceCorrespondenceRows(page: number, limit: number, search: string) {
  const matchingUsers = await findMatchingUsers(search);
  const matchingUserIds = matchingUsers.map((user) => user.id);

  const requesterSuggestions =
    search && matchingUserIds.length
      ? await prisma.suggestion.findMany({
          where: {
            status: { in: [SuggestionStatus.APPROVED, SuggestionStatus.IMPLEMENTED] },
            requesterId: { in: matchingUserIds },
          },
          select: {
            id: true,
            adminNotes: true,
          },
        })
      : [];

  const searchSuggestionIds = requesterSuggestions.map((item) => item.id);
  const searchLinkedEntityIds = Array.from(
    new Set(
      requesterSuggestions
        .map((item) => String(parseJsonObject(item.adminNotes).linkedEntityId || '').trim())
        .filter(Boolean)
    )
  );

  const where = {
    AND: [
      { status: { in: [DraftStatus.COPIED, DraftStatus.SENT] } },
      buildDraftSearchWhere(search, searchSuggestionIds, searchLinkedEntityIds),
    ],
  };

  const [total, drafts] = await Promise.all([
    prisma.emailDraft.count({ where }),
    prisma.emailDraft.findMany({
      where,
      orderBy: [{ copiedAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const sourceIds = drafts.map((item) => item.sourceId).filter(Boolean);
  const draftIds = drafts.map((item) => item.id);
  const suggestionOr = [
    ...(sourceIds.length ? [{ id: { in: sourceIds } }] : []),
    ...sourceIds.map((sourceId) => ({
      adminNotes: { contains: sourceId, mode: 'insensitive' as const },
    })),
    ...draftIds.map((draftId) => ({
      adminNotes: { contains: draftId, mode: 'insensitive' as const },
    })),
  ];

  const linkedSuggestions = suggestionOr.length
    ? await prisma.suggestion.findMany({
        where: {
          status: { in: [SuggestionStatus.APPROVED, SuggestionStatus.IMPLEMENTED] },
          OR: suggestionOr,
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          justification: true,
          adminNotes: true,
          requesterId: true,
        },
      })
    : [];

  const requesterMap = await getRequesterMap(
    linkedSuggestions.map((item) => item.requesterId)
  );

  return {
    total,
    rows: drafts.map((draft) => {
      const linkedSuggestion = findSuggestionForDraft(draft, linkedSuggestions);
      const metadata = parseJsonObject(linkedSuggestion?.justification);
      const admin = parseJsonObject(linkedSuggestion?.adminNotes);
      const requester = linkedSuggestion
        ? requesterMap.get(linkedSuggestion.requesterId)
        : null;

      return {
        id: `draft-${draft.id}`,
        source: 'service' as const,
        folder: 'service-correspondence' as const,
        title: draft.subject || 'مراسلة خارجية',
        code:
          String(metadata.publicCode || admin.linkedCode || draft.sourceId || draft.id).trim() ||
          draft.id,
        status: draft.status,
        requesterName: requester?.fullName || '—',
        requesterDepartment: requester?.department || '—',
        description: linkedSuggestion?.description || stripHtmlToText(draft.body || '') || '—',
        createdAt: toIso(draft.copiedAt || draft.createdAt),
        extra: linkedSuggestion?.category
          ? `المسار: ${categoryLabel(linkedSuggestion.category)}`
          : undefined,
      } satisfies ArchiveRow;
    }),
  };
}

async function getRejectedSuggestionRows(
  category: 'MAINTENANCE' | 'CLEANING' | 'PURCHASE' | 'OTHER',
  page: number,
  limit: number,
  search: string
) {
  const matchingUsers = await findMatchingUsers(search);
  const requesterIds = matchingUsers.map((user) => user.id);
  const where = {
    AND: [
      { status: SuggestionStatus.REJECTED, category },
      buildSuggestionSearchWhere(search, requesterIds),
    ],
  };

  const [total, suggestions] = await Promise.all([
    prisma.suggestion.count({ where }),
    prisma.suggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        createdAt: true,
        requesterId: true,
      },
    }),
  ]);

  const requesterMap = await getRequesterMap(
    suggestions.map((item) => item.requesterId)
  );

  return {
    total,
    rows: suggestions.map((item) => {
      const requester = requesterMap.get(item.requesterId);
      return mapRejectedSuggestionRow({
        ...item,
        requesterName: requester?.fullName || '—',
        requesterDepartment: requester?.department || '—',
      });
    }),
  };
}

async function getConsumableArchiveRows(page: number, limit: number, search: string) {
  const windowSize = page * limit;
  const matchingUsers = await findMatchingUsers(search);
  const requesterIds = matchingUsers.map((user) => user.id);
  const requestWhere = {
    AND: [
      {
        status: RequestStatus.ISSUED,
        items: { some: { item: { type: ItemType.CONSUMABLE } } },
      },
      buildRequestSearchWhere(search, ItemType.CONSUMABLE, requesterIds),
    ],
  };
  const rejectedWhere = {
    AND: [
      {
        status: ReturnStatus.REJECTED,
        sourceType: ReturnSourceType.REQUEST_ITEM,
      },
      buildRejectedReturnSearchWhere(search, requesterIds),
    ],
  };

  const [requestTotal, rejectedTotal, requests, rejectedReturns] = await Promise.all([
    prisma.request.count({ where: requestWhere }),
    prisma.returnRequest.count({ where: rejectedWhere }),
    prisma.request.findMany({
      where: requestWhere,
      orderBy: { createdAt: 'desc' },
      take: windowSize,
      select: {
        id: true,
        code: true,
        purpose: true,
        notes: true,
        department: true,
        status: true,
        createdAt: true,
        processedAt: true,
        requester: {
          select: {
            fullName: true,
            department: true,
          },
        },
        items: {
          where: { item: { type: ItemType.CONSUMABLE } },
          select: { id: true },
        },
      },
    }),
    prisma.returnRequest.findMany({
      where: rejectedWhere,
      orderBy: [{ processedAt: 'desc' }, { createdAt: 'desc' }],
      take: windowSize,
      select: {
        id: true,
        code: true,
        sourceType: true,
        status: true,
        conditionNote: true,
        rejectionReason: true,
        createdAt: true,
        processedAt: true,
        requester: {
          select: {
            fullName: true,
            department: true,
          },
        },
      },
    }),
  ]);

  const merged = [
    ...requests.map((item) => mapRequestRow(item, 'material-consumable')),
    ...rejectedReturns.map((item) => mapRejectedReturnRow(item, 'material-consumable')),
  ].sort(
    (left, right) =>
      new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  );

  return {
    total: requestTotal + rejectedTotal,
    rows: merged.slice((page - 1) * limit, page * limit),
  };
}

async function getReturnableArchiveRows(page: number, limit: number, search: string) {
  const windowSize = page * limit;
  const matchingUsers = await findMatchingUsers(search);
  const requesterIds = matchingUsers.map((user) => user.id);
  const requestWhere = {
    AND: [
      {
        status: RequestStatus.RETURNED,
        items: { some: { item: { type: ItemType.RETURNABLE } } },
      },
      buildRequestSearchWhere(search, ItemType.RETURNABLE, requesterIds),
    ],
  };
  const rejectedWhere = {
    AND: [
      {
        status: ReturnStatus.REJECTED,
        sourceType: ReturnSourceType.CUSTODY,
      },
      buildRejectedReturnSearchWhere(search, requesterIds),
    ],
  };

  const [requestTotal, rejectedTotal, requests, rejectedReturns] = await Promise.all([
    prisma.request.count({ where: requestWhere }),
    prisma.returnRequest.count({ where: rejectedWhere }),
    prisma.request.findMany({
      where: requestWhere,
      orderBy: [{ processedAt: 'desc' }, { createdAt: 'desc' }],
      take: windowSize,
      select: {
        id: true,
        code: true,
        purpose: true,
        notes: true,
        department: true,
        status: true,
        createdAt: true,
        processedAt: true,
        requester: {
          select: {
            fullName: true,
            department: true,
          },
        },
        items: {
          where: { item: { type: ItemType.RETURNABLE } },
          select: { id: true },
        },
      },
    }),
    prisma.returnRequest.findMany({
      where: rejectedWhere,
      orderBy: [{ processedAt: 'desc' }, { createdAt: 'desc' }],
      take: windowSize,
      select: {
        id: true,
        code: true,
        sourceType: true,
        status: true,
        conditionNote: true,
        rejectionReason: true,
        createdAt: true,
        processedAt: true,
        requester: {
          select: {
            fullName: true,
            department: true,
          },
        },
      },
    }),
  ]);

  const merged = [
    ...requests.map((item) => mapRequestRow(item, 'material-returnable')),
    ...rejectedReturns.map((item) => mapRejectedReturnRow(item, 'material-returnable')),
  ].sort(
    (left, right) =>
      new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  );

  return {
    total: requestTotal + rejectedTotal,
    rows: merged.slice((page - 1) * limit, page * limit),
  };
}

async function getReturnedCustodyRows(page: number, limit: number, search: string) {
  const matchingUsers = await findMatchingUsers(search);
  const userIds = matchingUsers.map((user) => user.id);
  const where = {
    AND: [
      {
        status: CustodyStatus.RETURNED,
        item: { type: ItemType.RETURNABLE },
      },
      buildCustodySearchWhere(search, userIds),
    ],
  };

  const [total, records] = await Promise.all([
    prisma.custodyRecord.count({ where }),
    prisma.custodyRecord.findMany({
      where,
      orderBy: [{ actualReturn: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        quantity: true,
        issueDate: true,
        updatedAt: true,
        actualReturn: true,
        returnCondition: true,
        notes: true,
        status: true,
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
          },
        },
      },
    }),
  ]);

  return {
    total,
    rows: records.map(mapCustodyRow),
  };
}

async function getFolderCounts(source: ArchiveSource): Promise<ArchiveFolderCounts> {
  if (source === 'service') {
    const [correspondence, maintenance, cleaning, purchase, other] = await Promise.all([
      prisma.emailDraft.count({
        where: { status: { in: [DraftStatus.COPIED, DraftStatus.SENT] } },
      }),
      prisma.suggestion.count({
        where: { status: SuggestionStatus.REJECTED, category: 'MAINTENANCE' },
      }),
      prisma.suggestion.count({
        where: { status: SuggestionStatus.REJECTED, category: 'CLEANING' },
      }),
      prisma.suggestion.count({
        where: { status: SuggestionStatus.REJECTED, category: 'PURCHASE' },
      }),
      prisma.suggestion.count({
        where: { status: SuggestionStatus.REJECTED, category: 'OTHER' },
      }),
    ]);

    return {
      'service-correspondence': correspondence,
      'service-maintenance': maintenance,
      'service-cleaning': cleaning,
      'service-purchase': purchase,
      'service-other': other,
      'material-consumable': 0,
      'material-returnable': 0,
      'material-custody-returned': 0,
    };
  }

  const [
    issuedConsumable,
    rejectedConsumable,
    returnedReturnable,
    rejectedReturnable,
    returnedCustody,
  ] = await Promise.all([
    prisma.request.count({
      where: {
        status: RequestStatus.ISSUED,
        items: { some: { item: { type: ItemType.CONSUMABLE } } },
      },
    }),
    prisma.returnRequest.count({
      where: {
        status: ReturnStatus.REJECTED,
        sourceType: ReturnSourceType.REQUEST_ITEM,
      },
    }),
    prisma.request.count({
      where: {
        status: RequestStatus.RETURNED,
        items: { some: { item: { type: ItemType.RETURNABLE } } },
      },
    }),
    prisma.returnRequest.count({
      where: {
        status: ReturnStatus.REJECTED,
        sourceType: ReturnSourceType.CUSTODY,
      },
    }),
    prisma.custodyRecord.count({
      where: {
        status: CustodyStatus.RETURNED,
        item: { type: ItemType.RETURNABLE },
      },
    }),
  ]);

  return {
    'service-correspondence': 0,
    'service-maintenance': 0,
    'service-cleaning': 0,
    'service-purchase': 0,
    'service-other': 0,
    'material-consumable': issuedConsumable + rejectedConsumable,
    'material-returnable': returnedReturnable + rejectedReturnable,
    'material-custody-returned': returnedCustody,
  };
}

export const ArchiveService = {
  async getFolderData(params: {
    source: ArchiveSource;
    folder: ArchiveFolderKey;
    page?: number;
    limit?: number;
    search?: string | null;
  }) {
    const source = params.source === 'service' ? 'service' : 'materials';
    const page = Number.isFinite(params.page)
      ? Math.max(1, Math.trunc(params.page || 1))
      : 1;
    const limit = Number.isFinite(params.limit)
      ? Math.min(Math.max(1, Math.trunc(params.limit || 5)), 20)
      : 5;
    const search = normalizeSearch(params.search);
    const folderCounts = await getFolderCounts(source);

    let result: { total: number; rows: ArchiveRow[] };

    switch (params.folder) {
      case 'service-correspondence':
        result = await getServiceCorrespondenceRows(page, limit, search);
        break;
      case 'service-maintenance':
        result = await getRejectedSuggestionRows('MAINTENANCE', page, limit, search);
        break;
      case 'service-cleaning':
        result = await getRejectedSuggestionRows('CLEANING', page, limit, search);
        break;
      case 'service-purchase':
        result = await getRejectedSuggestionRows('PURCHASE', page, limit, search);
        break;
      case 'service-other':
        result = await getRejectedSuggestionRows('OTHER', page, limit, search);
        break;
      case 'material-returnable':
        result = await getReturnableArchiveRows(page, limit, search);
        break;
      case 'material-custody-returned':
        result = await getReturnedCustodyRows(page, limit, search);
        break;
      case 'material-consumable':
      default:
        result = await getConsumableArchiveRows(page, limit, search);
        break;
    }

    const totalPages = Math.max(1, Math.ceil(result.total / limit));
    const safePage = Math.min(page, totalPages);
    const sourceFolders =
      source === 'service'
        ? ([
            'service-correspondence',
            'service-maintenance',
            'service-cleaning',
            'service-purchase',
            'service-other',
          ] as ArchiveFolderKey[])
        : ([
            'material-consumable',
            'material-returnable',
            'material-custody-returned',
          ] as ArchiveFolderKey[]);

    const sourceTotal = sourceFolders.reduce(
      (sum, key) => sum + (folderCounts[key] || 0),
      0
    );

    return {
      data: safePage === page ? result.rows : [],
      folderCounts,
      stats: {
        total: sourceTotal,
        folders: sourceFolders.length,
        activeFolderCount: folderCounts[params.folder] || 0,
      },
      pagination: {
        page: safePage,
        limit,
        total: result.total,
        totalPages,
      },
    };
  },
};
