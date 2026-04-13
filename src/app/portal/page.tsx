'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { AppRole } from '@/lib/workspace';

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

  const openMaterials = () => router.push('/materials/dashboard');
  const openServices = () => router.push('/services/dashboard');

  return (
    <div className="min-h-screen bg-[#f5f7f7]" dir="rtl">
      <div className="mx-auto max-w-[1680px] px-4 py-4 lg:px-5 lg:py-5">
        <header className="rounded-[28px] border border-[#dde6e4] bg-white px-4 py-3 shadow-soft lg:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {canUseRoleSwitch && availableRoles.length > 1 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[#dbe6e4] bg-white px-3 py-2">
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => switchViewRole(role)}
                      className={`min-w-[104px] rounded-full px-5 py-2.5 text-[15px] font-semibold transition ${
                        user?.role === role
                          ? 'bg-[#2A6364] text-white shadow-[0_12px_30px_-18px_rgba(42,99,100,0.65)]'
                          : 'text-[#4f6766] hover:bg-[#f2f8f7]'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#dbe6e4] bg-white text-[#2A6364]"
                aria-label="الإشعارات"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex min-w-[260px] items-center gap-3 rounded-[22px] border border-[#dbe6e4] bg-[#fbfcfc] px-4 py-2.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#f4f8f7] text-[#2A6364]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0 text-right">
                  <div className="truncate text-[16px] font-bold text-[#1f3d3d]">{user?.fullName || 'مستخدم النظام'}</div>
                  <div className="truncate text-[13px] text-[#7d8c8a]">{user?.email || ''}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#dbe6e4] bg-white text-[#2A6364]"
                aria-label="تسجيل الخروج"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path d="M10 17l5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-[30px] bg-[linear-gradient(135deg,#2A6364_0%,#3f7274_100%)] p-5 text-white shadow-[0_22px_60px_-40px_rgba(15,23,42,0.45)]">
            <div className="rounded-[28px] border border-white/15 bg-white/5 p-5">
              <img src="/nauss-gold-logo.png" alt="شعار جامعة نايف" className="w-full object-contain" />
            </div>
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/10 px-6 py-7 text-center backdrop-blur-sm">
              <div className="text-[18px] font-semibold leading-[1.9] text-white/95">منصة مواد التدريب<br />وكالة التدريب</div>
            </div>
          </aside>

          <section className="grid gap-5 self-start">
            <SystemCard
              title="نظام المواد التدريبية"
              description="طلبات المواد، المخزون، الصرف، المرتجعات، والعهد"
              icon="▣"
              onClick={openMaterials}
            />
            <SystemCard
              title="نظام الخدمات العامة"
              description="الصيانة، النظافة، الشراء المباشر، الاعتمادات، والمراسلات الخارجية"
              icon="✦"
              onClick={openServices}
            />
          </section>
        </main>
      </div>
    </div>
  );
}

function SystemCard({ title, description, icon, onClick }: { title: string; description: string; icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[182px] items-center justify-between gap-6 rounded-[34px] border-[3px] border-[#274547] bg-[#6c8889] px-8 py-8 text-white shadow-[0_20px_55px_-36px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/8 text-[32px] text-[#d0b284]">{icon}</span>
      <span className="flex-1 text-right">
        <span className="block text-[18px] font-bold">{title}</span>
        <span className="mt-2 block text-[15px] leading-[2] text-white/92">{description}</span>
      </span>
    </button>
  );
}
