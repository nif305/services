'use client';

import { ChangeEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

type Role = 'manager' | 'warehouse' | 'user';

const ROLE_LABELS: Record<Role, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول المخزن',
  user: 'موظف',
};

export function Header() {
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();
  const router = useRouter();

  const availableRoles = useMemo<Role[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return roles.filter(
      (role): role is Role =>
        role === 'manager' || role === 'warehouse' || role === 'user'
    );
  }, [originalUser?.roles]);

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const role = event.target.value as Role;

    if (!role) return;

    switchViewRole(role).then(() => {
      router.refresh();
    });
  };

  return (
    <header className="rounded-[22px] border border-surface-border bg-white px-4 py-4 shadow-soft sm:rounded-[24px] sm:px-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-bold text-primary sm:text-[20px]">
            مرحبًا، {user?.fullName || 'مستخدم النظام'}
          </h1>
          <p className="mt-1 truncate text-[12px] leading-6 text-surface-subtle sm:text-[13px]">
            {user?.department || 'وكالة التدريب'}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 xl:w-auto xl:min-w-[340px]">
          {canUseRoleSwitch && availableRoles.length > 1 ? (
            <div className="flex w-full items-center gap-2">
              <label
                htmlFor="header-role-switcher"
                className="shrink-0 text-sm font-semibold text-primary"
              >
                الدور
              </label>

              <select
                id="header-role-switcher"
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

          <div className="flex w-full justify-end">
            <Button
              variant="ghost"
              onClick={logout}
              className="w-full sm:w-auto"
            >
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
