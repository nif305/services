import { DraftStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type JsonObject = Record<string, any>;

type AttachmentPayload = {
  filename?: string;
  contentType?: string;
  base64Content?: string;
};

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

function stripHtmlToText(html?: string | null) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, 'â€¢ ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizeRequestType(sourceType?: string | null) {
  const normalized = String(sourceType || '').trim().toLowerCase();
  if (normalized === 'maintenance') return { code: 'MAINTENANCE', label: 'ط·ظ„ط¨ طµظٹط§ظ†ط©' };
  if (normalized === 'cleaning') return { code: 'CLEANING', label: 'ط·ظ„ط¨ ظ†ط¸ط§ظپط©' };
  if (normalized === 'purchase') return { code: 'PURCHASE', label: 'ط·ظ„ط¨ ط´ط±ط§ط، ظ…ط¨ط§ط´ط±' };
  return { code: 'OTHER', label: 'ط·ظ„ط¨ ط¢ط®ط±' };
}

function friendlyAttachmentName(item: AttachmentPayload, index: number) {
  const contentType = String(item?.contentType || '').toLowerCase();
  const filename = String(item?.filename || '').toLowerCase();
  if (contentType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(filename)) {
    return `طµظˆط±ط© ظ…ط±ظپظ‚ط© ${index + 1}`;
  }
  if (contentType.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/.test(filename)) {
    return `ظپظٹط¯ظٹظˆ ظ…ط±ظپظ‚ ${index + 1}`;
  }
  if (contentType.includes('pdf') || filename.endsWith('.pdf')) {
    return `ظ…ظ„ظپ PDF ظ…ط±ظپظ‚ ${index + 1}`;
  }
  return `ظ…ظ„ظپ ظ…ط±ظپظ‚ ${index + 1}`;
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

function buildRecipientsFromCategory(category?: string | null, provided?: string | null) {
  const normalized = String(category || '').trim().toUpperCase();
  if (normalized === 'PURCHASE') return 'wa.n1@nauss.edu.sa';
  if (normalized === 'MAINTENANCE' || normalized === 'CLEANING') return 'ssd@nauss.edu.sa,AAlosaimi@nauss.edu.sa';
  return String(provided || '').trim();
}

function buildFallbackExternalDraftHtml(params: {
  recipientLabel: string;
  requestCode: string;
  requestTitle: string;
  requesterName: string;
  requesterEmail: string;
  requesterMobile?: string;
  location?: string;
  itemName?: string;
  description: string;
  attachmentsSummary?: string;
}) {
  const rows = [
    ['ط±ظ‚ظ… ط§ظ„ط·ظ„ط¨', params.requestCode],
    ['ظ†ظˆط¹ ط§ظ„ط·ظ„ط¨', params.requestTitle],
    ['ظ…ظ‚ط¯ظ… ط§ظ„ط·ظ„ط¨', params.requesterName],
    ['ط§ظ„ط¥ط¯ط§ط±ط©', 'ط¥ط¯ط§ط±ط© ط¹ظ…ظ„ظٹط§طھ ط§ظ„طھط¯ط±ظٹط¨'],
    ['ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ', params.requesterEmail || 'â€”'],
    ['ط§ظ„ط¬ظˆط§ظ„', params.requesterMobile || 'â€”'],
    ['ط§ظ„ظ…ظˆظ‚ط¹', params.location || 'â€”'],
    ['ط§ظ„ط¹ظ†ط§طµط± ط§ظ„ظ…ط·ظ„ظˆط¨ط©', params.itemName || 'â€”'],
    ['ط§ظ„ظˆطµظپ', params.description || 'â€”'],
  ];
  if (params.attachmentsSummary) rows.push(['ط§ظ„ظ…ط±ظپظ‚ط§طھ', params.attachmentsSummary]);

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 12px;border:1px solid #d6d7d4;font-weight:700;background:#f8fbfb;width:180px;">${label}</td><td style="padding:10px 12px;border:1px solid #d6d7d4;">${value}</td></tr>`
    )
    .join('');

  return `<div dir="rtl" style="font-family:Cairo,Tahoma,Arial,sans-serif;color:#1f2937;line-height:2;"><div style="font-size:18px;font-weight:700;margin-bottom:12px;">${params.recipientLabel}</div><div style="margin-bottom:12px;">ط§ظ„ط³ظ„ط§ظ… ط¹ظ„ظٹظƒظ… ظˆط±ط­ظ…ط© ط§ظ„ظ„ظ‡ ظˆط¨ط±ظƒط§طھظ‡طŒ</div><div style="margin-bottom:12px;">طھط­ظٹط© ط·ظٹط¨ط© ظˆط¨ط¹ط¯طŒ</div><div style="margin-bottom:12px;">ظ†ط£ظ…ظ„ ط§ظ„طھظƒط±ظ… ط¨ط§ظ„ط§ط·ظ„ط§ط¹ ط¹ظ„ظ‰ ط§ظ„ط·ظ„ط¨ ط§ظ„ظ…ط±ظپظˆط¹ ط£ط¯ظ†ط§ظ‡ ظˆط§طھط®ط§ط° ظ…ط§ ظٹظ„ط²ظ… ط­ظٹط§ظ„ ظ…ط¹ط§ظ„ط¬طھظ‡.</div><table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">${tableRows}</table><div style="margin-top:14px;">ظˆطھظپط¶ظ„ظˆط§ ط¨ظ‚ط¨ظˆظ„ ط®ط§ظ„طµ ط§ظ„طھط­ظٹط© ظˆط§ظ„طھظ‚ط¯ظٹط±.</div><div style="margin-top:18px;font-weight:700;">ظپط±ظٹظ‚ ط¹ظ…ظ„ ط¥ط¯ط§ط±ط© ط¹ظ…ظ„ظٹط§طھ ط§ظ„طھط¯ط±ظٹط¨<br/>ظˆظƒط§ظ„ط© ط§ظ„ط¬ط§ظ…ط¹ط© ظ„ظ„طھط¯ط±ظٹط¨</div></div>`;
}

function buildDraftPayloadFromSuggestion(params: {
  suggestion: SuggestionRecord;
  requester: { fullName: string | null; email: string | null; mobile: string | null } | null;
  requestCode: string;
}) {
  const justification = parseJsonObject(params.suggestion.justification);
  const attachments = Array.isArray(justification.attachments) ? justification.attachments : [];
  const attachmentsSummary = attachments
    .map((item: any, index: number) => friendlyAttachmentName(item, index))
    .join('طŒ ');
  const recipient = buildRecipientsFromCategory(params.suggestion.category, justification.externalRecipient);
  const recipientLabel =
    params.suggestion.category === 'PURCHASE'
      ? 'ط³ط¹ط§ط¯ط© ط§ظ„ط£ط³طھط§ط°/ ظ†ظˆط§ظپ ط§ظ„ظ…ط­ط§ط±ط¨ ط³ظ„ظ…ظ‡ ط§ظ„ظ„ظ‡'
      : params.suggestion.category === 'MAINTENANCE' || params.suggestion.category === 'CLEANING'
        ? 'ط³ط¹ط§ط¯ط© ظ…ط¯ظٹط± ط¥ط¯ط§ط±ط© ط§ظ„ط®ط¯ظ…ط§طھ ط§ظ„ظ…ط³ط§ظ†ط¯ط© ط³ظ„ظ…ظ‡ ط§ظ„ظ„ظ‡'
        : 'ط¥ظ„ظ‰ ظ…ظ† ظٹظ‡ظ…ظ‡ ط§ظ„ط£ظ…ط±';
  const serviceItems = Array.isArray(justification.serviceItems) ? justification.serviceItems : [];
  const itemName = String(justification.itemName || serviceItems.join('طŒ ') || params.suggestion.title || 'â€”');

  return {
    recipient,
    subject: `${params.suggestion.title} - ${params.requestCode}`,
    body: buildFallbackExternalDraftHtml({
      recipientLabel,
      requestCode: params.requestCode,
      requestTitle: normalizeRequestType(params.suggestion.category).label,
      requesterName: params.requester?.fullName || 'â€”',
      requesterEmail: params.requester?.email || 'â€”',
      requesterMobile: params.requester?.mobile || 'â€”',
      location: String(justification.location || 'â€”'),
      itemName,
      description: params.suggestion.description || 'â€”',
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
    const url = new URL(request.url);
    const scope = String(url.searchParams.get('scope') || 'active').toLowerCase();
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
      const requestCode = String(extractPrimaryCode(linkedSuggestion || { justification: null, adminNotes: null } as any) || draft.sourceId || draft.id);
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
        to: draft.recipient,
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
        requesterName: requester?.fullName || 'â€”',
        requesterEmail: requester?.email || 'â€”',
        requesterMobile: requester?.mobile || 'â€”',
        requesterDepartment: 'ط¥ط¯ط§ط±ط© ط¹ظ…ظ„ظٹط§طھ ط§ظ„طھط¯ط±ظٹط¨',
        requesterJobTitle: requester?.jobTitle || 'â€”',
        location: String(justification.location || admin.location || 'â€”'),
        itemName: String(
          justification.itemName ||
            (Array.isArray(justification.serviceItems) ? justification.serviceItems.join('طŒ ') : '') ||
            admin.itemName ||
            linkedSuggestion?.title ||
            'â€”'
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

    return NextResponse.json({ data: sorted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'طھط¹ط°ط± ط¬ظ„ط¨ ط§ظ„ظ…ط±ط§ط³ظ„ط§طھ ط§ظ„ط®ط§ط±ط¬ظٹط©' },
      { status: 500 }
    );
  }
}
