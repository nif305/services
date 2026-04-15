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
    const rows = [
      { label: 'متاحة', value: metrics?.availableInventory ?? 0, color: '#0f5e61' },
      { label: 'منخفضة', value: metrics?.lowStock ?? 0, color: '#c3a66f' },
      { label: 'نافدة', value: metrics?.outOfStock ?? 0, color: '#7c1e3e' },
    ];
    const total = Math.max(rows.reduce((sum, item) => sum + item.value, 0), 1);
    return { rows, total };
  }, [metrics]);

  const actionCards = [
    {
      title: 'طلبات تحتاج صرفًا',
      value: metrics?.pendingRequests ?? 0,
      hint: 'قائمة التنفيذ اليومية للمستودع',
      href: '/materials/requests',
      accent: 'from-[#0f5e61] to-[#41797a]',
    },
    {
      title: 'مرتجعات معلقة',
      value: metrics?.pendingReturns ?? 0,
      hint: 'طلبات إرجاع بانتظار الاستلام',
      href: '/materials/returns',
      accent: 'from-[#8a6a37] to-[#c3a66f]',
    },
    {
      title: 'عهد نشطة',
      value: metrics?.activeCustody ?? 0,
      hint: 'مواد لدى الموظفين تحتاج متابعة',
      href: '/materials/custody',
      accent: 'from-[#1b4f68] to-[#5f8fa2]',
    },
  ];

  const quickActions = [
    { title: 'طلبات المواد', hint: 'رفع ومراجعة وصرف الطلبات', href: '/materials/requests' },
    { title: 'المخزون', hint: 'إدارة الأصناف والكميات والحالة', href: '/materials/inventory' },
    { title: 'المرتجعات', hint: 'استلام الإرجاع وتوثيق الحالة', href: '/materials/returns' },
    { title: 'العهد', hint: 'متابعة العهد النشطة والمتأخرة', href: '/materials/custody' },
  ];

  const workflow = [
    { label: 'طلبات بانتظار الإجراء', value: metrics?.pendingRequests ?? 0 },
    { label: 'طلبات مصروفة', value: metrics?.issuedRequests ?? 0 },
    { label: 'طلبات مرفوضة', value: metrics?.rejectedRequests ?? 0 },
    { label: 'عهد متأخرة', value: metrics?.delayedCustody ?? 0 },
  ];
  const workflowMax = Math.max(...workflow.map((item) => item.value), 1);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_24px_56px_-40px_rgba(15,23,42,0.28)]">
        <div className="grid gap-6 p-6 xl:grid-cols-[1.05fr_0.95fr] xl:p-7">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#0e5d61_0%,#698b8c_100%)] px-6 py-6 text-white shadow-[0_22px_48px_-34px_rgba(1,101,100,0.72)]">
            <div className="text-[12px] text-white/70">نظام طلب المواد من المخزن</div>
            <h1 className="mt-3 text-[32px] font-extrabold leading-tight">لوحة تشغيل المواد</h1>
            <p className="mt-3 max-w-[620px] text-[15px] leading-8 text-white/84">
              مركز متابعة يومي يربط بين حالة المخزون وطلبات الصرف والمرتجعات والعهد
              النشطة، مع وصول مباشر إلى أهم الإجراءات التنفيذية.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroMetric title="إجمالي الأصناف" value={metrics?.totalInventory ?? 0} />
              <HeroMetric title="مواد متاحة" value={metrics?.availableInventory ?? 0} />
              <HeroMetric title="إشعارات غير مقروءة" value={metrics?.unreadNotifications ?? 0} />
            </div>
          </div>

          <div className="grid gap-4">
            {actionCards.map((card) => (
              <a
                key={card.title}
                href={card.href}
                className={`rounded-[26px] bg-gradient-to-l ${card.accent} px-5 py-5 text-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.36)] transition hover:-translate-y-1`}
              >
                <div className="text-[12px] text-white/72">أولوية تنفيذ</div>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[24px] font-extrabold">{card.title}</div>
                    <div className="mt-2 text-[13px] text-white/82">{card.hint}</div>
                  </div>
                  <div className="text-[40px] font-extrabold leading-none">{card.value}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[30px] border border-[#dde6e4] bg-white p-6 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[22px] font-extrabold text-[#223738]">حالة المخزون</h2>
            <a href="/materials/inventory" className="text-[13px] font-semibold text-[#0f5e61]">
              فتح المخزون
            </a>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <DonutChart series={stockSeries.rows} total={stockSeries.total} />
            <div className="flex-1 space-y-3">
              {stockSeries.rows.map((item) => (
                <div key={item.label} className="rounded-[20px] border border-[#edf1f1] bg-[#f8fbfb] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[15px] font-semibold text-[#244141]">{item.label}</span>
                    </div>
                    <span className="text-[22px] font-extrabold text-[#223738]">{item.value}</span>
                  </div>
                </div>
              ))}

              <div className="grid gap-3 sm:grid-cols-2">
                <MiniInsight title="مواد مسترجعة" value={metrics?.returnableItems ?? 0} />
                <MiniInsight title="مواد استهلاكية" value={metrics?.consumableItems ?? 0} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-[#dde6e4] bg-white p-6 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[22px] font-extrabold text-[#223738]">مسار التنفيذ اليومي</h2>
            <span className="rounded-full bg-[#f3f7f6] px-3 py-1 text-[12px] text-[#6f8080]">
              تشغيل حي قابل للتنفيذ
            </span>
          </div>

          <div className="space-y-4">
            {workflow.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-semibold text-[#2a4444]">{item.label}</span>
                  <span className="text-[#6f8080]">{item.value}</span>
                </div>
                <div className="h-3 rounded-full bg-[#edf3f2]">
                  <div
                    className="h-3 rounded-full bg-[#0f5e61]"
                    style={{ width: `${(item.value / workflowMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {quickActions.map((card) => (
              <a
                key={card.title}
                href={card.href}
                className="rounded-[22px] border border-[#dde6e4] bg-[#fbfcfc] px-5 py-5 transition hover:-translate-y-0.5 hover:border-[#cfe0dc] hover:bg-white"
              >
                <div className="text-[18px] font-extrabold text-[#223738]">{card.title}</div>
                <div className="mt-2 text-[13px] leading-7 text-[#70807e]">{card.hint}</div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroMetric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
      <div className="text-[12px] text-white/70">{title}</div>
      <div className="mt-2 text-[32px] font-extrabold">{value}</div>
    </div>
  );
}

function MiniInsight({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[20px] border border-[#edf1f1] bg-[#fbfcfc] px-4 py-4 text-center">
      <div className="text-[12px] text-[#879795]">{title}</div>
      <div className="mt-2 text-[28px] font-extrabold text-[#223738]">{value}</div>
    </div>
  );
}

function DonutChart({
  series,
  total,
}: {
  series: { label: string; value: number; color: string }[];
  total: number;
}) {
  let current = 0;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-[170px] w-[170px] shrink-0 self-center">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#eaf0ef" strokeWidth="16" />
        {series.map((item) => {
          const dash = (item.value / total) * circumference;
          const circle = (
            <circle
              key={item.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-current}
              strokeLinecap="round"
            />
          );
          current += dash;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">
        <div>
          <div className="text-[11px] text-[#8b9999]">إجمالي الحالة</div>
          <div className="text-[30px] font-extrabold text-[#223738]">{total}</div>
        </div>
      </div>
    </div>
  );
}
