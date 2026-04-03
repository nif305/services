'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type EmailDraftRow = {
  id: string;
  subject: string;
  to: string;
  cc?: string | null;
  body?: string | null;
  status: 'DRAFT' | 'COPIED' | 'SENT';
  createdAt?: string;
  copiedAt?: string | null;
  requestCode?: string;
  requestType?: string;
  requestCategory?: string;
  requesterName?: string;
  requesterDepartment?: string;
  requesterEmail?: string;
  requesterExtension?: string;
  location?: string;
  itemName?: string;
  description?: string;
  summary?: string;
  attachments?: string[];
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return '—';
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

function statusMeta(status: EmailDraftRow['status']) {
  if (status === 'DRAFT') return { label: 'مسودة', tone: 'bg-slate-100 text-slate-700' };
  if (status === 'COPIED') return { label: 'مؤرشفة بعد التنزيل', tone: 'bg-[#016564]/10 text-[#016564]' };
  return { label: 'مرسلة', tone: 'bg-emerald-100 text-emerald-700' };
}

export default function EmailDraftsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<EmailDraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EmailDraftRow | null>(null);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    let mounted = true;

    async function fetchRows() {
      setLoading(true);
      try {
        const res = await fetch('/api/email-drafts', { cache: 'no-store' });
        const data = await res.json();

        if (mounted) {
          setRows(Array.isArray(data?.data) ? data.data : []);
        }
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchRows();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);

    return rows.filter((row) => {
      const haystack = normalizeArabic(
        [
          row.subject,
          row.to,
          row.requestCode,
          row.requestType,
          row.requesterName,
          row.requesterDepartment,
          row.location,
          row.itemName,
          row.description,
          ...(row.attachments || []),
        ]
          .filter(Boolean)
          .join(' ')
      );
      return q ? haystack.includes(q) : true;
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      drafts: rows.filter((row) => row.status === 'DRAFT').length,
      copied: rows.filter((row) => row.status === 'COPIED').length,
      sent: rows.filter((row) => row.status === 'SENT').length,
    };
  }, [rows]);

  if (!isManager) {
    return (
      <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-700 sm:rounded-[26px]">
        غير مصرح لك بالوصول لهذه الصفحة
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">
            المراسلات الخارجية
          </h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
            استعراض المسودات الخارجية الجاهزة للتنزيل بصيغة بريد قابلة للتعديل، مع أرشفة الطلب بعد التنزيل.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">إجمالي العناصر</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">{stats.total}</div>
          </Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">المسودات</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-slate-700 sm:text-xl">{stats.drafts}</div>
          </Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">المؤرشفة بعد التنزيل</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">{stats.copied}</div>
          </Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">المرسلة</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#498983] sm:text-xl">{stats.sent}</div>
          </Card>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <Input
          label="بحث"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="الموضوع، رقم الطلب، مقدم الطلب، الموقع، أو نوع الطلب"
        />
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-32 w-full rounded-[24px] sm:rounded-3xl" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm sm:rounded-[28px]">
            لا توجد مراسلات مطابقة
          </Card>
        ) : (
          filteredRows.map((row) => {
            const status = statusMeta(row.status);
            return (
              <Card
                key={row.id}
                className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] leading-none ${status.tone}`}>
                        {status.label}
                      </span>
                      <span className="rounded-full bg-[#d0b284]/15 px-3 py-1 text-[11px] leading-none text-[#8a6a28]">
                        {row.requestType || 'طلب خدمي'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] leading-none text-slate-700">
                        {row.requestCode || '—'}
                      </span>
                    </div>

                    <div className="break-words text-[15px] font-bold leading-7 text-[#152625] sm:text-base">
                      {row.subject}
                    </div>

                    <div className="grid gap-2 text-[12px] text-[#61706f] sm:grid-cols-2 sm:text-xs xl:grid-cols-3">
                      <div className="break-words">مقدم الطلب: {row.requesterName || '—'}</div>
                      <div className="break-words">الإدارة: {row.requesterDepartment || '—'}</div>
                      <div className="break-words">الموقع: {row.location || '—'}</div>
                      <div className="break-words">العنصر المطلوب: {row.itemName || '—'}</div>
                      <div className="break-words">إلى: {row.to || '—'}</div>
                      <div>الإنشاء: {formatDate(row.createdAt)}</div>
                    </div>

                    <div className="break-words text-sm leading-7 text-[#304342]">{row.summary || '—'}</div>

                    {(row.attachments || []).length ? (
                      <div className="flex flex-wrap gap-2">
                        {(row.attachments || []).map((item, index) => (
                          <span
                            key={`${row.id}-attachment-${index}`}
                            className="rounded-full bg-[#016564]/8 px-3 py-1 text-[11px] leading-none text-[#016564]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button className="w-full sm:w-auto" onClick={() => setSelected(row)}>
                      فتح التفاصيل
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </section>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `تفاصيل المراسلة: ${selected.requestCode || selected.subject}` : 'تفاصيل المراسلة'}
        size="xl"
      >
        {selected ? (
          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[22px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-5">
                <div className="text-sm font-extrabold text-[#016564]">المذكرة الجاهزة للإرسال</div>
                <div
                  dir="rtl"
                  className="mt-3 overflow-x-auto rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-4"
                  dangerouslySetInnerHTML={{ __html: selected.body || '<div>—</div>' }}
                />
              </div>

              <div className="rounded-[22px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-5">
                <div className="text-sm font-extrabold text-[#016564]">ملخص المراسلة</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ['الموضوع', selected.subject],
                    ['نوع الطلب', selected.requestType],
                    ['رقم الطلب', selected.requestCode],
                    ['إلى', selected.to],
                    ['الحالة', statusMeta(selected.status).label],
                    ['تاريخ الإنشاء', formatDate(selected.createdAt)],
                    ['مقدم الطلب', selected.requesterName],
                    ['الإدارة', selected.requesterDepartment],
                    ['البريد الإلكتروني', selected.requesterEmail],
                    ['التحويلة', selected.requesterExtension],
                    ['العنصر المطلوب', selected.itemName],
                    ['الموقع', selected.location],
                  ].map(([label, value], index) => (
                    <div key={`${label}-${index}`} className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                      <div className="text-xs font-bold text-[#016564]">{label}</div>
                      <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{value || '—'}</div>
                    </div>
                  ))}

                  <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                    <div className="text-xs font-bold text-[#016564]">سبب الطلب</div>
                    <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{selected.description || '—'}</div>
                  </div>

                  {(selected.attachments || []).length ? (
                    <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                      <div className="text-xs font-bold text-[#016564]">المرفقات المرفوعة</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(selected.attachments || []).map((item, index) => (
                          <span
                            key={`selected-attachment-${index}`}
                            className="rounded-full bg-[#016564]/8 px-3 py-1 text-[11px] leading-none text-[#016564]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                className="w-full sm:w-auto"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/email-drafts/${selected.id}/download`, { cache: 'no-store' });
                    if (!res.ok) {
                      const payload = await res.json().catch(() => null);
                      throw new Error(payload?.error || 'تعذر تنزيل ملف المراسلة حاليًا');
                    }
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selected.requestCode || selected.subject}.eml`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);

                    setRows((current) => current.filter((row) => row.id !== selected.id));
                    setSelected(null);
                  } catch (error: any) {
                    alert(error?.message || 'تعذر تنزيل ملف المراسلة حاليًا');
                  }
                }}
              >
                تنزيل .eml
              </Button>

              <Button variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">
                إغلاق
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
