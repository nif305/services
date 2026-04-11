import Link from 'next/link';

const cards = [
  { href: '/materials/requests', title: 'طلبات المواد', description: 'إنشاء الطلبات ومتابعتها من بداية الرفع حتى الصرف أو الإرجاع.' },
  { href: '/materials/inventory', title: 'المخزون', description: 'متابعة المواد المتاحة، الجاهزية، وحركة المخزون.' },
  { href: '/materials/returns', title: 'الإرجاعات', description: 'متابعة إعادة المواد والعهد ومسار التسليم.' },
  { href: '/messages', title: 'المراسلات الداخلية', description: 'قناة المراسلات الرسمية المشتركة بين جميع المستخدمين.' },
];

export default function MaterialsDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[#dbe6e4] bg-white p-6 shadow-soft">
        <h2 className="text-[24px] font-bold text-primary">لوحة معلومات المواد والمخزون</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          بيئة مستقلة لإدارة طلبات المواد التدريبية، الصرف، الإرجاعات، ومتابعة المخزون.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-[24px] border border-[#dbe6e4] bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-[#016564]/40">
            <h3 className="text-lg font-bold text-primary">{card.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
