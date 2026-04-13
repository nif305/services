'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Role = 'manager' | 'warehouse' | 'user';

const ROLE_LABELS: Record<Role, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول المخزن',
  user: 'موظف',
};

export default function PortalPage() {
  const router = useRouter();
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();

  const availableRoles = useMemo<Role[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return roles.filter(
      (role): role is Role => role === 'manager' || role === 'warehouse' || role === 'user'
    );
  }, [originalUser?.roles]);

  const openMaterials = () => {
    if (user?.role === 'warehouse') {
      router.push('/inventory');
      return;
    }
    router.push('/requests');
  };

  const openServices = () => {
    if (user?.role === 'manager') {
      router.push('/maintenance');
      return;
    }
    router.push('/service-requests');
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#f5f7f7]"
      style={{
        background:
          'radial-gradient(circle at top right, rgba(1,101,100,0.08), transparent 18%), radial-gradient(circle at bottom left, rgba(208,178,132,0.12), transparent 20%), linear-gradient(180deg, #f7f9f9 0%, #eef3f2 100%)',
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col">
        <header className="px-4 pb-4 pt-4 md:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-[#d9e1df] bg-white/88 p-3 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.25)] backdrop-blur-sm md:p-4">
            <button
              type="button"
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

            <div className="flex min-w-[260px] flex-1 items-center gap-4 rounded-[24px] border border-[#d8dfde] bg-white px-4 py-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#f5f8f8] text-[#2A6364]">
                <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
                  <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[18px] font-bold text-[#223b3b] md:text-[20px]">{user?.fullName || 'مستخدم النظام'}</div>
                <div className="truncate text-[14px] text-[#7b8b8a]">{user?.email || ''}</div>
              </div>
            </div>

            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#d8dfde] bg-white text-[#2A6364]">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            {canUseRoleSwitch && availableRoles.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-[#d8dfde] bg-white px-3 py-2">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => switchViewRole(role)}
                    className={`min-w-[100px] rounded-full px-5 py-2.5 text-[16px] font-semibold transition ${
                      user?.role === role
                        ? 'bg-[#2A6364] text-white shadow-[0_10px_30px_-16px_rgba(42,99,100,0.55)]'
                        : 'bg-transparent text-[#4b5f5f] hover:bg-[#f1f6f5]'
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <main className="grid flex-1 gap-0 lg:grid-cols-[0.54fr_0.46fr]">
          <section className="flex items-center justify-center px-6 py-6 lg:px-10 lg:py-10">
            <div className="flex w-full max-w-[460px] flex-col gap-10">
              <PortalCard
                title="طلب مواد تدريبية"
                description="من يمكنك تقديم طلب مواد لتلبية الاحتياجات التدريبية"
                onClick={openMaterials}
                icon={
                  <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
                    <path d="M14 24h36v24H14z" stroke="currentColor" strokeWidth="3" />
                    <path d="M20 24V16h24v8" stroke="currentColor" strokeWidth="3" />
                    <path d="M24 34h6M34 34h6M24 42h6M34 42h6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                }
              />

              <PortalCard
                title="طلب خدمات عامة"
                description="من يمكنك تقديم طلب صيانة ونظافة ومشتريات أخرى"
                onClick={openServices}
                icon={
                  <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
                    <path d="M19 45 45 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <path d="M18 26 10 18l8-4 12 12-4 8-8-8ZM38 30l12 12 4-8-8-8-8 4Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                  </svg>
                }
              />
            </div>
          </section>

          <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#2A6364_0%,#255b5c_40%,#356f70_100%)] lg:flex lg:items-center lg:justify-center">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(199,176,140,0.18),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_16%)]" />
            <div className="absolute left-[14%] top-[17%] h-[270px] w-[570px] rounded-[42px] border border-white/10 bg-white/6" />
            <div className="absolute bottom-[18%] left-[24%] h-[180px] w-[360px] rounded-[34px] border border-white/10 bg-white/10" />
            <div className="absolute bottom-[14%] right-[17%] h-24 w-24 rounded-full border border-white/10 bg-white/6" />

            <div className="relative z-10 flex w-full max-w-[780px] flex-col items-center justify-center px-10 text-center text-white">
              <div className="flex min-h-[260px] w-full max-w-[620px] items-center justify-center rounded-[42px] border border-white/10 bg-white/6 px-10 backdrop-blur-sm">
                <img src="/nauss-gold-logo.png" alt="شعار الجامعة" className="max-h-[220px] w-auto object-contain" />
              </div>

              <div className="mt-12 rounded-[28px] border border-white/10 bg-white/10 px-10 py-7 backdrop-blur-sm">
                <div className="text-[44px] leading-[1.7]">منصة مواد التدريب<br />وكالة التدريب</div>
              </div>
            </div>
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
      className="group w-full rounded-[34px] border-[3px] border-[#17363d] bg-[#3f7274] px-8 py-10 text-center text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="mx-auto flex h-24 w-24 items-center justify-center text-[#d0b284]">{icon}</div>
      <div className="mt-5 text-[22px] font-bold leading-[1.6]">{title}</div>
      <div className="mt-4 text-[16px] leading-[1.8] text-white/92">{description}</div>
    </button>
  );
}
