import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ParsedSuggestionData = {
  publicCode?: string;
  linkedCode?: string;
  itemName?: string;
  location?: string;
  attachments?: Array<{ name?: string; filename?: string; type?: string; url?: string }>;
};

function parseJsonObject(value?: string | null): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeArabic(value: string) {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/\s+/g, ' ');
}

function categoryLabel(sourceType?: string | null, subject?: string | null) {
  const value = normalizeArabic(`${sourceType || ''} ${subject || ''}`);
  if (value.includes('purchase') || value.includes('شراء')) return 'طلب شراء مباشر';
  if (value.includes('clean') || value.includes('نظاف')) return 'طلب نظافة';
  if (value.includes('maint') || value.includes('صيان')) return 'طلب صيانة';
  if (value.includes('other') || value.includes('اخر')) return 'طلب آخر';
  return 'مراسلة خارجية';
}

function fileKindFromName(filename?: string | null) {
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'صورة';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(ext)) return 'فيديو';
  if (ext === 'pdf') return 'ملف PDF';
  if (['doc', 'docx'].includes(ext)) return 'ملف Word';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'ملف Excel';
  if (['ppt', 'pptx'].includes(ext)) return 'عرض تقديمي';
  return 'ملف مرفق';
}

function formatAttachmentLabels(attachments: ParsedSuggestionData['attachments']) {
  if (!Array.isArray(attachments) || !attachments.length) return [] as string[];

  const counters: Record<string, number> = {};
  return attachments.map((attachment) => {
    const kind = fileKindFromName(attachment?.name || attachment?.filename || attachment?.url || '');
    counters[kind] = (counters[kind] || 0) + 1;
    return `${kind} ${counters[kind]}`;
  });
}

function sanitizeBodyForDisplay(html?: string | null, attachmentLabels?: string[]) {
  let body = String(html || '').trim();
  if (!body) return '<div dir="rtl">—</div>';

  body = body.replace(
    /<div[^>]*>\s*المرفقات المرفوعه[^<]*<\/div>\s*<div[^>]*>[\s\S]*?<\/div>/i,
    ''
  );

  if (attachmentLabels?.length) {
    const attachmentHtml = `
      <div style="margin-top:16px;font-weight:700;">المرفقات المرفوعة</div>
      <div style="margin-top:8px;">${attachmentLabels.join('، ')}</div>
    `;

    if (body.includes('فريق عمل إدارة عمليات التدريب')) {
      body = body.replace(/<div[^>]*>\s*فريق عمل إدارة عمليات التدريب[\s\S]*$/i, `${attachmentHtml}$&`);
    } else {
      body += attachmentHtml;
    }
  }

  return body;
}

async function findRelatedSuggestion(draft: { id: string; sourceType: string; sourceId: string }) {
  const byAdminNotes = await prisma.suggestion.findFirst({
    where: {
      adminNotes: { contains: draft.id },
    },
    include: {
      requester: {
        select: {
          fullName: true,
          email: true,
          department: true,
          mobile: true,
          jobTitle: true,
        },
      },
    },
  });

  if (byAdminNotes) return byAdminNotes;

  if (draft.sourceType === 'suggestion' || draft.sourceType === 'other') {
    return prisma.suggestion.findUnique({
      where: { id: draft.sourceId },
      include: {
        requester: {
          select: {
            fullName: true,
            email: true,
            department: true,
            mobile: true,
            jobTitle: true,
          },
        },
      },
    });
  }

  return null;
}

export async function GET(_request: NextRequest) {
  try {
    const drafts = await prisma.emailDraft.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const data = await Promise.all(
      drafts.map(async (draft) => {
        const suggestion = await findRelatedSuggestion(draft);
        const justification = parseJsonObject(suggestion?.justification) as ParsedSuggestionData;
        const adminData = parseJsonObject(suggestion?.adminNotes);
        const attachmentLabels = formatAttachmentLabels(justification.attachments);
        const bodyHtml = sanitizeBodyForDisplay(draft.body, attachmentLabels);

        return {
          id: draft.id,
          subject: draft.subject,
          to: draft.recipient,
          cc: suggestion?.requester?.email || '',
          body: bodyHtml,
          status: draft.status,
          createdAt: draft.createdAt,
          updatedAt: draft.copiedAt || draft.createdAt,
          typeLabel: categoryLabel(draft.sourceType, draft.subject),
          requestCode: String(adminData.linkedCode || justification.publicCode || draft.subject || '—'),
          requesterName: suggestion?.requester?.fullName || '—',
          requesterEmail: suggestion?.requester?.email || '—',
          requesterDepartment: suggestion?.requester?.department || '—',
          requesterMobile: suggestion?.requester?.mobile || '—',
          requesterJobTitle: suggestion?.requester?.jobTitle || '—',
          location: String(justification.location || '—'),
          itemName: String(justification.itemName || '—'),
          description: suggestion?.description || '—',
          attachmentLabels,
        };
      })
    );

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'تعذر تحميل المراسلات الخارجية' },
      { status: 500 }
    );
  }
}
