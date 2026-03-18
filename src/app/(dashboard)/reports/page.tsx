'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type ReportRow = {
  id: string;
  title: string;
  type: string;
  period?: string | null;
  createdAt?: string;
  createdBy?: {
    fullName?: string;
  } | null;
  summary?: string | null;
  fileUrl?: string | null;
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

export default function ReportsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReportRow | null>(null);

  const canViewAll = user?.role === 'manager' || user?.role === 'warehouse';

  useEffect(() => {
    let mounted = true;

    async function fetchReports() {
      setLoading(true);
      try {
        const res = await fetch('/api/reports/summary', { cache: 'no-store' });
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

    fetchReports();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);

    return rows.filter((row) => {
      const haystack = normalizeArabic(
        [row.title, row.type, row.period, row.summary, row.createdBy?.fullName]
          .filter(Boolean)
          .join(' ')
      );

      return q ? haystack.includes(q) : true;
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      withFiles: rows.filter((row) => !!row.fileUrl).length,
      withSummary: rows.filter((row) => !!row.summary).length,
      recent: rows.filter((row) => {
        if (!row.createdAt) return false;
        const created = new Date(row.createdAt).getTime();
        const now = Date.now();
        return now - created <= 1000 * 60 * 60 * 24 * 30;
      }).length,
    };
  }, [rows]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">
            التقارير
          </h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
            أرشفة واستعراض التقارير التشغيلية والملخصات المرتبطة بالمخزون والطلبات والتنفيذ.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">إجمالي التقارير</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.total}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">بتفاصيل مختصرة</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#498983] sm:text-xl">
              {stats.withSummary}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">بملفات مرفقة</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#d0b284] sm:text-xl">
              {stats.withFiles}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">حديثة خلال 30 يومًا</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.recent}
            </div>
          </Card>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <Input
          label="بحث"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="عنوان التقرير، النوع، الفترة، أو منشئ التقرير"
        />
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-28 w-full rounded-[24px] sm:rounded-3xl" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm sm:rounded-[28px]">
            لا توجد تقارير مطابقة
          </Card>
        ) : (
          filteredRows.map((row) => (
            <Card
              key={row.id}
              className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] leading-none text-[#016564]">
                      {row.type || 'تقرير'}
                    </span>

                    {row.period ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] leading-none text-slate-700">
                        {row.period}
                      </span>
                    ) : null}
                  </div>

                  <div className="break-words text-[15px] font-bold leading-7 text-[#152625] sm:text-base">
                    {row.title}
                  </div>

                  {row.summary ? (
                    <div className="break-words text-sm leading-7 text-[#304342]">
                      {row.summary}
                    </div>
                  ) : null}

                  <div className="grid gap-2 text-[12px] text-[#61706f] sm:grid-cols-2 sm:text-xs">
                    <div>التاريخ: {formatDate(row.createdAt)}</div>
                    {canViewAll ? (
                      <div className="break-words">أنشئ بواسطة: {row.createdBy?.fullName || '—'}</div>
                    ) : null}
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button className="w-full sm:w-auto" onClick={() => setSelected(row)}>
                    فتح التفاصيل
                  </Button>

                  {row.fileUrl ? (
                    <a href={row.fileUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                      <Button variant="ghost" className="w-full sm:w-auto">
                        فتح الملف
                      </Button>
                    </a>
                  ) : null}
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `تفاصيل التقرير: ${selected.title}` : 'تفاصيل التقرير'}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">العنوان</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{selected.title}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">النوع</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{selected.type || '—'}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الفترة</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{selected.period || '—'}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">التاريخ</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{formatDate(selected.createdAt)}</div>
              </div>

              {canViewAll ? (
                <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                  <div className="text-xs font-bold text-[#016564]">أنشئ بواسطة</div>
                  <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                    {selected.createdBy?.fullName || '—'}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الملخص</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                  {selected.summary || '—'}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <Button variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">
                إغلاق
              </Button>

              {selected.fileUrl ? (
                <a href={selected.fileUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">فتح الملف</Button>
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}