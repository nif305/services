'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { type AppRole, type WorkspaceKey, WORKSPACE_DESCRIPTIONS, WORKSPACE_TITLES } from '@/lib/workspace';

const ROLE_ORDER: AppRole[] = ['manager', 'warehouse', 'user'];
const ROLE_LABELS: Record<AppRole, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول مخزن',
  user: 'موظف',
};

function HeaderIcon({ children }: { children: React.ReactNode }) {
  return <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dbe6e4] bg-white text-[#2A6364]">{children}</div>;
}

export function WorkspaceHeader({ workspace }: { workspace: WorkspaceKey }) {
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();
  const router = useRouter();

  const availableRoles = useMemo<AppRole[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return ROLE_ORDER.filter((role) => roles.includes(role));
  }, [originalUser?.roles]);

  const handleSwitchRole = async (role: AppRole) => {
    if (!canUseRoleSwitch || user?.role === role) return;
    await switchViewRole(role);
    router.push('/portal');
    router.refresh();
  };

  return (
    <header className="rounded-[26px] border border-[#dde5e3] bg-white px-4 py-3 shadow-soft sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="order-2 flex flex-wrap items-center justify-start gap-3 lg:order-1">
          <button
            type="button"
            onClick={() => router.push('/portal')}
            className="flex h-12 items-center gap-2 rounded-2xl border border-[#dbe6e4] bg-white px-4 text-sm font-semibold text-[#2A6364] transition hover:bg-[#f7faf9]"
          >
            <span>اختيار النظام</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="M8 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex min-w-[230px] items-center gap-3 rounded-[22px] border border-[#dbe6e4] bg-white px-3 py-2">
            <HeaderIcon>
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </HeaderIcon>
            <div className="min-w-0">
              <div className="truncate text-[16px] font-bold text-[#203535]">{user?.fullName || 'مستخدم النظام'}</div>
              <div className="truncate text-[12px] text-[#7a8b89]">{user?.email || ''}</div>
            </div>
          </div>

          <HeaderIcon>
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </HeaderIcon>

          <button
            type="button"
            onClick={logout}
            className="flex h-12 items-center gap-2 rounded-2xl border border-[#dbe6e4] bg-white px-4 text-sm font-semibold text-[#2A6364] transition hover:bg-[#f7faf9]"
          >
            <span>تسجيل الخروج</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-2 lg:order-2 lg:items-end">
          <div className="text-[12px] font-semibold text-[#8a9897]">{WORKSPACE_TITLES[workspace]}</div>
          <h1 className="text-[18px] font-bold text-[#234445] sm:text-[20px]">{WORKSPACE_TITLES[workspace]}</h1>
          <p className="max-w-[620px] text-[12px] text-[#6b7d7c] sm:text-[13px]">{WORKSPACE_DESCRIPTIONS[workspace]}</p>
        </div>
      </div>

      {canUseRoleSwitch && availableRoles.length > 1 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[22px] border border-[#eef3f2] bg-[#f9fbfb] p-2">
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleSwitchRole(role)}
              className={`rounded-full px-5 py-2 text-[14px] font-semibold transition ${
                user?.role === role ? 'bg-[#2A6364] text-white shadow-[0_10px_20px_-16px_rgba(42,99,100,0.55)]' : 'text-[#4d6060] hover:bg-white'
              }`}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}
