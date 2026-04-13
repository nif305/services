import Link from 'next/link';

const stats = [
  { label: 'طلبات الصيانة', value: 'رفع ومتابعة طلبات الصيانة', href: '/services/maintenance' },
  { label: 'طلبات النظافة', value: 'تنفيذ ومتابعة الطلبات', href: '/services/cleaning' },
  { label: 'الشراء المباشر', value: 'طلبات الشراء المباشر', href: '/services/purchases' },
  { label: 'الاعتمادات', value: 'اعتماد طلبات الخدمات', href: '/services/approvals' },
  { label: 'المراسلات الخارجية', value: 'مسودات البريد وملفات eml', href: '/services/email-drafts' },
  { label: 'المراسلات الداخلية', value: 'تواصل رسمي داخلي', href: '/services/messages' },
];

export default function ServicesDashboardPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-[26px] border border-[#dde6e4] bg-white px-5 py-5 shadow-soft">
        <div className="text-[12px] font-semibold text-[#8da09e]">نظام الخدمات العامة</div>
        <div className="mt-2 text-[20px] font-bold text-[#224343]">لوحة معلومات الخدمات</div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-[22px] border border-[#dde6e4] bg-white px-4 py-5 shadow-soft transition hover:border-[#2A6364]/35 hover:-translate-y-0.5">
            <div className="text-[18px] font-bold text-[#214141]">{card.label}</div>
            <div className="mt-2 text-[13px] text-[#70817f]">{card.value}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
