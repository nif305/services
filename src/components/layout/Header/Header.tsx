'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="rounded-[22px] border border-surface-border bg-white px-4 py-4 shadow-soft sm:rounded-[24px] sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-bold text-primary sm:text-[20px]">
            مرحبًا، {user?.fullName || 'مستخدم النظام'}
          </h1>
          <p className="mt-1 truncate text-[12px] leading-6 text-surface-subtle sm:text-[13px]">
            {user?.department || 'وكالة التدريب'}
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={logout}
          className="w-full sm:w-auto"
        >
          تسجيل الخروج
        </Button>
      </div>
    </header>
  );
}