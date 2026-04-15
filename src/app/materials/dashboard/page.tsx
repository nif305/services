import Link from 'next/link';

const cards = [
  { href: '/materials/requests', title: 'طلبات المواد', description: 'طلبات الرفع والصرف' },
  { href: '/materials/inventory', title: 'المخزون', description: 'الأصناف والحركة' },
  { href: '/materials/returns', title: 'المرتجعات', description: 'متابعة الإرجاع' },
  { href: '/materials/custody', title: 'العهد', description: 'العهد والتسليم' },
  { href: '/materials/messages', title: 'المراسلات الداخلية', description: 'تواصل رسمي داخلي' },
];

export default function MaterialsDashboardPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-[#dce5e3] bg-white px-5 py-5 shadow-soft">
        <div className="text-[11px] font-semibold text-[#94a3a1]">نظام المواد التدريبية</div>
        <h1 className="mt-2 text-[24px] font-bold text-[#234243]">لوحة معلومات المواد</h1>
        <p className="mt-1 text-[14px] text-[#7d8d8b]">طلبات المواد، المخزون، المرتجعات، والعهد في شاشة تنفيذية واحدة.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
