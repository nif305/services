
import Link from 'next/link';

const cards = [
  { href: '/materials/requests', title: 'طلب مواد من المخزون', description: 'رفع الطلبات ومتابعتها حتى الصرف أو الإرجاع.' },
  { href: '/materials/inventory', title: 'المخزون', description: 'متابعة المواد المتاحة والجاهزية وحركة المخزون.' },
  { href: '/materials/returns', title: 'المرتجعات', description: 'متابعة إعادة المواد والعهد ومسار التسليم.' },
  { href: '/materials/messages', title: 'المراسلات الداخلية', description: 'المراسلات الرسمية المشتركة داخل الموقع.' },
];

export default function MaterialsDashboardPage() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.href} href={card.href} className="rounded-[24px] border border-[#dbe6e4] bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-[#016564]/40">
          <h3 className="text-lg font-bold text-primary">{card.title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{card.description}</p>
        </Link>
      ))}
    </div>
  );
}
