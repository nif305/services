'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type SummaryResponse = {
  metrics?: {
    maintenancePending?: number;
    cleaningPending?: number;
    purchasePending?: number;
    otherPending?: number;
    unreadNotifications?: number;
  };
};

const quickLinks = [
  { href: '/services/maintenance', title: 'طلبات الصيانة', desc: 'الملاحظات الفنية والأعطال' },
  { href: '/services/cleaning', title: 'طلبات النظافة', desc: 'خدمات النظافة والتجهيز' },
  { href: '/services/purchases', title: 'الشراء المباشر', desc: 'طلبات الشراء والاحتياج' },
  { href: '/services/approvals', title: 'اعتماد الطلبات', desc: 'اعتماد، إعادة، أو رفض' },
  { href: '/services/email-drafts', title: 'المراسلات الخارجية', desc: 'مسودات البريد وملفات eml.' },
  { href: '/services/messages', title: 'المراسلات الداخلية', desc: 'تواصل رسمي داخلي' },
];

export default function ServicesDashboardPage() {
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
      { label: 'طلبات صيانة', value: summary?.maintenancePending ?? 0, tone: 'teal' },
      { label: 'طلبات نظافة', value: summary?.cleaningPending ?? 0, tone: 'green' },
      { label: 'شراء مباشر', value: summary?.purchasePending ?? 0, tone: 'gold' },
      { label: 'طلبات أخرى', value: summary?.otherPending ?? 0, tone: 'slate' },
    ],
    [summary]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[#dde5e3] bg-white p-6 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.2)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[13px] font-semibold text-[#8a9998]">نظام الخدمات العامة</div>
            <h1 className="mt-2 text-[30px] font-bold text-[#214344]">لوحة معلومات الخدمات</h1>
            <p className="mt-2 text-[15px] text-[#667978]">متابعة طلبات الخدمات والاعتمادات والمراسلات الخارجية من شاشة واحدة.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniInfo label="إشعارات غير مقروءة" value={summary?.unreadNotifications ?? 0} />
            <MiniInfo label="إجمالي طلبات الخدمات" value={(summary?.maintenancePending ?? 0)+(summary?.cleaningPending ?? 0)+(summary?.purchasePending ?? 0)+(summary?.otherPending ?? 0)} />
            <MiniInfo label="طلبات قيد المعالجة" value={(summary?.maintenancePending ?? 0)+(summary?.cleaningPending ?? 0)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="rounded-[28px] border border-[#dde5e3] bg-white p-6 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.2)]">
        <div className="mb-5">
          <h2 className="text-[22px] font-bold text-[#214344]">الوصول السريع</h2>
          <p className="mt-1 text-[14px] text-[#7b8b8a]">أهم المسارات التشغيلية داخل نظام الخدمات العامة.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    slate: 'bg-[#f2f5f5] text-[#4f6666]',
  };

  return (
    <div className="rounded-[24px] border border-[#dde5e3] bg-white px-5 py-5 shadow-[0_10px_28px_-26px_rgba(15,23,42,0.22)]">
      <div className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${tones[tone] || tones.teal}`}>{label}</div>
      <div className="mt-4 text-[34px] font-bold text-[#214344]">{value}</div>
    </div>
  );
}
