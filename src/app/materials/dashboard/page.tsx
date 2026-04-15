'use client';

import { useEffect, useMemo, useState } from 'react';

type SummaryMetrics = {
  totalInventory: number;
  lowStock: number;
  outOfStock: number;
  availableInventory: number;
  returnableItems: number;
  consumableItems: number;
  pendingRequests: number;
  issuedRequests: number;
  rejectedRequests: number;
  pendingReturns: number;
  activeCustody: number;
  delayedCustody: number;
  unreadNotifications: number;
};

export default function MaterialsDashboardPage() {
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);

  useEffect(() => {
    fetch('/api/dashboard-summary', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => setMetrics(json?.metrics || null))
      .catch(() => setMetrics(null));
  }, []);

  const stockSeries = useMemo(() => {
    const data = [
      { label: 'متاحة', value: metrics?.availableInventory || 0, color: '#2A6364' },
      { label: 'منخفضة', value: metrics?.lowStock || 0, color: '#C7B08C' },
      { label: 'نافدة', value: metrics?.outOfStock || 0, color: '#73384B' },
    ];
    const total = Math.max(data.reduce((sum, item) => sum + item.value, 0), 1);
    return { data, total };
  }, [metrics]);

  const flowSeries = [
    { label: 'طلبات بانتظار الإجراء', value: metrics?.pendingRequests || 0 },
    { label: 'طلبات مصروفة', value: metrics?.issuedRequests || 0 },
    { label: 'طلبات إرجاع', value: metrics?.pendingReturns || 0 },
    { label: 'عهد نشطة', value: metrics?.activeCustody || 0 },
  ];
  const flowMax = Math.max(...flowSeries.map((i) => i.value), 1);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[#dde6e4] bg-white p-6 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-[12px] font-semibold text-[#97a5a4]">نظام المواد التدريبية</div>
            <h1 className="mt-2 text-[24px] font-bold text-[#223738]">لوحة معلومات المواد</h1>
            <p className="mt-2 text-[14px] text-[#6f8080]">مؤشرات تنفيذية لحالة الطلبات، المخزون، الإرجاعات، والعهد.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard title="إجمالي الأصناف" value={metrics?.totalInventory ?? 0} accent="#2A6364" />
            <MetricCard title="مواد متاحة" value={metrics?.availableInventory ?? 0} accent="#4F8F7A" />
            <MetricCard title="طلبات معلقة" value={metrics?.pendingRequests ?? 0} accent="#C7B08C" />
            <MetricCard title="إشعارات غير مقروءة" value={metrics?.unreadNotifications ?? 0} accent="#73384B" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-[#dde6e4] bg-white p-6 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-[#223738]">مسار التشغيل اليومي</h2>
            <span className="rounded-full bg-[#f5f8f8] px-3 py-1 text-[12px] text-[#6f8080]">طلبات وصرف وإرجاع</span>
          </div>
          <div className="space-y-4">
            {flowSeries.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-semibold text-[#2a4444]">{item.label}</span>
                  <span className="text-[#6f8080]">{item.value}</span>
                </div>
                <div className="h-3 rounded-full bg-[#eef3f3]">
                  <div className="h-3 rounded-full bg-[#2A6364]" style={{ width: `${(item.value / flowMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#dde6e4] bg-white p-6 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-[#223738]">حالة المخزون</h2>
            <span className="text-[12px] text-[#8b9999]">توزيع فوري</span>
          </div>
          <div className="flex items-center gap-5">
            <DonutChart series={stockSeries.data} total={stockSeries.total} />
            <div className="flex-1 space-y-3">
              {stockSeries.data.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-[#f8fbfb] px-3 py-2 text-[14px]">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-[#2a4444]">{item.label}</span>
                  </div>
                  <span className="text-[#6f8080]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickCard title="طلبات المواد" hint="الرفع والصرف" href="/materials/requests" />
        <QuickCard title="المخزون" hint="الأصناف والحركة" href="/materials/inventory" />
        <QuickCard title="المرتجعات" hint="متابعة الإرجاع" href="/materials/returns" />
        <QuickCard title="العهد" hint="العهد والتسليم" href="/materials/custody" />
      </section>
    </div>
  );
}

function MetricCard({ title, value, accent }: { title: string; value: number; accent: string }) {
  return (
    <div className="rounded-[22px] border border-[#e3ecea] bg-[#fbfcfc] px-4 py-4 text-center">
      <div className="text-[12px] font-semibold text-[#90a0a0]">{title}</div>
      <div className="mt-3 text-[34px] font-bold" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function DonutChart({ series, total }: { series: { label: string; value: number; color: string }[]; total: number }) {
  let current = 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-[150px] w-[150px] shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#eef3f3" strokeWidth="14" />
        {series.map((item) => {
          const dash = (item.value / total) * circumference;
          const el = (
            <circle key={item.label} cx="70" cy="70" r={radius} fill="none" stroke={item.color} strokeWidth="14" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-current} strokeLinecap="round" />
          );
          current += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">
        <div>
          <div className="text-[11px] text-[#8b9999]">الإجمالي</div>
          <div className="text-[28px] font-bold text-[#223738]">{total}</div>
        </div>
      </div>
    </div>
  );
}

function QuickCard({ title, hint, href }: { title: string; hint: string; href: string }) {
  return (
    <a href={href} className="rounded-[24px] border border-[#dde6e4] bg-white px-5 py-5 shadow-[0_14px_32px_-32px_rgba(15,23,42,0.3)] transition hover:-translate-y-0.5 hover:border-[#cfe0dc]">
      <div className="text-[18px] font-bold text-[#223738]">{title}</div>
      <div className="mt-2 text-[13px] text-[#7b8c8c]">{hint}</div>
    </a>
  );
}
