'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      dir="rtl"
      className="flex min-h-[60vh] items-center justify-center overflow-x-hidden px-4 py-8 sm:px-5 sm:py-10"
    >
      <div className="w-full max-w-xl rounded-[24px] border border-surface-border bg-white p-6 text-center shadow-soft sm:rounded-[28px] sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7c1e3e]/10 text-[#7c1e3e] sm:h-16 sm:w-16">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 sm:h-8 sm:w-8">
            <path
              d="M12 4 3.5 19h17L12 4Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M12 9v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="mt-5 text-[24px] leading-[1.3] text-[#7c1e3e] sm:text-[30px]">
          تعذر تحميل هذه الصفحة
        </h1>

        <p className="mt-3 text-[14px] leading-7 text-surface-subtle sm:text-[15px] sm:leading-8">
          حدث خطأ أثناء عرض إحدى صفحات لوحة التحكم. أعد المحاولة، وإذا استمرت المشكلة فارجع إلى الصفحة الرئيسية.
        </p>

        {error?.digest ? (
          <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-6 text-slate-500 break-all">
            مرجع الخطأ: {error.digest}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm text-white shadow-soft sm:w-auto sm:min-w-[160px]"
          >
            إعادة المحاولة
          </button>

          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-surface-border bg-white px-4 py-3 text-sm text-primary sm:w-auto sm:min-w-[160px]"
          >
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}