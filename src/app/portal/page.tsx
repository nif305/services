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
      <div className="mx-auto max-w-[1500px] px-4 py-5 lg:px-6 lg:py-6">
        <header className="overflow-hidden rounded-[32px] border border-white/80 bg-white/90 px-5 py-5 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.28)] backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="rounded-[24px] border border-[#dce6e4] bg-[linear-gradient(135deg,#0f5d61_0%,#6d8d8e_100%)] px-5 py-4 text-white shadow-[0_18px_40px_-34px_rgba(1,101,100,0.74)]">
                <div className="text-[12px] text-white/72">بوابة موحدة</div>
                <div className="mt-2 text-[24px] font-extrabold leading-tight">منصة المواد والخدمات</div>
              </div>

              {canUseRoleSwitch && availableRoles.length > 1 ? (
                <div className="inline-flex w-full items-center gap-1 rounded-[24px] border border-[#dce6e4] bg-[#f7f9f9] p-1 shadow-inner lg:w-auto">
                  {availableRoles.map((role) => {
                    const active = user?.role === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => switchViewRole(role)}
                        className={
                          active
                            ? 'flex-1 rounded-[18px] bg-[#2A6364] px-5 py-3 text-[15px] font-semibold text-white lg:flex-none'
                            : 'flex-1 rounded-[18px] px-5 py-3 text-[15px] font-semibold text-[#455d5d] hover:bg-white lg:flex-none'
                        }
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex items-center gap-3 rounded-[24px] border border-[#dde7e5] bg-[#fbfcfc] px-4 py-3">
                <img
                  src="/nauss-gold-logo.png"
                  alt="شعار جامعة نايف"
                  className="h-12 w-auto object-contain sm:h-14"
                />
                <div className="text-right">
                  <div className="text-[15px] font-bold text-[#223738]">
                    {user?.fullName || 'مستخدم النظام'}
                  </div>
                  <div className="text-[12px] text-[#7a8d8b]">{user?.email || ''}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dce6e4] bg-white px-5 text-[14px] font-semibold text-[#27494a]"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </header>

        <main className="mt-8">
          <div className="mx-auto max-w-[1100px] text-center">
            <div className="text-[13px] font-semibold tracking-[0.12em] text-[#7d8f8d]">
              اختر النظام
            </div>
            <h1 className="mt-3 text-[34px] font-extrabold text-[#223738] sm:text-[44px]">
              ابدأ من المسار الذي تحتاجه
            </h1>
            <p className="mt-3 text-[15px] leading-8 text-[#6f8080] sm:text-[17px]">
              انتقال مباشر وسريع إلى نظام طلب المواد من المخزن أو نظام طلب الخدمات.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <PortalEntryCard
              title="طلب مواد"
              subtitle="نظام المواد من المخزن"
              description="طلبات المواد، الصرف، المرتجعات، والعهد."
              icon={<MaterialsIcon />}
              accent="from-[#0f5d61] via-[#45787a] to-[#7fa0a0]"
              onClick={() => router.push('/materials/dashboard')}
            />

            <PortalEntryCard
              title="طلب خدمات"
              subtitle="نظام الخدمات"
              description="الصيانة، النظافة، الشراء المباشر، والمراسلات."
              icon={<ServicesIcon />}
              accent="from-[#7c1e3e] via-[#8c4e66] to-[#286c6a]"
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
  description,
  icon,
  accent,
  onClick,
}: {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group overflow-hidden rounded-[34px] bg-gradient-to-br ${accent} p-[1px] text-right shadow-[0_26px_56px_-40px_rgba(15,23,42,0.42)] transition duration-200 hover:-translate-y-1`}
    >
      <div className="flex h-full min-h-[320px] flex-col justify-between rounded-[33px] bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_100%)] p-7 text-white backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/12 text-white">
            {icon}
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] text-white/86">
            دخول مباشر
          </span>
        </div>

        <div>
          <div className="text-[14px] text-white/72">{subtitle}</div>
          <div className="mt-3 text-[38px] font-extrabold leading-tight">{title}</div>
          <div className="mt-4 max-w-[440px] text-[16px] leading-8 text-white/82">
            {description}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[24px] border border-white/12 bg-black/10 px-4 py-4 text-[15px] font-semibold">
          <span>الانتقال إلى {title}</span>
          <span className="text-[22px] transition group-hover:translate-x-[-4px]">←</span>
        </div>
      </div>
    </button>
  );
}

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
      <path d="M4 7.5 12 3l8 4.5-8 4.5L4 7.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7.5V16.5L12 21l8-4.5V7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 12v9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
      <path d="m14.7 6.3 3 3-8.4 8.4H6.3v-3L14.7 6.3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.3 7.7 3 3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
