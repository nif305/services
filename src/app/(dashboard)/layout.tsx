'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header/Header';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSelectorPage = pathname === '/dashboard';

  if (isSelectorPage) {
    return (
      <div dir="rtl" className="min-h-screen bg-surface text-slate-900">
        <main className="mx-auto max-w-[1320px] px-4 py-4 sm:px-5 lg:px-6 lg:py-6">
          <Header />
          <div className="mt-6">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-surface text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 sm:px-5 lg:px-6 lg:py-6">
        <div className="min-w-0 flex-1">
          <Header />
          <main className="mt-6 min-w-0">{children}</main>
        </div>
        <div className="hidden w-80 shrink-0 lg:block">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
