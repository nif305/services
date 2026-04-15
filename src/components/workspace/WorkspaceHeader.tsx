'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { type AppRole, type WorkspaceKey } from '@/lib/workspace';

const ROLE_ORDER: AppRole[] = ['manager', 'warehouse', 'user'];
const ROLE_LABELS: Record<AppRole, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول مخزن',
  user: 'موظف',
};

export function WorkspaceHeader({ workspace }: { workspace: WorkspaceKey }) {
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const availableRoles = useMemo<AppRole[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return ROLE_ORDER.filter((role) => roles.includes(role));
  }, [originalUser?.roles]);

  const handleRoleChange = async (role: AppRole) => {
    if (!canUseRoleSwitch || user?.role === role) return;
    await switchViewRole(role);
    router.push('/portal');
    router.refresh();
  };

  return (
    <header className="rounded-[20px] border border-[#dde6e4] bg-white px-4 py-3 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {pathname !== '/portal' ? (
            <button
              type="button"
              onClick={() => router.push('/portal')}
              className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-[#dbe6e4] bg-white px-4 text-[14px] font-semibold text-[#385454] hover:bg-[#f8fbfa]"
            >
              اختيار النظام
            </button>
          ) : null}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#dbe6e4] bg-white text-[#2A6364]"
            aria-label="الإشعارات"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex min-w-[220px] items-center gap-3 rounded-[18px] border border-[#dbe6e4] bg-[#fbfcfc] px-3 py-2">
          <div className="min-w-0 flex-1 text-right">
            <div className="truncate text-[15px] font-bold text-[#1f3d3d]">{user?.fullName || 'مستخدم النظام'}</div>
            <div className="truncate text-[12px] text-[#7d8c8a]">{user?.email || ''}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f4f8f7] text-[#2A6364]">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" /><path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </div>
        </div>

        <div className="flex flex-1 justify-center">
          {canUseRoleSwitch && availableRoles.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-[#dbe6e4] bg-white px-2 py-2">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`min-w-[96px] rounded-full px-4 py-2 text-[14px] font-semibold transition ${
                    user?.role === role ? 'bg-[#2A6364] text-white' : 'text-[#4f6766] hover:bg-[#f2f8f7]'
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-[#dbe6e4] bg-white px-4 text-[14px] font-semibold text-[#385454] hover:bg-[#f8fbfa]"
        >
          تسجيل الخروج
        </button>
      </div>
    </header>
  );
}
