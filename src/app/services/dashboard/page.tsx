import Link from 'next/link';

const cards = [
  { href: '/services/maintenance', title: 'طلبات الصيانة', description: 'الملاحظات والأعمال الفنية' },
  { href: '/services/cleaning', title: 'طلبات النظافة', description: 'التجهيزات والنظافة التشغيلية' },
  { href: '/services/purchases', title: 'الشراء المباشر', description: 'الطلبات العاجلة والمباشرة' },
  { href: '/services/approvals', title: 'اعتماد الطلبات', description: 'اعتماد، إعادة، أو رفض' },
  { href: '/services/email-drafts', title: 'المراسلات الخارجية', description: 'مسودات البريد وتصدير .eml' },
  { href: '/services/messages', title: 'المراسلات الداخلية', description: 'تواصل رسمي داخلي' },
];

export default function ServicesDashboardPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-[#dce5e3] bg-white px-6 py-7 shadow-soft">
        <div className="text-[12px] font-semibold text-[#94a3a1]">نظام الخدمات العامة</div>
        <div className="mt-2 text-right">
          <h1 className="text-[22px] font-bold text-[#234243]">لوحة معلومات الخدمات</h1>
          <p className="mt-1 text-[14px] text-[#7d8d8b]">بيئة تنفيذ لطلبات الخدمات، الاعتمادات، والمراسلات الخارجية.</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-[24px] border border-[#dce5e3] bg-white px-5 py-5 text-right shadow-soft transition hover:border-[#cddad8] hover:-translate-y-0.5"
          >
            <div className="text-[18px] font-bold text-[#234243]">{card.title}</div>
            <div className="mt-2 text-[14px] text-[#7d8d8b]">{card.description}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
