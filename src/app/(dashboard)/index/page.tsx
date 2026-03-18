'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-10 text-center text-sm text-slate-500">
      جارٍ التحويل...
    </div>
  );
}