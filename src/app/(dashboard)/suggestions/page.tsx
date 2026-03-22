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
type SuggestionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

type ApiSuggestionRow = {
  id: string;
  title: string;
  description?: string | null;
  justification?: string | null;
  category?: string | null;
  priority?: SuggestionPriority | null;
  requesterId?: string;
  status: SuggestionStatus;
  adminNotes?: string | null;
  createdAt?: string;
  requester?: {
    fullName?: string;
    department?: string;
  } | null;
};

type SuggestionRow = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  type: SuggestionType;
  status: SuggestionStatus;
  priority?: SuggestionPriority | null;
  createdAt?: string;
  requesterId?: string;
  requester?: {
    fullName?: string;
    department?: string;
  } | null;
  location?: string | null;
  relatedItemName?: string | null;
  quantity?: number | null;
  justificationText?: string | null;
  targetDepartment?: string | null;
  externalRecipient?: string | null;
  adminNotesText?: string | null;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  linkedCode?: string | null;
};

type CreateFormState = {
  category: SuggestionType;
  title: string;
  description: string;
  justification: string;
  itemName: string;
  quantity: string;
  location: string;
  targetDepartment: string;
  externalRecipient: string;
  priority: SuggestionPriority;
  estimatedValue: string;
};

type ManagerDecisionState = {
  action: 'approve' | 'reject';
  adminNotes: string;
  targetDepartment: string;
  estimatedValue: string;
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

function normalizeType(value?: string | null): SuggestionType {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'MAINTENANCE') return 'MAINTENANCE';
  if (raw === 'CLEANING') return 'CLEANING';
  if (raw === 'PURCHASE') return 'PURCHASE';
  return 'OTHER';
}

function typeMeta(type: SuggestionType) {
  if (type === 'MAINTENANCE') return { label: 'صيانة', variant: 'danger' as const };
  if (type === 'CLEANING') return { label: 'نظافة', variant: 'info' as const };
  if (type === 'PURCHASE') return { label: 'شراء مباشر', variant: 'warning' as const };
  return { label: 'طلب آخر', variant: 'neutral' as const };
}

function statusMeta(status: SuggestionStatus) {
  if (status === 'PENDING') return { label: 'معلق', variant: 'warning' as const };
  if (status === 'UNDER_REVIEW') return { label: 'قيد المراجعة', variant: 'info' as const };
  if (status === 'APPROVED') return { label: 'معتمد', variant: 'success' as const };
  if (status === 'REJECTED') return { label: 'مرفوض', variant: 'danger' as const };
  return { label: 'تمت المعالجة', variant: 'success' as const };
}

function priorityMeta(priority?: SuggestionPriority | null) {
  if (priority === 'URGENT') return { label: 'عاجل', variant: 'danger' as const };
  if (priority === 'HIGH') return { label: 'عالٍ', variant: 'warning' as const };
  if (priority === 'NORMAL') return { label: 'متوسط', variant: 'info' as const };
  if (priority === 'LOW') return { label: 'منخفض', variant: 'neutral' as const };
  return null;
}

function suggestionTitleByType(type: SuggestionType) {
  if (type === 'MAINTENANCE') return 'طلب صيانة';
  if (type === 'CLEANING') return 'طلب نظافة';
  if (type === 'PURCHASE') return 'طلب شراء مباشر';
  return 'طلب آخر';
}

function defaultTargetDepartment(type: SuggestionType) {
  if (type === 'MAINTENANCE') return 'SUPPORT_SERVICES';
  if (type === 'CLEANING') return 'SUPPORT_SERVICES';
  if (type === 'PURCHASE') return 'PROCUREMENT';
  return 'SUPPORT_SERVICES';
}

function parseJsonObject(value?: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function buildDisplayCode(id: string, type: SuggestionType) {
  const prefix =
    type === 'MAINTENANCE'
      ? 'MNT'
      : type === 'CLEANING'
      ? 'CLN'
      : type === 'PURCHASE'
      ? 'PUR'
      : 'OTH';

  return `${prefix}-${id.slice(-6).toUpperCase()}`;
}

function mapApiRow(row: ApiSuggestionRow): SuggestionRow {
  const type = normalizeType(row.category);
  const justificationData = parseJsonObject(row.justification);
  const adminNotesData = parseJsonObject(row.adminNotes);

  return {
    id: row.id,
    code: buildDisplayCode(row.id, type),
    title: row.title || suggestionTitleByType(type),
    description: row.description || '',
    type,
    status: row.status,
    priority: row.priority || 'NORMAL',
    createdAt: row.createdAt,
    requesterId: row.requesterId,
    requester: row.requester || null,
    location: String(justificationData.location || '').trim() || null,
    relatedItemName: String(justificationData.itemName || '').trim() || null,
    quantity: Number(justificationData.quantity || 0) || null,
    justificationText: String(justificationData.rawJustification || '').trim() || null,
    targetDepartment: String(justificationData.targetDepartment || adminNotesData.targetDepartment || '').trim() || null,
    externalRecipient: String(justificationData.externalRecipient || '').trim() || null,
    adminNotesText: String(adminNotesData.adminNotes || row.adminNotes || '').trim() || null,
    linkedEntityType: String(adminNotesData.linkedEntityType || '').trim() || null,
    linkedEntityId: String(adminNotesData.linkedEntityId || '').trim() || null,
    linkedCode: String(adminNotesData.linkedCode || '').trim() || null,
  };
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
      />
    </div>
  );
}

function FormShell({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/45 px-0 py-0 sm:px-4 sm:py-6">
      <div className="mx-auto flex h-full items-center justify-center">
        <div className="flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-[1080px] sm:rounded-[28px] sm:border sm:border-[#d6d7d4]">
          <div className="flex items-start justify-between gap-3 border-b border-[#eceeed] px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold text-[#016564] sm:text-xl">{title}</h2>
              <p className="mt-1 text-[11px] text-[#6f7b7a] sm:text-xs">
                مسار موحد لطلبات الصيانة والنظافة والشراء المباشر والطلبات الأخرى.
              </p>
            </div>

            <Button type="button" variant="ghost" onClick={onClose} className="shrink-0">
              إغلاق
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-5">{children}</div>

          <div className="border-t border-[#eceeed] bg-[#fcfcfc] px-4 py-4 sm:px-6">{footer}</div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM: CreateFormState = {
  category: 'OTHER',
  title: '',
  description: '',
  justification: '',
  itemName: '',
  quantity: '1',
  location: '',
  targetDepartment: defaultTargetDepartment('OTHER'),
  externalRecipient: '',
  priority: 'NORMAL',
  estimatedValue: '',
};

export default function SuggestionsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const role = (user?.role || '').toLowerCase();
  const isEmployee = role === 'user';
  const isManager = role === 'manager';
  const canViewAll = isManager || role === 'warehouse';

  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | SuggestionType>('ALL');
  const [selected, setSelected] = useState<SuggestionRow | null>(null);
  const [pageError, setPageError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createState, setCreateState] = useState<CreateFormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [decisionState, setDecisionState] = useState<ManagerDecisionState>({
    action: 'approve',
    adminNotes: '',
    targetDepartment: defaultTargetDepartment('OTHER'),
    estimatedValue: '',
  });
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    setPageError('');

    try {
      const res = await fetch('/api/suggestions', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setRows([]);
        setPageError(data?.error || 'تعذر جلب الطلبات الأخرى');
        return;
      }

      const normalized = Array.isArray(data?.data) ? data.data.map(mapApiRow) : [];
      setRows(normalized);
    } catch {
      setRows([]);
      setPageError('تعذر جلب الطلبات الأخرى');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    const requestedType = normalizeType(searchParams.get('type'));
    const shouldOpenNew = searchParams.get('new') === '1' && isEmployee;

    if (shouldOpenNew) {
      setCreateState({
        ...EMPTY_FORM,
        category: requestedType,
        title: requestedType === 'OTHER' ? '' : suggestionTitleByType(requestedType),
        targetDepartment: defaultTargetDepartment(requestedType),
      });
      setCreateError('');
      setIsCreateOpen(true);
    }
  }, [searchParams, isEmployee]);

  useEffect(() => {
    if (!selected) {
      setDecisionState({
        action: 'approve',
        adminNotes: '',
        targetDepartment: defaultTargetDepartment('OTHER'),
        estimatedValue: '',
      });
      return;
    }

    setDecisionState({
      action: 'approve',
      adminNotes: selected.adminNotesText || '',
      targetDepartment: selected.targetDepartment || defaultTargetDepartment(selected.type),
      estimatedValue: '',
    });
  }, [selected]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      pending: rows.filter((row) => row.status === 'PENDING').length,
      review: rows.filter((row) => row.status === 'UNDER_REVIEW').length,
      implemented: rows.filter((row) => row.status === 'IMPLEMENTED').length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);

    return rows.filter((row) => {
      const matchesType = typeFilter === 'ALL' ? true : row.type === typeFilter;

      const haystack = normalizeArabic(
        [
          row.code,
          row.title,
          row.description,
          row.location,
          row.relatedItemName,
          row.justificationText,
          row.requester?.fullName,
          row.requester?.department,
          typeMeta(row.type).label,
          statusMeta(row.status).label,
        ]
          .filter(Boolean)
          .join(' ')
      );

      const matchesSearch = q ? haystack.includes(q) : true;
      return matchesType && matchesSearch;
    });
  }, [rows, search, typeFilter]);

  const handleCreateState = <K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) => {
    setCreateState((current) => {
      const next = { ...current, [key]: value };

      if (key === 'category') {
        const category = value as SuggestionType;
        next.title = category === 'OTHER' ? current.title : suggestionTitleByType(category);
        next.targetDepartment = defaultTargetDepartment(category);
      }

      return next;
    });
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setCreateError('');
    router.replace('/suggestions');
  };

  const submitCreate = async () => {
    setCreateError('');

    if (!createState.description.trim() || !createState.justification.trim()) {
      setCreateError('الوصف والمبررات حقول مطلوبة');
      return;
    }

    if (createState.category === 'OTHER' && !createState.title.trim()) {
      setCreateError('عنوان الطلب مطلوب في الطلبات الأخرى');
      return;
    }

    setCreateSubmitting(true);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: createState.category,
          title: createState.category === 'OTHER' ? createState.title.trim() : suggestionTitleByType(createState.category),
          description: createState.description.trim(),
          justification: createState.justification.trim(),
          itemName: createState.itemName.trim(),
          quantity: Number(createState.quantity || 1) || 1,
          location: createState.location.trim(),
          targetDepartment: createState.targetDepartment.trim(),
          externalRecipient: createState.externalRecipient.trim(),
          priority: createState.priority,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCreateError(data?.error || 'تعذر حفظ الطلب');
        return;
      }

      await loadRows();
      closeCreate();
      setCreateState(EMPTY_FORM);
    } catch {
      setCreateError('تعذر حفظ الطلب');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const submitDecision = async () => {
    if (!selected || !isManager) return;

    setDecisionSubmitting(true);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: selected.id,
          action: decisionState.action,
          adminNotes: decisionState.adminNotes.trim(),
          targetDepartment: decisionState.targetDepartment.trim(),
          estimatedValue:
            selected.type === 'PURCHASE' && decisionState.estimatedValue.trim()
              ? Number(decisionState.estimatedValue)
              : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPageError(data?.error || 'تعذر معالجة الطلب');
        return;
      }

      await loadRows();
      setSelected(null);
    } catch {
      setPageError('تعذر معالجة الطلب');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">
              الطلبات الأخرى
            </h1>
            <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
              مسار موحد لطلبات الصيانة، النظافة، الشراء المباشر، والطلبات التشغيلية الأخرى من الموظف حتى المدير.
            </p>
          </div>

          {isEmployee ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setCreateState({
                  ...EMPTY_FORM,
                  title: '',
                  category: 'OTHER',
                  targetDepartment: defaultTargetDepartment('OTHER'),
                });
                setCreateError('');
                setIsCreateOpen(true);
              }}
            >
              طلب جديد
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">إجمالي الطلبات</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.total}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">المعلقة</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#d0b284] sm:text-xl">
              {stats.pending}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">قيد المراجعة</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#498983] sm:text-xl">
              {stats.review}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">تمت المعالجة</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.implemented}
            </div>
          </Card>
        </div>
      </section>

      {pageError ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:rounded-[26px]">
          {pageError}
        </div>
      ) : null}

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px]">
          <Input
            label="بحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="الرمز، العنوان، الوصف، الموقع، أو اسم مقدم الطلب"
          />

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">النوع</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | SuggestionType)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
            >
              <option value="ALL">الكل</option>
              <option value="MAINTENANCE">صيانة</option>
              <option value="CLEANING">نظافة</option>
              <option value="PURCHASE">شراء مباشر</option>
              <option value="OTHER">طلب آخر</option>
            </select>
          </div>
        </div>
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
            لا توجد طلبات مطابقة
          </Card>
        ) : (
          filteredRows.map((row) => {
            const type = typeMeta(row.type);
            const status = statusMeta(row.status);
            const priority = priorityMeta(row.priority);

            return (
              <Card
                key={row.id}
                className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="break-all font-mono text-sm font-bold text-[#016564]">
                        {row.code}
                      </div>
                      <Badge variant={type.variant}>{type.label}</Badge>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {priority ? <Badge variant={priority.variant}>{priority.label}</Badge> : null}
                    </div>

                    <div className="break-words text-[15px] font-bold leading-7 text-[#152625] sm:text-base">
                      {row.title}
                    </div>

                    {row.description ? (
                      <div className="break-words text-sm leading-7 text-[#304342]">
                        {row.description}
                      </div>
                    ) : null}

                    <div className="grid gap-2 text-[12px] text-[#61706f] sm:grid-cols-2 sm:text-xs">
                      <div>التاريخ: {formatDate(row.createdAt)}</div>
                      <div className="break-words">الموقع: {row.location || '—'}</div>
                      <div className="break-words">العنصر: {row.relatedItemName || '—'}</div>
                      <div>الكمية: {row.quantity || 1}</div>
                      {canViewAll ? (
                        <div className="break-words">مقدم الطلب: {row.requester?.fullName || '—'}</div>
                      ) : null}
                      {canViewAll ? (
                        <div className="break-words">الإدارة: {row.requester?.department || '—'}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto">
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

      <FormShell
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title={createState.category === 'OTHER' ? 'إنشاء طلب آخر' : suggestionTitleByType(createState.category)}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={closeCreate} className="w-full sm:w-auto">
              إلغاء
            </Button>
            <Button type="button" onClick={submitCreate} disabled={createSubmitting} className="w-full sm:w-auto">
              {createSubmitting ? 'جارٍ الحفظ...' : 'إرسال الطلب'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {createError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">نوع الطلب</label>
              <select
                value={createState.category}
                onChange={(e) => handleCreateState('category', e.target.value as SuggestionType)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
              >
                <option value="MAINTENANCE">صيانة</option>
                <option value="CLEANING">نظافة</option>
                <option value="PURCHASE">شراء مباشر</option>
                <option value="OTHER">طلب آخر</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">الأولوية</label>
              <select
                value={createState.priority}
                onChange={(e) => handleCreateState('priority', e.target.value as SuggestionPriority)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
              >
                <option value="LOW">منخفضة</option>
                <option value="NORMAL">متوسطة</option>
                <option value="HIGH">عالية</option>
                <option value="URGENT">عاجلة</option>
              </select>
            </div>
          </div>

          <Input
            label="العنوان"
            value={createState.title}
            onChange={(e) => handleCreateState('title', e.target.value)}
            placeholder="عنوان الطلب"
            disabled={createState.category !== 'OTHER'}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="العنصر / المادة"
              value={createState.itemName}
              onChange={(e) => handleCreateState('itemName', e.target.value)}
              placeholder="اسم المادة أو التجهيز أو الخدمة"
            />

            <Input
              label="الكمية"
              type="number"
              min={1}
              value={createState.quantity}
              onChange={(e) => handleCreateState('quantity', e.target.value)}
              placeholder="1"
            />
          </div>

          <Input
            label="الموقع"
            value={createState.location}
            onChange={(e) => handleCreateState('location', e.target.value)}
            placeholder="المبنى / القاعة / المستودع / الجهة المستفيدة"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="الجهة المحال إليها"
              value={createState.targetDepartment}
              onChange={(e) => handleCreateState('targetDepartment', e.target.value)}
              placeholder="SUPPORT_SERVICES / PROCUREMENT"
            />

            <Input
              label="مستلم خارجي (اختياري)"
              value={createState.externalRecipient}
              onChange={(e) => handleCreateState('externalRecipient', e.target.value)}
              placeholder="بريد أو اسم الجهة"
            />
          </div>

          <TextArea
            label="وصف الطلب"
            value={createState.description}
            onChange={(value) => handleCreateState('description', value)}
            placeholder="اشرح الاحتياج أو الخلل أو المطلوب تنفيذه"
            rows={4}
            required
          />

          <TextArea
            label="مبررات الطلب"
            value={createState.justification}
            onChange={(value) => handleCreateState('justification', value)}
            placeholder="لماذا يحتاج هذا الطلب إلى إجراء؟"
            rows={4}
            required
          />
        </div>
      </FormShell>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `تفاصيل الطلب ${selected.code}` : 'تفاصيل الطلب'}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الرمز</div>
                <div className="mt-1 break-all text-sm leading-7 text-[#304342]">{selected.code}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">النوع</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{typeMeta(selected.type).label}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الحالة</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{statusMeta(selected.status).label}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الأولوية</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">
                  {priorityMeta(selected.priority)?.label || '—'}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">العنوان</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{selected.title}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الوصف</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                  {selected.description || '—'}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">العنصر / المادة</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{selected.relatedItemName || '—'}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الكمية</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{selected.quantity || 1}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الموقع</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{selected.location || '—'}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الجهة المحال إليها</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                  {selected.targetDepartment || '—'}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">المبررات</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                  {selected.justificationText || '—'}
                </div>
              </div>

              {selected.adminNotesText ? (
                <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                  <div className="text-xs font-bold text-[#016564]">ملاحظات المدير</div>
                  <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                    {selected.adminNotesText}
                  </div>
                </div>
              ) : null}

              {selected.linkedCode ? (
                <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                  <div className="text-xs font-bold text-[#016564]">المرجع الناتج بعد المعالجة</div>
                  <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                    {selected.linkedEntityType || 'مرجع'} — {selected.linkedCode}
                  </div>
                </div>
              ) : null}

              {canViewAll ? (
                <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                  <div className="text-xs font-bold text-[#016564]">مقدم الطلب</div>
                  <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                    {selected.requester?.fullName || '—'} {selected.requester?.department ? `— ${selected.requester.department}` : ''}
                  </div>
                </div>
              ) : null}
            </div>

            {isManager && selected.status === 'PENDING' ? (
              <div className="space-y-4 rounded-[20px] border border-[#e7ebea] bg-[#fafcfc] p-4">
                <div className="text-sm font-extrabold text-[#016564]">قرار المدير</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">الإجراء</label>
                    <select
                      value={decisionState.action}
                      onChange={(e) =>
                        setDecisionState((current) => ({
                          ...current,
                          action: e.target.value as 'approve' | 'reject',
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
                    >
                      <option value="approve">اعتماد</option>
                      <option value="reject">رفض</option>
                    </select>
                  </div>

                  <Input
                    label="الجهة المحال إليها"
                    value={decisionState.targetDepartment}
                    onChange={(e) =>
                      setDecisionState((current) => ({
                        ...current,
                        targetDepartment: e.target.value,
                      }))
                    }
                    placeholder="SUPPORT_SERVICES / PROCUREMENT"
                  />
                </div>

                {selected.type === 'PURCHASE' && decisionState.action === 'approve' ? (
                  <Input
                    label="قيمة تقديرية (اختياري)"
                    type="number"
                    min={0}
                    value={decisionState.estimatedValue}
                    onChange={(e) =>
                      setDecisionState((current) => ({
                        ...current,
                        estimatedValue: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                ) : null}

                <TextArea
                  label="ملاحظة المدير"
                  value={decisionState.adminNotes}
                  onChange={(value) =>
                    setDecisionState((current) => ({
                      ...current,
                      adminNotes: value,
                    }))
                  }
                  placeholder="أدخل ملاحظتك أو توجيهك الإداري"
                  rows={3}
                />

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">
                    إغلاق
                  </Button>
                  <Button
                    type="button"
                    onClick={submitDecision}
                    disabled={decisionSubmitting}
                    variant={decisionState.action === 'reject' ? 'danger' : 'primary'}
                    className="w-full sm:w-auto"
                  >
                    {decisionSubmitting
                      ? 'جارٍ الحفظ...'
                      : decisionState.action === 'reject'
                      ? 'رفض الطلب'
                      : 'اعتماد الطلب'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">
                  إغلاق
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
