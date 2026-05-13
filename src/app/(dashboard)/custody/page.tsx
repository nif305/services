'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import {
  getInventoryDisplayCategory,
  getInventoryDisplayName,
} from '@/lib/inventoryLocalization';

type CustodyStatus = 'ACTIVE' | 'RETURN_REQUESTED' | 'RETURNED' | 'OVERDUE';

type ReturnRequestSummary = {
  id: string;
  code: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  conditionNote?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
};

type CustodyItem = {
  id: string;
  code: string;
  itemName: string;
  category?: string | null;
  assignedToUserId: string;
  assignedToUserName: string;
  assignedDate: string;
  dueDate?: string | null;
  notes?: string | null;
  status: CustodyStatus;
  returnRequests: ReturnRequestSummary[];
};

type CustodyApiRow = {
  id: string;
  issueDate: string;
  dueDate?: string | null;
  expectedReturn?: string | null;
  notes?: string | null;
  status: CustodyStatus;
  userId: string;
  user?: {
    fullName?: string | null;
    department?: string | null;
  } | null;
  item?: {
    name?: string | null;
    code?: string | null;
    category?: string | null;
    type?: 'RETURNABLE' | 'CONSUMABLE' | null;
  } | null;
  returnRequests?: ReturnRequestSummary[];
};

type CustodyStats = {
  total: number;
  active: number;
  overdue: number;
  returnRequested: number;
};

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type CustodyApiResponse = {
  data?: CustodyApiRow[];
  stats?: CustodyStats;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

function formatDate(date?: string | null) {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('ar-SA');
  } catch {
    return '-';
  }
}

function statusLabel(status: CustodyStatus) {
  if (status === 'ACTIVE') return 'نشطة';
  if (status === 'OVERDUE') return 'متأخرة';
  if (status === 'RETURN_REQUESTED') return 'طُلب إرجاعها';
  return 'أُعيدت';
}

function statusVariant(status: CustodyStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'OVERDUE') return 'danger';
  if (status === 'RETURN_REQUESTED') return 'warning';
  return 'neutral';
}

function mapCustodyRow(row: CustodyApiRow, language: 'ar' | 'en'): CustodyItem | null {
  if (row.item?.type && row.item.type !== 'RETURNABLE') return null;
  if (!row.item?.code && !row.item?.name) return null;

  return {
    id: row.id,
    code: row.item?.code || '-',
    itemName: getInventoryDisplayName(row.item, language),
    category: getInventoryDisplayCategory(row.item, language) || row.user?.department || null,
    assignedToUserId: row.userId,
    assignedToUserName: row.user?.fullName || 'المستخدم',
    assignedDate: row.issueDate,
    dueDate: row.dueDate || row.expectedReturn || null,
    notes: row.notes || null,
    status: row.status,
    returnRequests: Array.isArray(row.returnRequests) ? row.returnRequests : [],
  };
}

export default function CustodyPage() {
  const { language } = useI18n();
  const [items, setItems] = useState<CustodyItem[]>([]);
  const [stats, setStats] = useState<CustodyStats>({
    total: 0,
    active: 0,
    overdue: 0,
    returnRequested: 0,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [submittingReturnId, setSubmittingReturnId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURN_REQUESTED'>('ALL');
  const [selectedItem, setSelectedItem] = useState<CustodyItem | null>(null);

  const refresh = useCallback(async (page = pagination.page) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
      });

      if (activeFilter !== 'ALL') {
        params.set('status', activeFilter);
      }

      const response = await fetch(`/api/custody?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      const data: CustodyApiResponse = await response.json().catch(() => ({ data: [] }));
      const mapped = Array.isArray(data?.data)
        ? (data.data.map((row) => mapCustodyRow(row, language)).filter(Boolean) as CustodyItem[])
        : [];
      const nextPagination: PaginationState = {
        page: Number(data?.pagination?.page || page || 1),
        limit: Number(data?.pagination?.limit || pagination.limit || 5),
        total: Number(data?.pagination?.total || 0),
        totalPages: Math.max(1, Number(data?.pagination?.totalPages || 1)),
      };

      if (page > nextPagination.totalPages && nextPagination.totalPages > 0) {
        setPagination((prev) => ({ ...prev, page: nextPagination.totalPages }));
        return;
      }

      setItems(mapped);
      setStats({
        total: Number(data?.stats?.total || 0),
        active: Number(data?.stats?.active || 0),
        overdue: Number(data?.stats?.overdue || 0),
        returnRequested: Number(data?.stats?.returnRequested || 0),
      });
      setPagination(nextPagination);
    } catch {
      setItems([]);
      setStats({ total: 0, active: 0, overdue: 0, returnRequested: 0 });
      setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  }, [activeFilter, language, pagination.limit, pagination.page]);

  useEffect(() => {
    void refresh(pagination.page);
  }, [pagination.page, refresh]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [activeFilter]);

  const pendingReturnFor = useCallback(
    (item: CustodyItem) => item.returnRequests.find((r) => r.status === 'PENDING'),
    []
  );

  const createReturnRequest = async (item: CustodyItem) => {
    if (pendingReturnFor(item) || item.status === 'RETURN_REQUESTED') return;

    setSubmittingReturnId(item.id);
    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          custodyId: item.id,
          returnType: 'GOOD',
          damageDetails: '',
          damageImages: '',
          declarationAck: true,
          notes: '',
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(data?.error || 'تعذر تسجيل طلب الإرجاع');
        return;
      }

      await refresh(pagination.page);
    } finally {
      setSubmittingReturnId(null);
    }
  };

  const showingOverdue = useMemo(() => stats.overdue > 0, [stats.overdue]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-[24px] border border-surface-border bg-white p-4 shadow-soft sm:rounded-[28px] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[24px] leading-[1.25] text-primary sm:text-[30px]">عهدتي</h1>
            <p className="mt-2 text-[13px] leading-7 text-surface-subtle sm:text-[14px]">
              تظهر هنا المواد المسترجعة التي ما زالت بعهدتك ولم تُغلق بعد.
            </p>
          </div>

          <Link href="/materials/requests" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto">
              طلب مادة جديدة
            </Button>
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3 sm:mt-5 sm:gap-4">
          <div className="rounded-[20px] border border-surface-border bg-slate-50 p-3 sm:rounded-[22px] sm:p-4">
            <div className="text-[12px] text-surface-subtle sm:text-[13px]">إجمالي العهد الحالية</div>
            <div className="mt-2 text-[24px] leading-none text-slate-900 sm:text-[32px]">{stats.total}</div>
          </div>

          <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-3 sm:rounded-[22px] sm:p-4">
            <div className="text-[12px] text-emerald-700 sm:text-[13px]">عهد نشطة</div>
            <div className="mt-2 text-[24px] leading-none text-slate-900 sm:text-[32px]">{stats.active}</div>
          </div>

          <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-3 sm:col-span-2 sm:rounded-[22px] sm:p-4 xl:col-span-1">
            <div className="text-[12px] text-amber-700 sm:text-[13px]">طلبات إرجاع مفتوحة</div>
            <div className="mt-2 text-[24px] leading-none text-slate-900 sm:text-[32px]">{stats.returnRequested}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
          {[
            { key: 'ALL', label: 'الكل' },
            { key: 'ACTIVE', label: 'نشطة' },
            { key: 'OVERDUE', label: 'متأخرة' },
            { key: 'RETURN_REQUESTED', label: 'طُلب إرجاعها' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as 'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURN_REQUESTED')}
              className={`min-h-[42px] rounded-full px-4 py-2 text-sm transition ${
                activeFilter === tab.key
                  ? 'bg-[#016564] text-white'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {showingOverdue ? (
            <div className="inline-flex min-h-[42px] items-center rounded-full bg-[#7c1e3e]/10 px-4 py-2 text-sm font-bold text-[#7c1e3e]">
              متأخرة: {stats.overdue}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2 sm:gap-4">
        {loading ? (
          <Card className="rounded-[24px] p-8 text-center text-slate-500 sm:rounded-[28px] xl:col-span-2">
            جاري تحميل العهد...
          </Card>
        ) : items.length === 0 ? (
          <Card className="rounded-[24px] p-8 text-center text-slate-500 sm:rounded-[28px] xl:col-span-2">
            لا توجد مواد مسجلة عليك حاليًا
          </Card>
        ) : (
          items.map((item) => {
            const openReturn = pendingReturnFor(item);

            return (
              <Card
                key={item.id}
                className="rounded-[24px] border border-surface-border p-4 shadow-soft sm:rounded-[28px] sm:p-5"
              >
                <div className="flex flex-col gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] leading-none text-slate-700 break-all">
                        {item.code}
                      </span>
                    </div>

                    <h3 className="text-[20px] leading-8 text-primary sm:text-[22px]">{item.itemName}</h3>

                    <div className="mt-3 grid gap-2 rounded-[18px] bg-slate-50 p-3 text-[13px] leading-7 text-slate-600 sm:rounded-[20px] sm:p-4 md:grid-cols-2">
                      <div>
                        الفئة: <span className="text-slate-900">{item.category || '-'}</span>
                      </div>
                      <div>
                        تاريخ الاستلام: <span className="text-slate-900">{formatDate(item.assignedDate)}</span>
                      </div>
                      <div>
                        موعد الإرجاع: <span className="text-slate-900">{formatDate(item.dueDate)}</span>
                      </div>
                      <div>
                        حالة الإرجاع:{' '}
                        <span className="text-slate-900">{openReturn ? 'تم رفع طلب إرجاع' : 'لا يوجد'}</span>
                      </div>
                    </div>

                    {item.notes ? (
                      <div className="mt-4 rounded-[18px] border border-surface-border bg-white p-4 text-[13px] leading-7 text-slate-700 whitespace-pre-wrap break-words">
                        {item.notes}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedItem(item)}
                      className="w-full sm:w-auto"
                    >
                      عرض
                    </Button>

                    {item.status === 'RETURN_REQUESTED' || openReturn ? (
                      <Button variant="ghost" disabled className="w-full sm:w-auto">
                        تم رفع طلب إرجاع
                      </Button>
                    ) : (
                      <Button
                        onClick={() => createReturnRequest(item)}
                        className="w-full sm:w-auto"
                        disabled={submittingReturnId === item.id}
                      >
                        {submittingReturnId === item.id ? 'جاري الإرسال...' : 'طلب إرجاع'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {!loading && pagination.totalPages > 1 ? (
        <section className="flex items-center justify-between rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
            disabled={pagination.page <= 1}
            className="rounded-full border border-[#d6d7d4] px-4 py-2 text-sm font-bold text-[#425554] disabled:cursor-not-allowed disabled:opacity-40"
          >
            السابق
          </button>
          <div className="text-center">
            <div className="text-sm font-bold text-[#016564]">
              الصفحة {pagination.page} من {pagination.totalPages}
            </div>
            <div className="text-xs text-slate-500">إجمالي العهد في هذا العرض: {pagination.total}</div>
          </div>
          <button
            type="button"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                page: Math.min(prev.page + 1, prev.totalPages),
              }))
            }
            disabled={pagination.page >= pagination.totalPages}
            className="rounded-full border border-[#d6d7d4] px-4 py-2 text-sm font-bold text-[#425554] disabled:cursor-not-allowed disabled:opacity-40"
          >
            التالي
          </button>
        </section>
      ) : null}

      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="تفاصيل العهدة">
        <div className="space-y-4">
          <div className="rounded-[18px] border border-surface-border bg-slate-50 p-4 text-[14px] leading-8 text-slate-700 break-words">
            <div>
              المادة: <span className="text-slate-900">{selectedItem?.itemName || '-'}</span>
            </div>
            <div>
              الرقم: <span className="text-slate-900">{selectedItem?.code || '-'}</span>
            </div>
            <div>
              الفئة: <span className="text-slate-900">{selectedItem?.category || '-'}</span>
            </div>
            <div>
              تاريخ الاستلام: <span className="text-slate-900">{formatDate(selectedItem?.assignedDate)}</span>
            </div>
            <div>
              موعد الإرجاع: <span className="text-slate-900">{formatDate(selectedItem?.dueDate)}</span>
            </div>
            <div>
              الحالة: <span className="text-slate-900">{selectedItem ? statusLabel(selectedItem.status) : '-'}</span>
            </div>
          </div>

          {selectedItem?.notes ? (
            <div className="rounded-[18px] border border-surface-border bg-white p-4 text-[14px] leading-8 text-slate-700 whitespace-pre-wrap break-words sm:rounded-[20px]">
              {selectedItem.notes}
            </div>
          ) : null}

          <div className="flex justify-end border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedItem(null)}
              className="w-full sm:w-auto"
            >
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
