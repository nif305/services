'use client';

import { ChangeEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { type AppRole, type WorkspaceKey, WORKSPACE_DESCRIPTIONS, WORKSPACE_TITLES, getDefaultWorkspacePath } from '@/lib/workspace';

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
    router.push(getDefaultWorkspacePath(nextRole));
    router.refresh();
  };

  return (
    <header className="rounded-[24px] border border-[#dde5e3] bg-white px-4 py-4 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.22)] lg:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="order-2 flex flex-col gap-4 xl:order-1 xl:flex-row xl:items-center">
          <Button variant="ghost" onClick={logout} className="h-12 rounded-[18px] px-5">
            تسجيل الخروج
          </Button>

          {canUseRoleSwitch && availableRoles.length > 1 ? (
            <div className="flex items-center gap-3 rounded-[20px] border border-[#dde5e3] bg-[#fbfcfc] px-4 py-2.5">
              <span className="text-sm font-semibold text-[#2f4d4d]">الدور</span>
              <select
                id="workspace-role-switcher"
                value={user?.role || 'user'}
                onChange={handleRoleChange}
                className="h-10 min-w-[220px] rounded-[14px] border border-[#dde5e3] bg-white px-3 text-sm text-[#223b3b] outline-none transition focus:border-[#2A6364]"
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="order-1 flex flex-wrap items-center justify-between gap-3 xl:order-2 xl:justify-end">
          <button
            type="button"
            onClick={() => router.push('/portal')}
            className="inline-flex h-12 items-center gap-2 rounded-[18px] border border-[#dde5e3] bg-white px-4 text-sm font-semibold text-[#2A6364] transition hover:bg-[#f7faf9]"
          >
            اختيار النظام
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M8 5h8l3 3v8l-3 3H8l-3-3V8l3-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[#dde5e3] bg-white text-[#2A6364]"
            aria-label="الإشعارات"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex min-w-[250px] items-center gap-3 rounded-[20px] border border-[#dde5e3] bg-white px-4 py-2.5">
            <div className="min-w-0 flex-1 text-right">
              <div className="truncate text-[16px] font-bold text-[#1e3939]">{user?.fullName || 'مستخدم النظام'}</div>
              <div className="truncate text-[13px] text-[#7a8c8a]">{user?.email || ''}</div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f5f8f8] text-[#2A6364]">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
