'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  notes?: string | null;
  createdAt: string;
  user?: {
    fullName?: string;
    email?: string;
    role?: string | null;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

function actionVariant(action: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  const a = action.toLowerCase();

  if (
    a.includes('delete') ||
    a.includes('remove') ||
    a.includes('reject') ||
    a.includes('cancel')
  ) {
    return 'danger';
  }

  if (
    a.includes('approve') ||
    a.includes('issue') ||
    a.includes('close') ||
    a.includes('return') ||
    a.includes('complete')
  ) {
    return 'success';
  }

  if (a.includes('update') || a.includes('edit') || a.includes('adjust')) {
    return 'warning';
  }

  if (a.includes('create') || a.includes('add') || a.includes('new')) {
    return 'info';
  }

  return 'neutral';
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isManager = user?.role === 'manager';

  useEffect(() => {
    let mounted = true;

    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await fetch('/api/audit-logs?limit=200', { cache: 'no-store' });
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

    fetchLogs();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);

    return rows.filter((row) => {
      const haystack = normalizeArabic(
        [
          row.action,
          row.entity,
          row.entityId,
          row.notes,
          row.user?.fullName,
          row.user?.email,
          row.user?.role,
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
      creates: rows.filter((row) => {
        const a = row.action.toLowerCase();
        return a.includes('create') || a.includes('add') || a.includes('new');
      }).length,
      updates: rows.filter((row) => {
        const a = row.action.toLowerCase();
        return a.includes('update') || a.includes('edit') || a.includes('adjust');
      }).length,
      decisions: rows.filter((row) => {
        const a = row.action.toLowerCase();
        return (
          a.includes('approve') ||
          a.includes('reject') ||
          a.includes('issue') ||
          a.includes('close') ||
          a.includes('return')
        );
      }).length,
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
            سجل التدقيق
          </h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
            تتبّع موحد للعمليات المنفذة داخل المنصة، يوضّح من قام بالفعل، وعلى أي كيان، وفي أي وقت.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">إجمالي السجلات</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.total}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">عمليات الإنشاء</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.creates}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">عمليات التعديل</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#d0b284] sm:text-xl">
              {stats.updates}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">القرارات والإقفالات</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#498983] sm:text-xl">
              {stats.decisions}
            </div>
          </Card>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <Input
          label="بحث في السجل"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="الإجراء، الكيان، الرقم المرجعي، اسم المستخدم، أو الملاحظات"
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
            لا توجد سجلات مطابقة
          </Card>
        ) : (
          filteredRows.map((row) => (
            <Card
              key={row.id}
              className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={actionVariant(row.action)}>{row.action}</Badge>

                      {row.entity ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] leading-none text-slate-700">
                          {row.entity}
                        </span>
                      ) : null}

                      {row.entityId ? (
                        <span className="break-all rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] leading-none text-[#016564]">
                          {row.entityId}
                        </span>
                      ) : null}
                    </div>

                    <div className="break-words text-sm font-semibold leading-7 text-[#152625] sm:text-[15px]">
                      {row.user?.fullName || 'مستخدم غير معروف'}
                    </div>

                    <div className="grid gap-2 text-[12px] text-[#61706f] sm:grid-cols-2 sm:text-xs">
                      <div>البريد: {row.user?.email || '—'}</div>
                      <div>الدور: {row.user?.role || '—'}</div>
                      <div className="sm:col-span-2">الوقت: {formatDate(row.createdAt)}</div>
                    </div>
                  </div>
                </div>

                {row.notes ? (
                  <div className="rounded-[18px] border border-[#e7ebea] bg-[#fcfdfd] px-4 py-3 text-sm leading-7 text-[#304342] sm:rounded-2xl break-words whitespace-pre-wrap">
                    {row.notes}
                  </div>
                ) : null}
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}