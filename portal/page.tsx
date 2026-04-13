'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 text-[#d0b284]" fill="none" aria-hidden="true">
      <path d="M12 28 32 16l20 12v20H12V28Z" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M21 48V34h22v14" stroke="currentColor" strokeWidth="2.8" />
      <path d="M25 22v-7h14v7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M27 40h4M33 40h4M27 45h4M33 45h4" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 text-[#d0b284]" fill="none" aria-hidden="true">
      <path d="m18 24 8 8m0 0 12-12m-12 12-7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m38 14 12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="m15 49 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="47" cy="47" r="5" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function PortalCard({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group flex min-h-[272px] flex-col items-center justify-center rounded-[34px] border-[3px] border-[#0f3946] bg-[#3e6f73] px-8 py-10 text-center shadow-[0_24px_60px_-28px_rgba(15,57,70,0.55)] transition hover:-translate-y-1 hover:shadow-[0_30px_75px_-30px_rgba(15,57,70,0.65)]"
    >
      <div className="mb-6">{icon}</div>
      <h2 className="text-[26px] font-semibold leading-[1.7] text-white">{title}</h2>
      <p className="mt-3 max-w-[360px] text-[18px] leading-[1.9] text-white/90">{description}</p>
    </Link>
  );
}

export default function PortalPage() {
  const { user } = useAuth();
  const activeRole = user?.role || 'user';
  const servicesHref = activeRole === 'manager' ? '/maintenance' : '/service-requests';

  return (
    <div className="min-h-[calc(100vh-88px)] bg-[#f4f6f6] px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.88fr] lg:items-stretch">
        <div className="order-2 flex flex-col gap-6 lg:order-1 lg:justify-center">
          <PortalCard
            href="/requests"
            icon={<MaterialsIcon />}
            title="طلب مواد تدريبية"
            description="من هنا يمكنك تقديم طلب مواد لتلبية الاحتياجات التدريبية"
          />

          <PortalCard
            href={servicesHref}
            icon={<ServicesIcon />}
            title="طلب خدمات عامة"
            description="من هنا يمكنك تقديم طلب صيانة ونظافة ومشتريات وطلبات أخرى"
          />
        </div>

        <div className="order-1 overflow-hidden rounded-[0px] lg:order-2 lg:rounded-[0_0_0_0]">
          <div className="relative flex min-h-[640px] items-center justify-center overflow-hidden rounded-[0px] bg-[linear-gradient(135deg,#015f5f_0%,#016564_42%,#014948_100%)] p-8 lg:min-h-[720px] lg:rounded-[0_28px_28px_0]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:34px_34px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(208,178,132,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_22%)]" />

            <div className="relative z-10 flex w-full max-w-[620px] flex-col items-center justify-center gap-10 text-center">
              <div className="w-full rounded-[34px] border border-white/10 bg-white/8 px-6 py-10 backdrop-blur-sm">
                <img
                  src="/nauss-gold-logo.png"
                  alt="شعار جامعة نايف"
                  className="mx-auto h-auto max-w-[420px] object-contain"
                />
              </div>

              <div className="rounded-[30px] border border-white/10 bg-white/12 px-10 py-8 text-white backdrop-blur-sm">
                <p className="text-[26px] leading-[2] sm:text-[34px]">
                  منصة مواد التدريب
                  <br />
                  وكالة التدريب
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
