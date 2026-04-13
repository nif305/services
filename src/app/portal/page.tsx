'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Role = 'manager' | 'warehouse' | 'user';

const ROLE_LABELS: Record<Role, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول المخزن',
  user: 'موظف',
};

function getMaterialsRoute(role?: string) {
  if (role === 'warehouse') return '/inventory';
  return '/requests';
}

function getServicesRoute(role?: string) {
  if (role === 'manager') return '/maintenance';
  return '/service-requests';
}

function SystemCard({ href, title, subtitle, icon }: { href: string; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group block rounded-[34px] border border-[#0d4048] bg-[linear-gradient(135deg,#2e6f73_0%,#436f73_100%)] p-7 text-white shadow-[0_18px_40px_rgba(42,99,100,0.14)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(42,99,100,0.18)]"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/6 text-[#d0b284]">
          {icon}
        </div>
        <h2 className="text-[26px] leading-[1.5] text-white">{title}</h2>
        <p className="mt-4 max-w-[340px] text-[15px] leading-8 text-white/90">{subtitle}</p>
      </div>
    </Link>
  );
}

export default function PortalPage() {
  const { user, originalUser, switchViewRole, logout, canUseRoleSwitch, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roles = useMemo<Role[]>(() => {
    const raw = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return raw.filter((role): role is Role => role === 'manager' || role === 'warehouse' || role === 'user');
  }, [originalUser?.roles]);

  const error = searchParams.get('error');

  const handleRoleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRole = event.target.value as Role;
    if (!nextRole || nextRole === user?.role) return;
    await switchViewRole(nextRole);
    router.replace('/portal');
    router.refresh();
  };

  if (loading) {
    return <div className="min-h-screen bg-[#eef4f3]" />;
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#eef4f3] text-slate-900"
      style={{
        background:
          'radial-gradient(circle at top right, rgba(1,101,100,0.08), transparent 20%), radial-gradient(circle at bottom left, rgba(208,178,132,0.12), transparent 24%), linear-gradient(180deg, #f6f8f8 0%, #edf3f2 100%)',
      }}
    >
      <div className="mx-auto flex max-w-[1700px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-wrap items-center gap-3 rounded-[26px] border border-[#dbe6e4] bg-white/95 px-4 py-3 shadow-soft sm:px-5">
          <button
            onClick={logout}
            className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#dbe6e4] bg-white text-[#2A6364] transition hover:bg-[#f6fbfa]"
            aria-label="تسجيل الخروج"
            type="button"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M10 7 5 12l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M14 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex min-w-[240px] flex-1 items-center justify-between rounded-[24px] border border-[#dbe6e4] bg-white px-4 py-3 shadow-soft">
            <div className="min-w-0 text-right">
              <p className="truncate text-[17px] leading-7 text-[#17233a]">{user?.fullName || 'مستخدم النظام'}</p>
              <p className="truncate text-[14px] leading-6 text-[#7b8797]">{user?.email || ''}</p>
            </div>
            <div className="mr-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#2A6364]/8 text-[#2A6364]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 19c1.5-2.8 4-4.2 7-4.2S17.5 16.2 19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#dbe6e4] bg-white text-[#2A6364] shadow-soft">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          {canUseRoleSwitch && roles.length > 1 ? (
            <div className="mr-auto flex min-w-[300px] flex-1 items-center justify-end">
              <div className="flex w-full max-w-[430px] items-center rounded-full border border-[#dbe6e4] bg-white p-1 shadow-soft">
                {roles.map((role) => {
                  const active = user?.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={async () => {
                        if (role === user?.role) return;
                        await switchViewRole(role);
                        router.replace('/portal');
                        router.refresh();
                      }}
                      className={`flex-1 rounded-full px-4 py-3 text-[15px] transition ${
                        active ? 'bg-[#2A6364] text-white shadow-sm' : 'text-[#4d5968] hover:bg-[#f6fbfa]'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </header>

        {error === 'unauthorized' ? (
          <div className="mb-4 rounded-[20px] border border-[#f0d8da] bg-[#fff6f6] px-5 py-4 text-[14px] text-[#8b3641]">
            لا تملك صلاحية الوصول إلى هذه الصفحة. اختر المسار المناسب من البوابة.
          </div>
        ) : null}

        <div className="grid min-h-[calc(100vh-140px)] grid-cols-1 overflow-hidden rounded-[34px] border border-[#dbe6e4] bg-white/70 shadow-soft-xl lg:grid-cols-[1.02fr_0.98fr]">
          <section className="order-2 flex items-center justify-center p-6 lg:order-1 lg:p-10 xl:p-14">
            <div className="flex w-full max-w-[430px] flex-col gap-10">
              <SystemCard
                href={getMaterialsRoute(user?.role)}
                title="طلب مواد تدريبية"
                subtitle="من هنا يمكنك تقديم طلب مواد لتلبية الاحتياجات التدريبية"
                icon={
                  <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
                    <path d="M12 24 32 14l20 10v24H12V24Z" stroke="currentColor" strokeWidth="2.6" />
                    <path d="M22 32h20M22 40h20" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                    <path d="M20 24v24M44 24v24" stroke="currentColor" strokeWidth="2.6" />
                  </svg>
                }
              />

              <SystemCard
                href={getServicesRoute(user?.role)}
                title="طلب خدمات عامة"
                subtitle="من هنا يمكنك تقديم طلب صيانة ونظافة ومشتريات وطلبات أخرى"
                icon={
                  <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
                    <path d="m19 17 28 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <path d="M24 12 14 22l6 6 10-10-6-6ZM45 34l7 7-9 9-7-7" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                  </svg>
                }
              />
            </div>
          </section>

          <section className="order-1 relative hidden overflow-hidden bg-[linear-gradient(135deg,#015857_0%,#2A6364_48%,#2f7376_100%)] lg:flex lg:items-center lg:justify-center lg:p-10 xl:p-14">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:34px_34px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(208,178,132,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_20%)]" />
            <div className="absolute right-[12%] top-[20%] h-32 w-32 rounded-[28px] border border-white/10 bg-white/6" />
            <div className="absolute bottom-[16%] left-[18%] h-24 w-24 rounded-full border border-white/10 bg-white/6" />

            <div className="relative z-10 flex w-full max-w-[680px] flex-col items-center text-center text-white">
              <div className="w-full rounded-[34px] border border-white/12 bg-white/6 px-8 py-10 backdrop-blur-sm">
                <img src="/nauss-gold-logo.png" alt="شعار جامعة نايف" className="mx-auto max-h-[180px] w-auto object-contain" />
              </div>

              <div className="mt-10 rounded-[30px] border border-white/12 bg-white/10 px-8 py-7 backdrop-blur-sm">
                <p className="text-[40px] leading-[1.8] text-white xl:text-[48px]">
                  منصة مواد التدريب
                  <br />
                  وكالة التدريب
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
