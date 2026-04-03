'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type AuditRow = {
  id: string;
  source: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; fullName?: string; role?: string | null; roles?: string[]; email?: string | null } | null;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch { return '—'; }
}

function normalizeArabic(value: string) {
  return (value || '').toLowerCase().trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '').replace(/\s+/g, ' ');
}

function actionVariant(action: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('remove') || a.includes('reject') || a.includes('cancel')) return 'danger';
  if (a.includes('approve') || a.includes('issue') || a.includes('close') || a.includes('return') || a.includes('complete')) return 'success';
  if (a.includes('update') || a.includes('edit') || a.includes('adjust')) return 'warning';
  if (a.includes('create') || a.includes('add') || a.includes('new')) return 'info';
  return 'neutral';
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuditRow | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/audit-logs?limit=300', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (mounted) setRows(Array.isArray(json?.data) ? json.data : []);
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);
    return rows.filter((row) => {
      const haystack = normalizeArabic([row.action, row.entity, row.entityId, row.details, row.user?.fullName, row.user?.email, row.user?.role].filter(Boolean).join(' '));
      return q ? haystack.includes(q) : true;
    });
  }, [rows, search]);

  const stats = useMemo(() => ({
    total: rows.length,
    creates: rows.filter((row) => /create|add|new/i.test(row.action)).length,
    updates: rows.filter((row) => /update|edit|adjust/i.test(row.action)).length,
    decisions: rows.filter((row) => /approve|reject|issue|close|return|complete/i.test(row.action)).length,
  }), [rows]);

  if (user?.role !== 'manager') {
    return <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-700">غير مصرح لك بالوصول لهذه الصفحة</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">سجل التدقيق</h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">سجل موحد لتتبع الأعمال المنفذة داخل المنصة مع اسم المنفذ والكيان والوقت والتفاصيل.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">إجمالي السجلات</div><div className="mt-1 text-[22px] font-extrabold text-[#016564]">{stats.total}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">عمليات الإنشاء</div><div className="mt-1 text-[22px] font-extrabold text-[#016564]">{stats.creates}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">عمليات التعديل</div><div className="mt-1 text-[22px] font-extrabold text-[#d0b284]">{stats.updates}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">القرارات والإقفالات</div><div className="mt-1 text-[22px] font-extrabold text-[#498983]">{stats.decisions}</div></Card>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <Input label="بحث في السجل" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الإجراء، الكيان، الرقم المرجعي، اسم المستخدم، أو الملاحظات" />
      </section>

      <section className="space-y-3">
        {loading ? <div className="space-y-3">{[1,2,3].map((item) => <Skeleton key={item} className="h-32 w-full rounded-[24px]" />)}</div> : filteredRows.length === 0 ? (
          <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد سجلات مطابقة</Card>
        ) : filteredRows.map((row) => (
          <Card key={row.id} className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={actionVariant(row.action)}>{row.action}</Badge>
                  {row.entity ? <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700">{row.entity}</span> : null}
                  {row.entityId ? <span className="rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] text-[#016564]">{row.entityId}</span> : null}
                </div>
                <div className="grid gap-2 text-sm text-[#425554] sm:grid-cols-2 xl:grid-cols-3">
                  <div><span className="font-semibold text-[#016564]">المنفذ: </span>{row.user?.fullName || 'غير معروف'}</div>
                  <div><span className="font-semibold text-[#016564]">الدور: </span>{row.user?.role || '—'}</div>
                  <div><span className="font-semibold text-[#016564]">الوقت: </span>{formatDate(row.createdAt)}</div>
                </div>
                {row.details ? <p className="text-sm leading-7 text-[#61706f]">{row.details}</p> : null}
              </div>
              <div className="flex w-full flex-col gap-2 lg:w-auto"><Button className="w-full lg:w-36" onClick={() => setSelected(row)}>فتح التفاصيل</Button></div>
            </div>
          </Card>
        ))}
      </section>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `تفاصيل السجل: ${selected.action}` : 'تفاصيل السجل'} maxWidth="4xl">
        {selected ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['الإجراء', selected.action],
              ['الكيان', selected.entity || '—'],
              ['الرقم المرجعي', selected.entityId || '—'],
              ['المصدر', selected.source || 'SERVER'],
              ['المنفذ', selected.user?.fullName || '—'],
              ['البريد الإلكتروني', selected.user?.email || '—'],
              ['الدور', selected.user?.role || '—'],
              ['الوقت', formatDate(selected.createdAt)],
              ['عنوان IP', selected.ipAddress || '—'],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-3">
                <div className="text-xs font-bold text-[#016564]">{label}</div>
                <div className="mt-1 break-words text-sm text-[#425554]">{value}</div>
              </div>
            ))}
            <div className="sm:col-span-2 rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-3">
              <div className="text-xs font-bold text-[#016564]">التفاصيل</div>
              <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-[#425554]">{selected.details || '—'}</div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
