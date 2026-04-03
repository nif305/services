'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type SummaryResponse = {
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
  topConsumedItems: { itemId: string; name: string; code: string; quantity: number }[];
  topIssuedUsers: { userId: string; fullName: string; department: string; quantity: number }[];
  userConsumption: { userId: string; fullName: string; department: string; quantity: number }[];
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/reports/summary', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (mounted) setData(json && !json.error ? json : null);
      } catch {
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const topItems = useMemo(() => (data?.topConsumedItems || []).filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(normalizedSearch)), [data, normalizedSearch]);
  const topUsers = useMemo(() => (data?.topIssuedUsers || []).filter((item) => `${item.fullName} ${item.department}`.toLowerCase().includes(normalizedSearch)), [data, normalizedSearch]);
  const consumptionUsers = useMemo(() => (data?.userConsumption || []).filter((item) => `${item.fullName} ${item.department}`.toLowerCase().includes(normalizedSearch)), [data, normalizedSearch]);

  if (user?.role !== 'manager') {
    return <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-700">غير مصرح لك بالوصول لهذه الصفحة</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">التقارير التنفيذية</h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">لوحة قيادية مختصرة تلخّص وضع المخزون والطلبات والعهد والإرجاعات، مع أبرز المواد والمستفيدين خلال العام الحالي.</p>
        </div>
        {loading || !data ? (
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              ['إجمالي الأصناف', data.totalItems, '#016564'],
              ['منخفضة المخزون', data.lowStockItems, '#d0b284'],
              ['النافدة', data.outOfStockItems, '#7c1e3e'],
              ['صحة المخزون %', `${data.healthPercentage}%`, '#498983'],
              ['الطلبات المعلقة', data.pendingRequests, '#016564'],
              ['الطلبات المصروفة', data.totalIssuedRequests, '#498983'],
              ['الإرجاعات المعتمدة', data.totalReturnedRequests, '#d0b284'],
              ['العهد النشطة', data.activeCustody, '#7c1e3e'],
            ].map(([label, value, color]) => (
              <Card key={String(label)} className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none">
                <div className="text-[12px] text-[#6f7b7a]">{label}</div>
                <div className="mt-1 text-[22px] font-extrabold" style={{ color: String(color) }}>{value}</div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <Input label="بحث داخل الجداول" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اسم الصنف أو المستفيد أو الكود" />
      </section>

      {loading || !data ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-56 rounded-[24px]" />)}</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
            <h3 className="text-lg font-extrabold text-[#016564]">أكثر الأصناف استهلاكًا</h3>
            <div className="mt-4 space-y-3">
              {topItems.length ? topItems.map((item) => (
                <div key={item.itemId} className="rounded-2xl border border-[#e7ebea] p-3">
                  <div className="font-bold text-[#152625]">{item.name}</div>
                  <div className="mt-1 text-sm text-[#61706f]">{item.code}</div>
                  <div className="mt-2 text-sm font-semibold text-[#016564]">الكمية: {item.quantity}</div>
                </div>
              )) : <div className="text-sm text-[#61706f]">لا توجد بيانات مطابقة</div>}
            </div>
          </Card>

          <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
            <h3 className="text-lg font-extrabold text-[#016564]">أكثر المستفيدين صرفًا</h3>
            <div className="mt-4 space-y-3">
              {topUsers.length ? topUsers.map((item) => (
                <div key={item.userId} className="rounded-2xl border border-[#e7ebea] p-3">
                  <div className="font-bold text-[#152625]">{item.fullName}</div>
                  <div className="mt-1 text-sm text-[#61706f]">{item.department}</div>
                  <div className="mt-2 text-sm font-semibold text-[#016564]">إجمالي الكميات: {item.quantity}</div>
                </div>
              )) : <div className="text-sm text-[#61706f]">لا توجد بيانات مطابقة</div>}
            </div>
          </Card>

          <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
            <h3 className="text-lg font-extrabold text-[#016564]">استهلاك المستخدمين للمواد المستهلكة</h3>
            <div className="mt-4 space-y-3">
              {consumptionUsers.length ? consumptionUsers.map((item) => (
                <div key={item.userId} className="rounded-2xl border border-[#e7ebea] p-3">
                  <div className="font-bold text-[#152625]">{item.fullName}</div>
                  <div className="mt-1 text-sm text-[#61706f]">{item.department}</div>
                  <div className="mt-2 text-sm font-semibold text-[#016564]">إجمالي الاستهلاك: {item.quantity}</div>
                </div>
              )) : <div className="text-sm text-[#61706f]">لا توجد بيانات مطابقة</div>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
