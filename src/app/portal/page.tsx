'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { type AppRole } from '@/lib/workspace';

const ROLE_LABELS: Record<AppRole, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول مخزن',
  user: 'موظف',
};

const ROLE_ORDER: AppRole[] = ['manager', 'warehouse', 'user'];

export default function PortalPage() {
  const router = useRouter();
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();

  const availableRoles = useMemo<AppRole[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return ROLE_ORDER.filter((role) => roles.includes(role));
  }, [originalUser?.roles]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6f8f8]">
      <div className="mx-auto min-h-screen w-full max-w-[1560px] px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
        <header className="rounded-[22px] border border-[#dde5e3] bg-white px-4 py-3 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#dde5e3] text-[#2A6364] hover:bg-[#f7faf9]"
              aria-label="تسجيل الخروج"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M13 4H18C19.1 4 20 4.9 20 6V18C20 19.1 19.1 20 18 20H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            <div className="flex min-w-[250px] flex-1 items-center gap-3 rounded-[20px] border border-[#dde5e3] px-3 py-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#f3f8f7] text-[#2A6364]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                  <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M5 19c1.5-2.8 4-4.2 7-4.2S17.5 16.2 19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1 text-right">
                <div className="truncate text-[16px] font-bold text-[#17373a]">{user?.fullName || 'مستخدم النظام'}</div>
                <div className="truncate text-[12px] text-slate-500">{user?.email || ''}</div>
              </div>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#dde5e3] text-[#2A6364]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            {canUseRoleSwitch && availableRoles.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-[#dde5e3] bg-white px-2 py-1.5">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => switchViewRole(role)}
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                      user?.role === role ? 'bg-[#2A6364] text-white' : 'text-slate-600 hover:bg-[#f3f8f7]'
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <main className="mt-4 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="order-2 flex flex-col justify-center gap-4 lg:order-1">
            <PortalCard
              title="نظام المواد التدريبية"
              description="طلبات المواد، المخزون، الصرف، المرتجعات، والعهد"
              onClick={() => router.push('/materials/dashboard')}
              icon="▣"
            />
            <PortalCard
              title="نظام الخدمات العامة"
              description="الصيانة، النظافة، الشراء المباشر، الاعتمادات، والمراسلات الخارجية"
              onClick={() => router.push('/services/dashboard')}
              icon="✦"
            />
          </section>

          <section className="order-1 overflow-hidden rounded-[28px] border border-[#dde5e3] bg-[linear-gradient(135deg,#2A6364_0%,#2f6b6d_100%)] lg:order-2">
            <div className="h-full bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] p-6 sm:p-8 lg:p-10">
              <div className="mx-auto max-w-[560px] rounded-[28px] border border-white/12 bg-white/5 p-6 backdrop-blur-sm">
                <img src="/nauss-gold-logo.png" alt="شعار الجامعة" className="mx-auto h-auto w-full max-w-[440px] object-contain" />
              </div>
              <div className="mx-auto mt-8 max-w-[420px] rounded-[24px] border border-white/12 bg-white/10 px-6 py-5 text-center text-white backdrop-blur-sm">
                <div className="text-[24px] font-bold leading-[1.8]">منصة مواد التدريب<br />وكالة التدريب</div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function PortalCard({ title, description, onClick, icon }: { title: string; description: string; onClick: () => void; icon: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[24px] border-2 border-[#27494e] bg-[#53797b] px-6 py-6 text-right text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="text-[34px] leading-none text-[#d0b284]">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[20px] font-bold leading-[1.6]">{title}</div>
          <div className="mt-2 text-[14px] leading-[1.9] text-white/92">{description}</div>
        </div>
      </div>
    </button>
  );
}
