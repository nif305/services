'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type ArchiveRow = {
  id: string;
  source: 'materials' | 'service';
  title: string;
  code: string;
  status: string;
  requesterName: string;
  requesterDepartment: string;
  description: string;
  createdAt?: string;
  extra?: string;
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

export default function ArchivePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'materials' | 'service'>('ALL');
  const [selected, setSelected] = useState<ArchiveRow | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [requestsRes, returnsRes, suggestionsRes, draftsRes] = await Promise.all([
          fetch('/api/requests?limit=200', { cache: 'no-store' }),
          fetch('/api/returns?limit=200', { cache: 'no-store' }),
          fetch('/api/suggestions', { cache: 'no-store' }),
          fetch('/api/email-drafts', { cache: 'no-store' }),
        ]);
        const [requestsJson, returnsJson, suggestionsJson, draftsJson] = await Promise.all([
          requestsRes.json().catch(() => null),
          returnsRes.json().catch(() => null),
          suggestionsRes.json().catch(() => null),
          draftsRes.json().catch(() => null),
        ]);

        const materialRows: ArchiveRow[] = [
          ...(Array.isArray(requestsJson?.data) ? requestsJson.data : []).filter((item: any) => ['ISSUED', 'RETURNED', 'REJECTED'].includes(String(item.status || ''))).map((item: any) => ({
            id: `request-${item.id}`,
            source: 'materials' as const,
            title: item.purpose || 'طلب مواد',
            code: item.code || item.id,
            status: item.status || '—',
            requesterName: item.requester?.fullName || '—',
            requesterDepartment: item.requester?.department || item.department || '—',
            description: item.notes || item.purpose || '—',
            createdAt: item.createdAt,
            extra: Array.isArray(item.items) ? `عدد البنود: ${item.items.length}` : undefined,
          })),
          ...(Array.isArray(returnsJson?.data) ? returnsJson.data : []).filter((item: any) => ['APPROVED', 'REJECTED'].includes(String(item.status || ''))).map((item: any) => ({
            id: `return-${item.id}`,
            source: 'materials' as const,
            title: 'طلب إرجاع',
            code: item.code || item.id,
            status: item.status || '—',
            requesterName: item.requester?.fullName || '—',
            requesterDepartment: item.requester?.department || '—',
            description: item.conditionNote || item.rejectionReason || '—',
            createdAt: item.createdAt,
            extra: item.sourceType ? `المصدر: ${item.sourceType}` : undefined,
          })),
        ];

        const serviceRows: ArchiveRow[] = [
          ...(Array.isArray(suggestionsJson?.data) ? suggestionsJson.data : []).filter((item: any) => ['IMPLEMENTED', 'REJECTED'].includes(String(item.status || ''))).map((item: any) => ({
            id: `suggestion-${item.id}`,
            source: 'service' as const,
            title: item.title || 'طلب خدمي',
            code: item.code || item.id,
            status: item.status || '—',
            requesterName: item.requester?.fullName || '—',
            requesterDepartment: item.requester?.department || '—',
            description: item.description || '—',
            createdAt: item.createdAt,
            extra: item.category ? `النوع: ${item.category}` : undefined,
          })),
          ...(Array.isArray(draftsJson?.data) ? draftsJson.data : []).filter((item: any) => ['COPIED', 'SENT'].includes(String(item.status || ''))).map((item: any) => ({
            id: `draft-${item.id}`,
            source: 'service' as const,
            title: item.subject || 'مراسلة خارجية',
            code: item.code || item.id,
            status: item.status || '—',
            requesterName: item.requester?.fullName || '—',
            requesterDepartment: item.requester?.department || '—',
            description: item.summary || '—',
            createdAt: item.createdAt,
            extra: item.categoryLabel ? `المسار: ${item.categoryLabel}` : undefined,
          })),
        ];

        if (mounted) setRows([...serviceRows, ...materialRows].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
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
      const byType = typeFilter === 'ALL' ? true : row.source === typeFilter;
      if (!byType) return false;
      const haystack = normalizeArabic([row.title, row.code, row.status, row.requesterName, row.requesterDepartment, row.description, row.extra].filter(Boolean).join(' '));
      return q ? haystack.includes(q) : true;
    });
  }, [rows, search, typeFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    materials: rows.filter((r) => r.source === 'materials').length,
    service: rows.filter((r) => r.source === 'service').length,
    rejected: rows.filter((r) => String(r.status).toUpperCase().includes('REJECT')).length,
  }), [rows]);

  if (user?.role !== 'manager') {
    return <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-700">غير مصرح لك بالوصول لهذه الصفحة</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">الأرشيف</h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">أرشيف موحد يضم طلبات المواد المقفلة والطلبات الخدمية المنفذة أو المرفوضة، مع المراسلات التي تم تنزيلها أو إرسالها.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">إجمالي السجلات</div><div className="mt-1 text-[22px] font-extrabold text-[#016564]">{stats.total}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">أرشيف المواد</div><div className="mt-1 text-[22px] font-extrabold text-[#498983]">{stats.materials}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">الأرشيف الخدمي</div><div className="mt-1 text-[22px] font-extrabold text-[#d0b284]">{stats.service}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">المرفوضة</div><div className="mt-1 text-[22px] font-extrabold text-[#7c1e3e]">{stats.rejected}</div></Card>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <Input label="بحث" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الرمز، العنوان، مقدم الطلب، أو وصف الحالة" />
          <div className="flex flex-wrap gap-2 self-end">
            {[
              ['ALL', 'الكل'],
              ['materials', 'أرشيف المواد'],
              ['service', 'الأرشيف الخدمي'],
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setTypeFilter(key as any)} className={`rounded-full px-4 py-2 text-xs transition ${typeFilter === key ? 'bg-[#016564] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{label}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map((item) => <Skeleton key={item} className="h-32 w-full rounded-[24px]" />)}</div>
        ) : filteredRows.length === 0 ? (
          <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد سجلات مطابقة</Card>
        ) : filteredRows.map((row) => (
          <Card key={row.id} className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[11px] ${row.source === 'materials' ? 'bg-[#498983]/10 text-[#498983]' : 'bg-[#d0b284]/15 text-[#8a6a28]'}`}>{row.source === 'materials' ? 'مواد' : 'خدمي'}</span>
                  <span className="rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] text-[#016564]">{row.code}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700">{row.status}</span>
                </div>
                <h3 className="text-lg font-bold text-[#152625]">{row.title}</h3>
                <p className="text-sm leading-7 text-[#61706f]">{row.description}</p>
                <div className="grid gap-2 text-sm text-[#425554] sm:grid-cols-2 xl:grid-cols-3">
                  <div><span className="font-semibold text-[#016564]">مقدم الطلب: </span>{row.requesterName}</div>
                  <div><span className="font-semibold text-[#016564]">الإدارة: </span>{row.requesterDepartment}</div>
                  <div><span className="font-semibold text-[#016564]">التاريخ: </span>{formatDate(row.createdAt)}</div>
                  {row.extra ? <div className="sm:col-span-2 xl:col-span-3"><span className="font-semibold text-[#016564]">معلومة إضافية: </span>{row.extra}</div> : null}
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 lg:w-auto"><button type="button" onClick={() => setSelected(row)} className="rounded-full bg-[#016564] px-5 py-2 text-sm font-bold text-white">فتح التفاصيل</button></div>
            </div>
          </Card>
        ))}
      </section>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `تفاصيل الأرشيف: ${selected.code}` : 'تفاصيل الأرشيف'} maxWidth="4xl">
        {selected ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['النوع', selected.source === 'materials' ? 'أرشيف المواد' : 'أرشيف خدمي'],
              ['الرمز', selected.code],
              ['العنوان', selected.title],
              ['الحالة', selected.status],
              ['مقدم الطلب', selected.requesterName],
              ['الإدارة', selected.requesterDepartment],
              ['التاريخ', formatDate(selected.createdAt)],
              ['معلومة إضافية', selected.extra || '—'],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-3">
                <div className="text-xs font-bold text-[#016564]">{label}</div>
                <div className="mt-1 text-sm text-[#425554]">{value}</div>
              </div>
            ))}
            <div className="sm:col-span-2 rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-3">
              <div className="text-xs font-bold text-[#016564]">الوصف</div>
              <div className="mt-1 text-sm leading-7 text-[#425554]">{selected.description || '—'}</div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
