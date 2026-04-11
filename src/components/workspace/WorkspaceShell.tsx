'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { useAuth } from '@/context/AuthContext';
import { type AppRole, type WorkspaceKey, canAccessWorkspace, getDefaultWorkspacePath, normalizeRole } from '@/lib/workspace';

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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="rounded-3xl border border-surface-border bg-white px-8 py-6 text-center shadow-soft">
          جاري تجهيز بيئة العمل...
        </div>
      </div>
    );
  }

  if (!canAccessWorkspace(role, workspace)) return null;

  return (
    <div className="min-h-screen bg-surface lg:flex lg:flex-row-reverse">
      <WorkspaceSidebar workspace={workspace} role={role} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-5 px-4 py-4 sm:px-5 lg:px-6 lg:py-6">
          <WorkspaceHeader workspace={workspace} />
          <section className="min-h-0 flex-1">{children}</section>
        </div>
      </main>
    </div>
  );
}
