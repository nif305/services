'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

const roleLabels = {
  manager: 'مدير',
  warehouse: 'مسؤول مخزن',
  user: 'موظف',
} as const;

export function Header() {
  const { user, logout, canUseRoleSwitch, availableRoles, switchViewRole } = useAuth();

  const sortedRoles = useMemo(() => {
    const roles = Array.isArray(availableRoles) ? availableRoles : [];
    if (roles.includes('manager')) {
      return ['user', 'manager'].filter((role) => roles.includes(role as typeof roles[number]));
    }
    if (roles.includes('warehouse')) {
      return ['user', 'warehouse'].filter((role) => roles.includes(role as typeof roles[number]));
    }
    return roles;
  }, [availableRoles]);

  return (
    <header className="rounded-[22px] border border-surface-border bg-white px-4 py-4 shadow-soft sm:rounded-[24px] sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-1">
          <div className="min-w-0">
            <h1 className="truncate text-[18px] font-bold text-primary sm:text-[20px]">
              مرحبًا، {user?.fullName || 'مستخدم النظام'}
            </h1>
            <p className="mt-1 truncate text-[12px] leading-6 text-surface-subtle sm:text-[13px]">
              {user?.email || user?.department || 'وكالة التدريب'}
            </p>
          </div>

          {canUseRoleSwitch ? (
            <div className="inline-flex w-full rounded-[20px] border border-[#d6d7d4] bg-[#f8f9f9] p-1 sm:w-auto">
              {sortedRoles.map((role) => {
                const isActive = user?.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => void switchViewRole(role)}
                    className={`min-w-[108px] rounded-[16px] px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? 'bg-[#016564] text-white shadow-sm'
                        : 'text-[#61706f] hover:text-[#016564]'
                    }`}
                  >
                    {roleLabels[role]}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <Button variant="ghost" onClick={logout} className="w-full lg:w-auto">
          تسجيل الخروج
        </Button>
      </div>
    </header>
  );
}
