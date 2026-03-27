'use client';

import { useMemo } from 'react';
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

  const availableRoles = useMemo<Role[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];

    return roles.filter(
      (role): role is Role =>
        role === 'manager' || role === 'warehouse' || role === 'user'
    );
  }, [originalUser?.roles]);

  return (
    <header className="rounded-[22px] border border-surface-border bg-white px-4 py-4 shadow-soft sm:rounded-[24px] sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-bold text-primary sm:text-[20px]">
            مرحبًا، {user?.fullName || 'مستخدم النظام'}
          </h1>
          <p className="mt-1 truncate text-[12px] leading-6 text-surface-subtle sm:text-[13px]">
            {user?.department || 'وكالة التدريب'}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
          {canUseRoleSwitch && availableRoles.length > 1 ? (
            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
              {availableRoles.map((role) => {
                const isActive = user?.role === role;

                return (
                  <Button
                    key={role}
                    variant={isActive ? 'primary' : 'ghost'}
                    className="w-full sm:min-w-[118px]"
                    onClick={() => switchViewRole(role)}
                  >
                    {ROLE_LABELS[role]}
                  </Button>
                );
              })}
            </div>
          ) : null}

          <Button
            variant="ghost"
            onClick={logout}
            className="w-full sm:w-auto"
          >
            تسجيل الخروج
          </Button>
        </div>
      </div>
    </header>
  );
}
