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
      router.replace('/portal');
    }
  }, [loading, user, role, workspace, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="rounded-2xl border border-surface-border bg-white px-6 py-4 text-center text-sm shadow-soft">
          جاري تجهيز بيئة العمل...
        </div>
      </div>
    );
  }

  if (!canAccessWorkspace(role, workspace)) return null;

  return (
    <div className="min-h-screen bg-surface" dir="rtl">
      <div className="mx-auto grid min-h-screen w-full max-w-[1680px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_290px]">
        <main className="min-w-0 px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
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
