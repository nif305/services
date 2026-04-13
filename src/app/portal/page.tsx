'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Role = 'manager' | 'warehouse' | 'user';
const ROLE_ORDER: Role[] = ['manager', 'warehouse', 'user'];
const ROLE_LABELS: Record<Role, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول مخزن',
  user: 'موظف',
};

export default function PortalPage() {
  const router = useRouter();
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();

  const availableRoles = useMemo<Role[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return ROLE_ORDER.filter((role) => roles.includes(role));
  }, [originalUser?.roles]);

  const openMaterials = () => router.push('/materials/dashboard');
  const openServices = () => router.push('/services/dashboard');

  const handleSwitchRole = async (role: Role) => {
    if (!canUseRoleSwitch || user?.role === role) return;
    await switchViewRole(role);
    router.refresh();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f7f7]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
        <header className="rounded-[26px] border border-[#dee7e5] bg-white px-4 py-3 shadow-soft sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={logout}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dbe6e4] bg-white text-[#2A6364]"
                aria-label="تسجيل الخروج"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M13 4H18C19.1 4 20 4.9 20 6V18C20 19.1 19.1 20 18 20H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              <div className="flex min-w-[250px] items-center gap-3 rounded-[22px] border border-[#dbe6e4] bg-white px-3 py-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f7f7] text-[#2A6364]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <div className="text-[16px] font-bold text-[#203535]">{user?.fullName || 'مستخدم النظام'}</div>
                  <div className="text-[12px] text-[#7a8b89]">{user?.email || ''}</div>
                </div>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dbe6e4] bg-white text-[#2A6364]">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {canUseRoleSwitch && availableRoles.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[#e8efee] bg-[#f9fbfb] p-2">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleSwitchRole(role)}
                    className={`rounded-full px-5 py-2 text-[14px] font-semibold transition ${
                      user?.role === role ? 'bg-[#2A6364] text-white' : 'text-[#506564] hover:bg-white'
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <main className="mt-5 grid gap-5 lg:grid-cols-[420px_1fr] lg:items-start">
          <section className="order-2 rounded-[28px] border border-[#dbe6e4] bg-[linear-gradient(145deg,#2c6768_0%,#2c6162_100%)] p-6 text-white shadow-soft lg:order-1 lg:min-h-[500px]">
            <div className="rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6">
              <img src="/nauss-gold-logo.png" alt="شعار الجامعة" className="h-40 w-auto max-w-full object-contain" />
            </div>
            <div className="mt-5 rounded-[24px] border border-white/15 bg-white/8 px-6 py-5 text-center backdrop-blur-sm">
              <div className="text-[28px] font-bold leading-[1.9]">منصة مواد التدريب<br />وكالة التدريب</div>
            </div>
          </section>

          <section className="order-1 grid gap-4 lg:order-2">
            <PortalCard
              title="نظام المواد التدريبية"
              description="طلبات المواد، المخزون، الصرف، المرتجعات، والعهد"
              onClick={openMaterials}
              icon={
                <svg viewBox="0 0 64 64" className="h-12 w-12" fill="none">
                  <path d="M14 24h36v24H14z" stroke="currentColor" strokeWidth="3" />
                  <path d="M20 24V16h24v8" stroke="currentColor" strokeWidth="3" />
                  <path d="M24 34h6M34 34h6M24 42h6M34 42h6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              }
            />
            <PortalCard
              title="نظام الخدمات العامة"
              description="الصيانة، النظافة، الشراء المباشر، الاعتمادات، والمراسلات الخارجية"
              onClick={openServices}
              icon={
                <svg viewBox="0 0 64 64" className="h-12 w-12" fill="none">
                  <path d="M19 45 45 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <path d="M18 26 10 18l8-4 12 12-4 8-8-8ZM38 30l12 12 4-8-8-8-8 4Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                </svg>
              }
            />
          </section>
        </main>
      </div>
    </div>
  );
}

function PortalCard({ title, description, onClick, icon }: { title: string; description: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[176px] items-center gap-5 rounded-[30px] border-[3px] border-[#1d4047] bg-[#5a8282] px-6 py-6 text-right text-white shadow-[0_18px_45px_-32px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
    >
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-white/8 text-[#d0b284]">{icon}</div>
      <div className="flex-1">
        <div className="text-[28px] font-bold leading-[1.6]">{title}</div>
        <div className="mt-2 text-[17px] leading-[1.9] text-white/95">{description}</div>
      </div>
    </button>
  );
}
