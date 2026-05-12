'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
type UploadStage = 'idle' | 'preparing' | 'uploading';

type AttachmentSummary = {
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  compressed?: boolean;
  compressedSize?: number;
};

type AttachmentPayload = {
  filename: string;
  contentType: string;
  base64Content: string;
  originalSize: number;
  compressedSize: number;
};

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
  attachmentsRemovedAt?: string | null;
  attachmentsRemovedReason?: string | null;
  attachmentsRemovedCount?: number;
  attachmentsRemovedSummary?: Array<{ name?: string; filename?: string; contentType?: string }>;
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
const MAX_ATTACHMENTS = 8;
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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('تعذر قراءة المرفق'));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressImageFile(file: File, maxDimension = 1600, maxBytes = 350 * 1024) {
  if (!file.type.startsWith('image/') || file.size <= maxBytes) return file;

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('تعذر تجهيز الصورة'));
      img.src = imageUrl;
    });

    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = 0.82;
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);

    while (blob && blob.size > maxBytes && quality > 0.45) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg') || 'attachment.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function buildAttachmentPayloads(
  files: File[],
  onPrepared: (index: number, info: Pick<AttachmentSummary, 'compressed' | 'compressedSize' | 'type'>) => void,
  onProgress: (progress: number) => void
) {
  const payloads: AttachmentPayload[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const preparedFile = await compressImageFile(file);
    const dataUrl = await readBlobAsDataUrl(preparedFile);
    const base64Content = dataUrl.split(',')[1] || '';

    if (!base64Content) {
      throw new Error('تعذر تجهيز أحد المرفقات. احذف المرفق وحاول مرة أخرى.');
    }

    onPrepared(index, {
      compressed: preparedFile.size < file.size,
      compressedSize: preparedFile.size,
      type: preparedFile.type || file.type || 'application/octet-stream',
    });
    onProgress(Math.round(((index + 1) / files.length) * 45));

    payloads.push({
      filename: file.name,
      contentType: preparedFile.type || file.type || 'application/octet-stream',
      base64Content,
      originalSize: file.size,
      compressedSize: preparedFile.size,
    });
  }

  return payloads;
}

function postJsonWithProgress<T>(url: string, body: unknown, onProgress: (progress: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(45 + Math.round((event.loaded / event.total) * 55));
    };
    xhr.onload = () => {
      let response: any = {};
      try {
        response = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        response = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response as T);
      } else {
        reject(new Error(response?.error || 'تعذر حفظ الطلب'));
      }
    };
    xhr.onerror = () => reject(new Error('تعذر الاتصال بالخادم أثناء حفظ الطلب'));
    xhr.send(JSON.stringify(body));
  });
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
  const openId = String(searchParams.get('open') || '').trim();
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentSummaries, setAttachmentSummaries] = useState<AttachmentSummary[]>([]);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlsRef = useRef<string[]>([]);

  async function fetchRows() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type,
        scope: 'active',
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (openId) params.set('open', openId);
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
  }, [type, page, openId]);

  useEffect(() => {
    if (!openId || loading) return;
    const match = rows.find((row) => row.id === openId);
    if (match && selected?.id !== match.id) {
      setSelected(match);
    }
  }, [openId, loading, rows, selected?.id]);

  useEffect(() => {
    setAdminNotes(selected ? parseAdminNotes(selected.adminNotes).note : '');
  }, [selected]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);

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

  function makeAttachmentSummary(file: File): AttachmentSummary {
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    if (previewUrl) previewUrlsRef.current.push(previewUrl);

    return {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      previewUrl,
    };
  }

  function revokePreviewUrl(url?: string) {
    if (!url) return;
    URL.revokeObjectURL(url);
    previewUrlsRef.current = previewUrlsRef.current.filter((item) => item !== url);
  }

  function resetAttachments() {
    attachmentSummaries.forEach((summary) => revokePreviewUrl(summary.previewUrl));
    setAttachments([]);
    setAttachmentSummaries([]);
    setUploadStage('idle');
    setUploadProgress(0);
  }

  function handleAttachmentFiles(fileList: FileList | null) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const accepted = files.filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf');
    if (!accepted.length) {
      setFeedback({ type: 'error', message: 'المرفقات المدعومة حاليًا هي الصور وملفات PDF الصغيرة فقط.' });
      return;
    }

    const availableSlots = MAX_ATTACHMENTS - attachments.length;
    if (availableSlots <= 0) {
      setFeedback({ type: 'error', message: `يمكن إرفاق ${MAX_ATTACHMENTS} ملفات كحد أقصى لكل طلب.` });
      return;
    }

    const selectedFiles = accepted.slice(0, availableSlots);
    if (accepted.length > availableSlots) {
      setFeedback({ type: 'error', message: `تمت إضافة ${availableSlots} مرفقات فقط للوصول إلى الحد الأعلى.` });
    }

    setAttachments((prev) => [...prev, ...selectedFiles]);
    setAttachmentSummaries((prev) => [...prev, ...selectedFiles.map(makeAttachmentSummary)]);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setAttachmentSummaries((prev) => {
      const removed = prev[index];
      revokePreviewUrl(removed?.previewUrl);
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function updatePreparedAttachment(index: number, info: Pick<AttachmentSummary, 'compressed' | 'compressedSize' | 'type'>) {
    setAttachmentSummaries((prev) => prev.map((summary, itemIndex) => (
      itemIndex === index ? { ...summary, ...info } : summary
    )));
  }

  function closeCreateMode() {
    setForm(DEFAULT_FORM);
    setFeedback(null);
    resetAttachments();
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
    setUploadStage(attachments.length ? 'preparing' : 'idle');
    setUploadProgress(attachments.length ? 5 : 0);
    try {
      const attachmentPayloads = attachments.length
        ? await buildAttachmentPayloads(attachments, updatePreparedAttachment, setUploadProgress)
        : [];
      if (attachmentPayloads.length) {
        setUploadStage('uploading');
        setUploadProgress(65);
      }

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
          attachments: attachmentPayloads,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'error', message: data?.error || 'تعذر حفظ الطلب' });
        return;
      }
      closeCreateMode();
      await fetchRows();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error?.message || 'تعذر حفظ الطلب' });
    } finally {
      setSubmitting(false);
      setUploadStage('idle');
      setUploadProgress(0);
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
          <div className="rounded-[22px] border border-slate-200 bg-[#f8fbfb] p-4">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(event) => {
                handleAttachmentFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                handleAttachmentFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-extrabold text-[#016564]">توثيق الطلب بالصور</div>
                <div className="mt-1 text-xs leading-6 text-[#61706f]">المرفقات مؤقتة، وتُحذف تلقائيًا بعد تنزيل مسودة البريد أو بعد 10 أيام.</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="ghost" onClick={() => cameraInputRef.current?.click()}>التقاط صورة</Button>
                <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>إرفاق من الملفات</Button>
              </div>
            </div>
            {attachmentSummaries.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {attachmentSummaries.map((summary, index) => (
                  <div key={`${summary.name}-${index}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                    {summary.previewUrl ? <img src={summary.previewUrl} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">PDF</div>}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-800">{summary.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatBytes(summary.compressedSize || summary.size)}{summary.compressed ? ` بعد الضغط من ${formatBytes(summary.size)}` : ''}</div>
                      <button type="button" onClick={() => removeAttachment(index)} className="mt-2 text-xs font-bold text-red-600">حذف المرفق</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-[#61706f]">يمكنك إضافة صور للمشكلة مباشرة من الكاميرا أو من الملفات قبل إرسال الطلب.</div>
            )}
            {uploadStage !== 'idle' ? (
              <div className="mt-4">
                <div className="mb-2 text-xs font-bold text-[#016564]">{uploadStage === 'preparing' ? 'جاري تجهيز وضغط المرفقات...' : 'جاري إرسال الطلب...'}</div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#016564] transition-all" style={{ width: `${Math.min(100, Math.max(5, uploadProgress))}%` }} />
                </div>
              </div>
            ) : null}
          </div>
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

                <div className="rounded-[18px] border border-[#e7ebea] bg-[#f8fbfb] px-4 py-4">
                  <div className="text-xs font-bold text-[#016564]">المرفقات المرفوعة</div>
                  {selected.attachments?.length ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {selected.attachments.map((attachment, index) => (
                        <div key={`${attachment.filename || attachment.name || 'attachment'}-${index}`} className="rounded-[18px] border border-[#dfe7e6] bg-white px-4 py-3">
                          <div className="text-sm font-bold leading-6 text-[#152625]">{attachment.name || `مرفق ${index + 1}`}</div>
                          <div className="mt-1 break-words text-xs leading-6 text-[#61706f]">{attachment.filename || 'ملف مرفق'}</div>
                          {attachment.contentType ? <div className="mt-1 text-[11px] text-[#8b9897]">{attachment.contentType}</div> : null}
                          {attachment.url ? (
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-[#016564] px-4 text-sm font-bold text-white transition hover:bg-[#014b4a]"
                              >
                                عرض المرفق
                              </a>
                              <a
                                href={attachment.url}
                                download={attachment.filename || `attachment-${index + 1}`}
                                className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#d6d7d4] bg-white px-4 text-sm font-bold text-[#425554] transition hover:border-[#016564]/30 hover:text-[#016564]"
                              >
                                تنزيل
                              </a>
                            </div>
                          ) : (
                            <div className="mt-3 text-xs text-[#8b9897]">المرفق محفوظ بدون رابط عرض مباشر.</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : selected.attachmentsRemovedCount ? (
                    <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
                      تم حذف {selected.attachmentsRemovedCount} مرفقات مؤقتة من قاعدة البيانات بعد انتهاء الحاجة لها. بقي ملخص الطلب محفوظًا، ويمكن الاعتماد على مسودة البريد التي تم تنزيلها عند الأرشفة.
                    </div>
                  ) : (
                    <div className="mt-2 text-sm leading-7 text-[#61706f]">لا توجد مرفقات مرفوعة لهذا الطلب.</div>
                  )}
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
