import Link from 'next/link';

const cards = [
  { href: '/services/requests', title: 'بوابة طلبات الخدمات', description: 'مسار موحد لطلبات الصيانة، النظافة، المشتريات، والطلبات الأخرى.' },
  { href: '/services/approvals', title: 'اعتماد الطلبات', description: 'مراجعة الطلبات الخدمية واتخاذ القرار المناسب: اعتماد، إعادة، أو رفض.' },
  { href: '/services/email-drafts', title: 'المراسلات الخارجية', description: 'متابعة مسودات البريد الخارجي وتصدير ملفات .eml.' },
  { href: '/messages', title: 'المراسلات الداخلية', description: 'نظام المراسلات الرسمية المشترك بين جميع المستخدمين.' },
];

export default function ServicesDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[#dbe6e4] bg-white p-6 shadow-soft">
        <h2 className="text-[24px] font-bold text-primary">لوحة معلومات الخدمات والمراسلات</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          بيئة مستقلة لطلبات الخدمات، الاعتمادات، المراسلات الخارجية، والمتابعة التشغيلية الرسمية.
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
