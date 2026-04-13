
'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Role = 'manager' | 'warehouse' | 'user';

const ROLE_LABELS: Record<Role, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول المخزن',
  user: 'موظف',
};

function SystemCard({
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
      className="group w-full rounded-[32px] border-[3px] border-[#1f4649] bg-[#557c7f] p-8 text-right text-white transition hover:-translate-y-1 hover:shadow-[0_18px_60px_-30px_rgba(31,70,73,0.55)]"
    >
      <div className="mb-6 flex justify-center text-[#d3b586]">{icon}</div>
      <h2 className="text-[28px] font-bold leading-tight">{title}</h2>
      <p className="mt-4 text-[18px] leading-9 text-white/90">{description}</p>
    </button>
  );
}

export default function PortalPage() {
  const router = useRouter();
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();

  const roles = useMemo<Role[]>(() => {
    const raw = Array.isArray(originalUser?.roles) ? originalUser.roles : [user?.role || 'user'];
    return raw.filter((role): role is Role => role === 'manager' || role === 'warehouse' || role === 'user');
  }, [originalUser?.roles, user?.role]);

  const openMaterials = () => router.push('/materials/dashboard');
  const openServices = () => router.push('/services/dashboard');

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f5f7f7]"
      style={{
        background:
          'radial-gradient(circle at top right, rgba(42,99,100,0.08), transparent 20%), radial-gradient(circle at bottom left, rgba(199,176,140,0.12), transparent 22%), linear-gradient(180deg, #f8faf9 0%, #eff3f2 100%)',
      }}
    >
      <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[32px] border border-[#dde5e3] bg-white/95 p-4 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={logout}
                className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#d8dfde] bg-white text-[#2A6364] transition hover:bg-[#f7faf9]"
                aria-label="تسجيل الخروج"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                  <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M13 4H18C19.1 4 20 4.9 20 6V18C20 19.1 19.1 20 18 20H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              <div className="flex min-w-[280px] flex-1 items-center gap-4 rounded-[24px] border border-[#d8dfde] bg-white px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[18px] font-bold text-[#223b3b] md:text-[20px]">{user?.fullName || 'مستخدم النظام'}</div>
                  <div className="truncate text-[14px] text-[#7b8b8a]">{user?.email || ''}</div>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#f5f8f8] text-[#2A6364]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#d8dfde] bg-white text-[#2A6364]">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                  <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>

              {canUseRoleSwitch && roles.length > 1 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-[#d8dfde] bg-white px-3 py-2">
                  {roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={async () => { await switchViewRole(role); router.refresh(); }}
                      className={`min-w-[108px] rounded-full px-5 py-2.5 text-[16px] font-semibold transition ${
                        user?.role === role ? 'bg-[#2A6364] text-white shadow-[0_10px_30px_-16px_rgba(42,99,100,0.55)]' : 'bg-transparent text-[#4b5f5f] hover:bg-[#f1f6f5]'
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

        <main className="grid gap-8 lg:grid-cols-[0.48fr_0.52fr]">
          <section className="order-2 lg:order-1">
            <div className="rounded-[36px] border border-[#d9e1df] bg-[linear-gradient(135deg,#245d5f_0%,#2A6364_42%,#1c5153_100%)] p-8 shadow-[0_28px_90px_-50px_rgba(1,101,100,0.6)]">
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:34px_34px] p-8">
                <div className="rounded-[28px] border border-white/8 bg-white/4 p-6">
                  <Image src="/nauss-gold-logo.png" alt="شعار الجامعة" width={520} height={250} className="h-auto w-full" priority />
                </div>
                <div className="mx-auto mt-10 max-w-[460px] rounded-[28px] border border-white/10 bg-white/12 px-8 py-10 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                  <div className="text-[48px] font-bold leading-tight text-white">منصة مواد التدريب</div>
                  <div className="mt-4 text-[36px] font-bold leading-tight text-white">وكالة التدريب</div>
                </div>
              </div>
            </div>
          </section>

          <section className="order-1 flex flex-col justify-center gap-8 lg:order-2">
            <SystemCard
              title="طلب مواد تدريبية"
              description="من هنا تنتقل إلى نظام المواد التدريبية لرفع الطلبات ومتابعة المخزون والصرف والإرجاعات والعهد."
              onClick={openMaterials}
              icon={
                <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
                  <path d="M14 24h36v24H14z" stroke="currentColor" strokeWidth="3" />
                  <path d="M20 24V16h24v8" stroke="currentColor" strokeWidth="3" />
                  <path d="M22 34h8v8h-8zM34 34h8v8h-8z" stroke="currentColor" strokeWidth="3" />
                </svg>
              }
            />

            <SystemCard
              title="طلب خدمات عامة"
              description="من هنا تنتقل إلى نظام الخدمات العامة لطلبات الصيانة والنظافة والشراء المباشر والطلبات الأخرى والاعتمادات والمراسلات الخارجية."
              onClick={openServices}
              icon={
                <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
                  <path d="M18 18l28 28" stroke="currentColor" strokeWidth="3" />
                  <path d="M24 40l-8 8M48 16l-8 8" stroke="currentColor" strokeWidth="3" />
                  <path d="M18 26l20 20" stroke="currentColor" strokeWidth="3" />
                </svg>
              }
            />
          </section>
        </main>
      </div>
    </div>
  );
}
