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

  const series = useMemo(() => [
    { label: 'الصيانة', value: metrics?.maintenancePending || 0, color: '#2A6364' },
    { label: 'النظافة', value: metrics?.cleaningPending || 0, color: '#4F8F7A' },
    { label: 'الشراء المباشر', value: metrics?.purchasePending || 0, color: '#C7B08C' },
    { label: 'الطلبات الأخرى', value: metrics?.otherPending || 0, color: '#73384B' },
  ], [metrics]);

  const maxVal = Math.max(...series.map((item) => item.value), 1);
  const total = series.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[#dde6e4] bg-white p-6 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-[12px] font-semibold text-[#97a5a4]">نظام الخدمات العامة</div>
            <h1 className="mt-2 text-[24px] font-bold text-[#223738]">لوحة معلومات الخدمات</h1>
            <p className="mt-2 text-[14px] text-[#6f8080]">رؤية تنفيذية لحالة الطلبات والاعتمادات والمراسلات الخارجية.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard title="طلبات الصيانة" value={metrics?.maintenancePending ?? 0} accent="#2A6364" />
            <MetricCard title="طلبات النظافة" value={metrics?.cleaningPending ?? 0} accent="#4F8F7A" />
            <MetricCard title="الشراء المباشر" value={metrics?.purchasePending ?? 0} accent="#C7B08C" />
            <MetricCard title="إشعارات غير مقروءة" value={metrics?.unreadNotifications ?? 0} accent="#73384B" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-[#dde6e4] bg-white p-6 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-[#223738]">حجم الطلبات الحالية</h2>
            <span className="rounded-full bg-[#f5f8f8] px-3 py-1 text-[12px] text-[#6f8080]">إجمالي الطلبات {total}</span>
          </div>
          <div className="space-y-4">
            {series.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-semibold text-[#2a4444]">{item.label}</span>
                  <span className="text-[#6f8080]">{item.value}</span>
                </div>
                <div className="h-3 rounded-full bg-[#eef3f3]">
                  <div className="h-3 rounded-full" style={{ width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#dde6e4] bg-white p-6 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-[#223738]">الوصول السريع</h2>
            <span className="text-[12px] text-[#8b9999]">الخدمات والاعتمادات</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <QuickCard title="بوابة الطلبات" hint="رفع الطلبات" href="/services/requests" />
            <QuickCard title="اعتماد الطلبات" hint="قرار المدير" href="/services/approvals" />
            <QuickCard title="المراسلات الخارجية" hint="مسودات البريد" href="/services/email-drafts" />
            <QuickCard title="المراسلات الداخلية" hint="تواصل رسمي داخلي" href="/services/messages" />
          </div>
        </div>
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

function QuickCard({ title, hint, href }: { title: string; hint: string; href: string }) {
  return (
    <a href={href} className="rounded-[24px] border border-[#dde6e4] bg-[#fbfcfc] px-5 py-5 transition hover:border-[#cfe0dc] hover:bg-white">
      <div className="text-[17px] font-bold text-[#223738]">{title}</div>
      <div className="mt-2 text-[13px] text-[#7b8c8c]">{hint}</div>
    </a>
  );
}
