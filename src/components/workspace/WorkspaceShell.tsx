'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { useAuth } from '@/context/AuthContext';
import {
  type AppRole,
  type WorkspaceKey,
  canAccessWorkspace,
  getDefaultWorkspacePath,
  normalizeRole,
} from '@/lib/workspace';

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
      router.replace(getDefaultWorkspacePath(role));
    }
  }, [loading, user, role, workspace, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7f7]">
        <div className="rounded-[24px] border border-[#dbe6e4] bg-white px-6 py-5 text-center text-sm text-[#385454] shadow-soft">
          جاري تجهيز بيئة العمل...
        </div>
      </div>
    );
  }

  if (!canAccessWorkspace(role, workspace)) return null;

  return (
    <div className="min-h-screen bg-[#f4f7f6]" dir="rtl">
      <div className="mx-auto grid min-h-screen max-w-[1720px] grid-cols-1 gap-4 px-3 py-3 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-5 lg:px-4 lg:py-4">
        <main className="order-2 min-w-0 lg:order-1">
          <div className="flex min-h-full flex-col gap-4">
            <WorkspaceHeader workspace={workspace} />
            <section className="min-h-0 flex-1">{children}</section>
          </div>
        </main>
        <aside className="order-1 lg:order-2">
          <WorkspaceSidebar workspace={workspace} role={role} />
        </aside>
      </div>
    </div>
  );
}
