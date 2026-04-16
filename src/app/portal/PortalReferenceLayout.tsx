'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Role = 'manager' | 'warehouse' | 'user';

const ROLE_LABELS: Record<Role, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول المخزن',
  user: 'موظف',
};

const ROLE_ORDER: Role[] = ['manager', 'warehouse', 'user'];

export default function PortalReferenceLayout() {
  const router = useRouter();
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();

  const availableRoles = useMemo<Role[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return ROLE_ORDER.filter((role) => roles.includes(role));
  }, [originalUser?.roles]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6f7f3] px-4 py-4 lg:px-6 lg:py-5">
      <div dir="ltr" className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1600px] overflow-hidden rounded-[26px] border border-[#dde5e1] bg-white shadow-[0_18px_48px_-40px_rgba(15,23,42,0.18)] lg:grid-cols-[0.94fr_0.86fr]">
        <section dir="rtl" className="order-1 flex flex-col bg-white px-6 py-5 lg:px-8 lg:py-6">
          <header dir="ltr" className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={logout}
              aria-label="تسجيل الخروج"
              className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#dde5e1] bg-white text-[#315f61] shadow-[0_12px_24px_-22px_rgba(15,23,42,0.16)]"
            >
              <LogoutIcon />
            </button>

            <div className="flex h-12 w-[300px] items-center justify-between rounded-[20px] border border-[#dde5e1] bg-white px-4 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.14)]">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] text-[#315f61]">
                <UserIcon />
              </div>
              <div className="text-right">
                <div className="text-[12px] font-extrabold leading-none text-[#1f3435]">
                  {user?.fullName || 'مستخدم النظام'}
                </div>
                <div className="mt-1 text-[9px] font-medium text-[#819391]">
                  {user?.email || ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="التنبيهات"
              className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#dde5e1] bg-white text-[#315f61] shadow-[0_12px_24px_-22px_rgba(15,23,42,0.16)]"
            >
              <BellIcon />
            </button>

            {canUseRoleSwitch && availableRoles.length > 1 ? (
              <div dir="rtl" className="inline-flex h-12 w-[330px] items-center gap-1 rounded-[20px] border border-[#dde5e1] bg-white p-1 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.14)]">
                {availableRoles.map((role) => {
                  const active = user?.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => switchViewRole(role)}
                      className={
                        active
                          ? 'flex-1 rounded-[16px] bg-[#2f6666] px-3 py-2 text-[11px] font-bold text-white'
                          : 'flex-1 rounded-[16px] px-3 py-2 text-[11px] font-semibold text-[#607372] transition hover:bg-[#f3f7f5]'
                      }
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </header>

          <div className="mt-7 flex flex-1 items-center justify-center">
            <div className="w-full max-w-[420px] space-y-6">
              <SystemCard
                title="طلب مواد تدريبية"
                description="من هنا يمكنك تقديم طلب مواد لتلبية الاحتياجات التدريبية"
                icon={<MaterialsIcon />}
                onClick={() => router.push('/materials/dashboard')}
              />

              <SystemCard
                title="طلب خدمات عامة"
                description="من هنا يمكنك تقديم طلب صيانة ونظافة ومشتريات وخدمات أخرى"
                icon={<ServicesIcon />}
                onClick={() => router.push('/services/dashboard')}
              />
            </div>
          </div>
        </section>

        <section dir="rtl" className="order-2 relative overflow-hidden bg-[#2f6666] text-white">
          <div className="absolute inset-0 opacity-[0.08]" style={gridPatternStyle} />
          <div className="absolute left-[12%] top-[16%] h-20 w-20 rounded-full border border-white/10" />
          <div className="absolute bottom-[15%] right-[12%] h-24 w-24 rounded-full border border-white/10" />

          <div className="relative flex h-full flex-col items-center justify-center px-7 py-8">
            <div className="w-full max-w-[560px] rounded-[28px] border border-white/8 bg-white/[0.03] px-8 py-8">
              <img
                src="/nauss-gold-logo.png"
                alt="شعار جامعة نايف العربية للعلوم الأمنية"
                className="mx-auto h-auto w-full max-w-[460px] object-contain opacity-95"
              />
            </div>

            <div className="mt-10 w-full max-w-[360px] rounded-[28px] border border-white/8 bg-white/[0.14] px-7 py-7 text-center shadow-[0_20px_36px_-32px_rgba(0,0,0,0.2)] backdrop-blur-[2px]">
              <div className="text-[12px] font-semibold text-white/88">منصة مواد التدريب</div>
              <div className="mt-3 text-[26px] font-extrabold leading-tight">وكالة التدريب</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SystemCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-center rounded-[26px] border-[3px] border-[#173d45] bg-[#547d7f] px-7 py-8 text-center text-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5"
    >
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#4f7678] text-[#d7bd82] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        {icon}
      </div>
      <div className="mt-3 text-[18px] font-extrabold leading-tight">{title}</div>
      <div className="mt-4 max-w-[250px] text-[11px] font-medium leading-6 text-white/92">{description}</div>
    </button>
  );
}

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" className="h-[58px] w-[58px]">
      <path
        d="M20 74V37.5L48 22l28 15.5V74h-8V43H28v31h-8Z"
        fill="currentColor"
      />
      <path
        d="M34 49h28"
        stroke="#4f7678"
        strokeLinecap="round"
        strokeWidth="4.8"
      />
      <path
        d="M33 59.5h10v10H33zm12.5 0H56v10H45.5zm12.5 0H69v10H58zm-25 12.5h10v10H33zm12.5 0H56v10H45.5z"
        fill="#4f7678"
      />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" className="h-[58px] w-[58px]">
      <path
        d="m29 31 36 36"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        d="m56 24 16 16-10 10-16-16 10-10Z"
        fill="currentColor"
      />
      <path
        d="m26 68 14-14 15 15-14 14a8 8 0 0 1-11.3 0l-3.7-3.7a8 8 0 0 1 0-11.3Z"
        fill="currentColor"
      />
      <circle cx="59" cy="37" r="3.5" fill="#4f7678" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M14 7V5.8A1.8 1.8 0 0 0 12.2 4H7.8A1.8 1.8 0 0 0 6 5.8v12.4A1.8 1.8 0 0 0 7.8 20h4.4a1.8 1.8 0 0 0 1.8-1.8V17"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M10 12h9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="m16 8 4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 18.2c1.8-3 4.1-4.5 6.5-4.5s4.7 1.5 6.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M8 10a4 4 0 1 1 8 0v2.6c0 .8.2 1.5.7 2.1l.8 1H6.5l.8-1c.5-.6.7-1.3.7-2.1V10Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

const gridPatternStyle = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
  backgroundSize: '34px 34px',
};
