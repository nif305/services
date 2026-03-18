export default function ArchiveLoadingPage() {
  return (
    <div
      dir="rtl"
      className="flex min-h-[40vh] items-center justify-center overflow-x-hidden px-4 py-8 sm:px-5 sm:py-10"
    >
      <div className="w-full max-w-md rounded-[24px] border border-surface-border bg-white p-6 text-center shadow-soft sm:rounded-[28px] sm:p-8">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#016564]/15 border-t-[#016564] sm:h-16 sm:w-16" />
        <h1 className="mt-5 text-[22px] leading-[1.3] text-primary sm:text-[26px]">
          جارٍ تحميل الأرشيف
        </h1>
        <p className="mt-3 text-[14px] leading-7 text-surface-subtle sm:text-[15px] sm:leading-8">
          نجهّز لك السجلات المؤرشفة الآن.
        </p>
      </div>
    </div>
  );
}