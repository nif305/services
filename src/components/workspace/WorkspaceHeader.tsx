'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { type AppRole, type WorkspaceKey, WORKSPACE_TITLES } from '@/lib/workspace';

const ROLE_ORDER: AppRole[] = ['manager', 'warehouse', 'user'];
const ROLE_LABELS: Record<AppRole, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول مخزن',
  user: 'موظف',
};

export function WorkspaceHeader({ workspace }: { workspace: WorkspaceKey }) {
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();
  const router = useRouter();

  const availableRoles = useMemo<AppRole[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return ROLE_ORDER.filter((role) => roles.includes(role));
  }, [originalUser?.roles]);

  return (
    <header className="flex flex-col gap-3 rounded-[22px] border border-[#e2e8e6] bg-[#fbfcfc] p-3 lg:flex-row lg:items-center lg:justify-between lg:p-4">
      <div className="flex items-center gap-3 lg:gap-4">
        <button
          type="button"
          onClick={() => router.push('/portal')}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dfe6e4] bg-white px-4 text-sm font-semibold text-[#274c4d] transition hover:bg-[#f6faf9]"
        >
          اختيار النظام
          <span className="mr-2">↩</span>
        </button>

        {canUseRoleSwitch && availableRoles.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#dfe6e4] bg-white p-1.5">
            {availableRoles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={async () => {
                  await switchViewRole(role);
                  router.push('/portal');
                  router.refresh();
                }}
                className={`min-w-[96px] rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  user?.role === role
                    ? 'bg-[#2A6364] text-white shadow-[0_8px_20px_-12px_rgba(42,99,100,0.6)]'
                    : 'text-[#415c5c] hover:bg-[#f3f7f6]'
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dfe6e4] bg-white text-[#2A6364]"
          aria-label="الإشعارات"
        >
          🔔
        </button>

        <div className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-[#dfe6e4] bg-white px-3 py-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3f7f6] text-[#2A6364]">👤</div>
          <div className="min-w-0 flex-1 text-right">
            <div className="truncate text-[15px] font-bold text-[#173b3c]">{user?.fullName || 'مستخدم النظام'}</div>
            <div className="truncate text-[12px] text-[#7d8f8d]">{user?.email || ''}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dfe6e4] bg-white px-4 text-sm font-semibold text-[#274c4d] transition hover:bg-[#f6faf9]"
        >
          تسجيل الخروج
        </button>
      </div>
    </header>
  );
}
