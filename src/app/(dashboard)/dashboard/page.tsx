'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSystemEntryRoute } from '@/lib/system';

function SystemCard({ href, title, subtitle, tone }: { href: string; title: string; subtitle: string; tone: 'primary' | 'gold'; }) {
  const toneClasses = tone === 'primary'
    ? 'border-[#016564]/15 bg-[linear-gradient(135deg,#016564_0%,#0b6d6b_100%)] text-white'
    : 'border-[#d0b284]/40 bg-[linear-gradient(135deg,#fbf7ee_0%,#fffdf9_100%)] text-[#5a4a2e]';
  const buttonClasses = tone === 'primary' ? 'bg-white text-[#016564]' : 'bg-[#016564] text-white';

  return (
    <Link href={href} className={`group block rounded-[28px] border p-7 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg ${toneClasses}`}>
      <div className="text-[24px] font-extrabold leading-[1.3]">{title}</div>
      <p className={`mt-3 text-[14px] leading-8 ${tone === 'primary' ? 'text-white/90' : 'text-[#6b5a4a]'}`}>{subtitle}</p>
      <div className={`mt-6 inline-flex rounded-full px-5 py-2.5 text-[13px] font-bold ${buttonClasses}`}>الدخول إلى النظام</div>
    </Link>
  );
}

export default function DashboardSelectorPage() {
  const { user } = useAuth();
  const role = user?.role || 'user';

  const materialsHref = useMemo(() => getSystemEntryRoute('materials', role), [role]);
  const servicesHref = useMemo(() => getSystemEntryRoute('services', role), [role]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d6d7d4] bg-white p-6 shadow-soft">
        <h1 className="text-[28px] font-extrabold text-[#016564]">اختر النظام</h1>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <SystemCard
          href={materialsHref}
          title="طلبات المخزون والمواد"
          subtitle="رفع طلبات المواد، متابعة المخزون، الإرجاعات والعهد التشغيلية."
          tone="gold"
        />
        <SystemCard
          href={servicesHref}
          title="طلبات الخدمات"
          subtitle="الصيانة، النظافة، المشتريات المباشرة، الطلبات الأخرى والمراسلات الخارجية."
          tone="primary"
        />
      </section>
    </div>
  );
}
