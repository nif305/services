import { DraftStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  AttachmentPayload,
  buildAttachmentSummary,
  buildExternalEmailHtml,
  buildRecipientLabel,
  buildRecipientsFromCategory,
  friendlyAttachmentName,
  normalizeRequestType,
  stripHtmlToText,
} from '@/lib/external-email';
import { pruneExpiredSuggestionAttachmentBodies } from '@/lib/service-attachment-retention';

type JsonObject = Record<string, any>;

type SuggestionRecord = {
  id: string;
  title: string;
  description: string;
  justification: string;
  category: string;
  requesterId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  adminNotes: string | null;
};

function parseJsonObject(value: any): JsonObject {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as JsonObject;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function extractCodeCandidates(draft: { subject?: string | null; body?: string | null }) {
  const text = `${draft.subject || ''} ${stripHtmlToText(draft.body || '')}`;
  const matches = text.match(/[A-Z]{3}-\d{4}-\d{4}/g) || [];
  return Array.from(new Set(matches));
}

function extractPrimaryCode(suggestion: Pick<SuggestionRecord, 'justification' | 'adminNotes'>) {
  const justification = parseJsonObject(suggestion.justification);
  const admin = parseJsonObject(suggestion.adminNotes);
  return String(justification.publicCode || admin.linkedCode || '').trim();
}

function normalizeSearchText(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/،/g, '')
    .replace(/\s+/g, ' ');
}

function buildDraftPayloadFromSuggestion(params: {
  suggestion: SuggestionRecord;
  requester: { fullName: string | null; email: string | null; mobile: string | null } | null;
  requestCode: string;
}) {
  const justification = parseJsonObject(params.suggestion.justification);
  const attachments = Array.isArray(justification.attachments) ? justification.attachments : [];
  const attachmentsSummary = buildAttachmentSummary(attachments);
  const recipient = buildRecipientsFromCategory(params.suggestion.category, justification.externalRecipient);
  const serviceItems = Array.isArray(justification.serviceItems) ? justification.serviceItems : [];
  const requestType = normalizeRequestType(params.suggestion.category);
  const itemName = String(justification.itemName || serviceItems.join('، ') || params.suggestion.title || '—');

  return {
    recipient,
    subject: `${params.suggestion.title} - ${params.requestCode}`,
    body: buildExternalEmailHtml({
      recipientLabel: buildRecipientLabel(params.suggestion.category),
      requestCode: params.requestCode,
      requestTitle: requestType.label,
      createdAt: params.suggestion.createdAt,
      requesterName: params.requester?.fullName || '—',
      requesterDepartment: 'إدارة عمليات التدريب',
      requesterEmail: params.requester?.email || '—',
      requesterMobile: params.requester?.mobile || '—',
      requesterExtension: '—',
      location: String(justification.location || '—'),
      itemName,
      description: params.suggestion.description || '—',
      attachmentsSummary,
    }),
  };
}

function draftMatchesSuggestion(
  draft: { id: string; sourceId: string; subject?: string | null; body?: string | null },
  suggestion: SuggestionRecord
) {
  const requestCode = extractPrimaryCode(suggestion);
  const draftCodes = extractCodeCandidates(draft);

  return (
    draft.sourceId === suggestion.id ||
    (!!requestCode && draftCodes.includes(requestCode))
  );
}

function scoreDraftOwnership(
  draft: { id: string; sourceId: string; subject?: string | null; body?: string | null },
  suggestion: SuggestionRecord
) {
  const admin = parseJsonObject(suggestion.adminNotes);
  const requestCode = extractPrimaryCode(suggestion);
  const draftCodes = extractCodeCandidates(draft);
  let score = 0;

  if (draft.sourceId === suggestion.id) score += 6;
  if (!!requestCode && draftCodes.includes(requestCode)) score += 5;
  if (!!requestCode && String(admin.linkedEntityId || '').trim() === draft.sourceId && draftCodes.includes(requestCode)) score += 2;
  if (draftMatchesSuggestion(draft, suggestion)) score += 1;
  if (String(admin.linkedDraftId || '').trim() === draft.id) score += 1;

  return score;
}

function findLinkedSuggestion(
  draft: { id: string; sourceId: string; subject?: string | null; body?: string | null },
  suggestions: SuggestionRecord[],
  preferredSuggestionByDraftId: Map<string, string> = new Map()
) {
  const preferredSuggestionId = preferredSuggestionByDraftId.get(draft.id);
  if (preferredSuggestionId) {
    const preferredSuggestion = suggestions.find((item) => item.id === preferredSuggestionId);
    if (preferredSuggestion) return preferredSuggestion;
  }

  let suggestion = suggestions.find((item) => draftMatchesSuggestion(draft, item));
  if (suggestion) return suggestion;

  const codes = extractCodeCandidates(draft);

  suggestion = suggestions.find((item) => {
    const admin = parseJsonObject(item.adminNotes);
    return String(admin.linkedDraftId || '') === draft.id;
  });
  if (suggestion) return suggestion;

  suggestion = suggestions.find((item) => item.id === draft.sourceId);
  if (suggestion) return suggestion;

  suggestion = suggestions.find((item) => {
    const admin = parseJsonObject(item.adminNotes);
    return String(admin.linkedEntityId || '') === draft.sourceId;
  });
  if (suggestion) return suggestion;

  suggestion = suggestions.find((item) => {
    const admin = parseJsonObject(item.adminNotes);
    const justification = parseJsonObject(item.justification);
    const linkedCode = String(admin.linkedCode || '').trim();
    const publicCode = String(justification.publicCode || '').trim();
    return codes.includes(linkedCode) || codes.includes(publicCode);
  });

  return suggestion || null;
}

export async function GET(request: Request) {
  try {
    try {
      await pruneExpiredSuggestionAttachmentBodies();
    } catch (cleanupError) {
      console.error('Failed to prune expired service attachments', cleanupError);
    }

    const url = new URL(request.url);
    const scope = String(url.searchParams.get('scope') || 'active').toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit') || 5)));
    const search = normalizeSearchText(String(url.searchParams.get('search') || ''));
    const suggestions = await prisma.suggestion.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        justification: true,
        category: true,
        requesterId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        adminNotes: true,
      },
    });

    const approvedSuggestions = suggestions.filter(
      (item) => item.status === 'APPROVED' || item.status === 'IMPLEMENTED'
    );
    const activeApprovedSuggestions = approvedSuggestions.filter(
      (item) => item.status === 'APPROVED'
    );
    const linkedDraftIds = Array.from(
      new Set(
        approvedSuggestions
          .map((item) => String(parseJsonObject(item.adminNotes).linkedDraftId || '').trim())
          .filter(Boolean)
      )
    );
    const draftSourceIds = Array.from(
      new Set(
        approvedSuggestions.flatMap((item) => {
          const admin = parseJsonObject(item.adminNotes);
          return [String(admin.linkedEntityId || '').trim(), item.id].filter(Boolean);
        })
      )
    );
    const requesterIds = Array.from(
      new Set(suggestions.map((item) => item.requesterId).filter(Boolean))
    );
    const candidateDraftOr: Prisma.EmailDraftWhereInput[] = [];
    if (linkedDraftIds.length) candidateDraftOr.push({ id: { in: linkedDraftIds } });
    if (draftSourceIds.length) candidateDraftOr.push({ sourceId: { in: draftSourceIds } });

    const [candidateDrafts, users] = await Promise.all([
      candidateDraftOr.length
        ? prisma.emailDraft.findMany({
            where: { OR: candidateDraftOr },
          })
        : Promise.resolve([]),
      requesterIds.length
        ? prisma.user.findMany({
            where: { id: { in: requesterIds } },
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
              department: true,
              jobTitle: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const draftById = new Map(candidateDrafts.map((draft) => [draft.id, draft]));
    const draftsBySourceId = new Map<string, typeof candidateDrafts>();
    for (const draft of candidateDrafts) {
      const group = draftsBySourceId.get(draft.sourceId) || [];
      group.push(draft);
      draftsBySourceId.set(draft.sourceId, group);
    }

    const sharedDraftOwners = new Map<string, SuggestionRecord[]>();
    for (const suggestion of approvedSuggestions) {
      const admin = parseJsonObject(suggestion.adminNotes);
      const linkedDraftId = String(admin.linkedDraftId || '').trim();
      if (!linkedDraftId) continue;
      const group = sharedDraftOwners.get(linkedDraftId) || [];
      group.push(suggestion);
      sharedDraftOwners.set(linkedDraftId, group);
    }

    const primarySuggestionByDraftId = new Map<string, string>();
    for (const [draftId, group] of sharedDraftOwners.entries()) {
      const draft = draftById.get(draftId);
      const [primary] = [...group].sort(
        (left, right) => {
          const scoreDelta = (draft ? scoreDraftOwnership(draft, right) : 0) - (draft ? scoreDraftOwnership(draft, left) : 0);
          if (scoreDelta !== 0) return scoreDelta;
          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        }
      );
      if (primary) primarySuggestionByDraftId.set(draftId, primary.id);
    }

    for (const suggestion of activeApprovedSuggestions) {
      const admin = parseJsonObject(suggestion.adminNotes);
      const desiredCode = extractPrimaryCode(suggestion) || suggestion.id;
      const linkedDraftId = String(admin.linkedDraftId || '').trim();
      const linkedEntityId = String(admin.linkedEntityId || '').trim();
      const sourceCandidates = [linkedEntityId, suggestion.id].filter(Boolean);
      let existingDraft = linkedDraftId ? draftById.get(linkedDraftId) || null : null;

      if (!existingDraft) {
        const draftsForSources = sourceCandidates.flatMap((sourceId) => draftsBySourceId.get(sourceId) || []);
        existingDraft =
          draftsForSources.find((draft) => draftMatchesSuggestion(draft, suggestion)) ||
          draftsForSources[0] ||
          null;
      }

      const requester = userMap.get(suggestion.requesterId) || null;
      const isDraftValid = existingDraft
        ? draftMatchesSuggestion(existingDraft, suggestion) &&
          (!primarySuggestionByDraftId.has(existingDraft.id) || primarySuggestionByDraftId.get(existingDraft.id) === suggestion.id)
        : false;
      const requestCode = desiredCode;
      const draftPayload = buildDraftPayloadFromSuggestion({
        suggestion,
        requester,
        requestCode,
      });
      const shouldRefreshDraftContent = !!existingDraft && isDraftValid && (
        existingDraft.recipient !== draftPayload.recipient ||
        existingDraft.subject !== draftPayload.subject ||
        existingDraft.body !== draftPayload.body ||
        existingDraft.status !== DraftStatus.DRAFT
      );

      let draft = existingDraft;

      if (!draft) {
        draft = await prisma.emailDraft.create({
          data: {
            sourceType: String(suggestion.category || 'other').toLowerCase(),
            sourceId: suggestion.id,
            recipient: draftPayload.recipient,
            subject: draftPayload.subject,
            body: draftPayload.body,
            status: DraftStatus.DRAFT,
          },
        });
      } else if (!isDraftValid) {
        draft = await prisma.emailDraft.create({
          data: {
            sourceType: String(suggestion.category || 'other').toLowerCase(),
            sourceId: suggestion.id,
            recipient: draftPayload.recipient,
            subject: draftPayload.subject,
            body: draftPayload.body,
            status: DraftStatus.DRAFT,
          },
        });
      } else if (shouldRefreshDraftContent) {
        draft = await prisma.emailDraft.update({
          where: { id: draft.id },
          data: {
            recipient: draftPayload.recipient,
            subject: draftPayload.subject,
            body: draftPayload.body,
            status: DraftStatus.DRAFT,
            copiedAt: null,
          },
        });
      }

      draftById.set(draft.id, draft);
      const updatedSourceGroup = draftsBySourceId.get(draft.sourceId) || [];
      updatedSourceGroup.push(draft);
      draftsBySourceId.set(draft.sourceId, updatedSourceGroup);
      primarySuggestionByDraftId.set(draft.id, suggestion.id);

      const nextAdminNotes = JSON.stringify({
        ...admin,
        linkedDraftId: draft.id,
        linkedCode: requestCode,
      });

      if (
        String(admin.linkedDraftId || '').trim() !== draft.id ||
        String(admin.linkedCode || '').trim() !== requestCode
      ) {
        const updatedSuggestion = await prisma.suggestion.update({
          where: { id: suggestion.id },
          data: {
            adminNotes: nextAdminNotes,
          },
          select: {
            id: true,
            title: true,
            description: true,
            justification: true,
            category: true,
            requesterId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            adminNotes: true,
          },
        });

        Object.assign(suggestion, updatedSuggestion);
      }
    }

    const draftWhere: Prisma.EmailDraftWhereInput =
      scope === 'archived'
        ? { status: { in: [DraftStatus.COPIED, DraftStatus.SENT] } }
        : scope === 'all'
          ? {}
          : { status: DraftStatus.DRAFT };

    const [drafts, approvalLogs] = await Promise.all([
      prisma.emailDraft.findMany({
        where: draftWhere,
        orderBy: { createdAt: 'desc' },
      }),
      approvedSuggestions.length
        ? prisma.auditLog.findMany({
            where: {
              action: 'APPROVE_SUGGESTION',
              entityId: { in: approvedSuggestions.map((item) => item.id) },
            },
            select: {
              entityId: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const approvalAtBySuggestionId = new Map<string, Date>();
    for (const log of approvalLogs) {
      if (!log.entityId || approvalAtBySuggestionId.has(log.entityId)) continue;
      approvalAtBySuggestionId.set(log.entityId, log.createdAt);
    }

    const data = drafts
      .map((draft) => {
      const linkedSuggestion = findLinkedSuggestion(draft, suggestions, primarySuggestionByDraftId);
      if (scope === 'active' && linkedSuggestion?.status && linkedSuggestion.status !== 'APPROVED') {
        return null;
      }

      const requester = linkedSuggestion ? userMap.get(linkedSuggestion.requesterId) : null;
      const admin = parseJsonObject(linkedSuggestion?.adminNotes);
      const justification = parseJsonObject(linkedSuggestion?.justification);
      const attachments = Array.isArray(justification.attachments)
        ? (justification.attachments as AttachmentPayload[])
        : [];
      const requestType = normalizeRequestType(linkedSuggestion?.category || draft.sourceType);
      const requestCode = String(
        (linkedSuggestion ? extractPrimaryCode(linkedSuggestion) : '') || draft.sourceId || draft.id
      );
      const approvalAt = linkedSuggestion ? approvalAtBySuggestionId.get(linkedSuggestion.id) : null;
      const sortDate =
        draft.status === DraftStatus.DRAFT
          ? approvalAt || linkedSuggestion?.createdAt || draft.createdAt
          : draft.copiedAt || approvalAt || linkedSuggestion?.createdAt || draft.createdAt;
      const mappedStatus =
        draft.status === 'COPIED'
          ? 'COPIED'
          : draft.status === 'SENT'
            ? 'SENT'
            : 'DRAFT';

      return {
        id: draft.id,
        subject: draft.subject,
        to: draft.recipient.split(',').map((item) => item.trim()).filter(Boolean).join(', '),
        cc: null,
        body: draft.body,
        status: mappedStatus,
        createdAt: linkedSuggestion?.createdAt || draft.createdAt,
        updatedAt: sortDate,
        createdBy: requester
          ? {
              fullName: requester.fullName,
            }
          : null,
        requestCode,
        requestType: requestType.code,
        requestTypeLabel: requestType.label,
        requesterName: requester?.fullName || '—',
        requesterEmail: requester?.email || '—',
        requesterMobile: requester?.mobile || '—',
        requesterDepartment: 'إدارة عمليات التدريب',
        requesterJobTitle: requester?.jobTitle || '—',
        location: String(justification.location || admin.location || '—'),
        itemName: String(
          justification.itemName ||
            (Array.isArray(justification.serviceItems) ? justification.serviceItems.join('، ') : '') ||
            admin.itemName ||
            linkedSuggestion?.title ||
            '—'
        ),
        description: linkedSuggestion?.description || stripHtmlToText(draft.body),
        attachments: attachments.map((item, index) => ({
          name: friendlyAttachmentName(item, index),
        })),
      };
    })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const sorted = data.sort((a, b) => {
      const aDate = new Date((a.updatedAt || a.createdAt || 0) as any).getTime();
      const bDate = new Date((b.updatedAt || b.createdAt || 0) as any).getTime();
      return bDate - aDate;
    });

    const filtered = search
      ? sorted.filter((item) => {
          const haystack = normalizeSearchText([
            item.subject,
            item.requestCode,
            item.requestTypeLabel,
            item.requesterName,
            item.requesterDepartment,
            item.requesterEmail,
            item.requesterMobile,
            item.location,
            item.itemName,
            item.description,
            item.to,
          ].join(' '));

          return haystack.includes(search);
        })
      : sorted;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * limit, safePage * limit);

    return NextResponse.json({
      data: paged,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'تعذر جلب المراسلات الخارجية' },
      { status: 500 }
    );
  }
}
