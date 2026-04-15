'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Role = 'manager' | 'warehouse' | 'user';

const ROLE_LABELS: Record<Role, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول مخزن',
  user: 'موظف',
};

const ROLE_ORDER: Role[] = ['manager', 'warehouse', 'user'];

export default function PortalPage() {
  const router = useRouter();
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();

  const availableRoles = useMemo<Role[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return ROLE_ORDER.filter((role) => roles.includes(role));
  }, [originalUser?.roles]);

  const openMaterials = () => router.push('/materials/dashboard');
  const openServices = () => router.push('/services/dashboard');

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7f7] text-[#163234]">
      <div className="mx-auto max-w-[1600px] px-5 py-5 lg:px-8 lg:py-6">
        <header className="rounded-[28px] border border-[#d9e2df] bg-white px-4 py-4 shadow-[0_12px_35px_-28px_rgba(15,23,42,0.22)] lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="order-2 flex flex-col gap-3 lg:order-1 lg:flex-row lg:items-center">
              {canUseRoleSwitch && availableRoles.length > 1 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#dce3e1] bg-[#fbfcfc] p-1.5">
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => switchViewRole(role)}
                      className={`min-w-[104px] rounded-full px-4 py-2 text-[15px] font-semibold transition ${
                        user?.role === role
                          ? 'bg-[#2A6364] text-white shadow-[0_10px_28px_-18px_rgba(42,99,100,0.6)]'
                          : 'text-[#425b5b] hover:bg-[#f1f6f5]'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#dce3e1] bg-white text-[#2A6364]"
                aria-label="الإشعارات"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="order-1 flex items-center justify-between gap-3 lg:order-2 lg:justify-end">
              <button
                type="button"
                onClick={logout}
                className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#dce3e1] bg-white text-[#2A6364] transition hover:bg-[#f7faf9]"
                aria-label="تسجيل الخروج"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M13 4H18C19.1 4 20 4.9 20 6V18C20 19.1 19.1 20 18 20H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              <div className="flex min-w-[260px] items-center gap-3 rounded-[22px] border border-[#dce3e1] bg-white px-4 py-3">
                <div className="min-w-0 flex-1 text-right">
                  <div className="truncate text-[18px] font-bold text-[#1e3939]">{user?.fullName || 'مستخدم النظام'}</div>
                  <div className="truncate text-[13px] text-[#7a8c8a]">{user?.email || ''}</div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#f4f7f7] text-[#2A6364]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="order-2 xl:order-1">
            <div className="rounded-[34px] border border-[#d1ddd8] bg-[linear-gradient(180deg,#2A6364_0%,#315f60_100%)] p-5 text-white shadow-[0_22px_55px_-34px_rgba(15,23,42,0.35)]">
              <div className="rounded-[28px] border border-white/12 bg-white/6 px-6 py-8 backdrop-blur-sm">
                <img src="/nauss-gold-logo.png" alt="شعار الجامعة" className="mx-auto h-auto max-w-[240px] object-contain" />
              </div>
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/8 px-6 py-7 text-center backdrop-blur-sm">
                <div className="text-[14px] text-white/75">منصة مواد التدريب</div>
                <div className="mt-2 text-[34px] font-bold leading-[1.55]">وكالة التدريب</div>
              </div>
            </div>
          </aside>

          <section className="order-1 grid gap-5 xl:order-2">
            <PortalCard
              title="نظام المواد التدريبية"
              description="طلبات المواد، المخزون، الصرف، المرتجعات، والعهد"
              onClick={openMaterials}
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                  <path d="M4 9.5 12 5l8 4.5v8L12 22l-8-4.5v-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M12 13.5 20 9.5M12 13.5 4 9.5M12 13.5V22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
            />

            <PortalCard
              title="نظام الخدمات العامة"
              description="الصيانة، النظافة، الشراء المباشر، الاعتمادات، والمراسلات الخارجية"
              onClick={openServices}
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                  <path d="m4 20 6.5-6.5M13 13l7-7M14.5 4 20 9.5M3.5 14.5 9 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="m11 8 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
            />
          </section>
        </main>
      </div>
    </div>
  );
}

function PortalCard({
  title,
  description,
  onClick,
  icon,
}: {
  title: string;
  description: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[180px] items-center justify-between rounded-[34px] border-[2px] border-[#294f53] bg-[linear-gradient(180deg,#6f898a_0%,#6b8586_100%)] px-7 py-6 text-right text-white shadow-[0_20px_46px_-36px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-34px_rgba(15,23,42,0.4)]"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/8 text-[#d0b284]">
        {icon}
      </div>
      <div className="max-w-[78%]">
        <div className="text-[28px] font-bold leading-[1.5]">{title}</div>
        <div className="mt-3 text-[18px] leading-[1.9] text-white/92">{description}</div>
      </div>
    </button>
  );
}
