'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type SummaryResponse = {
  metrics?: {
    totalInventory?: number;
    availableInventory?: number;
    lowStock?: number;
    outOfStock?: number;
    pendingRequests?: number;
    issuedRequests?: number;
    pendingReturns?: number;
    activeCustody?: number;
    delayedCustody?: number;
    unreadNotifications?: number;
  };
};

const quickLinks = [
  { href: '/materials/requests', title: 'طلبات المواد', desc: 'رفع الطلب ومتابعته حتى الصرف أو الإرجاع' },
  { href: '/materials/inventory', title: 'المخزون', desc: 'متابعة الأصناف، الجاهزية، وحركة المخزون' },
  { href: '/materials/returns', title: 'المرتجعات', desc: 'متابعة الإرجاع والاستلام' },
  { href: '/materials/custody', title: 'العهد', desc: 'العهد والتسليم' },
  { href: '/materials/messages', title: 'المراسلات الداخلية', desc: 'تواصل رسمي داخلي' },
];

export default function MaterialsDashboardPage() {
  const [summary, setSummary] = useState<SummaryResponse['metrics']>({});

  useEffect(() => {
    let active = true;
    fetch('/api/dashboard-summary', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: SummaryResponse) => {
        if (active) setSummary(data.metrics || {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: 'طلبات بانتظار الإجراء', value: summary?.pendingRequests ?? 0, tone: 'teal' },
      { label: 'مواد متاحة', value: summary?.availableInventory ?? 0, tone: 'green' },
      { label: 'مواد منخفضة', value: summary?.lowStock ?? 0, tone: 'gold' },
      { label: 'مواد نافدة', value: summary?.outOfStock ?? 0, tone: 'rose' },
      { label: 'طلبات مصروفة', value: summary?.issuedRequests ?? 0, tone: 'blue' },
      { label: 'طلبات إرجاع', value: summary?.pendingReturns ?? 0, tone: 'amber' },
      { label: 'عهد نشطة', value: summary?.activeCustody ?? 0, tone: 'slate' },
      { label: 'عهد متأخرة', value: summary?.delayedCustody ?? 0, tone: 'rose' },
    ],
    [summary]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[#dde5e3] bg-white p-6 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.2)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[13px] font-semibold text-[#8a9998]">نظام المواد التدريبية</div>
            <h1 className="mt-2 text-[30px] font-bold text-[#214344]">لوحة معلومات المواد</h1>
            <p className="mt-2 text-[15px] text-[#667978]">متابعة حالة الطلبات، المخزون، المرتجعات، والعهد في شاشة تنفيذية واحدة.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniInfo label="إجمالي الأصناف" value={summary?.totalInventory ?? 0} />
            <MiniInfo label="إشعارات غير مقروءة" value={summary?.unreadNotifications ?? 0} />
            <MiniInfo label="مواد متاحة" value={summary?.availableInventory ?? 0} />
            <MiniInfo label="طلبات مصروفة" value={summary?.issuedRequests ?? 0} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="rounded-[28px] border border-[#dde5e3] bg-white p-6 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.2)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[22px] font-bold text-[#214344]">الوصول السريع</h2>
            <p className="mt-1 text-[14px] text-[#7b8b8a]">أهم المسارات التشغيلية داخل نظام المواد.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {quickLinks.map((card) => (
            <Link key={card.href} href={card.href} className="rounded-[22px] border border-[#e2e9e7] bg-[#fbfcfc] px-5 py-5 transition hover:-translate-y-0.5 hover:border-[#2A6364]/30 hover:shadow-[0_12px_28px_-24px_rgba(15,23,42,0.25)]">
              <h3 className="text-[20px] font-bold text-[#214344]">{card.title}</h3>
              <p className="mt-2 text-[14px] leading-7 text-[#778685]">{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-[#e3e9e7] bg-[#fbfcfc] px-4 py-3 text-center">
      <div className="text-[13px] text-[#889695]">{label}</div>
      <div className="mt-1 text-[22px] font-bold text-[#214344]">{value}</div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  const tones: Record<string, string> = {
    teal: 'bg-[#eef7f6] text-[#2A6364]',
    green: 'bg-[#eef5ef] text-[#35624f]',
    gold: 'bg-[#fbf6ea] text-[#8b6c2f]',
    rose: 'bg-[#fbf0f2] text-[#8f4158]',
    blue: 'bg-[#eef4f8] text-[#35647d]',
    amber: 'bg-[#fff6ea] text-[#9a6828]',
    slate: 'bg-[#f2f5f5] text-[#4f6666]',
  };

  return (
    <div className="rounded-[24px] border border-[#dde5e3] bg-white px-5 py-5 shadow-[0_10px_28px_-26px_rgba(15,23,42,0.22)]">
      <div className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${tones[tone] || tones.teal}`}>{label}</div>
      <div className="mt-4 text-[34px] font-bold text-[#214344]">{value}</div>
    </div>
  );
}
