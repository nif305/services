import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeArabic(value: string) {
  return String(value || '')
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

function stripHtmlToText(html?: string | null) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, '• ')
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

function extractField(body: string, label: string) {
  const normalizedBody = stripHtmlToText(body);
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedLabel}\s*[:：]?\s*(.+)`, 'i');
  const match = normalizedBody.match(regex);
  return match?.[1]?.split('\n')[0]?.trim() || '';
}

function resolveTypeLabel(subject: string, body: string) {
  const normalized = normalizeArabic(`${subject} ${body}`);
  if (normalized.includes('شراء مباشر') || normalized.includes('طلب شراء')) return 'شراء مباشر';
  if (normalized.includes('طلب نظافه') || normalized.includes('نظافه')) return 'طلب نظافة';
  if (normalized.includes('طلب صيانه') || normalized.includes('صيانه')) return 'طلب صيانة';
  return 'طلب آخر';
}

export async function GET(_request: NextRequest) {
  try {
    const drafts = await prisma.emailDraft.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const data = drafts.map((draft) => {
      const plain = stripHtmlToText(draft.body || '');
      const requesterName = extractField(draft.body || '', 'مقدم الطلب') || '—';
      const requesterDepartment = extractField(draft.body || '', 'الإدارة') || '—';
      const requesterEmail = extractField(draft.body || '', 'البريد الإلكتروني') || '—';
      const requesterExtension = extractField(draft.body || '', 'التحويلة') || '—';
      const location = extractField(draft.body || '', 'الموقع') || '—';
      const itemName = extractField(draft.body || '', 'العنصر المطلوب') || '—';
      const description = extractField(draft.body || '', 'سبب الطلب') || plain.slice(0, 180) || '—';
      const requestType = resolveTypeLabel(draft.subject || '', draft.body || '');
      const requestCode = (draft.subject || '').split(' - ').pop() || '—';

      return {
        id: draft.id,
        subject: draft.subject,
        to: draft.recipient,
        cc: null,
        body: draft.body,
        status: draft.status,
        createdAt: draft.createdAt,
        updatedAt: draft.copiedAt || draft.createdAt,
        requestType,
        requestCode,
        requesterName,
        requesterDepartment,
        requesterEmail,
        requesterExtension,
        location,
        itemName,
        description,
        snippet: description,
      };
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'تعذر جلب المراسلات الخارجية' },
      { status: 500 }
    );
  }
}
