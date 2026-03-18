'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type RequestRecord = {
  id: string;
  code: string;
  department: string;
  purpose: string;
  createdAt?: string;
  requester?: {
    fullName?: string;
  };
  items?: Array<{
    id: string;
    quantity: number;
    item?: {
      name?: string;
      availableQty?: number;
    };
  }>;
};

function formatDate(date?: string) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests?status=PENDING', { cache: 'no-store' });
      const data = await res.json();
      setPendingRequests(Array.isArray(data?.data) ? data.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const stats = useMemo(() => pendingRequests.length, [pendingRequests]);

  const handleAction = async (
    id: string,
    action: 'approve' | 'reject' | 'approve_and_issue'
  ) => {
    setProcessingId(id);
    try {
      if (action === 'approve_and_issue') {
        const approveRes = await fetch(`/api/requests/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
          }),
        });

        if (!approveRes.ok) {
          await fetchPending();
          return;
        }

        const issueRes = await fetch(`/api/requests/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'issue',
          }),
        });

        if (issueRes.ok) {
          await fetchPending();
        }

        return;
      }

      const res = await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? 'تم الرفض من الإدارة' : undefined,
        }),
      });

      if (res.ok) {
        await fetchPending();
      }
    } finally {
      setProcessingId(null);
    }
  };

  if (user?.role !== 'manager') {
    return (
      <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-700 sm:rounded-[26px]">
        غير مصرح لك بالوصول لهذه الصفحة
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-[24px] border border-surface-border bg-white p-4 shadow-soft sm:rounded-[28px] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[24px] leading-[1.25] text-primary sm:text-[30px]">
              مركز الاعتمادات
            </h1>
            <p className="mt-2 text-[13px] leading-7 text-slate-500 sm:text-[14px]">
              الطلبات التي ما زالت بانتظار قرارك الإداري.
            </p>
          </div>

          <span className="inline-flex w-full items-center justify-center rounded-full border border-[#d0b284]/40 bg-[#d0b284]/15 px-3 py-2 text-sm font-bold text-[#8a6a28] sm:w-auto">
            {stats} طلب معلق
          </span>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-[24px] p-8 text-center sm:rounded-[28px]">جارِ التحميل...</Card>
      ) : pendingRequests.length === 0 ? (
        <Card className="rounded-[24px] p-8 text-center text-gray-500 sm:rounded-[28px]">
          لا توجد طلبات معلقة حالياً
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 sm:gap-4">
          {pendingRequests.map((req) => (
            <Card key={req.id} className="rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="break-all text-[18px] font-bold text-[#016564] sm:text-[20px]">
                      {req.code}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 sm:text-sm">
                      {req.department}
                    </div>
                  </div>

                  <span className="inline-flex w-full items-center justify-center rounded-full border border-[#d0b284]/40 bg-[#d0b284]/15 px-3 py-2 text-xs font-bold text-[#8a6a28] sm:w-auto sm:text-sm">
                    بانتظار الاعتماد
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="break-words font-semibold text-slate-800">
                    {req.requester?.fullName || 'غير معروف'}
                  </div>
                  <div className="break-words leading-7 text-slate-600">{req.purpose}</div>
                  <div className="text-xs text-slate-400">{formatDate(req.createdAt)}</div>
                </div>

                <div className="rounded-[20px] bg-slate-50 p-3 text-sm sm:rounded-[22px] sm:p-4">
                  <div className="mb-2 font-semibold text-slate-700">الأصناف</div>
                  <ul className="space-y-2 text-slate-600">
                    {req.items?.map((it) => (
                      <li key={it.id} className="break-words leading-7">
                        {it.item?.name || 'صنف'} × {it.quantity}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    className="w-full"
                    onClick={() => handleAction(req.id, 'approve')}
                    disabled={processingId === req.id}
                  >
                    اعتماد
                  </Button>

                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => handleAction(req.id, 'approve_and_issue')}
                    disabled={processingId === req.id}
                  >
                    اعتماد وصرف
                  </Button>

                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => handleAction(req.id, 'reject')}
                    disabled={processingId === req.id}
                  >
                    رفض
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}