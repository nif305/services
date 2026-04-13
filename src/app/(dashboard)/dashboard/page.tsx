'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

function PortalCard({ href, title, subtitle, icon }: { href: string; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[34px] border-[3px] border-[#153b46] bg-[linear-gradient(180deg,#4f7d80_0%,#456f73_100%)] px-8 py-10 text-white shadow-[0_26px_70px_-46px_rgba(1,101,100,0.95)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_80px_-42px_rgba(1,101,100,0.9)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_24%)] opacity-80" />
      <div className="relative flex flex-col items-center text-center">
        <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 text-[#d0b284] shadow-inner shadow-black/10">
          {icon}
        </div>
        <h2 className="text-[34px] font-semibold leading-[1.5] text-white">{title}</h2>
        <p className="mt-4 max-w-[360px] text-[17px] leading-[2] text-white/88">{subtitle}</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  return (
    <div className="min-h-[calc(100vh-120px)]">
      <div className="grid min-h-[calc(100vh-140px)] gap-0 overflow-hidden rounded-[34px] border border-[#d6dfdf] bg-white shadow-[0_22px_60px_-46px_rgba(15,23,42,0.35)] lg:grid-cols-[1fr_0.86fr]">
        <section className="order-2 flex items-center justify-center bg-[#f6f8f8] px-10 py-12 lg:order-1 lg:px-12 xl:px-16">
          <div className="w-full max-w-[560px] space-y-10">
            <PortalCard
              href="/requests"
              title="طلب مواد تدريبية"
              subtitle="من هنا يمكنك تقديم طلب مواد لتلبية الاحتياجات التدريبية"
              icon={(
                <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12" aria-hidden="true">
                  <path d="M4 9.5 12 5l8 4.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            />

            <PortalCard
              href={isManager ? '/maintenance' : '/service-requests'}
              title="طلب خدمات عامة"
              subtitle="من هنا يمكنك تقديم طلب صيانة ونظافة ومشتريات وطلبات أخرى"
              icon={(
                <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12" aria-hidden="true">
                  <path d="m14.7 6.3 3 3-8.4 8.4H6.3v-3L14.7 6.3Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m13.2 7.8 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="m4.5 6.5 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            />
          </div>
        </section>

        <section className="order-1 relative hidden overflow-hidden bg-[linear-gradient(180deg,#2d696a_0%,#2f6667_50%,#315f60_100%)] lg:flex lg:order-2 lg:items-center lg:justify-center">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:36px_36px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_14%)]" />

          <div className="relative z-10 flex w-full max-w-[660px] flex-col items-center px-10 py-16 text-center text-white">
            <div className="w-full rounded-[34px] border border-white/10 bg-white/6 px-10 py-10 backdrop-blur-sm">
              <img
                src="/nauss-gold-logo.png"
                alt="شعار جامعة نايف"
                className="mx-auto max-h-[180px] w-auto object-contain"
              />
            </div>

            <div className="mt-12 rounded-[30px] border border-white/10 bg-white/8 px-12 py-10 backdrop-blur-sm">
              <p className="text-[44px] font-normal leading-[1.7] text-white">
                منصة مواد التدريب
                <br />
                وكالة التدريب
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
