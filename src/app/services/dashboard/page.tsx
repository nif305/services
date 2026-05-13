'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/hooks/useI18n';
import { translateStaticUiText } from '@/lib/i18n';

type SummaryMetrics = {
  serviceRequestsTotal: number;
  serviceApproved: number;
  serviceImplemented: number;
  serviceRejected: number;
  maintenanceTotal: number;
  maintenancePending: number;
  cleaningTotal: number;
  cleaningPending: number;
  purchaseTotal: number;
  purchasePending: number;
  otherTotal: number;
  otherPending: number;
  emailDraftsTotal: number;
  activeEmailDrafts: number;
  unreadNotifications: number;
};

export default function ServicesDashboardPage() {
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { language } = useI18n();
  const isEmployee = user?.role === 'user';
  const ui = (source: string) => translateStaticUiText(source, language);
  const serviceRequestsTotal =
    metrics?.serviceRequestsTotal ??
    ((metrics?.maintenancePending ?? 0) +
      (metrics?.cleaningPending ?? 0) +
      (metrics?.purchasePending ?? 0) +
      (metrics?.otherPending ?? 0));
  const pendingServicesTotal =
    (metrics?.maintenancePending ?? 0) +
    (metrics?.cleaningPending ?? 0) +
    (metrics?.purchasePending ?? 0) +
    (metrics?.otherPending ?? 0);

  useEffect(() => {
    let mounted = true;
    const headers = user?.role ? { 'x-active-role': user.role } : undefined;

    fetch(`/api/dashboard-summary?scope=global&ts=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store',
      headers,
    })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json?.error || 'Unable to load dashboard summary');
        return json;
      })
      .then((json) => {
        if (mounted) setMetrics(json?.metrics || null);
      })
      .catch(() => {
        // Keep any successful summary already shown instead of silently
        // falling back to zeros during auth/session refresh races.
      });

    return () => {
      mounted = false;
    };
  }, [authLoading, user?.id, user?.role]);

  const series = useMemo(
    () => [
      { label: ui('الصيانة'), value: metrics?.maintenanceTotal ?? metrics?.maintenancePending ?? 0, color: '#0f5e61' },
      { label: ui('النظافة'), value: metrics?.cleaningTotal ?? metrics?.cleaningPending ?? 0, color: '#4f8f7a' },
      { label: ui('الشراء المباشر'), value: metrics?.purchaseTotal ?? metrics?.purchasePending ?? 0, color: '#c3a66f' },
      { label: ui('الطلبات الأخرى'), value: metrics?.otherTotal ?? metrics?.otherPending ?? 0, color: '#7c1e3e' },
    ],
    [metrics, language]
  );

  const total = serviceRequestsTotal || series.reduce((sum, item) => sum + item.value, 0);
  const maxVal = Math.max(...series.map((item) => item.value), 1);

  const quickActions = [
    { title: ui('بوابة الطلبات'), hint: ui('رفع طلبات الخدمة ومتابعتها'), href: '/services/requests' },
    { title: ui('اعتماد الطلبات'), hint: ui('قرارات المدير والموافقات'), href: '/services/approvals' },
    { title: ui('المراسلات الخارجية'), hint: ui('مسودات البريد ومتابعتها'), href: '/services/email-drafts' },
    { title: ui('المراسلات الداخلية'), hint: ui('تواصل رسمي داخلي'), href: '/services/messages' },
  ];

  const requestActions = useMemo(() => {
    if (user?.role === 'user') {
      return [
        {
          title: ui('طلب صيانة'),
          hint: ui('رفع طلب أعمال الصيانة'),
          href: '/services/maintenance?new=1',
          icon: <MaintenanceIcon />,
        },
        {
          title: ui('طلب نظافة'),
          hint: ui('رفع طلب خدمات النظافة'),
          href: '/services/cleaning?new=1',
          icon: <CleaningIcon />,
        },
        {
          title: ui('شراء مباشر'),
          hint: ui('رفع طلب شراء مباشر'),
          href: '/services/purchases?new=1',
          icon: <PurchaseIcon />,
        },
        {
          title: ui('طلب آخر'),
          hint: ui('رفع طلب خدمات عامة أخرى'),
          href: '/services/other?new=1',
          icon: <MessagesIcon />,
        },
      ];
    }

    return [
      {
        title: ui('بوابة الطلبات'),
        hint: ui('متابعة جميع طلبات الخدمات'),
        href: '/services/requests',
        icon: <MaintenanceIcon />,
      },
      {
        title: ui('اعتماد الطلبات'),
        hint: ui('الطلبات التي تحتاج قراراً أو موافقة'),
        href: '/services/approvals',
        icon: <PurchaseIcon />,
      },
      {
        title: ui('المراسلات الخارجية'),
        hint: ui('مسودات البريد ومتابعتها'),
        href: '/services/email-drafts',
        icon: <MessagesIcon />,
      },
      {
        title: ui('المراسلات الداخلية'),
        hint: ui('التواصل الرسمي داخل النظام'),
        href: '/services/messages',
        icon: <MessagesIcon />,
      },
    ];
  }, [user?.role, language]);

  const sectionTitle = user?.role === 'user' ? ui('اختر نوع الطلب') : ui('متابعة الخدمات');
  const primaryAction =
    user?.role === 'user'
      ? { label: ui('بوابة الطلبات'), href: '/services/requests' }
      : { label: ui('اعتماد الطلبات'), href: '/services/approvals' };

  const priorityCards = [
    {
      title: ui('طلبات الصيانة'),
      value: metrics?.maintenanceTotal ?? metrics?.maintenancePending ?? 0,
      hint: ui('إجمالي طلبات الصيانة'),
      href: '/services/maintenance',
      accent: 'from-[#0f5e61] to-[#4b7f81]',
    },
    {
      title: ui('طلبات النظافة'),
      value: metrics?.cleaningTotal ?? metrics?.cleaningPending ?? 0,
      hint: ui('إجمالي طلبات النظافة'),
      href: '/services/cleaning',
      accent: 'from-[#3e8370] to-[#7ea493]',
    },
    {
      title: ui('الشراء المباشر'),
      value: metrics?.purchaseTotal ?? metrics?.purchasePending ?? 0,
      hint: ui('إجمالي طلبات الشراء المباشر'),
      href: '/services/purchases',
      accent: 'from-[#8a6a37] to-[#c3a66f]',
    },
    {
      title: ui('طلبات أخرى'),
      value: metrics?.otherTotal ?? metrics?.otherPending ?? 0,
      hint: ui('إجمالي الطلبات الأخرى'),
      href: '/services/other',
      accent: 'from-[#63344c] to-[#8e5366]',
    },
  ];

  return (
    <div className="space-y-5">
      {isEmployee ? (
        <section className="rounded-[26px] border border-white/80 bg-white p-5 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.2)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[12px] font-semibold text-[#8a9a98]">{ui('إجراءات النظام')}</div>
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
          <div className="rounded-[24px] bg-[linear-gradient(135deg,#7c1e3e_0%,#8e5366_52%,#2a6d6b_100%)] px-5 py-5 text-white shadow-[0_18px_40px_-32px_rgba(124,30,62,0.4)]">
            <div className="text-[12px] text-white/70">{ui('نظام طلب الخدمات')}</div>
            <h1 className="mt-2.5 text-[25px] font-extrabold leading-tight">{ui('لوحة تشغيل الخدمات')}</h1>
            <p className="mt-2.5 max-w-[620px] text-[13px] leading-7 text-white/84">
              {ui('لوحة تفاعلية لإدارة طلبات الصيانة والنظافة والشراء المباشر والمراسلات، مع إبراز الطلبات التي تحتاج قرارًا أو متابعة مباشرة.')}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <HeroMetric title={ui('إجمالي طلبات الخدمات')} value={total} />
              <HeroMetric title={ui('طلبات بانتظار الاعتماد')} value={pendingServicesTotal} />
              <HeroMetric title={ui('مسودات خارجية نشطة')} value={metrics?.activeEmailDrafts ?? 0} />
            </div>
          </div>

          <div className="grid gap-4">
            {priorityCards.map((card) => (
              <a
                key={card.title}
                href={card.href}
                className={`rounded-[22px] bg-gradient-to-l ${card.accent} px-4 py-4 text-white shadow-[0_16px_32px_-30px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5`}
              >
                <div className="text-[12px] text-white/72">{ui('أولوية تشغيل')}</div>
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

      <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-[26px] border border-[#dde6e4] bg-white p-5 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[19px] font-extrabold text-[#223738]">{ui('الوصول السريع')}</h2>
            <span className="rounded-full bg-[#f3f7f6] px-3 py-1 text-[12px] text-[#6f8080]">
              {ui('أدوات تشغيل مباشرة')}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
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

        <div className="rounded-[26px] border border-[#dde6e4] bg-white p-5 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[19px] font-extrabold text-[#223738]">{ui('حجم العمل الحالي')}</h2>
            <a href="/services/reports" className="text-[13px] font-semibold text-[#0f5e61]">
              {ui('عرض التقارير')}
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

          <div className="mt-5 rounded-[20px] border border-[#e4eceb] bg-[#f8fbfb] p-4">
            <div className="text-[12px] font-semibold text-[#8a9a98]">{ui('قراءة تنفيذية')}</div>
            <div className="mt-2.5 text-[20px] font-extrabold text-[#223738]">{total}</div>
            <div className="mt-1.5 text-[13px] leading-6 text-[#6f8080]">
              {ui('إجمالي طلبات الخدمات بجميع حالاتها مع إبراز ما يحتاج اعتمادًا أو متابعة تشغيلية فورية.')}
            </div>
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

function MaintenanceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="m14.7 6.3 3 3-8.4 8.4H6.3v-3L14.7 6.3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.3 7.7 3 3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CleaningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="M7 21h10" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3v12" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8 7 4-4 4 4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 15h8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PurchaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="M6 7h13l-1.2 6.2a2 2 0 0 1-2 1.6H9.3a2 2 0 0 1-2-1.6L6 7Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 7 5.2 5.3A1.5 1.5 0 0 0 3.8 4.5H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="18.5" r="1.2" fill="currentColor" />
      <circle cx="17" cy="18.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H10l-4 3v-3.5A2.5 2.5 0 0 1 5 13.5v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
