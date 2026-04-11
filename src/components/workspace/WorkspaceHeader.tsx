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

export function WorkspaceHeader({ workspace }: { workspace: WorkspaceKey }) {
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();
  const router = useRouter();

  const availableRoles = useMemo<AppRole[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return roles.filter((role): role is AppRole => role === 'manager' || role === 'warehouse' || role === 'user');
  }, [originalUser?.roles]);

  const handleRoleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRole = event.target.value as AppRole;
    if (!nextRole) return;
    await switchViewRole(nextRole);
    router.push(getDefaultWorkspacePath(nextRole));
    router.refresh();
  };

  return (
    <header className="rounded-[24px] border border-surface-border bg-white px-5 py-4 shadow-soft">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center rounded-full bg-[#016564]/8 px-3 py-1 text-[11px] font-semibold text-[#016564]">
            {WORKSPACE_TITLES[workspace]}
          </div>
          <h1 className="mt-3 truncate text-[20px] font-bold text-primary">
            مرحبًا، {user?.fullName || 'مستخدم النظام'}
          </h1>
          <p className="mt-1 text-[13px] leading-6 text-surface-subtle">
            {WORKSPACE_DESCRIPTIONS[workspace]}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 xl:w-auto xl:min-w-[360px]">
          {canUseRoleSwitch && availableRoles.length > 1 ? (
            <div className="flex items-center gap-2">
              <label htmlFor="workspace-role-switcher" className="shrink-0 text-sm font-semibold text-primary">
                الدور
              </label>
              <select
                id="workspace-role-switcher"
                value={user?.role || 'user'}
                onChange={handleRoleChange}
                className="h-11 w-full rounded-2xl border border-surface-border bg-white px-4 text-sm text-primary outline-none transition focus:border-primary"
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button variant="ghost" onClick={logout} className="w-full sm:w-auto">
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
