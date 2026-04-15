import Link from 'next/link';

const quickActions = [
  { href: '/services/maintenance', title: 'طلبات الصيانة', meta: 'الملاحظات الفنية والأعطال', icon: '🛠' },
  { href: '/services/cleaning', title: 'طلبات النظافة', meta: 'خدمات النظافة والتجهيز', icon: '🧹' },
  { href: '/services/purchases', title: 'الشراء المباشر', meta: 'الطلبات والمشتريات', icon: '🛒' },
  { href: '/services/approvals', title: 'اعتماد الطلبات', meta: 'اعتماد، إعادة، رفض', icon: '✓' },
  { href: '/services/email-drafts', title: 'المراسلات الخارجية', meta: 'مسودات البريد .eml', icon: '↗' },
  { href: '/services/messages', title: 'المراسلات الداخلية', meta: 'تواصل رسمي داخلي', icon: '✉' },
];

export default function ServicesDashboardPage() {
  return (
    <div className="space-y-4" dir="rtl">
      <section className="rounded-[24px] border border-[#e3e9e7] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbfb_100%)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 text-right">
            <div className="text-[12px] font-semibold text-[#9aa8a6]">نظام الخدمات العامة</div>
            <h1 className="text-[34px] font-bold leading-[1.4] text-[#244142]">لوحة معلومات الخدمات</h1>
            <p className="text-[15px] leading-8 text-[#6e7f7d]">واجهة تنفيذ سريعة لطلبات الخدمات، الاعتمادات، والمراسلات الخارجية.</p>
          </div>
          <div className="rounded-[22px] border border-[#e7ecea] bg-[#fbfcfc] px-5 py-4 text-center text-[#244142]">
            <div className="text-[12px] font-semibold text-[#9aa8a6]">المسار الحالي</div>
            <div className="mt-1 text-[22px] font-bold">نظام الخدمات العامة</div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[22px] border border-[#e3e9e7] bg-white px-4 py-5 transition hover:border-[#cbd8d5] hover:bg-[#fbfcfc]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f7f6] text-lg text-[#2A6364]">{item.icon}</span>
              <div className="text-right">
                <div className="text-[18px] font-bold text-[#244142]">{item.title}</div>
                <div className="mt-1 text-[13px] text-[#7a8b89]">{item.meta}</div>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
