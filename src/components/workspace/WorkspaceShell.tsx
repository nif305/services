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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="rounded-2xl border border-surface-border bg-white px-6 py-4 text-sm text-primary shadow-soft">
          جاري تجهيز بيئة العمل...
        </div>
      </div>
    );
  }

  if (!canAccessWorkspace(role, workspace)) return null;

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-[1650px] lg:flex lg:flex-row">
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <div className="flex min-h-screen flex-col gap-4">
            <WorkspaceHeader workspace={workspace} />
            <section className="min-h-0 flex-1">{children}</section>
          </div>
        </main>
        <WorkspaceSidebar workspace={workspace} role={role} />
      </div>
    </div>
  );
}
