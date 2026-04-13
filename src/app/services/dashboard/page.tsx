import Link from 'next/link';

const cards = [
  { href: '/services/requests', title: 'بوابة الطلبات' },
  { href: '/services/approvals', title: 'اعتماد الطلبات' },
  { href: '/services/email-drafts', title: 'المراسلات الخارجية' },
  { href: '/services/messages', title: 'المراسلات الداخلية' },
];

export default function ServicesDashboardPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[#dde5e3] bg-white px-5 py-4 shadow-soft">
        <div className="text-[12px] font-semibold text-slate-400">نظام الخدمات العامة</div>
        <h2 className="mt-1 text-[18px] font-bold text-[#1b4e50]">لوحة معلومات الخدمات</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
