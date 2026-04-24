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
  linkedCode?: string | null;
  title: string;
  description?: string | null;
  type?: SuggestionType;
  category?: SuggestionType;
  status: SuggestionStatus;
  createdAt?: string;
  itemName?: string;
  location?: string;
  requestSource?: string;
  programName?: string;
  area?: string;
  attachments?: Array<{ name: string; filename?: string; contentType?: string; url?: string; }>;
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
  area: string;
  customArea: string;
  serviceItems: string[];
  customServiceItems: string;
  issueSummary: string;
  itemName: string;
  quantity: string;
  otherTitle: string;
  otherRecipient: string;
};

type AttachmentSummary = {
  name: string;
  originalSize: number;
  finalSize?: number;
  status: 'queued' | 'processing' | 'ready' | 'error';
  message?: string;
};

const DEFAULT_FORM: FormState = {
  scope: 'BUILDING', programName: '', location: '', area: '', customArea: '', serviceItems: [], customServiceItems: '', issueSummary: '', itemName: '', quantity: '1', otherTitle: '', otherRecipient: ''
};
const MAINTENANCE_PARTS = ['الإنارة','الأبواب','النوافذ','الموكيت','التكييف','الإلكترونيات','الشاشات','الطاولات والكراسي','القاعات التدريبية','ممرات المبنى','دورات المياه','أخرى'];
const CLEANING_AREAS = ['قاعة تدريبية','ممرات المبنى','دورات المياه','منطقة الضيافة','مكاتب','مداخل المبنى','أخرى'];

function formatDateTime(value?: string | null) { if (!value) return '—'; try { return new Intl.DateTimeFormat('ar-SA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); } catch { return '—'; } }
function normalizeArabic(value: string) { return (value || '').toLowerCase().trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '').replace(/\s+/g, ' '); }
function resolveType(row: SuggestionRow): SuggestionType { return (row.type || row.category || 'OTHER') as SuggestionType; }
function typeMeta(type: SuggestionType) { if (type==='MAINTENANCE') return {label:'طلب صيانة',variant:'danger' as const}; if (type==='CLEANING') return {label:'طلب نظافة',variant:'info' as const}; if (type==='PURCHASE') return {label:'طلب شراء مباشر',variant:'warning' as const}; return {label:'طلبات أخرى',variant:'neutral' as const}; }
function statusMeta(status: SuggestionStatus) { if (status==='PENDING') return {label:'بانتظار المدير',variant:'warning' as const}; if (status==='UNDER_REVIEW') return {label:'قيد المراجعة',variant:'info' as const}; if (status==='APPROVED') return {label:'معتمد',variant:'success' as const}; if (status==='REJECTED') return {label:'مرفوض',variant:'danger' as const}; return {label:'تمت المعالجة',variant:'neutral' as const}; }
function buildPageTitle(type: SuggestionType) { if (type==='MAINTENANCE') return 'طلب صيانة'; if (type==='CLEANING') return 'طلب نظافة'; if (type==='PURCHASE') return 'طلب شراء مباشر'; return 'طلب آخر'; }
function buildDefaultRecipient(type: SuggestionType) { if (type==='PURCHASE') return 'wa.n1@nauss.edu.sa'; if (type==='MAINTENANCE' || type==='CLEANING') return 'ssd@nauss.edu.sa,AAlosaimi@nauss.edu.sa'; return ''; }
function parseAdminNotes(value?: string | null) { if (!value) return { note:'', linkedCode:'', linkedDraftId:'' }; try { const parsed = JSON.parse(value); return { note: parsed?.adminNotes || '', linkedCode: parsed?.linkedCode || parsed?.publicCode || '', linkedDraftId: parsed?.linkedDraftId || '' }; } catch { return { note:String(value), linkedCode:'', linkedDraftId:'' }; } }

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return '0 ك.ب';
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} ك.ب`;
  return `${(kb / 1024).toFixed(2)} م.ب`;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
    reader.readAsDataURL(blob);
  });
}

async function compressImageFile(file: File, maxDimension = 1600, maxBytes = 350 * 1024): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`تعذر قراءة الصورة: ${file.name}`));
      img.src = objectUrl;
    });

    let width = image.width;
    let height = image.height;
    const largest = Math.max(width, height);
    if (largest > maxDimension) {
      const scale = maxDimension / largest;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('تعذر تجهيز الصورة للرفع');
    ctx.drawImage(image, 0, 0, width, height);

    const qualities = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];
    let output: Blob | null = null;
    for (const quality of qualities) {
      output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (output && output.size <= maxBytes) return output;
    }
    return output || file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function buildAttachmentPayloads(
  files: File[],
  onSummary: (items: AttachmentSummary[]) => void,
  onProgress: (progress: number) => void,
) {
  const summaries: AttachmentSummary[] = files.map((file) => ({
    name: file.name,
    originalSize: file.size,
    status: 'queued',
  }));
  onSummary(summaries);
  const payload: Array<{ filename: string; contentType: string; base64Content: string }> = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    summaries[index] = { ...summaries[index], status: 'processing' };
    onSummary([...summaries]);

    let blob: Blob = file;
    const isImage = String(file.type || '').startsWith('image/');
    if (isImage) {
      blob = await compressImageFile(file);
    } else if (file.size > 700 * 1024) {
      summaries[index] = { ...summaries[index], status: 'error', message: 'الملف غير الصوري يتجاوز الحد المسموح (700 ك.ب)' };
      onSummary([...summaries]);
      throw new Error(`الملف ${file.name} كبير جدًا. ارفع نسخة أصغر أو صورة بدقة أقل.`);
    }

    const dataUrl = await readBlobAsDataUrl(blob);
    const base64Content = dataUrl.split(',')[1] || '';
    payload.push({
      filename: file.name,
      contentType: blob.type || file.type || 'application/octet-stream',
      base64Content,
    });

    summaries[index] = { ...summaries[index], status: 'ready', finalSize: blob.size };
    onSummary([...summaries]);
    onProgress(Math.round(((index + 1) / Math.max(files.length, 1)) * 100));
  }

  const estimatedBytes = payload.reduce((total, item) => total + item.base64Content.length, 0);
  if (estimatedBytes > 3_300_000) {
    throw new Error('حجم المرفقات بعد الضغط ما زال كبيرًا. خفف عدد الصور أو أعد رفع صور أقل حجمًا.');
  }

  return payload;
}

function postJsonWithProgress(url: string, body: unknown, onProgress: (progress: number) => void) {
  return new Promise<{ status: number; responseText: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(100, Math.max(1, Math.round((event.loaded / event.total) * 100))));
    };
    xhr.onload = () => resolve({ status: xhr.status, responseText: xhr.responseText || '' });
    xhr.onerror = () => reject(new Error('تعذر إرسال الطلب إلى الخادم'));
    xhr.send(JSON.stringify(body));
  });
}


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
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<{type:'success'|'error'; message:string}|null>(null);
  const [uploadStage, setUploadStage] = useState<'idle'|'preparing'|'uploading'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentSummaries, setAttachmentSummaries] = useState<AttachmentSummary[]>([]);

  const canManage = user?.role === 'manager';
  const requestedType = (searchParams.get('type') || '').toUpperCase() as SuggestionType;
  const isCreateMode = searchParams.get('new') === '1';
  const activeType: SuggestionType = ['MAINTENANCE','CLEANING','PURCHASE','OTHER'].includes(requestedType) ? requestedType : 'OTHER';

  async function fetchRows() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (requestedType && ['MAINTENANCE','CLEANING','PURCHASE','OTHER'].includes(requestedType)) {
        params.set('type', activeType);
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/suggestions${query}`, { cache: 'no-store' });
      const data = await res.json();
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch { setRows([]); } finally { setLoading(false); }
  }
  useEffect(() => { fetchRows(); }, [searchParams.toString()]);
  useEffect(() => { if (!selected) { setAdminNotes(''); return; } setAdminNotes(parseAdminNotes((selected as any).adminNotes).note || ''); }, [selected]);

  const stats = useMemo(() => ({ total: rows.length, pending: rows.filter((r)=>r.status==='PENDING' || r.status==='UNDER_REVIEW').length, approved: rows.filter((r)=>r.status==='APPROVED'||r.status==='IMPLEMENTED').length, rejected: rows.filter((r)=>r.status==='REJECTED').length }), [rows]);
  const filteredRows = useMemo(() => { const q=normalizeArabic(search); return rows.filter((row)=>{ const type=resolveType(row); const haystack=normalizeArabic([row.code,row.title,row.description,row.requester?.fullName,row.requester?.department,row.itemName,row.location,row.requestSource,typeMeta(type).label,statusMeta(row.status).label].filter(Boolean).join(' ')); return q ? haystack.includes(q) : true; }); }, [rows, search]);
  const pendingRows = useMemo(() => filteredRows.filter((r)=>r.status==='PENDING' || r.status==='UNDER_REVIEW'), [filteredRows]);
  const processedRows = useMemo(() => filteredRows.filter((r)=>!(r.status==='PENDING' || r.status==='UNDER_REVIEW')), [filteredRows]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((prev) => ({ ...prev, [key]: value })); }
  function toggleServiceItem(item: string) {
    setForm((prev) => ({
      ...prev,
      serviceItems: prev.serviceItems.includes(item)
        ? prev.serviceItems.filter((entry) => entry !== item)
        : [...prev.serviceItems, item],
    }));
  }

  function resolveSelectedServiceItems() {
    const customLines = form.customServiceItems
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const baseItems = form.serviceItems.filter((item) => item !== 'أخرى');
    const extraItems = form.serviceItems.includes('أخرى') ? customLines : [];
    return [...baseItems, ...extraItems];
  }
  function resetCreateState() { setForm(DEFAULT_FORM); setAttachments([]); setFeedback(null); setUploadStage('idle'); setUploadProgress(0); setAttachmentSummaries([]); }
  async function fileToAttachmentPayload(file: File) { const buffer = await file.arrayBuffer(); let binary=''; const bytes=new Uint8Array(buffer); const chunkSize=0x8000; for (let i=0;i<bytes.length;i+=chunkSize) { const chunk=bytes.subarray(i,i+chunkSize); binary += String.fromCharCode(...chunk); } return { filename:file.name, contentType:file.type || 'application/octet-stream', base64Content:btoa(binary) }; }
  function closeCreateMode() { resetCreateState(); router.replace('/services/suggestions'); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setUploadProgress(0);

    const selectedServiceItems = resolveSelectedServiceItems();
    const areaName = selectedServiceItems.join('، ');
    const quantityValue = Math.max(1, Number(form.quantity || 1));
    const requestSource = form.scope === 'PROGRAM' ? `مرتبط ببرنامج تدريبي${form.programName ? ` | اسم البرنامج: ${form.programName}` : ''}` : 'مرتبط بملاحظة عامة في المبنى';
    let title = buildPageTitle(activeType);
    const description = form.issueSummary.trim();
    let itemName = '';
    const location = form.location.trim();
    let externalRecipient = buildDefaultRecipient(activeType);

    if (activeType === 'MAINTENANCE' || activeType === 'CLEANING') {
      itemName = areaName;
      if (!selectedServiceItems.length) {
        setFeedback({ type:'error', message:'اختر بند خدمة واحدًا على الأقل.' });
        return;
      }
      if (!description) {
        setFeedback({ type:'error', message:`أكمل حقول ${activeType === 'MAINTENANCE' ? 'طلب الصيانة' : 'طلب النظافة'} المطلوبة` });
        return;
      }
    }
    if (activeType === 'PURCHASE') {
      title = 'طلب شراء مباشر';
      itemName = form.itemName.trim();
      if (!itemName || !description) {
        setFeedback({ type:'error', message:'أكمل حقول طلب الشراء المباشر المطلوبة' });
        return;
      }
    }
    if (activeType === 'OTHER') {
      title = form.otherTitle.trim() || 'طلب آخر';
      if (!title || !description) {
        setFeedback({ type:'error', message:'أكمل حقول الطلب الآخر المطلوبة' });
        return;
      }
      externalRecipient = form.otherRecipient.trim();
    }

    setSubmitting(true);
    try {
      setUploadStage('preparing');
      const attachmentPayload = await buildAttachmentPayloads(attachments, setAttachmentSummaries, setUploadProgress);

      setUploadStage('uploading');
      setUploadProgress(0);
      const payload = {
        category: activeType,
        title,
        description,
        itemName,
        quantity: quantityValue,
        location,
        externalRecipient,
        requestSource,
        programName: form.programName.trim(),
        area: areaName,
        serviceItems: selectedServiceItems,
        attachments: attachmentPayload,
      };

      const res = await postJsonWithProgress('/api/suggestions', payload, setUploadProgress);
      const data = res.responseText ? JSON.parse(res.responseText) : {};
      if (res.status < 200 || res.status >= 300) {
        const message = data?.error || (res.status === 413 ? 'حجم المرفقات كبير جدًا. خفف عدد الصور أو استخدم صورًا أصغر.' : 'تعذر حفظ الطلب');
        setFeedback({ type:'error', message });
        return;
      }

      setFeedback({ type:'success', message:'تم رفع الطلب بنجاح وإحالته إلى المدير للمراجعة' });
      resetCreateState();
      router.replace('/services/suggestions');
      await fetchRows();
    } catch (error: any) {
      setFeedback({ type:'error', message: error?.message || 'تعذر حفظ الطلب' });
    } finally {
      setSubmitting(false);
      setUploadStage('idle');
      setUploadProgress(0);
    }
  }

  async function handleDecision(action: 'approve' | 'reject') {
    if (!selected) return; setFeedback(null); setProcessing(true);
    try {
      const targetDepartment = resolveType(selected) === 'PURCHASE' ? 'FINANCE' : resolveType(selected) === 'OTHER' ? 'OTHER' : 'SUPPORT_SERVICES';
      const res = await fetch('/api/suggestions', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ suggestionId:selected.id, action, adminNotes, targetDepartment }) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) { setFeedback({ type:'error', message: data?.error || 'تعذر معالجة الطلب' }); return; }
      setFeedback({ type:'success', message: action === 'approve' ? 'تم اعتماد الطلب بنجاح وإنشاء مسودة المراسلة الخارجية' : 'تم رفض الطلب' });
      setSelected(null); await fetchRows();
    } finally { setProcessing(false); }
  }

  function ServiceButtons() {
    const items: Array<{type:SuggestionType; label:string}> = [
      {type:'MAINTENANCE', label:'طلب صيانة'}, {type:'CLEANING', label:'طلب نظافة'}, {type:'PURCHASE', label:'شراء مباشر'}, {type:'OTHER', label:'طلب آخر'}
    ];
    return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{items.map((item)=><Button key={item.type} variant={activeType===item.type && isCreateMode ? 'primary' : 'ghost'} className="w-full" onClick={()=>router.push(`/services/suggestions?type=${item.type}&new=1`)}>{item.label}</Button>)}</div>;
  }


  const managerHeading = canManage
    ? activeType === 'MAINTENANCE'
      ? 'طلبات الصيانة المرفوعة'
      : activeType === 'CLEANING'
      ? 'طلبات النظافة المرفوعة'
      : activeType === 'PURCHASE'
      ? 'طلبات الشراء المباشر المرفوعة'
      : activeType === 'OTHER'
      ? 'الطلبات الأخرى المرفوعة'
      : 'الطلبات المرفوعة'
    : 'الطلبات المرفوعة';

  const managerDescription = canManage
    ? activeType === 'MAINTENANCE'
      ? 'متابعة واعتماد طلبات الصيانة وربطها بالمراسلات الخارجية.'
      : activeType === 'CLEANING'
      ? 'متابعة واعتماد طلبات النظافة وربطها بالمراسلات الخارجية.'
      : activeType === 'PURCHASE'
      ? 'متابعة واعتماد طلبات الشراء المباشر وربطها بالمراسلات الخارجية.'
      : activeType === 'OTHER'
      ? 'متابعة واعتماد الطلبات الأخرى وربطها بالمراسلات الخارجية.'
      : 'متابعة طلبات الصيانة، النظافة، الشراء المباشر، والطلبات الأخرى بعد رفعها.'
    : 'متابعة طلبات الصيانة، النظافة، الشراء المباشر، والطلبات الأخرى بعد رفعها.';

  function renderRow(row: SuggestionRow) {
    const type = resolveType(row); const typeBadge = typeMeta(type); const statusBadge = statusMeta(row.status);
    return <Card key={row.id} className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 space-y-3"><div className="flex flex-wrap items-center gap-2"><div className="font-mono text-sm font-bold text-[#016564]">{row.code || row.id}</div><Badge variant={typeBadge.variant}>{typeBadge.label}</Badge><Badge variant={statusBadge.variant}>{statusBadge.label}</Badge></div><div className="break-words text-[15px] font-bold leading-7 text-[#152625] sm:text-base">{row.title}</div>{row.description ? <div className="break-words text-sm leading-7 text-[#304342]">{row.description}</div> : null}<div className="grid gap-2 text-[12px] text-[#61706f] sm:grid-cols-2 sm:text-xs"><div>التاريخ: {formatDateTime(row.createdAt)}</div><div className="break-words">مقدم الطلب: {row.requester?.fullName || '—'}</div></div></div><div className="flex w-full flex-col gap-2 sm:w-auto"><Button className="w-full sm:w-auto" onClick={()=>setSelected(row)}>فتح التفاصيل</Button>{row.linkedDraftId && canManage ? <Button variant="ghost" className="w-full sm:w-auto" onClick={()=>router.push('/services/email-drafts')}>فتح المراسلات</Button> : null}</div></div></Card>;
  }

  return <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2"><h2 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">{managerHeading}</h2><p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">{managerDescription}</p></div>
          {!canManage ? <Button className="w-full sm:w-auto" onClick={()=>router.push('/services/suggestions?new=1&type=MAINTENANCE')}>طلب جديد</Button> : null}
        </div>
        {!canManage ? <div className="mt-4"><ServiceButtons /></div> : null}
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4"><Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">إجمالي الطلبات</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564]">{stats.total}</div></Card><Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">بانتظار المدير</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#d0b284]">{stats.pending}</div></Card><Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">المعالجة</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#498983]">{stats.approved}</div></Card><Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none"><div className="text-[12px] text-[#6f7b7a]">المرفوضة</div><div className="mt-1 text-[22px] font-extrabold leading-none text-[#7c1e3e]">{stats.rejected}</div></Card></div>
      </section>
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5"><Input label="بحث" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="ابحث برقم الطلب أو العنوان أو اسم مقدم الطلب" /></section>
      {canManage ? <section className="grid gap-6 xl:grid-cols-2 xl:items-start"><div><div className="mb-3 text-lg font-bold text-[#016564]">طلبات تحتاج اعتماد</div><div className="space-y-3">{loading ? [1,2].map((i)=><Skeleton key={i} className="h-32 w-full rounded-[24px]" />) : pendingRows.length ? pendingRows.map(renderRow) : <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد طلبات بانتظار الاعتماد</Card>}</div></div><div><div className="mb-3 text-lg font-bold text-[#016564]">طلبات تمت معالجتها</div><div className="space-y-3">{loading ? [1,2].map((i)=><Skeleton key={`processed-${i}`} className="h-32 w-full rounded-[24px]" />) : processedRows.length ? processedRows.map(renderRow) : <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد طلبات معالجة</Card>}</div></div></section> : <section className="space-y-3">{loading ? [1,2,3].map((i)=><Skeleton key={i} className="h-32 w-full rounded-[24px]" />) : filteredRows.length ? filteredRows.map(renderRow) : <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد طلبات مطابقة</Card>}</section>}
      <Modal isOpen={isCreateMode} onClose={closeCreateMode} title={buildPageTitle(activeType)} size="2xl" bodyClassName="overflow-visible">
        <form onSubmit={handleCreate} className="space-y-4">
          {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type==='error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{feedback.message}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><label className="block text-sm font-semibold text-slate-700">مصدر الحاجة</label><select value={form.scope} onChange={(e)=>updateForm('scope', e.target.value as RequestScope)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"><option value="BUILDING">مرتبط بملاحظة عامة في المبنى</option><option value="PROGRAM">مرتبط ببرنامج تدريبي</option></select></div>
            <Input label="الموقع" value={form.location} onChange={(e)=>updateForm('location', e.target.value)} placeholder="مثال: القاعة 3 أو الممر الغربي" />
          </div>
          {form.scope === 'PROGRAM' ? <Input label="اسم البرنامج التدريبي (إن وجد)" value={form.programName} onChange={(e)=>updateForm('programName', e.target.value)} placeholder="اكتب اسم البرنامج" /> : null}
          {(activeType==='MAINTENANCE' || activeType==='CLEANING') ? <div className="space-y-3"><div className="space-y-2"><label className="block text-sm font-semibold text-slate-700">{activeType==='MAINTENANCE' ? 'البنود المطلوبة' : 'بنود النظافة المطلوبة'}</label><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(activeType==='MAINTENANCE' ? MAINTENANCE_PARTS : CLEANING_AREAS).map((option)=><label key={option} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"><span>{option}</span><input type="checkbox" checked={form.serviceItems.includes(option)} onChange={()=>toggleServiceItem(option)} className="h-4 w-4 rounded border-slate-300 text-[#016564] focus:ring-[#016564]" /></label>)}</div></div>{form.serviceItems.includes('أخرى') ? <div className="space-y-2"><label className="block text-sm font-semibold text-slate-700">بنود إضافية (كل بند في سطر مستقل)</label><textarea value={form.customServiceItems} onChange={(e)=>updateForm('customServiceItems', e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10" placeholder="مثال:
صيانة مقابض الأبواب
معالجة تسرب بسيط قرب النافذة" /></div> : null}</div> : null}
          {activeType==='PURCHASE' ? <div className="grid gap-3 sm:grid-cols-2"><Input label="الصنف المطلوب" value={form.itemName} onChange={(e)=>updateForm('itemName', e.target.value)} placeholder="اكتب اسم الصنف المطلوب" /><Input label="الكمية" type="number" min="1" value={form.quantity} onChange={(e)=>updateForm('quantity', e.target.value)} placeholder="1" /></div> : null}
          {activeType==='OTHER' ? <div className="grid gap-3 sm:grid-cols-2"><Input label="عنوان الطلب" value={form.otherTitle} onChange={(e)=>updateForm('otherTitle', e.target.value)} placeholder="مثال: طلب معالجة تشغيلية أخرى" /><Input label="الجهة المقترحة مبدئيًا (اختياري)" value={form.otherRecipient} onChange={(e)=>updateForm('otherRecipient', e.target.value)} placeholder="يترك فارغًا إذا كان المدير سيحدده" /></div> : null}
          <div className="space-y-2"><label className="block text-sm font-semibold text-slate-700">سبب الطلب أو الملاحظة</label><textarea value={form.issueSummary} onChange={(e)=>updateForm('issueSummary', e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10" placeholder="اكتب وصفًا واضحًا ومباشرًا" /></div>
          <div className="space-y-3"><label className="block text-sm font-semibold text-slate-700">المرفقات (اختياري)</label><input type="file" accept="image/*,.pdf" multiple onChange={(e)=>{ const files = Array.from(e.target.files || []); setAttachments(files); setAttachmentSummaries(files.map((file) => ({ name: file.name, originalSize: file.size, status: 'queued' as const }))); setUploadStage('idle'); setUploadProgress(0); }} className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" />{attachments.length>0 ? <div className="space-y-3 rounded-2xl border border-[#e7ebea] bg-[#f8fbfb] px-4 py-3 text-sm text-[#304342]"><div className="font-semibold text-[#016564]">الملفات المختارة ({attachments.length})</div><div className="space-y-2">{attachmentSummaries.map((item, index) => <div key={`${item.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e7ebea] bg-white px-3 py-2"><div className="min-w-0 flex-1 truncate">{item.name}</div><div className="text-xs text-[#61706f]">{item.finalSize ? `${formatBytes(item.originalSize)} ← ${formatBytes(item.finalSize)}` : formatBytes(item.originalSize)}</div><div className={`text-xs font-bold ${item.status==='error' ? 'text-red-600' : item.status==='ready' ? 'text-emerald-700' : item.status==='processing' ? 'text-[#016564]' : 'text-[#8a6a28]'}`}>{item.status==='error' ? (item.message || 'فشل') : item.status==='ready' ? 'جاهز للرفع' : item.status==='processing' ? 'جاري التجهيز' : 'بانتظار التجهيز'}</div></div>)}</div>{(submitting || uploadStage !== 'idle') ? <div className="space-y-2"><div className="flex items-center justify-between text-xs font-semibold text-[#016564]"><span>{uploadStage==='preparing' ? 'جاري تجهيز وضغط المرفقات' : 'جاري رفع الطلب إلى الخادم'}</span><span>{uploadProgress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#d6e6e5]"><div className="h-full rounded-full bg-[#016564] transition-all" style={{ width: `${uploadProgress}%` }} /></div></div> : <div className="text-xs text-[#61706f]">سيتم ضغط الصور تلقائيًا قبل الرفع لتفادي فشل الحفظ.</div>}</div> : null}</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={closeCreateMode} className="w-full sm:w-auto">إلغاء</Button><Button type="submit" loading={submitting} className="w-full sm:w-auto">إرسال الطلب</Button></div>
        </form>
      </Modal>
      <Modal isOpen={!!selected} onClose={()=>setSelected(null)} title={selected ? `تفاصيل الطلب ${selected.code || ''}` : 'تفاصيل الطلب'} size="full" bodyClassName="overflow-visible">
        {selected ? <div className="space-y-5">{feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type==='error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{feedback.message}</div> : null}
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4 rounded-[22px] border border-[#e7ebea] bg-white p-4 sm:p-5">
              <div className="text-sm font-extrabold text-[#016564]">بيانات الطلب الأساسية</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['الرمز', selected.code || selected.id],
                  ['النوع', typeMeta(resolveType(selected)).label],
                  ['الحالة', statusMeta(selected.status).label],
                  ['التاريخ', formatDateTime(selected.createdAt)],
                  ['العنوان', selected.title],
                  ['الوصف', selected.description || '—'],
                  ['مقدم الطلب', selected.requester?.fullName || '—'],
                  ['الإدارة', 'إدارة عمليات التدريب'],
                  ['البريد الإلكتروني', selected.requester?.email || '—'],
                  ['الجوال', selected.requester?.mobile || '—'],
                  ['رقم التحويلة', selected.requester?.extension || '—'],
                  ['الموقع', selected.location || '—'],
                  ['العنصر المطلوب', selected.itemName || selected.area || '—'],
                  ['البنود المحددة', Array.isArray((selected as any).serviceItems) && (selected as any).serviceItems.length ? (selected as any).serviceItems.join('، ') : '—'],
                  ['مصدر الحاجة', selected.requestSource || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[18px] border border-[#e7ebea] bg-[#f8fbfb] px-4 py-3">
                    <div className="text-xs font-bold text-[#016564]">{label}</div>
                    <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{value || '—'}</div>
                  </div>
                ))}
                <div className="rounded-[18px] border border-[#e7ebea] bg-[#f8fbfb] px-4 py-3 sm:col-span-2">
                  <div className="text-xs font-bold text-[#016564]">المرفقات المرفوعة</div>
                  <div className="mt-2 space-y-2 text-sm leading-7 text-[#304342]">{Array.isArray(selected.attachments) && selected.attachments.length ? selected.attachments.map((attachment, index)=><div key={`${attachment.filename || attachment.name || 'attachment'}-${index}`} className="flex flex-wrap items-center gap-2"><span>{attachment.name}</span>{attachment.url ? <a href={attachment.url} target="_blank" rel="noreferrer" className="text-[#016564] underline">معاينة</a> : null}</div>) : 'لا توجد مرفقات'}</div>
                </div>
              </div>
            </div>
            <div className="space-y-3 rounded-[22px] border border-[#e7ebea] bg-[#f8fbfb] p-4 sm:p-5">
              <div className="text-sm font-extrabold text-[#016564]">قرار المدير</div>
              <textarea value={adminNotes} onChange={(e)=>setAdminNotes(e.target.value)} rows={8} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10" placeholder="اكتب ملاحظة القرار أو التوجيه" />
              {canManage && (selected.status==='PENDING' || selected.status==='UNDER_REVIEW') ? <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="danger" className="w-full sm:w-auto" loading={processing} onClick={()=>handleDecision('reject')}>رفض الطلب</Button><Button className="w-full sm:w-auto" loading={processing} onClick={()=>handleDecision('approve')}>اعتماد الطلب</Button></div> : null}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{selected.linkedDraftId && canManage ? <Button className="w-full sm:w-auto" onClick={()=>router.push('/services/email-drafts')}>فتح المراسلات الخارجية</Button> : null}<Button variant="ghost" onClick={()=>setSelected(null)} className="w-full sm:w-auto">إغلاق</Button></div>
        </div> : null}
      </Modal>
    </div>;
}
