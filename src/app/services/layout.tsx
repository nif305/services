'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { useAuth } from '@/context/AuthContext';

const PUBLIC_SERVICE_PATHS = new Set([
  '/services',
  '/services/requests',
  '/services/maintenance',
  '/services/cleaning',
  '/services/hospitality',
  '/services/other',
  '/services/purchases',
]);

function isPublicServicePath(pathname: string) {
  return PUBLIC_SERVICE_PATHS.has(pathname);
}

function PublicServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f7f7]">
      <header className="border-b border-[#dce6e3] bg-white/95">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/services/requests" className="flex items-center gap-3">
            <img src="/nauss-gold-logo.png" alt="شعار الجامعة" className="h-14 w-auto object-contain" />
            <div>
              <div className="text-[12px] font-semibold text-[#8a9a98]">وكالة الجامعة للتدريب</div>
              <div className="text-[20px] font-extrabold text-[#223738]">خدمات مرافق التدريب</div>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-bold">
            <Link href="/services/requests" className="rounded-2xl bg-[#2A6364] px-4 py-2.5 text-white">
              رفع ملاحظة
            </Link>
            <Link href="/login" className="rounded-2xl border border-[#dbe5e3] bg-white px-4 py-2.5 text-[#27494a]">
              دخول الإدارة
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-4 py-5">{children}</main>
    </div>
  );
}

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (!loading && user && (user.role === 'manager' || user.role === 'warehouse')) {
    return <WorkspaceShell workspace="services">{children}</WorkspaceShell>;
  }

  if (isPublicServicePath(pathname)) {
    return <PublicServicesLayout>{children}</PublicServicesLayout>;
  }

  return <WorkspaceShell workspace="services">{children}</WorkspaceShell>;
}
