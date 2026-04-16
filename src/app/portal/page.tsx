export { default } from './PortalReferenceLayout';
/*

import type { ReactNode } from 'react';
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

function getRoleLabel(role: Role) {
  return ROLE_LABELS[role];
}

export default function PortalPage() {
  const router = useRouter();
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();

  const availableRoles = useMemo<Role[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return ROLE_ORDER.filter((role) => roles.includes(role));
  }, [originalUser?.roles]);

  return (
    <div dir="rtl" className="arabic-surface min-h-screen bg-[#f5f7f4]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <section className="relative hidden overflow-hidden bg-[#2f6666] lg:block">
          <div className="absolute inset-0 opacity-20" style={gridPatternStyle} />
          <div className="absolute left-[10%] top-[18%] h-20 w-20 rounded-full border border-white/10" />
          <div className="absolute bottom-[16%] left-[12%] h-16 w-16 rounded-full border border-white/12" />

          <div className="relative flex h-full flex-col items-center justify-center px-8">
            <div className="w-full max-w-[500px] rounded-[34px] border border-white/10 bg-[#356d6d]/36 px-8 py-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <img
                src="/nauss-gold-logo.png"
                alt="شعار جامعة نايف"
                className="mx-auto h-auto w-full max-w-[360px] object-contain opacity-95"
              />
            </div>

            <div className="mt-10 w-full max-w-[340px] rounded-[28px] border border-white/10 bg-[#709590]/50 px-6 py-7 text-center text-white shadow-[0_16px_30px_-22px_rgba(0,0,0,0.18)] backdrop-blur-sm">
              <div className="text-[13px] font-semibold text-white/90">منصة مواد التدريب</div>
              <div className="mt-3 text-[26px] font-extrabold leading-tight">وكالة التدريب</div>
            </div>
          </div>
        </section>

        <section className="relative bg-[#f8f8f6] px-5 py-5 lg:px-8 lg:py-6">
          <div className="mx-auto flex max-w-[760px] flex-col">
            <header className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <button
                type="button"
                onClick={logout}
                aria-label="تسجيل الخروج"
                className="order-2 inline-flex h-11 w-11 items-center justify-center justify-self-start rounded-[16px] border border-[#d9e2df] bg-white text-[#315f61] shadow-[0_14px_24px_-22px_rgba(15,23,42,0.18)] lg:order-3"
              >
                <LogoutIcon />
              </button>

              <div className="order-1 flex min-w-[220px] items-center justify-between gap-3 rounded-[22px] border border-[#d9e2df] bg-white px-4 py-3 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.15)] lg:order-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f5f8f7] text-[#315f61]">
                  <UserIcon />
                </div>
                <div className="flex-1 text-right">
                  <div className="text-[13px] font-extrabold text-[#223738]">
                    {user?.fullName || 'مستخدم النظام'}
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium text-[#869895]">
                    {user?.email || ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                aria-label="التنبيهات"
                className="order-3 inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-[16px] border border-[#d9e2df] bg-white text-[#315f61] shadow-[0_14px_24px_-22px_rgba(15,23,42,0.18)] lg:order-1"
              >
                <BellIcon />
              </button>

              {canUseRoleSwitch && availableRoles.length > 1 ? (
                <div className="order-4 col-span-full inline-flex min-w-[280px] w-full items-center gap-1 rounded-[20px] border border-[#d9e2df] bg-white p-1 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.15)]">
                  {availableRoles.map((role) => {
                    const active = user?.role === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => switchViewRole(role)}
                        className={
                          active
                            ? 'flex-1 rounded-[16px] bg-[#2f6666] px-4 py-2 text-[12px] font-bold text-white'
                            : 'flex-1 rounded-[16px] px-4 py-2 text-[12px] font-semibold text-[#576b6b] hover:bg-[#f5f8f7]'
                        }
                      >
                        {getRoleLabel(role)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </header>

            <div className="flex flex-1 items-center justify-center py-8 lg:py-8">
              <div className="w-full max-w-[390px] space-y-5">
                <PortalCard
                  icon={<MaterialsIcon />}
                  title="طلب مواد"
                  description="تقديم طلب مواد تدريبية"
                  onClick={() => router.push('/materials/dashboard')}
                />

                <PortalCard
                  icon={<ServicesIcon />}
                  title="طلب خدمات"
                  description="صيانة ونظافة ومشتريات"
                  onClick={() => router.push('/services/dashboard')}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PortalCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-4 rounded-[26px] border border-[#d8e2de] bg-white px-5 py-5 text-right shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-[#c9dad5] hover:shadow-[0_28px_46px_-36px_rgba(15,23,42,0.22)]"
    >
      <div className="flex-1">
        <div className="text-[24px] font-extrabold leading-tight text-[#223738]">{title}</div>
        <div className="mt-2 text-[13px] font-medium leading-6 text-[#6d8381]">{description}</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#eef5f3] text-[#c8ab70]">
          {icon}
        </div>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#2f6666] text-white transition group-hover:bg-[#255657]">
          <ArrowLeftIcon />
        </div>
      </div>
    </button>
  );
}

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-10 w-10">
      <path d="M15 51V22l17-9 17 9v29" stroke="currentColor" strokeWidth="3.5" />
      <path d="M22 29h20M22 36h20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M22 51V41h20v10" stroke="currentColor" strokeWidth="3.5" />
      <path d="M27 46h.01M37 46h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-10 w-10">
      <path d="m18 23 23 23" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="m38 18 8 8-8 8-8-8 8-8Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M19 46 31 34" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="m17 48 6-6 7 7-6 6a5 5 0 0 1-7 0 5 5 0 0 1 0-7Z" fill="currentColor" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M14 7V5.8A1.8 1.8 0 0 0 12.2 4H7.8A1.8 1.8 0 0 0 6 5.8v12.4A1.8 1.8 0 0 0 7.8 20h4.4a1.8 1.8 0 0 0 1.8-1.8V17" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 12h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m16 8 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 18.2c1.8-3 4.1-4.5 6.5-4.5s4.7 1.5 6.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5">
      <path d="M8 10a4 4 0 1 1 8 0v2.6c0 .8.2 1.5.7 2.1l.8 1H6.5l.8-1c.5-.6.7-1.3.7-2.1V10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M19 12H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m10 8-4 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const gridPatternStyle = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};
*/
