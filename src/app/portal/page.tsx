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

  return (
    <div className="min-h-screen bg-[#f5f7f7]" dir="rtl">
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-5 lg:py-5">
        <header className="rounded-[22px] border border-[#dde6e4] bg-white px-4 py-3 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={logout} className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-[#dbe6e4] bg-white px-4 text-[14px] font-semibold text-[#385454]">تسجيل الخروج</button>
            <div className="flex min-w-[220px] items-center gap-3 rounded-[18px] border border-[#dbe6e4] bg-[#fbfcfc] px-3 py-2">
              <div className="min-w-0 flex-1 text-right">
                <div className="truncate text-[15px] font-bold text-[#1f3d3d]">{user?.fullName || 'مستخدم النظام'}</div>
                <div className="truncate text-[12px] text-[#7d8c8a]">{user?.email || ''}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f4f8f7] text-[#2A6364]">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" /><path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#dbe6e4] bg-white text-[#2A6364]" aria-label="الإشعارات">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
              {canUseRoleSwitch && availableRoles.length > 1 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-[#dbe6e4] bg-white px-2 py-2">
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => switchViewRole(role)}
                      className={`min-w-[96px] rounded-full px-4 py-2 text-[14px] font-semibold transition ${
                        user?.role === role ? 'bg-[#2A6364] text-white' : 'text-[#4f6766] hover:bg-[#f2f8f7]'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mt-5 lg:flex lg:flex-row-reverse lg:items-start lg:gap-5">
          <aside className="mb-4 rounded-[24px] bg-[linear-gradient(135deg,#2A6364_0%,#3f7274_100%)] p-4 text-white shadow-[0_22px_60px_-40px_rgba(15,23,42,0.45)] lg:mb-0 lg:w-[320px]">
            <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
              <img src="/nauss-gold-logo.png" alt="شعار جامعة نايف" className="w-full object-contain" />
            </div>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-white/10 px-5 py-5 text-center backdrop-blur-sm">
              <div className="text-[18px] font-semibold leading-[1.8] text-white/95">منصة مواد التدريب<br />وكالة التدريب</div>
            </div>
          </aside>

          <section className="grid flex-1 gap-4">
            <SystemCard title="نظام المواد التدريبية" description="طلبات المواد، المخزون، الصرف، المرتجعات، والعهد" onClick={() => router.push('/materials/dashboard')} />
            <SystemCard title="نظام الخدمات العامة" description="الصيانة، النظافة، الشراء المباشر، الاعتمادات، والمراسلات الخارجية" onClick={() => router.push('/services/dashboard')} />
          </section>
        </main>
      </div>
    </div>
  );
}

function SystemCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-[24px] border-[2px] border-[#274547] bg-[#6c8889] px-6 py-8 text-right text-white shadow-[0_20px_55px_-36px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5">
      <div className="text-[22px] font-bold">{title}</div>
      <div className="mt-3 text-[15px] leading-[1.9] text-white/92">{description}</div>
    </button>
  );
}
