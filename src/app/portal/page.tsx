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
    <div dir="rtl" className="min-h-screen bg-[#f6f8f8]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6 lg:py-6">
        <header className="mb-5 flex flex-col gap-3 rounded-[24px] border border-[#dde5e3] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] lg:flex-row lg:items-center lg:justify-between lg:p-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={logout} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dfe6e4] bg-white text-[#2A6364]">↪</button>
            <div className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-[#dfe6e4] bg-white px-3 py-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3f7f6] text-[#2A6364]">👤</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold text-[#173b3c]">{user?.fullName || 'مستخدم النظام'}</div>
                <div className="truncate text-[12px] text-[#7d8f8d]">{user?.email || ''}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dfe6e4] bg-white text-[#2A6364]">🔔</button>
            {canUseRoleSwitch && availableRoles.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#dfe6e4] bg-white p-1.5">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => switchViewRole(role)}
                    className={`min-w-[96px] rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      user?.role === role ? 'bg-[#2A6364] text-white' : 'text-[#425f5d] hover:bg-[#f3f7f6]'
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="order-first rounded-[28px] bg-[linear-gradient(135deg,#2A6364_0%,#2e6f70_100%)] p-5 text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.28)] lg:order-last lg:sticky lg:top-6 lg:h-fit">
            <div className="rounded-[24px] border border-white/15 bg-white/5 p-5 backdrop-blur-sm">
              <img src="/nauss-gold-logo.png" alt="شعار الجامعة" className="mx-auto h-24 w-auto object-contain" />
            </div>
            <div className="mt-5 rounded-[22px] border border-white/10 bg-white/8 px-6 py-5 text-center text-[28px] font-bold leading-[1.8]">
              منصة مواد التدريب<br />وكالة التدريب
            </div>
          </aside>

          <section className="space-y-4">
            <PortalCard
              title="نظام المواد التدريبية"
              description="طلبات المواد، المخزون، الصرف، المرتجعات، والعهد"
              icon="▣"
              onClick={() => router.push('/materials/dashboard')}
            />
            <PortalCard
              title="نظام الخدمات العامة"
              description="الصيانة، النظافة، الشراء المباشر، الاعتمادات، والمراسلات الخارجية"
              icon="✦"
              onClick={() => router.push('/services/dashboard')}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function PortalCard({ title, description, icon, onClick }: { title: string; description: string; icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[30px] border-[2px] border-[#254447] bg-[#6c8b8c] px-8 py-8 text-right text-white shadow-[0_14px_40px_-28px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:bg-[#5f8182]"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-[26px] text-[#d0b284]">{icon}</span>
        <div className="space-y-3 text-right">
          <div className="text-[20px] font-bold leading-[1.5]">{title}</div>
          <div className="text-[15px] leading-[1.9] text-white/92">{description}</div>
        </div>
      </div>
    </button>
  );
}
