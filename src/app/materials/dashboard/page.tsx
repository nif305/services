'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

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
  const { user } = useAuth();
  const isEmployee = user?.role === 'user';

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

  const requestActions = useMemo(() => {
    if (user?.role === 'user') {
      return [
        {
          title: 'طلب جديد',
          hint: 'رفع طلب مواد من المخزن',
          href: '/materials/requests?new=1',
          icon: <RequestIcon />,
        },
        {
          title: 'المخزون',
          hint: 'استعراض الأصناف والكميات',
          href: '/materials/inventory',
          icon: <InventoryIcon />,
        },
        {
          title: 'المرتجعات',
          hint: 'طلبات الإرجاع والاستلام',
          href: '/materials/returns',
          icon: <ReturnIcon />,
        },
        {
          title: 'العهد',
          hint: 'العهد النشطة والمتأخرة',
          href: '/materials/custody',
          icon: <CustodyIcon />,
        },
      ];
    }

    if (user?.role === 'warehouse') {
      return [
        {
          title: 'طلبات الصرف',
          hint: 'تنفيذ الطلبات المعتمدة من المستودع',
          href: '/materials/requests',
          icon: <RequestIcon />,
        },
        {
          title: 'المخزون',
          hint: 'إدارة الأصناف والكميات والحالة',
          href: '/materials/inventory',
          icon: <InventoryIcon />,
        },
        {
          title: 'موافقة الإرجاع',
          hint: 'استلام المرتجعات وتوثيق حالتها',
          href: '/materials/returns',
          icon: <ReturnIcon />,
        },
        {
          title: 'العهد',
          hint: 'متابعة العهد المرتبطة بالمخزن',
          href: '/materials/custody',
          icon: <CustodyIcon />,
        },
      ];
    }

    return [
      {
        title: 'طلبات المواد',
        hint: 'متابعة جميع طلبات المواد والحالات',
        href: '/materials/requests',
        icon: <RequestIcon />,
      },
      {
        title: 'المخزون',
        hint: 'متابعة توفر الأصناف ومستوى المخزون',
        href: '/materials/inventory',
        icon: <InventoryIcon />,
      },
      {
        title: 'المرتجعات',
        hint: 'متابعة حالات الإرجاع والاستلام',
        href: '/materials/returns',
        icon: <ReturnIcon />,
      },
      {
        title: 'العهد',
        hint: 'متابعة العهد النشطة والمتأخرة',
        href: '/materials/custody',
        icon: <CustodyIcon />,
      },
    ];
  }, [user?.role]);

  const sectionTitle =
    user?.role === 'user' ? 'اختر نوع الإجراء' : user?.role === 'warehouse' ? 'مهام المستودع' : 'متابعة المواد';

  const primaryAction =
    user?.role === 'user'
      ? { label: 'طلب مواد جديد', href: '/materials/requests?new=1' }
      : user?.role === 'warehouse'
        ? { label: 'طلبات الصرف', href: '/materials/requests' }
        : { label: 'جميع طلبات المواد', href: '/materials/requests' };

  const workflow = [
    { label: 'طلبات بانتظار الإجراء', value: metrics?.pendingRequests ?? 0 },
    { label: 'طلبات مصروفة', value: metrics?.issuedRequests ?? 0 },
    { label: 'طلبات مرفوضة', value: metrics?.rejectedRequests ?? 0 },
    { label: 'عهد متأخرة', value: metrics?.delayedCustody ?? 0 },
  ];
  const workflowMax = Math.max(...workflow.map((item) => item.value), 1);

  return (
    <div className="space-y-5">
      {isEmployee ? (
        <section className="rounded-[26px] border border-white/80 bg-white p-5 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.2)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[12px] font-semibold text-[#8a9a98]">إجراءات النظام</div>
            <h2 className="mt-1.5 text-[22px] font-extrabold text-[#223738]">{sectionTitle}</h2>
          </div>
          <a
            href={primaryAction.href}
            className="inline-flex items-center justify-center rounded-[16px] bg-[#163e44] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#0f3337]"
          >
            {primaryAction.label}
          </a>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {requestActions.map((action) => (
            <a
              key={action.title}
              href={action.href}
              className="group rounded-[20px] border border-[#dde6e4] bg-[#fbfcfc] p-4 transition hover:-translate-y-0.5 hover:border-[#cfe0dc] hover:bg-white"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#eef5f4] text-[#0f5e61]">
                {action.icon}
              </div>
              <div className="mt-3 text-[18px] font-extrabold text-[#223738]">{action.title}</div>
              <div className="mt-1.5 text-[12px] leading-6 text-[#70807e]">{action.hint}</div>
            </a>
          ))}
        </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_20px_44px_-36px_rgba(15,23,42,0.22)]">
        <div className="grid gap-5 p-5 xl:grid-cols-[1.05fr_0.95fr] xl:p-6">
          <div className="rounded-[24px] bg-[linear-gradient(135deg,#0e5d61_0%,#698b8c_100%)] px-5 py-5 text-white shadow-[0_18px_40px_-32px_rgba(1,101,100,0.58)]">
            <div className="text-[12px] text-white/70">نظام طلب المواد من المخزن</div>
            <h1 className="mt-2.5 text-[25px] font-extrabold leading-tight">لوحة تشغيل المواد</h1>
            <p className="mt-2.5 max-w-[620px] text-[13px] leading-7 text-white/84">
              مركز متابعة يومي يربط بين حالة المخزون وطلبات الصرف والمرتجعات والعهد
              النشطة، مع وصول مباشر إلى أهم الإجراءات التنفيذية.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
                className={`rounded-[22px] bg-gradient-to-l ${card.accent} px-4 py-4 text-white shadow-[0_16px_32px_-30px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5`}
              >
                <div className="text-[12px] text-white/72">أولوية تنفيذ</div>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[19px] font-extrabold">{card.title}</div>
                    <div className="mt-1.5 text-[12px] text-white/82">{card.hint}</div>
                  </div>
                  <div className="text-[30px] font-extrabold leading-none">{card.value}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[26px] border border-[#dde6e4] bg-white p-5 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[19px] font-extrabold text-[#223738]">حالة المخزون</h2>
            <a href="/materials/inventory" className="text-[13px] font-semibold text-[#0f5e61]">
              فتح المخزون
            </a>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <DonutChart series={stockSeries.rows} total={stockSeries.total} />
            <div className="flex-1 space-y-3">
              {stockSeries.rows.map((item) => (
                <div key={item.label} className="rounded-[18px] border border-[#edf1f1] bg-[#f8fbfb] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[14px] font-semibold text-[#244141]">{item.label}</span>
                    </div>
                    <span className="text-[18px] font-extrabold text-[#223738]">{item.value}</span>
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

        <div className="rounded-[26px] border border-[#dde6e4] bg-white p-5 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[19px] font-extrabold text-[#223738]">مسار التنفيذ اليومي</h2>
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

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {quickActions.map((card) => (
              <a
                key={card.title}
                href={card.href}
                className="rounded-[18px] border border-[#dde6e4] bg-[#fbfcfc] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[#cfe0dc] hover:bg-white"
              >
                <div className="text-[16px] font-extrabold text-[#223738]">{card.title}</div>
                <div className="mt-1.5 text-[12px] leading-6 text-[#70807e]">{card.hint}</div>
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
    <div className="rounded-[18px] border border-white/12 bg-white/10 px-4 py-3.5 backdrop-blur-sm">
      <div className="text-[12px] text-white/70">{title}</div>
      <div className="mt-1.5 text-[24px] font-extrabold">{value}</div>
    </div>
  );
}

function MiniInsight({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-[#edf1f1] bg-[#fbfcfc] px-4 py-3.5 text-center">
      <div className="text-[12px] text-[#879795]">{title}</div>
      <div className="mt-1.5 text-[22px] font-extrabold text-[#223738]">{value}</div>
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
    <div className="relative h-[154px] w-[154px] shrink-0 self-center">
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
          <div className="text-[24px] font-extrabold text-[#223738]">{total}</div>
        </div>
      </div>
    </div>
  );
}

function RequestIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="M7 4h7l3 3v13H7V4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 4v4h4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 12h4M10 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="M4 7.5 12 3l8 4.5-8 4.5L4 7.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7.5V16.5L12 21l8-4.5V7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 12v9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="M8 8H5V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 8c1.8-2.4 4-3.5 7-3.5 4.7 0 8 3.3 8 8s-3.3 8-8 8c-3.3 0-5.8-1.3-7.5-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CustodyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="M4 7.5 12 3l8 4.5-8 4.5L4 7.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7.5V16.5L12 21l8-4.5V7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 12.5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
