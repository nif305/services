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

  return (
    <div dir="rtl" className="arabic-surface min-h-screen bg-[#f5f7f7]">
      <div className="mx-auto max-w-[1500px] px-4 py-5 lg:px-6">
        <header className="rounded-[28px] border border-[#dde6e4] bg-white px-5 py-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={logout} className="inline-flex h-12 items-center rounded-2xl border border-[#dce6e4] bg-white px-5 text-[14px] font-semibold text-[#27494a]">تسجيل الخروج</button>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dce6e4] bg-white text-[#2A6364]">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6.5 16.5h11l-1.25-1.7v-4a4.75 4.75 0 10-9.5 0v4L5.5 16.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M10.5 19a1.75 1.75 0 003.5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#dce6e4] bg-[#fbfcfc] px-4 py-2.5">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f8f8] text-[#2A6364]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" /><path d="M5.5 19c1.65-3.1 4.35-4.65 6.5-4.65S16.85 15.9 18.5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                </span>
                <div>
                  <div className="text-[17px] font-bold text-[#223738]">{user?.fullName || 'مستخدم النظام'}</div>
                  <div className="text-[12px] text-[#7a8d8b]">{user?.email || ''}</div>
                </div>
              </div>
            </div>

            {canUseRoleSwitch && availableRoles.length > 1 ? (
              <div className="inline-flex items-center gap-1 rounded-[20px] border border-[#dce6e4] bg-[#f7f9f9] p-1">
                {availableRoles.map((role) => {
                  const active = user?.role === role;
                  return (
                    <button key={role} type="button" onClick={() => switchViewRole(role)} className={active ? 'min-w-[112px] rounded-[16px] bg-[#2A6364] px-4 py-2.5 text-[15px] font-semibold text-white' : 'min-w-[112px] rounded-[16px] px-4 py-2.5 text-[15px] font-semibold text-[#455d5d] hover:bg-white'}>
                      {ROLE_LABELS[role]}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="order-2 lg:order-1 lg:col-start-2">
            <div className="rounded-[30px] bg-[linear-gradient(135deg,#2d6768_0%,#4e8280_100%)] p-5 text-white shadow-[0_22px_50px_-34px_rgba(15,23,42,0.35)]">
              <div className="rounded-[24px] border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                <img src="/nauss-gold-logo.png" alt="شعار الجامعة" className="h-28 w-auto object-contain" />
              </div>
              <div className="mt-4 rounded-[22px] border border-white/10 bg-white/6 px-5 py-6 text-center backdrop-blur-sm">
                <div className="text-[14px] text-white/80">منصة مواد التدريب</div>
                <div className="mt-2 text-[22px] font-bold">وكالة التدريب</div>
              </div>
            </div>
          </aside>

          <section className="order-1 lg:order-2 lg:col-start-1">
            <div className="grid gap-5 md:grid-cols-2">
              <PortalActionCard
                title="نظام المواد التدريبية"
                meta="طلبات المواد، الصرف، المرتجعات، العهد"
                icon="◫"
                onClick={() => (user?.role === 'warehouse' ? router.push('/materials/dashboard') : router.push('/materials/dashboard'))}
              />
              <PortalActionCard
                title="نظام الخدمات العامة"
                meta="الصيانة، النظافة، الشراء المباشر، المراسلات الخارجية"
                icon="✦"
                onClick={() => router.push('/services/dashboard')}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PortalActionCard({ title, meta, icon, onClick }: { title: string; meta: string; icon: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-[30px] border-[3px] border-[#213e45] bg-[linear-gradient(135deg,#678183_0%,#8aa0a0_100%)] px-7 py-8 text-right text-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.34)] transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[28px] text-[#d0b284]">{icon}</div>
        <div className="flex-1">
          <div className="text-[30px] font-bold leading-[1.5]">{title}</div>
          <div className="mt-3 text-[18px] leading-[1.9] text-white/92">{meta}</div>
        </div>
      </div>
    </button>
  );
}
