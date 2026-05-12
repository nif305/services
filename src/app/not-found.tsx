import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-surface px-4 py-6 sm:px-5 sm:py-8">
      <div className="w-full max-w-xl rounded-[24px] border border-surface-border bg-white p-6 text-center shadow-soft sm:rounded-[28px] sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#016564]/10 text-[#016564] sm:h-16 sm:w-16">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 sm:h-8 sm:w-8">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="mt-5 text-[26px] leading-[1.3] text-primary sm:text-[32px]">
          الصفحة غير موجودة
        </h1>

        <p className="mt-3 text-[14px] leading-7 text-surface-subtle sm:text-[15px] sm:leading-8">
          الرابط الذي حاولت الوصول إليه غير متوفر، أو تم نقله إلى مسار آخر داخل المنصة.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center">
          <Link
            href="/portal"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm text-white shadow-soft sm:w-auto sm:min-w-[160px]"
          >
            العودة للوحة التحكم
          </Link>

          <Link
            href="/login"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-surface-border bg-white px-4 py-3 text-sm text-primary sm:w-auto sm:min-w-[160px]"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
