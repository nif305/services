import Link from 'next/link';

const cards = [
  { href: '/services/requests', title: 'بوابة طلبات الخدمات', description: 'الصيانة، النظافة، الشراء، والطلبات الأخرى' },
  { href: '/services/approvals', title: 'اعتماد الطلبات', description: 'اعتماد، إعادة، أو رفض' },
  { href: '/services/email-drafts', title: 'المراسلات الخارجية', description: 'مسودات البريد وتصدير eml' },
  { href: '/services/messages', title: 'المراسلات الداخلية', description: 'تواصل رسمي داخلي' },
];

export default function ServicesDashboardPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-[#dce5e3] bg-white px-5 py-5 shadow-soft">
        <div className="text-[11px] font-semibold text-[#94a3a1]">نظام الخدمات العامة</div>
        <h1 className="mt-2 text-[24px] font-bold text-[#234243]">لوحة معلومات الخدمات</h1>
        <p className="mt-1 text-[14px] text-[#7d8d8b]">طلبات الخدمات، الاعتمادات، والمراسلات الخارجية في شاشة تنفيذية واحدة.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-[20px] border border-[#dce5e3] bg-white px-4 py-4 text-right shadow-soft transition hover:border-[#cddad8] hover:-translate-y-0.5">
            <div className="text-[18px] font-bold text-[#234243]">{card.title}</div>
            <div className="mt-1.5 text-[13px] text-[#7d8d8b]">{card.description}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
