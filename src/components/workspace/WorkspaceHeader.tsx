'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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

  const showBackToPortal = pathname !== '/portal';

  return (
    <header className="rounded-[26px] border border-[#dde6e4] bg-white px-4 py-3 shadow-soft lg:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="order-2 flex min-w-0 flex-1 items-center justify-end gap-3 lg:order-1">
          {showBackToPortal ? (
            <button
              type="button"
              onClick={() => router.push('/portal')}
              className="inline-flex h-14 items-center gap-2 rounded-[20px] border border-[#dbe6e4] bg-white px-5 text-[15px] font-semibold text-[#385454] transition hover:border-[#c8d8d5] hover:bg-[#f8fbfa]"
            >
              <span>اختيار النظام</span>
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}

          <div className="flex min-w-0 items-center gap-3 rounded-[22px] border border-[#dbe6e4] bg-[#fbfcfc] px-4 py-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#f4f8f7] text-[#2A6364]">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0 text-right">
              <div className="truncate text-[16px] font-bold text-[#1f3d3d]">{user?.fullName || 'مستخدم النظام'}</div>
              <div className="truncate text-[13px] text-[#7d8c8a]">{user?.email || ''}</div>
            </div>
          </div>

          <button
            type="button"
            className="relative flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#dbe6e4] bg-white text-[#2A6364] transition hover:bg-[#f8fbfa]"
            aria-label="الإشعارات"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="order-1 flex flex-1 flex-wrap items-center gap-3 lg:order-2 lg:flex-none">
          {canUseRoleSwitch && availableRoles.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[#dbe6e4] bg-white px-3 py-2">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`min-w-[104px] rounded-full px-5 py-2.5 text-[15px] font-semibold transition ${
                    user?.role === role
                      ? 'bg-[#2A6364] text-white shadow-[0_12px_30px_-18px_rgba(42,99,100,0.65)]'
                      : 'text-[#4f6766] hover:bg-[#f2f8f7]'
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={logout}
            className="inline-flex h-14 items-center gap-2 rounded-[20px] border border-[#dbe6e4] bg-white px-5 text-[15px] font-semibold text-[#385454] transition hover:border-[#c8d8d5] hover:bg-[#f8fbfa]"
          >
            <span>تسجيل الخروج</span>
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M10 17l5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#edf2f1] pt-3">
        <div className="text-[13px] font-semibold text-[#7d8c8a]">{workspace === 'materials' ? 'نظام المواد التدريبية' : 'نظام الخدمات العامة'}</div>
        <div className="text-[12px] text-[#90a09e]">بيئة تنفيذ تشغيلية</div>
      </div>
    </header>
  );
}
