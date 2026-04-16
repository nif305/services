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
    <div dir="rtl" className="min-h-screen bg-[#f6f7f3] px-5 py-5 lg:px-7 lg:py-6">
      <div dir="ltr" className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1740px] overflow-hidden rounded-[30px] border border-[#dde5e1] bg-white shadow-[0_22px_60px_-44px_rgba(15,23,42,0.20)] lg:grid-cols-[1fr_0.84fr]">
        <section dir="rtl" className="order-1 flex flex-col bg-white px-8 py-6 lg:px-10 lg:py-7">
          <header dir="ltr" className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={logout}
              aria-label="تسجيل الخروج"
              className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#dde5e1] bg-white text-[#315f61] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.18)]"
            >
              <LogoutIcon />
            </button>

            <div className="flex h-14 w-[330px] items-center justify-between rounded-[24px] border border-[#dde5e1] bg-white px-5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] text-[#315f61]">
                <UserIcon />
              </div>
              <div className="text-right">
                <div className="text-[13px] font-extrabold leading-none text-[#1f3435]">
                  {user?.fullName || 'مستخدم النظام'}
                </div>
                <div className="mt-1 text-[10px] font-medium text-[#819391]">
                  {user?.email || ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="التنبيهات"
              className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#dde5e1] bg-white text-[#315f61] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.18)]"
            >
              <BellIcon />
            </button>

            {canUseRoleSwitch && availableRoles.length > 1 ? (
              <div dir="rtl" className="inline-flex h-14 w-[360px] items-center gap-1 rounded-[24px] border border-[#dde5e1] bg-white p-1 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)]">
                {availableRoles.map((role) => {
                  const active = user?.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => switchViewRole(role)}
                      className={
                        active
                          ? 'flex-1 rounded-[18px] bg-[#2f6666] px-4 py-2.5 text-[12px] font-bold text-white'
                          : 'flex-1 rounded-[18px] px-4 py-2.5 text-[12px] font-semibold text-[#607372] transition hover:bg-[#f3f7f5]'
                      }
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </header>

          <div className="mt-10 flex flex-1 items-center justify-center">
            <div className="w-full max-w-[480px] space-y-8">
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
          <div className="absolute left-[12%] top-[16%] h-24 w-24 rounded-full border border-white/10" />
          <div className="absolute bottom-[15%] right-[12%] h-28 w-28 rounded-full border border-white/10" />

          <div className="relative flex h-full flex-col items-center justify-center px-8 py-10">
            <div className="w-full max-w-[640px] rounded-[34px] border border-white/8 bg-white/[0.03] px-10 py-10">
              <img
                src="/nauss-gold-logo.png"
                alt="شعار جامعة نايف العربية للعلوم الأمنية"
                className="mx-auto h-auto w-full max-w-[520px] object-contain opacity-95"
              />
            </div>

            <div className="mt-14 w-full max-w-[420px] rounded-[34px] border border-white/8 bg-white/[0.14] px-8 py-8 text-center shadow-[0_24px_40px_-34px_rgba(0,0,0,0.22)] backdrop-blur-[2px]">
              <div className="text-[14px] font-semibold text-white/88">منصة مواد التدريب</div>
              <div className="mt-4 text-[30px] font-extrabold leading-tight">وكالة التدريب</div>
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
      className="flex w-full flex-col items-center rounded-[30px] border-[3px] border-[#173d45] bg-[#547d7f] px-8 py-10 text-center text-white shadow-[0_18px_38px_-28px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5"
    >
      <div className="inline-flex h-24 w-24 items-center justify-center text-[#d2b77a]">{icon}</div>
      <div className="mt-4 text-[21px] font-extrabold leading-tight">{title}</div>
      <div className="mt-5 max-w-[290px] text-[12px] font-medium leading-7 text-white/92">{description}</div>
    </button>
  );
}

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" className="h-20 w-20">
      <path d="M22 74V35l26-13 26 13v39" stroke="currentColor" strokeWidth="5.5" />
      <path d="M34 45h28M34 54h28" stroke="currentColor" strokeLinecap="round" strokeWidth="5.5" />
      <path d="M34 74V60h28v14" stroke="currentColor" strokeWidth="5.5" />
      <path d="M42 66h.01M54 66h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="6" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" className="h-20 w-20">
      <path d="m29 34 34 34" stroke="currentColor" strokeLinecap="round" strokeWidth="7" />
      <path d="m59 27 10 10-11 11-10-10 11-11Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="6" />
      <path d="M30 68 48 50" stroke="currentColor" strokeLinecap="round" strokeWidth="7" />
      <path d="m28 71 8-8 11 11-8 8a7 7 0 0 1-11 0 7 7 0 0 1 0-11Z" fill="currentColor" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5.5 w-5.5">
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
    <svg viewBox="0 0 24 24" fill="none" className="h-5.5 w-5.5">
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
    <svg viewBox="0 0 24 24" fill="none" className="h-5.5 w-5.5">
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
