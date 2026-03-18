'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type MaintenanceRow = {
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

function statusMeta(status: MaintenanceRow['status']) {
  if (status === 'OPEN') return { label: 'مفتوح', variant: 'warning' as const };
  if (status === 'IN_PROGRESS') return { label: 'قيد المعالجة', variant: 'info' as const };
  if (status === 'COMPLETED') return { label: 'مغلق', variant: 'success' as const };
  return { label: 'ملغي', variant: 'danger' as const };
}

function priorityMeta(priority: MaintenanceRow['priority']) {
  if (priority === 'CRITICAL') return { label: 'حرج', variant: 'danger' as const };
  if (priority === 'HIGH') return { label: 'عالٍ', variant: 'warning' as const };
  if (priority === 'MEDIUM') return { label: 'متوسط', variant: 'info' as const };
  return { label: 'منخفض', variant: 'neutral' as const };
}

export default function MaintenancePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MaintenanceRow['status']>('ALL');
  const [selected, setSelected] = useState<MaintenanceRow | null>(null);

  const canViewAll = user?.role === 'manager' || user?.role === 'warehouse';

  useEffect(() => {
    let mounted = true;

    async function fetchRows() {
      setLoading(true);
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' });
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

    fetchRows();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      open: rows.filter((row) => row.status === 'OPEN').length,
      progress: rows.filter((row) => row.status === 'IN_PROGRESS').length,
      closed: rows.filter((row) => row.status === 'COMPLETED').length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);

    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'ALL' ? true : row.status === statusFilter;

      const haystack = normalizeArabic(
        [
          row.code,
          row.title,
          row.description,
          row.relatedItemName,
          row.location,
          row.requester?.fullName,
          row.requester?.department,
          row.assignedTo?.fullName,
        ]
          .filter(Boolean)
          .join(' ')
      );

      const matchesSearch = q ? haystack.includes(q) : true;
      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">
            الصيانة
          </h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
            متابعة طلبات الصيانة والأعطال المرتبطة بالمخزون أو البيئة التشغيلية.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">إجمالي الطلبات</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.total}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">المفتوحة</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#d0b284] sm:text-xl">
              {stats.open}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">قيد المعالجة</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#498983] sm:text-xl">
              {stats.progress}
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
        <div className="grid gap-3 lg:grid-cols-[1fr_190px]">
          <Input
            label="بحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="الرمز، العنوان، المادة، الموقع، أو اسم مقدم الطلب"
          />

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">الحالة</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'ALL' | MaintenanceRow['status'])
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
            >
              <option value="ALL">الكل</option>
              <option value="OPEN">مفتوح</option>
              <option value="IN_PROGRESS">قيد المعالجة</option>
              <option value="COMPLETED">مغلق</option>
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
          filteredRows.map((row) => {
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
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <Badge variant={priority.variant}>{priority.label}</Badge>
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
                      <div className="break-words">المادة: {row.relatedItemName || '—'}</div>
                      {canViewAll ? (
                        <div className="break-words">مقدم الطلب: {row.requester?.fullName || '—'}</div>
                      ) : null}
                      {canViewAll ? (
                        <div className="break-words">الإدارة: {row.requester?.department || '—'}</div>
                      ) : null}
                      <div className="break-words">المسند إليه: {row.assignedTo?.fullName || '—'}</div>
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

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
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
                <div className="mt-1 text-sm leading-7 text-[#304342]">{statusMeta(selected.status).label}</div>
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
                <div className="mt-1 text-sm leading-7 text-[#304342]">{priorityMeta(selected.priority).label}</div>
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
                <div className="text-xs font-bold text-[#016564]">المادة المرتبطة</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">{selected.relatedItemName || '—'}</div>
              </div>

              {canViewAll ? (
                <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                  <div className="text-xs font-bold text-[#016564]">مقدم الطلب</div>
                  <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                    {selected.requester?.fullName || '—'}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">المسند إليه</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                  {selected.assignedTo?.fullName || '—'}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">
                إغلاق
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}