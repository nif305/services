'use client';

import { ChangeEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { type AppRole, type WorkspaceKey, WORKSPACE_TITLES } from '@/lib/workspace';

const ROLE_LABELS: Record<AppRole, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول مخزن',
  user: 'موظف',
};

const ROLE_ORDER: AppRole[] = ['manager', 'warehouse', 'user'];

export function WorkspaceHeader({ workspace }: { workspace: WorkspaceKey }) {
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();
  const router = useRouter();

  const availableRoles = useMemo<AppRole[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return ROLE_ORDER.filter((role) => roles.includes(role));
  }, [originalUser?.roles]);

  const handleRoleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRole = event.target.value as AppRole;
    if (!nextRole) return;
    await switchViewRole(nextRole);
    router.push('/portal');
    router.refresh();
  };

  return (
    <header className="rounded-[22px] border border-[#dde5e3] bg-white px-4 py-3 shadow-soft">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="order-2 flex min-w-0 flex-1 items-center justify-end gap-3 xl:order-1">
          <button
            type="button"
            onClick={() => router.push('/portal')}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde5e3] px-4 text-sm font-semibold text-[#295f60] transition hover:bg-[#f5f9f8]"
          >
            <span>اختيار النظام</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path d="M9 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex min-w-[220px] items-center gap-3 rounded-[22px] border border-[#dde5e3] px-4 py-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#f4f8f7] text-[#2A6364]">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 19c1.5-2.8 4-4.2 7-4.2S17.5 16.2 19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="truncate text-[16px] font-bold text-[#17373a]">{user?.fullName || 'مستخدم النظام'}</div>
              <div className="truncate text-[12px] text-slate-500">{user?.email || ''}</div>
            </div>
          </div>

          <div className="relative flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#dde5e3] text-[#2A6364]">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="order-1 flex flex-col gap-2 xl:order-2 xl:min-w-[360px] xl:items-start">
          <div className="text-right xl:text-left">
            <div className="text-[11px] font-semibold text-slate-400">{workspace === 'materials' ? 'نظام المواد التدريبية' : 'نظام الخدمات العامة'}</div>
            <div className="mt-1 text-[14px] font-bold text-[#1d4f50]">{WORKSPACE_TITLES[workspace]}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canUseRoleSwitch && availableRoles.length > 1 ? (
              <div className="flex items-center gap-2 rounded-[18px] border border-[#dde5e3] bg-white px-2 py-1.5">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={async () => {
                      await switchViewRole(role);
                      router.push('/portal');
                      router.refresh();
                    }}
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                      user?.role === role ? 'bg-[#2A6364] text-white' : 'text-slate-600 hover:bg-[#f3f8f7]'
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            ) : null}

            <Button variant="ghost" onClick={logout} className="h-11 rounded-[18px] px-4 text-sm">
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
