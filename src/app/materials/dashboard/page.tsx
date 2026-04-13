import Link from 'next/link';

const cards = [
  { href: '/materials/requests', title: 'طلبات المواد' },
  { href: '/materials/inventory', title: 'المخزون' },
  { href: '/materials/returns', title: 'المرتجعات' },
  { href: '/materials/custody', title: 'العهد' },
  { href: '/materials/messages', title: 'المراسلات الداخلية' },
];

export default function MaterialsDashboardPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[#dde5e3] bg-white px-5 py-4 shadow-soft">
        <div className="text-[12px] font-semibold text-slate-400">نظام المواد التدريبية</div>
        <h2 className="mt-1 text-[18px] font-bold text-[#1b4e50]">لوحة معلومات المواد</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-[20px] border border-[#dde5e3] bg-white px-4 py-5 text-center text-[15px] font-bold text-[#1b4e50] shadow-soft transition hover:border-[#2A6364]/35 hover:bg-[#f8fbfa]"
          >
            {card.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
