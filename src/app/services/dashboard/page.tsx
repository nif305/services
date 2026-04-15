'use client';

import { useEffect, useMemo, useState } from 'react';

type SummaryMetrics = {
  maintenancePending: number;
  cleaningPending: number;
  purchasePending: number;
  otherPending: number;
  unreadNotifications: number;
};

export default function ServicesDashboardPage() {
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);

  useEffect(() => {
    fetch('/api/dashboard-summary', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => setMetrics(json?.metrics || null))
      .catch(() => setMetrics(null));
  }, []);

  const series = useMemo(
    () => [
      { label: 'الصيانة', value: metrics?.maintenancePending ?? 0, color: '#0f5e61' },
      { label: 'النظافة', value: metrics?.cleaningPending ?? 0, color: '#4f8f7a' },
      { label: 'الشراء المباشر', value: metrics?.purchasePending ?? 0, color: '#c3a66f' },
      { label: 'الطلبات الأخرى', value: metrics?.otherPending ?? 0, color: '#7c1e3e' },
    ],
    [metrics]
  );

  const total = series.reduce((sum, item) => sum + item.value, 0);
  const maxVal = Math.max(...series.map((item) => item.value), 1);

  const quickActions = [
    { title: 'بوابة الطلبات', hint: 'رفع طلبات الخدمة ومتابعتها', href: '/services/requests' },
    { title: 'اعتماد الطلبات', hint: 'قرارات المدير والموافقات', href: '/services/approvals' },
    { title: 'المراسلات الخارجية', hint: 'مسودات البريد ومتابعتها', href: '/services/email-drafts' },
    { title: 'المراسلات الداخلية', hint: 'تواصل رسمي داخلي', href: '/services/messages' },
  ];

  const priorityCards = [
    {
      title: 'طلبات الصيانة',
      value: metrics?.maintenancePending ?? 0,
      hint: 'متابعة البلاغات والأعمال المفتوحة',
      href: '/services/maintenance',
      accent: 'from-[#0f5e61] to-[#4b7f81]',
    },
    {
      title: 'طلبات النظافة',
      value: metrics?.cleaningPending ?? 0,
      hint: 'مهام التشغيل والخدمة اليومية',
      href: '/services/cleaning',
      accent: 'from-[#3e8370] to-[#7ea493]',
    },
    {
      title: 'الشراء المباشر',
      value: metrics?.purchasePending ?? 0,
      hint: 'طلبات تحتاج تنسيقًا أو تعميدًا',
      href: '/services/purchases',
      accent: 'from-[#8a6a37] to-[#c3a66f]',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_24px_56px_-40px_rgba(15,23,42,0.28)]">
        <div className="grid gap-6 p-6 xl:grid-cols-[1.05fr_0.95fr] xl:p-7">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#7c1e3e_0%,#8e5366_52%,#2a6d6b_100%)] px-6 py-6 text-white shadow-[0_22px_48px_-34px_rgba(124,30,62,0.52)]">
            <div className="text-[12px] text-white/70">نظام طلب الخدمات</div>
            <h1 className="mt-3 text-[32px] font-extrabold leading-tight">لوحة تشغيل الخدمات</h1>
            <p className="mt-3 max-w-[620px] text-[15px] leading-8 text-white/84">
              لوحة تفاعلية لإدارة طلبات الصيانة والنظافة والشراء المباشر والمراسلات، مع
              إبراز الطلبات التي تحتاج قرارًا أو متابعة مباشرة.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroMetric title="إجمالي الطلبات الحالية" value={total} />
              <HeroMetric title="إشعارات غير مقروءة" value={metrics?.unreadNotifications ?? 0} />
              <HeroMetric title="طلبات أخرى" value={metrics?.otherPending ?? 0} />
            </div>
          </div>

          <div className="grid gap-4">
            {priorityCards.map((card) => (
              <a
                key={card.title}
                href={card.href}
                className={`rounded-[26px] bg-gradient-to-l ${card.accent} px-5 py-5 text-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.36)] transition hover:-translate-y-1`}
              >
                <div className="text-[12px] text-white/72">أولوية تشغيل</div>
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

      <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-[30px] border border-[#dde6e4] bg-white p-6 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[22px] font-extrabold text-[#223738]">الوصول السريع</h2>
            <span className="rounded-full bg-[#f3f7f6] px-3 py-1 text-[12px] text-[#6f8080]">
              أدوات تشغيل مباشرة
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
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

        <div className="rounded-[30px] border border-[#dde6e4] bg-white p-6 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[22px] font-extrabold text-[#223738]">حجم العمل الحالي</h2>
            <a href="/services/reports" className="text-[13px] font-semibold text-[#0f5e61]">
              عرض التقارير
            </a>
          </div>

          <div className="space-y-4">
            {series.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-semibold text-[#2a4444]">{item.label}</span>
                  <span className="text-[#6f8080]">{item.value}</span>
                </div>
                <div className="h-3 rounded-full bg-[#edf3f2]">
                  <div
                    className="h-3 rounded-full"
                    style={{ width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-[#e4eceb] bg-[#f8fbfb] p-5">
            <div className="text-[12px] font-semibold text-[#8a9a98]">قراءة تنفيذية</div>
            <div className="mt-3 text-[24px] font-extrabold text-[#223738]">{total}</div>
            <div className="mt-2 text-[14px] leading-7 text-[#6f8080]">
              إجمالي الطلبات المفتوحة حاليًا عبر مسارات الخدمات المختلفة، مع تركيز على
              ما يحتاج اعتمادًا أو متابعة تشغيلية فورية.
            </div>
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
