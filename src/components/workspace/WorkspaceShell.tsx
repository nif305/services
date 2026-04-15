'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { useAuth } from '@/context/AuthContext';
import { type AppRole, type WorkspaceKey, canAccessWorkspace, normalizeRole } from '@/lib/workspace';

export function WorkspaceShell({ workspace, children }: { workspace: WorkspaceKey; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const role = normalizeRole(user?.role) as AppRole;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canAccessWorkspace(role, workspace)) {
      router.replace('/portal');
    }
  }, [loading, user, role, workspace, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8f8]">
        <div className="rounded-2xl border border-[#dbe3e1] bg-white px-6 py-4 text-sm text-[#294d4d] shadow-sm">
          جاري تجهيز بيئة العمل...
        </div>
      </div>
    );
  }

  if (!canAccessWorkspace(role, workspace)) return null;

  return (
    <div className="min-h-screen bg-[#f5f7f7]" dir="rtl">
      <div className="mx-auto grid min-h-screen max-w-[1680px] grid-cols-1 gap-4 px-3 py-3 lg:grid-cols-[1fr_300px] lg:px-4 lg:py-4">
        <main className="min-w-0 space-y-4 rounded-[28px] border border-[#dde5e3] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] lg:p-5">
          <WorkspaceHeader workspace={workspace} />
          <section className="min-w-0">{children}</section>
        </main>
        <WorkspaceSidebar workspace={workspace} role={role} />
      </div>
    </div>
  );
}
