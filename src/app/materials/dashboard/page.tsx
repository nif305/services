import Link from 'next/link';

const stats = [
  { label: 'طلبات المواد', value: 'طلبات الرفع والصرف', href: '/materials/requests' },
  { label: 'المخزون', value: 'الأصناف والحركة', href: '/materials/inventory' },
  { label: 'المرتجعات', value: 'متابعة الإرجاع', href: '/materials/returns' },
  { label: 'العهد', value: 'العهد والتسليم', href: '/materials/custody' },
  { label: 'المراسلات الداخلية', value: 'تواصل رسمي داخلي', href: '/materials/messages' },
];

export default function MaterialsDashboardPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-[26px] border border-[#dde6e4] bg-white px-5 py-5 shadow-soft">
        <div className="text-[12px] font-semibold text-[#8da09e]">نظام المواد التدريبية</div>
        <div className="mt-2 text-[20px] font-bold text-[#224343]">لوحة معلومات المواد</div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
