'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type MaintenanceApiRow = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt?: string;
  requester?: {
    fullName?: string;
    department?: string;
  };
  assignedTo?: {
    fullName?: string;
  };
  relatedItemName?: string | null;
  location?: string | null;
};

type SuggestionRow = {
  id: string;
  code?: string | null;
  title: string;
  description?: string | null;
  status:
    | 'PENDING'
    | 'UNDER_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'IMPLEMENTED'
    | string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | string;
  createdAt?: string;
  requester?: {
    fullName?: string;
    department?: string;
  } | null;
  justification?: string | null;
  adminNotes?: string | null;
  category?: string;
};

type DisplayRow = {
  id: string;
  rowType: 'maintenance' | 'suggestion';
  code: string;
  title: string;
  description?: string | null;
  statusLabel: string;
  statusVariant: 'warning' | 'info' | 'success' | 'danger' | 'neutral';
  priorityLabel: string;
  priorityVariant: 'warning' | 'info' | 'success' | 'danger' | 'neutral';
  createdAt?: string;
  requesterName?: string;
  requesterDepartment?: string;
  assignedToName?: string;
  location?: string | null;
  relatedItemName?: string | null;
  rawStatus?: string;
  rawPriority?: string;
  rawSuggestion?: SuggestionRow | null;
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

function parseSuggestionMeta(justification?: string | null) {
  try {
    const parsed = JSON.parse(justification || '{}');
    return {
      itemName: String(parsed?.itemName || '').trim(),
      location: String(parsed?.location || '').trim(),
      sourcePurpose: String(parsed?.sourcePurpose || '').trim(),
      rawJustification: String(parsed?.rawJustification || '').trim(),
      attachmentCount: Array.isArray(parsed?.attachments) ? parsed.attachments.length : 0,
    };
  } catch {
    return {
      itemName: '',
      location: '',
      sourcePurpose: '',
      rawJustification: '',
      attachmentCount: 0,
    };
  }
}

function maintenanceStatusMeta(status: MaintenanceApiRow['status']) {
  if (status === 'OPEN') return { label: 'مفتوح', variant: 'warning' as const };
  if (status === 'IN_PROGRESS') return { label: 'قيد المعالجة', variant: 'info' as const };
  if (status === 'COMPLETED') return { label: 'مغلق', variant: 'success' as const };
  return { label: 'ملغي', variant: 'danger' as const };
}

function maintenancePriorityMeta(priority: MaintenanceApiRow['priority']) {
  if (priority === 'CRITICAL') return { label: 'حرج', variant: 'danger' as const };
  if (priority === 'HIGH') return { label: 'عالٍ', variant: 'warning' as const };
  if (priority === 'MEDIUM') return { label: 'متوسط', variant: 'info' as const };
  return { label: 'منخفض', variant: 'neutral' as const };
}

function suggestionStatusMeta(status: string) {
  if (status === 'PENDING') return { label: 'بانتظار الاعتماد', variant: 'warning' as const };
  if (status === 'UNDER_REVIEW') return { label: 'قيد المراجعة', variant: 'info' as const };
  if (status === 'APPROVED') return { label: 'معتمد', variant: 'success' as const };
  if (status === 'IMPLEMENTED') return { label: 'تم إنشاء المسودة', variant: 'success' as const };
  if (status === 'REJECTED') return { label: 'مرفوض', variant: 'danger' as const };
  return { label: status || '—', variant: 'neutral' as const };
}

function suggestionPriorityMeta(priority?: string) {
  const raw = String(priority || '').toUpperCase();
  if (raw === 'URGENT') return { label: 'عاجل', variant: 'danger' as const };
  if (raw === 'HIGH') return { label: 'عالٍ', variant: 'warning' as const };
  if (raw === 'NORMAL') return { label: 'عادي', variant: 'info' as const };
  if (raw === 'LOW') return { label: 'منخفض', variant: 'neutral' as const };
  return { label: 'عادي', variant: 'info' as const };
}

export default function MaintenancePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PENDING' | 'IMPLEMENTED' | 'REJECTED'>('ALL');
  const [selected, setSelected] = useState<DisplayRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string>('');

  const isManager = user?.role === 'manager';
  const canViewAll = user?.role === 'manager' || user?.role === 'warehouse';

  async function fetchRows() {
    setLoading(true);
    try {
      const [maintenanceRes, suggestionsRes] = await Promise.all([
        fetch('/api/maintenance', { cache: 'no-store' }),
        fetch('/api/suggestions?category=MAINTENANCE', { cache: 'no-store' }),
      ]);

      const maintenanceJson = await maintenanceRes.json().catch(() => null);
      const suggestionsJson = await suggestionsRes.json().catch(() => null);

      const maintenanceRows: DisplayRow[] = Array.isArray(maintenanceJson?.data)
        ? maintenanceJson.data.map((row: MaintenanceApiRow) => {
            const status = maintenanceStatusMeta(row.status);
            const priority = maintenancePriorityMeta(row.priority);

            return {
              id: row.id,
              rowType: 'maintenance',
              code: row.code,
              title: row.title,
              description: row.description,
              statusLabel: status.label,
              statusVariant: status.variant,
              priorityLabel: priority.label,
              priorityVariant: priority.variant,
              createdAt: row.createdAt,
              requesterName: row.requester?.fullName,
              requesterDepartment: row.requester?.department,
              assignedToName: row.assignedTo?.fullName,
              location: row.location,
              relatedItemName: row.relatedItemName,
              rawStatus: row.status,
              rawPriority: row.priority,
              rawSuggestion: null,
            };
          })
        : [];

      const suggestionRows: DisplayRow[] = Array.isArray(suggestionsJson?.data)
        ? suggestionsJson.data.map((row: SuggestionRow) => {
            const parsed = parseSuggestionMeta(row.justification);
            const status = suggestionStatusMeta(row.status);
            const priority = suggestionPriorityMeta(row.priority);

            return {
              id: row.id,
              rowType: 'suggestion',
              code: row.code || `MNT-REQ-${String(row.id).slice(-6).toUpperCase()}`,
              title: row.title,
              description: row.description,
              statusLabel: status.label,
              statusVariant: status.variant,
              priorityLabel: priority.label,
              priorityVariant: priority.variant,
              createdAt: row.createdAt,
              requesterName: row.requester?.fullName || '—',
              requesterDepartment: row.requester?.department || '—',
              assignedToName: row.status === 'IMPLEMENTED' ? 'تمت الإحالة' : 'بانتظار قرار المدير',
              location: parsed.location || '—',
              relatedItemName: parsed.itemName || '—',
              rawStatus: row.status,
              rawPriority: row.priority,
              rawSuggestion: row,
            };
          })
        : [];

      setRows([...suggestionRows, ...maintenanceRows].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, []);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      pendingApproval: rows.filter((row) => row.rowType === 'suggestion' && row.rawStatus === 'PENDING').length,
      implemented: rows.filter((row) => row.rowType === 'suggestion' && row.rawStatus === 'IMPLEMENTED').length,
      progress: rows.filter((row) => row.rowType === 'maintenance' && row.rawStatus === 'IN_PROGRESS').length,
      closed: rows.filter((row) => row.rowType === 'maintenance' && row.rawStatus === 'COMPLETED').length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);

    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'ALL' ? true : row.rawStatus === statusFilter;

      const haystack = normalizeArabic(
        [
          row.code,
          row.title,
          row.description,
          row.relatedItemName,
          row.location,
          row.requesterName,
          row.requesterDepartment,
          row.assignedToName,
        ]
          .filter(Boolean)
          .join(' ')
      );

      const matchesSearch = q ? haystack.includes(q) : true;
      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const selectedMeta = selected?.rawSuggestion ? parseSuggestionMeta(selected.rawSuggestion.justification) : null;
  const canModerateSelected =
    isManager &&
    selected?.rowType === 'suggestion' &&
    (selected.rawStatus === 'PENDING' || selected.rawStatus === 'UNDER_REVIEW');

  async function handleSuggestionAction(action: 'approve' | 'reject') {
    if (!selected?.rawSuggestion) return;

    setSubmitting(true);
    setFeedback('');

    try {
      const res = await fetch('/api/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: selected.id,
          action,
          adminNotes,
          targetDepartment: 'SUPPORT_SERVICES',
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'تعذر تنفيذ الإجراء');
      }

      setFeedback(
        action === 'approve'
          ? 'تم اعتماد الطلب وإنشاء مسودة بريد في قسم المراسلات الخارجية.'
          : 'تم رفض الطلب بنجاح.'
      );

      await fetchRows();

      if (action === 'approve') {
        setTimeout(() => {
          window.location.href = '/email-drafts';
        }, 800);
      } else {
        setTimeout(() => {
          setSelected(null);
          setAdminNotes('');
          setFeedback('');
        }, 800);
      }
    } catch (error: any) {
      setFeedback(error?.message || 'تعذر تنفيذ الإجراء');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">
            الصيانة
          </h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
            متابعة طلبات الصيانة المعتمدة وطلبات الصيانة الجديدة بانتظار قرار المدير.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">إجمالي العناصر</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.total}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">بانتظار الاعتماد</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#d0b284] sm:text-xl">
              {stats.pendingApproval}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">أُحيلت للمراسلات</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#498983] sm:text-xl">
              {stats.implemented}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">المغلقة</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.closed}
            </div>
          </Card>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <Input
            label="بحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="الرمز، العنوان، العنصر، الموقع، أو اسم مقدم الطلب"
          />

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">الحالة</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | 'ALL'
                    | 'OPEN'
                    | 'IN_PROGRESS'
                    | 'COMPLETED'
                    | 'CANCELLED'
                    | 'PENDING'
                    | 'IMPLEMENTED'
                    | 'REJECTED'
                )
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
            >
              <option value="ALL">الكل</option>
              <option value="PENDING">بانتظار الاعتماد</option>
              <option value="IMPLEMENTED">تم إنشاء المسودة</option>
              <option value="OPEN">مفتوح</option>
              <option value="IN_PROGRESS">قيد المعالجة</option>
              <option value="COMPLETED">مغلق</option>
              <option value="REJECTED">مرفوض</option>
              <option value="CANCELLED">ملغي</option>
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
            لا توجد طلبات صيانة مطابقة
          </Card>
        ) : (
          filteredRows.map((row) => (
            <Card
              key={`${row.rowType}-${row.id}`}
              className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="break-all font-mono text-sm font-bold text-[#016564]">
                      {row.code}
                    </div>
                    <Badge variant={row.statusVariant}>{row.statusLabel}</Badge>
                    <Badge variant={row.priorityVariant}>{row.priorityLabel}</Badge>
                    {row.rowType === 'suggestion' ? (
                      <Badge variant="info">طلب مرفوع من الموظف</Badge>
                    ) : null}
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
                    {canViewAll ? (
                      <div className="break-words">مقدم الطلب: {row.requesterName || '—'}</div>
                    ) : null}
                    {canViewAll ? (
                      <div className="break-words">الإدارة: {row.requesterDepartment || '—'}</div>
                    ) : null}
                    <div className="break-words">المسند إليه: {row.assignedToName || '—'}</div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <Button className="w-full sm:w-auto" onClick={() => {
                    setSelected(row);
                    setAdminNotes('');
                    setFeedback('');
                  }}>
                    فتح التفاصيل
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      <Modal
        isOpen={!!selected}
        onClose={() => {
          setSelected(null);
          setAdminNotes('');
          setFeedback('');
        }}
        title={selected ? `تفاصيل طلب الصيانة ${selected.code}` : 'تفاصيل طلب الصيانة'}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الرمز</div>
                <div className="mt-1 break-all text-sm leading-7 text-[#304342]">{selected.code}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الحالة</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{selected.statusLabel}</div>
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
                <div className="text-xs font-bold text-[#016564]">الأولوية</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{selected.priorityLabel}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">التاريخ</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{formatDate(selected.createdAt)}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الموقع</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{selected.location || '—'}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">العنصر</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{selected.relatedItemName || '—'}</div>
              </div>

              {canViewAll ? (
                <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                  <div className="text-xs font-bold text-[#016564]">مقدم الطلب</div>
                  <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                    {selected.requesterName || '—'}
                  </div>
                </div>
              ) : null}

              {canViewAll ? (
                <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                  <div className="text-xs font-bold text-[#016564]">الإدارة</div>
                  <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                    {selected.requesterDepartment || '—'}
                  </div>
                </div>
              ) : null}

              {selectedMeta ? (
                <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                  <div className="text-xs font-bold text-[#016564]">مصدر الحاجة / الملاحظة التشغيلية</div>
                  <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                    {selectedMeta.sourcePurpose || selectedMeta.rawJustification || '—'}
                  </div>
                </div>
              ) : null}
            </div>

            {canModerateSelected ? (
              <div className="space-y-3 rounded-[18px] border border-[#e7ebea] bg-[#fafcfc] p-4 sm:rounded-2xl">
                <Input
                  label="ملاحظة المدير"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="ملاحظة داخلية تظهر مع الإحالة أو الرفض"
                />

                {feedback ? (
                  <div className="rounded-2xl border border-[#d6e4e2] bg-white px-4 py-3 text-sm leading-7 text-[#304342]">
                    {feedback}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => handleSuggestionAction('reject')}
                    disabled={submitting}
                    className="w-full sm:w-auto"
                  >
                    رفض
                  </Button>
                  <Button
                    onClick={() => handleSuggestionAction('approve')}
                    disabled={submitting}
                    className="w-full sm:w-auto"
                  >
                    اعتماد وإنشاء مسودة
                  </Button>
                </div>
              </div>
            ) : null}

            {!canModerateSelected && feedback ? (
              <div className="rounded-2xl border border-[#d6e4e2] bg-white px-4 py-3 text-sm leading-7 text-[#304342]">
                {feedback}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelected(null);
                  setAdminNotes('');
                  setFeedback('');
                }}
                className="w-full sm:w-auto"
              >
                إغلاق
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
