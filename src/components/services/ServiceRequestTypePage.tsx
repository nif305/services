'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type SuggestionType = 'MAINTENANCE' | 'CLEANING' | 'PURCHASE' | 'OTHER';
type SuggestionStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
type RequestScope = 'PROGRAM' | 'BUILDING';

type SuggestionRow = {
  id: string;
  code?: string;
  linkedDraftId?: string | null;
  title: string;
  description?: string | null;
  type?: SuggestionType;
  category?: SuggestionType;
  status: SuggestionStatus;
  createdAt?: string;
  itemName?: string;
  location?: string;
  requestSource?: string;
  attachments?: Array<{ name: string; filename?: string; contentType?: string; url?: string }>;
  serviceItems?: string[];
  adminNotes?: string;
  requester?: {
    fullName?: string;
    department?: string;
    email?: string;
    mobile?: string;
    extension?: string;
  } | null;
};

type FormState = {
  scope: RequestScope;
  programName: string;
  location: string;
  serviceItems: string[];
  customServiceItems: string;
  issueSummary: string;
  itemName: string;
  quantity: string;
  otherTitle: string;
  otherRecipient: string;
};

const PAGE_SIZE = 5;
const DEFAULT_FORM: FormState = {
  scope: 'BUILDING',
  programName: '',
  location: '',
  serviceItems: [],
  customServiceItems: '',
  issueSummary: '',
  itemName: '',
  quantity: '1',
  otherTitle: '',
  otherRecipient: '',
};
const MAINTENANCE_PARTS = ['الإنارة', 'الأبواب', 'النوافذ', 'الموكيت', 'التكييف', 'الإلكترونيات', 'الشاشات', 'الطاولات والكراسي', 'القاعات التدريبية', 'ممرات المبنى', 'دورات المياه', 'أخرى'];
const CLEANING_AREAS = ['قاعة تدريبية', 'ممرات المبنى', 'دورات المياه', 'منطقة الضيافة', 'مكاتب', 'مداخل المبنى', 'أخرى'];

function normalizeArabic(value: string) {
  return (value || '').toLowerCase().trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '').replace(/\s+/g, ' ');
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function typeMeta(type: SuggestionType) {
  if (type === 'MAINTENANCE') return { label: 'طلب صيانة', variant: 'danger' as const };
  if (type === 'CLEANING') return { label: 'طلب نظافة', variant: 'info' as const };
  if (type === 'PURCHASE') return { label: 'طلب شراء مباشر', variant: 'warning' as const };
  return { label: 'طلب آخر', variant: 'neutral' as const };
}

function statusMeta(status: SuggestionStatus) {
  if (status === 'PENDING') return { label: 'بانتظار المدير', variant: 'warning' as const };
  if (status === 'UNDER_REVIEW') return { label: 'قيد المراجعة', variant: 'info' as const };
  if (status === 'REJECTED') return { label: 'مرفوض', variant: 'danger' as const };
  return { label: 'منجز', variant: 'neutral' as const };
}

function buildPageTitle(type: SuggestionType) {
  if (type === 'MAINTENANCE') return 'طلبات الصيانة';
  if (type === 'CLEANING') return 'طلبات النظافة';
  if (type === 'PURCHASE') return 'طلبات الشراء المباشر';
  return 'الطلبات الأخرى';
}

function buildCreateTitle(type: SuggestionType) {
  if (type === 'MAINTENANCE') return 'طلب صيانة';
  if (type === 'CLEANING') return 'طلب نظافة';
  if (type === 'PURCHASE') return 'طلب شراء مباشر';
  return 'طلب آخر';
}

function buildDefaultRecipient(type: SuggestionType) {
  if (type === 'PURCHASE') return 'wa.n1@nauss.edu.sa';
  if (type === 'MAINTENANCE' || type === 'CLEANING') return 'ssd@nauss.edu.sa,AAlosaimi@nauss.edu.sa';
  return '';
}

function routeForType(type: SuggestionType) {
  if (type === 'MAINTENANCE') return '/services/maintenance';
  if (type === 'CLEANING') return '/services/cleaning';
  if (type === 'PURCHASE') return '/services/purchases';
  return '/services/other';
}

function parseAdminNotes(value?: string | null) {
  if (!value) return { note: '' };
  try {
    const parsed = JSON.parse(value);
    return { note: parsed?.adminNotes || '' };
  } catch {
    return { note: String(value) };
  }
}

export function ServiceRequestTypePage({ type }: { type: SuggestionType }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canManage = user?.role === 'manager';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const isCreateMode = searchParams.get('new') === '1';
  const basePath = routeForType(type);

  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SuggestionRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  async function fetchRows() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type,
        scope: 'active',
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      const res = await fetch(`/api/suggestions?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      setRows(Array.isArray(data?.data) ? data.data : []);
      setPagination({
        page: Number(data?.pagination?.page || page),
        totalPages: Number(data?.pagination?.totalPages || 1),
        total: Number(data?.pagination?.total || 0),
      });
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, [type, page]);

  useEffect(() => {
    setAdminNotes(selected ? parseAdminNotes(selected.adminNotes).note : '');
  }, [selected]);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);
    return rows.filter((row) => {
      const haystack = normalizeArabic([
        row.code,
        row.title,
        row.description,
        row.requester?.fullName,
        row.itemName,
        row.location,
      ].filter(Boolean).join(' '));
      return q ? haystack.includes(q) : true;
    });
  }, [rows, search]);

  const pendingRows = useMemo(() => filteredRows.filter((row) => row.status === 'PENDING' || row.status === 'UNDER_REVIEW'), [filteredRows]);
  const rejectedRows = useMemo(() => filteredRows.filter((row) => row.status === 'REJECTED'), [filteredRows]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleServiceItem(item: string) {
    setForm((prev) => ({
      ...prev,
      serviceItems: prev.serviceItems.includes(item)
        ? prev.serviceItems.filter((entry) => entry !== item)
        : [...prev.serviceItems, item],
    }));
  }

  function closeCreateMode() {
    setForm(DEFAULT_FORM);
    setFeedback(null);
    router.replace(basePath);
  }

  function goToPage(nextPage: number) {
    const safePage = Math.min(Math.max(1, nextPage), Math.max(1, pagination.totalPages));
    router.push(safePage > 1 ? `${basePath}?page=${safePage}` : basePath);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);

    const selectedItems = form.serviceItems.includes('أخرى')
      ? [...form.serviceItems.filter((item) => item !== 'أخرى'), ...form.customServiceItems.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)]
      : form.serviceItems;

    let title = buildCreateTitle(type);
    let itemName = '';
    let externalRecipient = buildDefaultRecipient(type);

    if (type === 'MAINTENANCE' || type === 'CLEANING') {
      itemName = selectedItems.join('، ');
      if (!selectedItems.length || !form.issueSummary.trim()) {
        setFeedback({ type: 'error', message: 'أكمل بنود الطلب والوصف المطلوب.' });
        return;
      }
    }

    if (type === 'PURCHASE') {
      itemName = form.itemName.trim();
      if (!itemName || !form.issueSummary.trim()) {
        setFeedback({ type: 'error', message: 'أكمل بيانات طلب الشراء المباشر.' });
        return;
      }
    }

    if (type === 'OTHER') {
      title = form.otherTitle.trim() || 'طلب آخر';
      externalRecipient = form.otherRecipient.trim();
      if (!title || !form.issueSummary.trim()) {
        setFeedback({ type: 'error', message: 'أكمل عنوان الطلب ووصفه.' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: type,
          title,
          description: form.issueSummary.trim(),
          itemName,
          quantity: Math.max(1, Number(form.quantity || 1)),
          location: form.location.trim(),
          externalRecipient,
          requestSource: form.scope === 'PROGRAM' ? `مرتبط ببرنامج تدريبي${form.programName ? ` | اسم البرنامج: ${form.programName}` : ''}` : 'مرتبط بملاحظة عامة في المبنى',
          programName: form.programName.trim(),
          area: selectedItems.join('، '),
          serviceItems: selectedItems,
          attachments: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'error', message: data?.error || 'تعذر حفظ الطلب' });
        return;
      }
      closeCreateMode();
      await fetchRows();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(action: 'approve' | 'reject') {
    if (!selected) return;
    setProcessing(true);
    try {
      const targetDepartment = type === 'PURCHASE' ? 'FINANCE' : type === 'OTHER' ? 'OTHER' : 'SUPPORT_SERVICES';
      const res = await fetch('/api/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId: selected.id, action, adminNotes, targetDepartment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'error', message: data?.error || 'تعذر معالجة الطلب' });
        return;
      }
      setSelected(null);
      await fetchRows();
    } finally {
      setProcessing(false);
    }
  }

  function renderRow(row: SuggestionRow) {
    const status = statusMeta(row.status);
    const meta = typeMeta(type);
    return (
      <Card key={row.id} className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#016564]">{row.code || row.id}</span>
              <Badge variant={meta.variant}>{meta.label}</Badge>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="text-[15px] font-bold leading-7 text-[#152625] sm:text-base break-words">{row.title}</div>
            <div className="text-sm leading-7 text-[#304342]">{row.description || '—'}</div>
            <div className="grid gap-2 text-[12px] text-[#61706f] sm:grid-cols-2 sm:text-xs">
              <div>التاريخ: {formatDateTime(row.createdAt)}</div>
              <div>مقدم الطلب: {row.requester?.fullName || '—'}</div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <Button className="w-full sm:w-auto" onClick={() => setSelected(row)}>فتح التفاصيل</Button>
            {row.linkedDraftId && canManage ? <Button variant="ghost" className="w-full sm:w-auto" onClick={() => router.push('/services/email-drafts')}>فتح المراسلات</Button> : null}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">{buildPageTitle(type)}</h2>
            <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
              {canManage
                ? 'يعرض هذا القسم الطلبات النشطة فقط. الطلب المعتمد ينتقل إلى المراسلات الخارجية، وبعد تنزيل المسودة ينتقل نهائيًا إلى الأرشيف.'
                : 'يعرض هذا القسم طلباتك النشطة فقط. عند اعتماد الطلب ينتقل إلى المراسلات الخارجية ولا يبقى هنا.'}
            </p>
          </div>
          {!canManage ? <Button className="w-full sm:w-auto" onClick={() => router.push(`${basePath}?new=1`)}>طلب جديد</Button> : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">إجمالي الطلبات</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564]">{pagination.total}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">بانتظار المدير</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#d0b284]">{pendingRows.length}</div></Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">المرفوضة</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#7c1e3e]">{rejectedRows.length}</div></Card>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <Input label="بحث" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث برقم الطلب أو العنوان أو اسم مقدم الطلب" />
      </section>

      {canManage ? (
        <section className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <div>
            <div className="mb-3 text-lg font-bold text-[#016564]">طلبات تحتاج اعتماد</div>
            <div className="space-y-3">
              {loading ? [1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-[24px]" />) : pendingRows.length ? pendingRows.map(renderRow) : <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد طلبات بانتظار الاعتماد</Card>}
            </div>
          </div>
          <div>
            <div className="mb-3 text-lg font-bold text-[#016564]">طلبات مرفوضة</div>
            <div className="space-y-3">
              {loading ? [1, 2].map((i) => <Skeleton key={`rejected-${i}`} className="h-32 w-full rounded-[24px]" />) : rejectedRows.length ? rejectedRows.map(renderRow) : <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد طلبات مرفوضة</Card>}
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {loading ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-[24px]" />) : filteredRows.length ? filteredRows.map(renderRow) : <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد طلبات مطابقة</Card>}
        </section>
      )}

      {!loading && pagination.totalPages > 1 ? (
        <section className="flex items-center justify-between rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-3 shadow-sm">
          <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} className="rounded-full border border-[#d6d7d4] px-4 py-2 text-sm font-bold text-[#425554] disabled:cursor-not-allowed disabled:opacity-40">السابق</button>
          <div className="text-sm font-bold text-[#016564]">الصفحة {page} من {pagination.totalPages}</div>
          <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= pagination.totalPages} className="rounded-full border border-[#d6d7d4] px-4 py-2 text-sm font-bold text-[#425554] disabled:cursor-not-allowed disabled:opacity-40">التالي</button>
        </section>
      ) : null}

      <Modal isOpen={isCreateMode} onClose={closeCreateMode} title={buildCreateTitle(type)} size="2xl" bodyClassName="overflow-visible">
        <form onSubmit={handleCreate} className="space-y-4">
          {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{feedback.message}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">مصدر الحاجة</label>
              <select value={form.scope} onChange={(e) => updateForm('scope', e.target.value as RequestScope)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10">
                <option value="BUILDING">مرتبط بملاحظة عامة في المبنى</option>
                <option value="PROGRAM">مرتبط ببرنامج تدريبي</option>
              </select>
            </div>
            <Input label="الموقع" value={form.location} onChange={(e) => updateForm('location', e.target.value)} placeholder="مثال: القاعة 3 أو الممر الغربي" />
          </div>
          {form.scope === 'PROGRAM' ? <Input label="اسم البرنامج التدريبي" value={form.programName} onChange={(e) => updateForm('programName', e.target.value)} placeholder="اكتب اسم البرنامج" /> : null}
          {(type === 'MAINTENANCE' || type === 'CLEANING') ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">{type === 'MAINTENANCE' ? 'البنود المطلوبة' : 'بنود النظافة المطلوبة'}</label>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(type === 'MAINTENANCE' ? MAINTENANCE_PARTS : CLEANING_AREAS).map((option) => (
                    <label key={option} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
                      <span>{option}</span>
                      <input type="checkbox" checked={form.serviceItems.includes(option)} onChange={() => toggleServiceItem(option)} className="h-4 w-4 rounded border-slate-300 text-[#016564] focus:ring-[#016564]" />
                    </label>
                  ))}
                </div>
              </div>
              {form.serviceItems.includes('أخرى') ? <textarea value={form.customServiceItems} onChange={(e) => updateForm('customServiceItems', e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10" placeholder="كل بند في سطر مستقل" /> : null}
            </div>
          ) : null}
          {type === 'PURCHASE' ? <div className="grid gap-3 sm:grid-cols-2"><Input label="الصنف المطلوب" value={form.itemName} onChange={(e) => updateForm('itemName', e.target.value)} placeholder="اكتب اسم الصنف المطلوب" /><Input label="الكمية" type="number" min="1" value={form.quantity} onChange={(e) => updateForm('quantity', e.target.value)} placeholder="1" /></div> : null}
          {type === 'OTHER' ? <div className="grid gap-3 sm:grid-cols-2"><Input label="عنوان الطلب" value={form.otherTitle} onChange={(e) => updateForm('otherTitle', e.target.value)} placeholder="مثال: طلب معالجة تشغيلية أخرى" /><Input label="الجهة المقترحة مبدئيًا" value={form.otherRecipient} onChange={(e) => updateForm('otherRecipient', e.target.value)} placeholder="اختياري" /></div> : null}
          <div className="space-y-2"><label className="block text-sm font-semibold text-slate-700">سبب الطلب أو الملاحظة</label><textarea value={form.issueSummary} onChange={(e) => updateForm('issueSummary', e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10" placeholder="اكتب وصفًا واضحًا ومباشرًا" /></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={closeCreateMode} className="w-full sm:w-auto">إلغاء</Button><Button type="submit" loading={submitting} className="w-full sm:w-auto">إرسال الطلب</Button></div>
        </form>
      </Modal>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `تفاصيل الطلب ${selected.code || ''}` : 'تفاصيل الطلب'} size="full" bodyClassName="overflow-visible">
        {selected ? (
          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4 rounded-[22px] border border-[#e7ebea] bg-white p-4 sm:p-5">
                <div className="text-sm font-extrabold text-[#016564]">بيانات الطلب الأساسية</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['الرمز', selected.code || selected.id],
                    ['النوع', typeMeta(type).label],
                    ['الحالة', statusMeta(selected.status).label],
                    ['التاريخ', formatDateTime(selected.createdAt)],
                    ['العنوان', selected.title],
                    ['الوصف', selected.description || '—'],
                    ['مقدم الطلب', selected.requester?.fullName || '—'],
                    ['الموقع', selected.location || '—'],
                    ['العنصر المطلوب', selected.itemName || '—'],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-[18px] border border-[#e7ebea] bg-[#f8fbfb] px-4 py-3">
                      <div className="text-xs font-bold text-[#016564]">{label}</div>
                      <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{value || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 rounded-[22px] border border-[#e7ebea] bg-[#f8fbfb] p-4 sm:p-5">
                <div className="text-sm font-extrabold text-[#016564]">قرار المدير</div>
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={8} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10" placeholder="اكتب ملاحظة القرار أو التوجيه" />
                {canManage && (selected.status === 'PENDING' || selected.status === 'UNDER_REVIEW') ? <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="danger" className="w-full sm:w-auto" loading={processing} onClick={() => handleDecision('reject')}>رفض الطلب</Button><Button className="w-full sm:w-auto" loading={processing} onClick={() => handleDecision('approve')}>اعتماد الطلب</Button></div> : null}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{selected.linkedDraftId && canManage ? <Button className="w-full sm:w-auto" onClick={() => router.push('/services/email-drafts')}>فتح المراسلات الخارجية</Button> : null}<Button variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">إغلاق</Button></div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
