'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

type TopItemRow = {
  itemId: string;
  name: string;
  code: string;
  quantity: number;
};

type TopUserRow = {
  userId: string;
  fullName: string;
  department: string;
  quantity: number;
};

type ExecutiveSummary = {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  activeCustody: number;
  activeCustodyQuantity: number;
  pendingRequests: number;
  rejectedRequests: number;
  totalIssuedRequests: number;
  totalReturnedRequests: number;
  totalIssuedQuantityYTD: number;
  totalConsumedQuantityYTD: number;
  totalReturnedQuantityYTD: number;
  healthPercentage: number;
  topConsumedItems: TopItemRow[];
  topIssuedUsers: TopUserRow[];
  userConsumption: TopUserRow[];
};

function NumberCard({ title, value, hint }: { title: string; value: number; hint?: string }) {
  return (
    <Card className="rounded-[20px] border border-[#d6d7d4] p-4 shadow-none sm:rounded-2xl">
      <div className="text-[12px] text-[#6f7b7a]">{title}</div>
      <div className="mt-2 text-[26px] font-extrabold leading-none text-[#016564]">{value}</div>
      {hint ? <div className="mt-2 text-xs leading-6 text-[#61706f]">{hint}</div> : null}
    </Card>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchSummary() {
      setLoading(true);
      try {
        const res = await fetch('/api/reports/summary', { cache: 'no-store' });
        const json = await res.json();
        if (mounted) setData(json || null);
      } catch {
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchSummary();
    return () => {
      mounted = false;
    };
  }, []);

  const healthTone = useMemo(() => {
    const value = data?.healthPercentage || 0;
    if (value >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (value >= 60) return 'text-[#8a6a28] bg-[#d0b284]/10 border-[#d0b284]/30';
    return 'text-[#7c1e3e] bg-[#7c1e3e]/10 border-[#7c1e3e]/20';
  }, [data]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">التقارير</h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
            لوحة تنفيذية موحدة تعرض صحة المخزون وحركة الطلبات والعهد والمستهلكات خلال العام الجاري.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <Skeleton key={item} className="h-28 rounded-[24px]" />
          ))}
        </div>
      ) : !data ? (
        <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm sm:rounded-[28px]">
          تعذر تحميل بيانات التقارير حاليًا
        </Card>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <NumberCard title="إجمالي أصناف المخزون" value={data.totalItems} hint="جميع الأصناف المسجلة في النظام" />
            <NumberCard title="منخفضة المخزون" value={data.lowStockItems} hint="تحتاج مراجعة وتموين قريب" />
            <NumberCard title="نافدة" value={data.outOfStockItems} hint="أصناف غير متاحة حاليًا" />
            <Card className="rounded-[20px] border p-4 shadow-none sm:rounded-2xl">
              <div className="text-[12px] text-[#6f7b7a]">صحة المخزون</div>
              <div className={`mt-3 inline-flex rounded-full border px-4 py-2 text-lg font-extrabold ${healthTone}`}>
                {data.healthPercentage}%
              </div>
              <div className="mt-2 text-xs leading-6 text-[#61706f]">نسبة الأصناف المستقرة مقارنة بإجمالي المخزون</div>
            </Card>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <NumberCard title="طلبات تنتظر الاعتماد" value={data.pendingRequests} hint="طلبات المواد المفتوحة" />
            <NumberCard title="طلبات تم صرفها" value={data.totalIssuedRequests} hint="طلبات منجزة خلال العام الجاري" />
            <NumberCard title="طلبات الإرجاع" value={data.totalReturnedRequests} hint="طلبات إرجاع مكتملة" />
            <NumberCard title="طلبات مرفوضة" value={data.rejectedRequests} hint="تتطلب تحليل سبب الرفض" />
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <NumberCard title="إجمالي الكميات المصروفة" value={data.totalIssuedQuantityYTD} hint="إجمالي الوحدات المصروفة هذا العام" />
            <NumberCard title="إجمالي المستهلكات" value={data.totalConsumedQuantityYTD} hint="الكمية المصروفة من المواد الاستهلاكية" />
            <NumberCard title="إجمالي الكميات المعادة" value={data.totalReturnedQuantityYTD} hint="الوحدات التي عادت للمخزون" />
            <NumberCard title="العهد النشطة" value={data.activeCustody} hint={`إجمالي الكميات بالعهد: ${data.activeCustodyQuantity}`} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5">
              <div className="text-lg font-extrabold text-[#016564]">أكثر الأصناف استهلاكًا</div>
              <div className="mt-4 space-y-3">
                {data.topConsumedItems.length ? data.topConsumedItems.map((item, index) => (
                  <div key={item.itemId} className="flex items-center justify-between rounded-2xl border border-[#e7ebea] px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#152625]">{index + 1}. {item.name}</div>
                      <div className="text-xs text-[#61706f]">{item.code}</div>
                    </div>
                    <div className="text-base font-extrabold text-[#016564]">{item.quantity}</div>
                  </div>
                )) : <div className="text-sm text-[#61706f]">لا توجد بيانات كافية</div>}
              </div>
            </Card>

            <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5">
              <div className="text-lg font-extrabold text-[#016564]">أكثر المستفيدين صرفًا</div>
              <div className="mt-4 space-y-3">
                {data.topIssuedUsers.length ? data.topIssuedUsers.map((item, index) => (
                  <div key={item.userId} className="flex items-center justify-between rounded-2xl border border-[#e7ebea] px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#152625]">{index + 1}. {item.fullName}</div>
                      <div className="text-xs text-[#61706f]">{item.department}</div>
                    </div>
                    <div className="text-base font-extrabold text-[#016564]">{item.quantity}</div>
                  </div>
                )) : <div className="text-sm text-[#61706f]">لا توجد بيانات كافية</div>}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
