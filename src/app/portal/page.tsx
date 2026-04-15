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
    <div dir="rtl" className="arabic-surface min-h-screen bg-[#f4f7f6]">
      <div className="mx-auto max-w-[1280px] px-4 py-5 lg:px-6 lg:py-6">
        <header className="rounded-[28px] border border-white/80 bg-white/90 px-4 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3 rounded-[20px] border border-[#dde7e5] bg-[#fbfcfc] px-4 py-3">
                <img
                  src="/nauss-gold-logo.png"
                  alt="شعار جامعة نايف"
                  className="h-10 w-auto object-contain"
                />
                <div className="text-right">
                  <div className="text-[11px] font-semibold text-[#8a9a98]">منصة المواد والخدمات</div>
                  <div className="text-[15px] font-extrabold text-[#223738]">
                    {user?.fullName || 'مستخدم النظام'}
                  </div>
                </div>
              </div>

              {canUseRoleSwitch && availableRoles.length > 1 ? (
                <div className="inline-flex w-full items-center gap-1 rounded-[20px] border border-[#dce6e4] bg-[#f7f9f9] p-1 shadow-inner lg:w-auto">
                  {availableRoles.map((role) => {
                    const active = user?.role === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => switchViewRole(role)}
                        className={
                          active
                            ? 'flex-1 rounded-[16px] bg-[#2A6364] px-4 py-2.5 text-[14px] font-semibold text-white lg:flex-none'
                            : 'flex-1 rounded-[16px] px-4 py-2.5 text-[14px] font-semibold text-[#455d5d] hover:bg-white lg:flex-none'
                        }
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex h-11 items-center justify-center rounded-[18px] border border-[#dce6e4] bg-white px-4 text-[14px] font-semibold text-[#27494a]"
            >
              تسجيل الخروج
            </button>
          </div>
        </header>

        <main className="mx-auto mt-12 max-w-[980px]">
          <div className="text-center">
            <div className="text-[12px] font-semibold tracking-[0.16em] text-[#8a9a98]">اختيار النظام</div>
            <h1 className="mt-3 text-[28px] font-extrabold text-[#223738] sm:text-[34px]">
              اختر النظام
            </h1>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <PortalEntryCard
              title="طلب مواد"
              subtitle="المواد من المخزن"
              tone="teal"
              icon={<MaterialsIcon />}
              onClick={() => router.push('/materials/dashboard')}
            />

            <PortalEntryCard
              title="طلب خدمات"
              subtitle="الخدمات العامة"
              tone="burgundy"
              icon={<ServicesIcon />}
              onClick={() => router.push('/services/dashboard')}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function PortalEntryCard({
  title,
  subtitle,
  icon,
  tone,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'teal' | 'burgundy';
  onClick: () => void;
}) {
  const palette =
    tone === 'teal'
      ? {
          border: 'border-[#cfe0dc]',
          iconBg: 'bg-[#eef5f4]',
          iconText: 'text-[#0f5d61]',
          arrowBg: 'bg-[#0f5d61]',
          arrowText: 'text-white',
        }
      : {
          border: 'border-[#e0d1d9]',
          iconBg: 'bg-[#f5ecef]',
          iconText: 'text-[#7c1e3e]',
          arrowBg: 'bg-[#7c1e3e]',
          arrowText: 'text-white',
        };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[24px] border ${palette.border} bg-white px-5 py-5 text-right shadow-[0_18px_38px_-34px_rgba(15,23,42,0.22)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_-36px_rgba(15,23,42,0.26)]`}
    >
      <div className="flex items-center gap-4">
        <div className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] ${palette.iconBg} ${palette.iconText}`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-[#8a9a98]">{subtitle}</div>
          <div className="mt-1 text-[30px] font-extrabold text-[#223738]">{title}</div>
        </div>

        <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${palette.arrowBg} ${palette.arrowText} transition group-hover:scale-105`}>
          <ArrowIcon />
        </div>
      </div>
    </button>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m11 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="M4 7.5 12 3l8 4.5-8 4.5L4 7.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7.5V16.5L12 21l8-4.5V7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 12v9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="m14.7 6.3 3 3-8.4 8.4H6.3v-3L14.7 6.3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.3 7.7 3 3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
