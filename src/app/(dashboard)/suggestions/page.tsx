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
type AttachmentItem = { name: string; filename: string; contentType?: string; previewUrl?: string | null; kind?: string };

type SuggestionRow = {
  id: string;
  code?: string;
  linkedDraftId?: string | null;
  linkedCode?: string | null;
  title: string;
  description?: string | null;
  type?: SuggestionType;
  category?: SuggestionType;
  status: SuggestionStatus;
  createdAt?: string;
  itemName?: string;
  serviceItems?: string[];
  location?: string;
  requestSource?: string;
  programName?: string;
  area?: string;
  attachments?: AttachmentItem[];
  adminNotes?: string;
  targetRecipient?: string;
  requester?: { fullName?: string; department?: string; email?: string; mobile?: string; extension?: string } | null;
};

type FormState = {
  scope: RequestScope;
  programName: string;
  location: string;
  issueSummary: string;
  itemName: string;
  quantity: string;
  otherTitle: string;
  otherRecipient: string;
  serviceItems: string[];
  customItemsText: string;
};

const DEFAULT_FORM: FormState = { scope: 'BUILDING', programName: '', location: '', issueSummary: '', itemName: '', quantity: '1', otherTitle: '', otherRecipient: '', serviceItems: [], customItemsText: '' };
const MAINTENANCE_PARTS = ['الإنارة','الأبواب','النوافذ','الموكيت','التكييف','الإلكترونيات','الطاولات والكراسي','الشاشات','القاعات التدريبية','ممرات المبنى','دورات المياه'];
const CLEANING_AREAS = ['قاعات التدريب','الممرات','دورات المياه','منطقة الضيافة','المكاتب','مداخل المبنى','السجاد والموكيت'];

function formatDateTime(value?: string | null) { if (!value) return '—'; try { return new Intl.DateTimeFormat('ar-SA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); } catch { return '—'; } }
function normalizeArabic(value: string) { return (value || '').toLowerCase().trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '').replace(/\s+/g, ' '); }
function resolveType(row: SuggestionRow): SuggestionType { return (row.type || row.category || 'OTHER') as SuggestionType; }
function typeMeta(type: SuggestionType) { if (type==='MAINTENANCE') return {label:'طلب صيانة',variant:'danger' as const}; if (type==='CLEANING') return {label:'طلب نظافة',variant:'info' as const}; if (type==='PURCHASE') return {label:'طلب شراء مباشر',variant:'warning' as const}; return {label:'طلبات أخرى',variant:'neutral' as const}; }
function statusMeta(status: SuggestionStatus) { if (status==='PENDING') return {label:'بانتظار المدير',variant:'warning' as const}; if (status==='UNDER_REVIEW') return {label:'أُعيد للاستكمال',variant:'info' as const}; if (status==='APPROVED') return {label:'معتمد',variant:'success' as const}; if (status==='REJECTED') return {label:'مرفوض',variant:'danger' as const}; return {label:'تمت المعالجة',variant:'neutral' as const}; }
function buildPageTitle(type: SuggestionType) { if (type==='MAINTENANCE') return 'طلب صيانة'; if (type==='CLEANING') return 'طلب نظافة'; if (type==='PURCHASE') return 'طلب شراء مباشر'; return 'طلب آخر'; }
function buildDefaultRecipient(type: SuggestionType) { if (type==='PURCHASE') return 'wa.n1@nauss.edu.sa'; if (type==='MAINTENANCE' || type==='CLEANING') return 'ssd@nauss.edu.sa,AAlosaimi@nauss.edu.sa'; return ''; }
function parseAdminNotes(value?: string | null) { if (!value) return { note:'', linkedCode:'', linkedDraftId:'', targetRecipient:'' }; try { const parsed = JSON.parse(value); return { note: parsed?.adminNotes || parsed?.returnReason || '', linkedCode: parsed?.linkedCode || parsed?.publicCode || '', linkedDraftId: parsed?.linkedDraftId || '', targetRecipient: parsed?.targetRecipient || '' }; } catch { return { note:String(value), linkedCode:'', linkedDraftId:'', targetRecipient:'' }; } }

export default function SuggestionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SuggestionRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [managerRecipient, setManagerRecipient] = useState('');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<{type:'success'|'error'; message:string}|null>(null);
  const [preview, setPreview] = useState<AttachmentItem | null>(null);

  const canManage = user?.role === 'manager';
  const requestedType = (searchParams.get('type') || '').toUpperCase() as SuggestionType;
  const isCreateMode = searchParams.get('new') === '1';
  const activeType: SuggestionType = ['MAINTENANCE','CLEANING','PURCHASE','OTHER'].includes(requestedType) ? requestedType : 'OTHER';

  async function fetchRows() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (requestedType && ['MAINTENANCE','CLEANING','PURCHASE','OTHER'].includes(requestedType)) params.set('type', activeType);
      const res = await fetch(`/api/suggestions${params.toString() ? `?${params}` : ''}`, { cache: 'no-store' });
      const data = await res.json();
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch { setRows([]); } finally { setLoading(false); }
  }
  useEffect(() => { fetchRows(); }, [searchParams.toString()]);
  useEffect(() => {
    if (!selected) { setAdminNotes(''); setManagerRecipient(''); return; }
    const parsed = parseAdminNotes((selected as any).adminNotes);
    setAdminNotes(parsed.note || '');
    setManagerRecipient(selected.targetRecipient || parsed.targetRecipient || buildDefaultRecipient(resolveType(selected)));
  }, [selected]);

  const stats = useMemo(() => ({ total: rows.length, pending: rows.filter((r)=>r.status==='PENDING' || r.status==='UNDER_REVIEW').length, approved: rows.filter((r)=>r.status==='APPROVED'||r.status==='IMPLEMENTED').length, rejected: rows.filter((r)=>r.status==='REJECTED').length }), [rows]);
  const filteredRows = useMemo(() => { const q=normalizeArabic(search); return rows.filter((row)=>{ const type=resolveType(row); const haystack=normalizeArabic([row.code,row.title,row.description,row.requester?.fullName,row.requester?.department,row.itemName,row.location,row.requestSource,(row.serviceItems||[]).join(' '),typeMeta(type).label,statusMeta(row.status).label].filter(Boolean).join(' ')); return q ? haystack.includes(q) : true; }); }, [rows, search]);
  const pendingRows = useMemo(() => filteredRows.filter((r)=>r.status==='PENDING' || r.status==='UNDER_REVIEW'), [filteredRows]);
  const processedRows = useMemo(() => filteredRows.filter((r)=>!(r.status==='PENDING' || r.status==='UNDER_REVIEW')), [filteredRows]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((prev) => ({ ...prev, [key]: value })); }
  function resetCreateState() { setForm(DEFAULT_FORM); setAttachments([]); setFeedback(null); }
  async function fileToAttachmentPayload(file: File) { const buffer = await file.arrayBuffer(); let binary=''; const bytes=new Uint8Array(buffer); const chunkSize=0x8000; for (let i=0;i<bytes.length;i+=chunkSize) { const chunk=bytes.subarray(i,i+chunkSize); binary += String.fromCharCode(...chunk); } return { filename:file.name, contentType:file.type || 'application/octet-stream', base64Content:btoa(binary) }; }
  function closeCreateMode() { resetCreateState(); router.replace('/suggestions'); }
  function toggleServiceItem(item: string) { updateForm('serviceItems', form.serviceItems.includes(item) ? form.serviceItems.filter((x) => x !== item) : [...form.serviceItems, item]); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const requestSource = form.scope === 'PROGRAM' ? `مرتبط ببرنامج تدريبي${form.programName ? ` | اسم البرنامج: ${form.programName}` : ''}` : 'مرتبط بملاحظة عامة في المبنى';
    let title = buildPageTitle(activeType);
    let description = form.issueSummary.trim();
    let itemName = '';
    let externalRecipient = buildDefaultRecipient(activeType);
    let serviceItems = [...form.serviceItems];
    const customItems = form.customItemsText.split(/\n|،|,/).map((item) => item.trim()).filter(Boolean);
    if (customItems.length) serviceItems = [...serviceItems, ...customItems];

    if (activeType === 'MAINTENANCE' || activeType === 'CLEANING') {
      if (!serviceItems.length || !description) { setFeedback({ type:'error', message:`اختر بند خدمة واحدًا على الأقل وأكمل الوصف` }); return; }
      itemName = serviceItems.join('، ');
    }
    if (activeType === 'PURCHASE') {
      title = 'طلب شراء مباشر'; itemName = form.itemName.trim();
      if (!itemName || !description) { setFeedback({ type:'error', message:'أكمل حقول طلب الشراء المباشر المطلوبة' }); return; }
      serviceItems = [itemName];
    }
    if (activeType === 'OTHER') {
      title = form.otherTitle.trim() || 'طلب آخر';
      if (!title || !description) { setFeedback({ type:'error', message:'أكمل حقول الطلب الآخر المطلوبة' }); return; }
      externalRecipient = form.otherRecipient.trim();
      serviceItems = [title];
    }
    const attachmentPayload = await Promise.all(attachments.map(fileToAttachmentPayload));
    setSubmitting(true);
    try {
      const res = await fetch('/api/suggestions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ category: activeType, title, description, itemName, quantity: Math.max(1, Number(form.quantity || 1)), location: form.location.trim(), externalRecipient, requestSource, programName: form.programName.trim(), serviceItems, attachments: attachmentPayload }) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) { setFeedback({ type:'error', message: data?.error || 'تعذر حفظ الطلب' }); return; }
      resetCreateState(); router.replace(`/suggestions?type=${activeType}`); await fetchRows();
    } finally { setSubmitting(false); }
  }

  async function handleDecision(action: 'approve' | 'reject' | 'return') {
    if (!selected) return; setFeedback(null); setProcessing(true);
    try {
      const targetDepartment = resolveType(selected) === 'PURCHASE' ? 'FINANCE' : resolveType(selected) === 'OTHER' ? 'OTHER' : 'SUPPORT_SERVICES';
      const res = await fetch('/api/suggestions', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ suggestionId:selected.id, action, adminNotes, targetDepartment, targetRecipient: managerRecipient }) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) { setFeedback({ type:'error', message: data?.error || 'تعذر معالجة الطلب' }); return; }
      setSelected(null); await fetchRows();
    } finally { setProcessing(false); }
  }

  function ServiceButtons() {
    const items: Array<{type:SuggestionType; label:string}> = [{type:'MAINTENANCE', label:'طلب صيانة'}, {type:'CLEANING', label:'طلب نظافة'}, {type:'PURCHASE', label:'شراء مباشر'}, {type:'OTHER', label:'طلب آخر'}];
    return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{items.map((item)=><Button key={item.type} variant={activeType===item.type && isCreateMode ? 'primary' : 'ghost'} className="w-full" onClick={()=>router.push(`/suggestions?type=${item.type}&new=1`)}>{item.label}</Button>)}</div>;
  }

  function renderAttachmentList(items?: AttachmentItem[]) {
    if (!items?.length) return <div className="text-sm text-[#61706f]">لا توجد مرفقات</div>;
    return <div className="grid gap-2 sm:grid-cols-2">{items.map((file, index) => <button key={`${file.filename}-${index}`} type="button" onClick={() => setPreview(file)} className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 text-right text-sm text-[#304342] hover:border-[#016564]">{file.name}</button>)}</div>;
  }

  function renderServiceSelectors() {
    const options = activeType === 'MAINTENANCE' ? MAINTENANCE_PARTS : CLEANING_AREAS;
    return <div className="space-y-3"><div className="text-sm font-semibold text-slate-700">البنود المطلوبة</div><div className="grid gap-2 sm:grid-cols-2">{options.map((option) => <label key={option} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"><input type="checkbox" checked={form.serviceItems.includes(option)} onChange={() => toggleServiceItem(option)} />{option}</label>)}</div><div className="space-y-2"><label className="block text-sm font-semibold text-slate-700">بنود إضافية (كل بند في سطر مستقل)</label><textarea value={form.customItemsText} onChange={(e)=>updateForm('customItemsText', e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10" placeholder="مثال: إصلاح نقطة كهرباء&#10;معالجة تسرب خفيف" /></div></div>;
  }

  return <div className="space-y-4 sm:space-y-5">
    <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="space-y-2"><h2 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">{canManage ? 'الطلبات التشغيلية والموافقات' : 'الطلبات التشغيلية'}</h2><p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">مسار موحد لطلبات الصيانة والنظافة والشراء المباشر والطلبات الأخرى، مع المرفقات والمراسلات الخارجية.</p></div>{!canManage ? <Button className="w-full sm:w-auto" onClick={()=>router.push('/suggestions?new=1&type=MAINTENANCE')}>طلب جديد</Button> : null}</div>
      {!canManage ? <div className="mt-4"><ServiceButtons /></div> : null}
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4"><Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">إجمالي الطلبات</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564]">{stats.total}</div></Card><Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">بانتظار المدير</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#d0b284]">{stats.pending}</div></Card><Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">المعالجة</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#498983]">{stats.approved}</div></Card><Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">المرفوضة</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#7c1e3e]">{stats.rejected}</div></Card></div>
    </section>
    <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5"><Input label="بحث" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="ابحث برقم الطلب أو عنوانه أو مقدم الطلب أو البنود" /></section>
    {canManage ? <section className="grid gap-6 xl:grid-cols-2 xl:items-start"><div><div className="mb-3 text-lg font-bold text-[#016564]">طلبات تحتاج قرارًا</div><div className="space-y-3">{loading ? [1,2].map((i)=><Skeleton key={i} className="h-32 w-full rounded-[24px]" />) : pendingRows.length ? pendingRows.map(renderRow) : <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد طلبات بانتظار القرار</Card>}</div></div><div><div className="mb-3 text-lg font-bold text-[#016564]">طلبات تمت معالجتها</div><div className="space-y-3">{loading ? [1,2].map((i)=><Skeleton key={`processed-${i}`} className="h-32 w-full rounded-[24px]" />) : processedRows.length ? processedRows.map(renderRow) : <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد طلبات معالجة</Card>}</div></div></section> : <section className="space-y-3">{loading ? [1,2,3].map((i)=><Skeleton key={i} className="h-32 w-full rounded-[24px]" />) : filteredRows.length ? filteredRows.map(renderRow) : <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد طلبات مطابقة</Card>}</section>}

    <Modal isOpen={isCreateMode} onClose={closeCreateMode} title={buildPageTitle(activeType)} size="2xl" bodyClassName="overflow-visible">
      <form onSubmit={handleCreate} className="space-y-4">
        {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type==='error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{feedback.message}</div> : null}
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><label className="block text-sm font-semibold text-slate-700">مصدر الحاجة</label><select value={form.scope} onChange={(e)=>updateForm('scope', e.target.value as RequestScope)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"><option value="BUILDING">مرتبط بملاحظة عامة في المبنى</option><option value="PROGRAM">مرتبط ببرنامج تدريبي</option></select></div><Input label="الموقع" value={form.location} onChange={(e)=>updateForm('location', e.target.value)} placeholder="مثال: القاعة 3 أو الممر الغربي" /></div>
        {form.scope === 'PROGRAM' ? <Input label="اسم البرنامج التدريبي" value={form.programName} onChange={(e)=>updateForm('programName', e.target.value)} placeholder="اكتب اسم البرنامج" /> : null}
        {(activeType==='MAINTENANCE' || activeType==='CLEANING') ? renderServiceSelectors() : null}
        {activeType==='PURCHASE' ? <div className="grid gap-3 sm:grid-cols-2"><Input label="الصنف المطلوب" value={form.itemName} onChange={(e)=>updateForm('itemName', e.target.value)} placeholder="اكتب اسم الصنف المطلوب" /><Input label="الكمية" type="number" min="1" value={form.quantity} onChange={(e)=>updateForm('quantity', e.target.value)} placeholder="1" /></div> : null}
        {activeType==='OTHER' ? <div className="grid gap-3 sm:grid-cols-2"><Input label="عنوان الطلب" value={form.otherTitle} onChange={(e)=>updateForm('otherTitle', e.target.value)} placeholder="مثال: طلب معالجة تشغيلية أخرى" /><Input label="الجهة المقترحة مبدئيًا" value={form.otherRecipient} onChange={(e)=>updateForm('otherRecipient', e.target.value)} placeholder="يترك فارغًا إذا كان المدير سيحدده" /></div> : null}
        <div className="space-y-2"><label className="block text-sm font-semibold text-slate-700">سبب الطلب أو الملاحظة</label><textarea value={form.issueSummary} onChange={(e)=>updateForm('issueSummary', e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10" placeholder="اكتب وصفًا واضحًا ومباشرًا" /></div>
        <div className="space-y-2"><label className="block text-sm font-semibold text-slate-700">المرفقات (يمكن رفع أكثر من مرفق)</label><input type="file" accept="image/*,application/pdf,video/*" multiple onChange={(e)=>setAttachments(Array.from(e.target.files || []))} className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" />{attachments.length>0 ? <div className="rounded-2xl border border-[#e7ebea] bg-[#f8fbfb] px-4 py-3 text-sm text-[#304342]">عدد المرفقات المختارة: {attachments.length}<div className="mt-2">{attachments.map((file)=> <div key={file.name}>{file.name}</div>)}</div></div> : null}</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={closeCreateMode} className="w-full sm:w-auto">إلغاء</Button><Button type="submit" loading={submitting} className="w-full sm:w-auto">إرسال الطلب</Button></div>
      </form>
    </Modal>

    <Modal isOpen={!!selected} onClose={()=>setSelected(null)} title={selected ? `تفاصيل الطلب ${selected.code || ''}` : 'تفاصيل الطلب'} size="full" bodyClassName="overflow-visible">
      {selected ? <div className="space-y-5"><div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]"><div className="space-y-4 rounded-[22px] border border-[#e7ebea] bg-white p-4 sm:p-5"><div className="text-sm font-extrabold text-[#016564]">بيانات الطلب الأساسية</div><div className="grid gap-3 sm:grid-cols-2">{[['الرمز', selected.code || selected.id],['النوع', typeMeta(resolveType(selected)).label],['الحالة', statusMeta(selected.status).label],['التاريخ', formatDateTime(selected.createdAt)],['العنوان', selected.title],['الوصف', selected.description || '—'],['مقدم الطلب', selected.requester?.fullName || '—'],['الإدارة', 'إدارة عمليات التدريب'],['البريد الإلكتروني', selected.requester?.email || '—'],['الجوال', selected.requester?.mobile || '—'],['رقم التحويلة', selected.requester?.extension || '—'],['الموقع', selected.location || '—'],['البنود المطلوبة', selected.itemName || '—'],['مصدر الحاجة', selected.requestSource || '—']].map(([label, value]) => <div key={String(label)} className="rounded-[18px] border border-[#e7ebea] bg-[#f8fbfb] px-4 py-3"><div className="text-xs font-bold text-[#016564]">{label}</div><div className="mt-1 break-words text-sm leading-7 text-[#304342]">{value || '—'}</div></div>)}<div className="rounded-[18px] border border-[#e7ebea] bg-[#f8fbfb] px-4 py-3 sm:col-span-2"><div className="text-xs font-bold text-[#016564]">المرفقات المرفوعة</div><div className="mt-2">{renderAttachmentList(selected.attachments)}</div></div></div></div><div className="space-y-3 rounded-[22px] border border-[#e7ebea] bg-[#f8fbfb] p-4 sm:p-5"><div className="text-sm font-extrabold text-[#016564]">قرار المدير</div><textarea value={adminNotes} onChange={(e)=>setAdminNotes(e.target.value)} rows={7} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10" placeholder="اكتب ملاحظة القرار أو طلب الاستكمال" />{resolveType(selected)==='OTHER' ? <Input label="الجهة المستلمة" value={managerRecipient} onChange={(e)=>setManagerRecipient(e.target.value)} placeholder="البريد أو الجهة المستلمة" /> : <Input label="الجهة المستلمة" value={managerRecipient} onChange={(e)=>setManagerRecipient(e.target.value)} />} {canManage && (selected.status==='PENDING' || selected.status==='UNDER_REVIEW') ? <div className="flex flex-col gap-2"><Button variant="ghost" className="w-full" loading={processing} onClick={()=>handleDecision('return')}>إعادة الطلب للاستكمال</Button><div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="danger" className="w-full sm:w-auto" loading={processing} onClick={()=>handleDecision('reject')}>رفض نهائي</Button><Button className="w-full sm:w-auto" loading={processing} onClick={()=>handleDecision('approve')}>اعتماد وتحويل للمراسلات الخارجية</Button></div></div> : null}</div></div><div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{selected.linkedDraftId && canManage ? <Button className="w-full sm:w-auto" onClick={()=>router.push('/email-drafts')}>فتح المراسلات الخارجية</Button> : null}<Button variant="ghost" onClick={()=>setSelected(null)} className="w-full sm:w-auto">إغلاق</Button></div></div> : null}
    </Modal>

    <Modal isOpen={!!preview} onClose={()=>setPreview(null)} title={preview?.name || 'معاينة مرفق'} size="xl">
      {preview ? <div className="space-y-4">{preview.kind === 'image' && preview.previewUrl ? <img src={preview.previewUrl} alt={preview.name} className="max-h-[70vh] w-full rounded-2xl object-contain" /> : preview.kind === 'pdf' && preview.previewUrl ? <iframe src={preview.previewUrl} className="h-[70vh] w-full rounded-2xl border border-[#d6d7d4]" /> : preview.previewUrl ? <a href={preview.previewUrl} download={preview.filename} className="inline-flex rounded-2xl border border-[#016564] px-4 py-3 text-sm font-bold text-[#016564]">تنزيل المرفق</a> : <div className="text-sm text-[#61706f]">لا تتوفر معاينة لهذا المرفق</div>}</div> : null}
    </Modal>
  </div>;

  function renderRow(row: SuggestionRow) {
    const type = resolveType(row); const typeBadge = typeMeta(type); const statusBadge = statusMeta(row.status);
    return <Card key={row.id} className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 space-y-3"><div className="flex flex-wrap items-center gap-2"><div className="font-mono text-sm font-bold text-[#016564]">{row.code || row.id}</div><Badge variant={typeBadge.variant}>{typeBadge.label}</Badge><Badge variant={statusBadge.variant}>{statusBadge.label}</Badge></div><div className="break-words text-[15px] font-bold leading-7 text-[#152625] sm:text-base">{row.title}</div>{row.description ? <div className="break-words text-sm leading-7 text-[#304342]">{row.description}</div> : null}<div className="grid gap-2 text-[12px] text-[#61706f] sm:grid-cols-2 sm:text-xs"><div>التاريخ: {formatDateTime(row.createdAt)}</div><div className="break-words">مقدم الطلب: {row.requester?.fullName || '—'}</div><div className="break-words sm:col-span-2">البنود: {row.itemName || '—'}</div><div>المرفقات: {row.attachments?.length || 0}</div></div></div><div className="flex w-full flex-col gap-2 sm:w-auto"><Button className="w-full sm:w-auto" onClick={()=>setSelected(row)}>فتح التفاصيل</Button>{row.linkedDraftId && canManage ? <Button variant="ghost" className="w-full sm:w-auto" onClick={()=>router.push('/email-drafts')}>فتح المراسلات</Button> : null}</div></div></Card>;
  }
}
