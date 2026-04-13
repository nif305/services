'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Role = 'manager' | 'warehouse' | 'user';

const ROLE_LABELS: Record<Role, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول المخزن',
  user: 'موظف',
};

function PortalCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[270px] w-full flex-col items-center justify-center overflow-hidden rounded-[34px] border border-[#0d353d] bg-[#4f7e81] px-8 py-8 text-center text-white shadow-[0_20px_60px_-40px_rgba(1,101,100,0.9)] transition duration-200 hover:-translate-y-1 hover:bg-[#3f7275]"
    >
      <div className="mb-6 text-[#d0b284]">{icon}</div>
      <h2 className="text-[24px] leading-[1.5] text-white">{title}</h2>
      <p className="mt-5 max-w-[320px] text-[18px] leading-[1.8] text-white/95">{description}</p>
    </button>
  );
}

export default function PortalPage() {
  const router = useRouter();
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();

  const roles = (Array.isArray(originalUser?.roles) ? originalUser.roles : ['user']).filter(
    (role): role is Role => role === 'manager' || role === 'warehouse' || role === 'user'
  );

  const handleRoleChange = async (role: Role) => {
    await switchViewRole(role);
    router.replace('/portal');
    router.refresh();
  };

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
      className="min-h-screen overflow-x-hidden bg-[#edf3f2]"
      style={{
        background:
          'radial-gradient(circle at top right, rgba(1,101,100,0.08), transparent 22%), radial-gradient(circle at bottom left, rgba(208,178,132,0.10), transparent 22%), linear-gradient(180deg, #f6f8f8 0%, #edf3f2 100%)',
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col px-4 py-5 sm:px-5 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={logout}
            aria-label="تسجيل الخروج"
            className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#d7e0df] bg-white text-[#456669] shadow-soft transition hover:border-[#016564]/20 hover:text-[#016564]"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M10 7 5 12l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 12h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M14 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-[24px] border border-[#d7e0df] bg-white px-4 py-3 shadow-soft sm:flex-none sm:px-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#016564]/8 text-[#016564]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 19c1.5-2.8 4-4.2 7-4.2S17.5 16.2 19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-[18px] leading-7 text-[#1b2d2f]">{user?.fullName || 'مستخدم النظام'}</p>
              <p className="truncate text-[13px] text-[#7d8b8c]">{user?.email || ''}</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="الإشعارات"
            className="relative flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#d7e0df] bg-white text-[#456669] shadow-soft"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          {canUseRoleSwitch && roles.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#d7e0df] bg-white px-3 py-2 shadow-soft">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`rounded-full px-5 py-2 text-[16px] transition ${
                    user?.role === role
                      ? 'bg-[#016564] text-white shadow-sm'
                      : 'text-[#5d6e70] hover:bg-[#f5f8f8]'
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <main className="grid flex-1 gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <section className="flex flex-col justify-center gap-8 px-2 lg:px-6 xl:px-10">
            <PortalCard
              title="طلب مواد تدريبية"
              description="من يمكنك تقديم طلب مواد لتلبية الاحتياجات التدريبية"
              onClick={openMaterials}
              icon=(
                <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
                  <path d="M14 24h36v24H14z" stroke="currentColor" strokeWidth="3" />
                  <path d="M20 24V16h24v8" stroke="currentColor" strokeWidth="3" />
                  <path d="M24 34h16M24 42h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )
            />

            <PortalCard
              title="طلب خدمات عامة"
              description="من يمكنك تقديم طلب صيانة وتنظيف ومشتريات أخرى"
              onClick={openServices}
              icon=(
                <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
                  <path d="m18 20 9 9" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                  <path d="m24 14 16 16" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                  <path d="M42 14 23 33a6 6 0 0 0 8.5 8.5L50 23" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )
            />
          </section>

          <section className="relative hidden overflow-hidden rounded-[0px] lg:flex lg:items-center lg:justify-center">
            <div className="absolute inset-0 rounded-[0px] bg-[linear-gradient(135deg,#015f5f_0%,#016564_42%,#014948_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(208,178,132,0.20),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.07),transparent_18%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:34px_34px]" />
            <div className="relative z-10 flex w-full max-w-[760px] flex-col items-center justify-center px-10 text-center text-white">
              <div className="relative flex min-h-[240px] w-[520px] items-center justify-center rounded-[40px] border border-white/10 bg-white/8 px-10 backdrop-blur-md">
                <img src="/nauss-gold-logo.png" alt="شعار جامعة نايف" className="max-h-[170px] w-auto object-contain" />
              </div>
              <div className="mt-10 rounded-[28px] border border-white/10 bg-white/10 px-8 py-6 backdrop-blur-md">
                <p className="text-[34px] font-normal leading-[1.6]">
                  منصة مواد التدريب
                  <br />
                  وكالة التدريب
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
