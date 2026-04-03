'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type DraftRow = {
  id: string;
  sourceId: string;
  sourceType: string;
  status: 'DRAFT' | 'COPIED' | 'SENT';
  createdAt?: string;
  copiedAt?: string | null;
  subject: string;
  recipient: string;
  code: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  summary: string;
  requester: {
    id: string;
    fullName: string;
    email: string;
    department: string;
    mobile: string;
    extension: string;
    employeeId: string;
  } | null;
  location: string;
  itemName: string;
  requestSource: string;
  programName: string;
  area: string;
  adminNotes: string;
  attachments: string[];
  body: string;
};

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

function statusMeta(status: DraftRow['status']) {
  if (status === 'COPIED') return { label: 'مؤرشفة بعد التنزيل', tone: 'bg-[#016564]/10 text-[#016564]' };
  if (status === 'SENT') return { label: 'مرسلة', tone: 'bg-emerald-100 text-emerald-700' };
  return { label: 'مسودة', tone: 'bg-slate-100 text-slate-700' };
}

export default function EmailDraftsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DraftRow | null>(null);

  const isManager = user?.role === 'manager';

  const fetchRows = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email-drafts', { cache: 'no-store' });
      const json = await response.json().catch(() => null);
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);
    return rows.filter((row) => {
      const haystack = normalizeArabic([
        row.subject,
        row.categoryLabel,
        row.code,
        row.summary,
        row.requester?.fullName,
        row.requester?.department,
        row.location,
        row.itemName,
      ].filter(Boolean).join(' '));
      return q ? haystack.includes(q) : true;
    });
  }, [rows, search]);

  const stats = useMemo(() => ({
    total: rows.length,
    drafts: rows.filter((row) => row.status === 'DRAFT').length,
    copied: rows.filter((row) => row.status === 'COPIED').length,
    sent: rows.filter((row) => row.status === 'SENT').length,
  }), [rows]);

  if (!isManager) {
    return <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-700">غير مصرح لك بالوصول لهذه الصفحة</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">المراسلات الخارجية</h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">استعراض المسودات الخارجية الجاهزة للتنزيل بصيغة بريد قابلة للتعديل، مع أرشفة الطلب بعد التنزيل.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">إجمالي العناصر</div><div className="mt-1 text-[22px] font-extrabold text-[#016564]">{stats.total}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">المسودات</div><div className="mt-1 text-[22px] font-extrabold text-slate-700">{stats.drafts}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">المؤرشفة بعد التنزيل</div><div className="mt-1 text-[22px] font-extrabold text-[#d0b284]">{stats.copied}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">المرسلة</div><div className="mt-1 text-[22px] font-extrabold text-[#498983]">{stats.sent}</div></Card>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <Input label="بحث" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الموضوع، رقم الطلب، مقدم الطلب، الموقع، أو نوع الطلب" />
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map((item) => <Skeleton key={item} className="h-28 w-full rounded-[24px]" />)}</div>
        ) : filteredRows.length === 0 ? (
          <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد مراسلات مطابقة</Card>
        ) : filteredRows.map((row) => {
          const meta = statusMeta(row.status);
          return (
            <Card key={row.id} className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] leading-none ${meta.tone}`}>{meta.label}</span>
                    <span className="rounded-full bg-[#7c1e3e]/10 px-3 py-1 text-[11px] leading-none text-[#7c1e3e]">{row.categoryLabel}</span>
                    <span className="rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] leading-none text-[#016564]">{row.code}</span>
                  </div>
                  <div>
                    <h3 className="text-[18px] font-bold text-[#152625]">{row.subject}</h3>
                    <p className="mt-1 text-sm leading-7 text-[#61706f]">{row.summary}</p>
                  </div>
                  <div className="grid gap-2 text-sm text-[#425554] sm:grid-cols-2 xl:grid-cols-3">
                    <div><span className="font-semibold text-[#016564]">مقدم الطلب: </span>{row.requester?.fullName || '—'}</div>
                    <div><span className="font-semibold text-[#016564]">الإدارة: </span>{row.requester?.department || '—'}</div>
                    <div><span className="font-semibold text-[#016564]">الموقع: </span>{row.location || '—'}</div>
                    <div><span className="font-semibold text-[#016564]">العنصر المطلوب: </span>{row.itemName || '—'}</div>
                    <div><span className="font-semibold text-[#016564]">إلى: </span>{row.recipient || '—'}</div>
                    <div><span className="font-semibold text-[#016564]">الإنشاء: </span>{formatDate(row.createdAt)}</div>
                  </div>
                  {row.attachments?.length ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {row.attachments.map((attachment, index) => (
                        <span key={`${row.id}-${index}`} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700">{attachment}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex w-full flex-col gap-2 lg:w-auto">
                  <Button className="w-full lg:w-36" onClick={() => setSelected(row)}>فتح التفاصيل</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `تفاصيل المراسلة: ${selected.subject}` : 'تفاصيل المراسلة'} maxWidth="6xl">
        {selected ? (
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] border border-[#e6ebea] bg-white p-4">
                <h3 className="mb-3 text-lg font-extrabold text-[#016564]">المذكرة الجاهزة للإرسال</h3>
                <div dir="rtl" className="max-h-[70vh] overflow-auto rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-4" dangerouslySetInnerHTML={{ __html: selected.body || '<div>—</div>' }} />
              </div>
              <div className="rounded-[24px] border border-[#e6ebea] bg-white p-4">
                <h3 className="mb-3 text-lg font-extrabold text-[#016564]">ملخص المراسلة</h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {[
                    ['الموضوع', selected.subject],
                    ['رقم الطلب', selected.code],
                    ['نوع الطلب', selected.categoryLabel],
                    ['إلى', selected.recipient],
                    ['الحالة', statusMeta(selected.status).label],
                    ['تاريخ الإنشاء', formatDate(selected.createdAt)],
                    ['مقدم الطلب', selected.requester?.fullName || '—'],
                    ['الإدارة', selected.requester?.department || '—'],
                    ['البريد الإلكتروني', selected.requester?.email || '—'],
                    ['التحويلة', selected.requester?.extension || '—'],
                    ['الجوال', selected.requester?.mobile || '—'],
                    ['الموقع', selected.location || '—'],
                    ['العنصر المطلوب', selected.itemName || '—'],
                    ['مصدر الحاجة', selected.requestSource || '—'],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-3">
                      <div className="text-xs font-bold text-[#016564]">{label}</div>
                      <div className="mt-1 break-words text-sm text-[#425554]">{value || '—'}</div>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-3">
                    <div className="text-xs font-bold text-[#016564]">المرفقات المرفوعة</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.attachments?.length ? selected.attachments.map((attachment, index) => (
                        <span key={index} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700">{attachment}</span>
                      )) : <span className="text-sm text-[#61706f]">لا توجد مرفقات</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button className="w-full sm:w-auto" onClick={async () => {
                try {
                  const res = await fetch(`/api/email-drafts/${selected.id}/download`, { cache: 'no-store' });
                  if (!res.ok) {
                    const json = await res.json().catch(() => null);
                    throw new Error(json?.error || 'تعذر تنزيل ملف المراسلة حاليًا');
                  }
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selected.subject}.eml`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                  setSelected(null);
                  await fetchRows();
                } catch (error: any) {
                  alert(error?.message || 'تعذر تنزيل ملف المراسلة حاليًا');
                }
              }}>تنزيل .eml</Button>
              <Button variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">إغلاق</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
