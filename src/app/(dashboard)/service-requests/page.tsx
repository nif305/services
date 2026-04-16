import Link from 'next/link';

const serviceCards = [
  {
    title: 'طلب صيانة',
    description: 'رفع طلبات الصيانة التشغيلية الخاصة بالقاعات والمرافق والمكونات الفنية داخل المبنى.',
    href: '/services/maintenance?new=1',
    badge: 'صيانة',
  },
  {
    title: 'طلب نظافة',
    description: 'رفع طلبات النظافة والخدمات المرتبطة بجاهزية البيئة التدريبية داخل المبنى.',
    href: '/services/cleaning?new=1',
    badge: 'نظافة',
  },
  {
    title: 'شراء مباشر',
    description: 'رفع طلبات الشراء المباشر المرتبطة باحتياج تشغيلي أو دعم عاجل للعمل التدريبي.',
    href: '/services/purchases?new=1',
    badge: 'شراء مباشر',
  },
  {
    title: 'طلب آخر',
    description: 'رفع طلبات تشغيلية أخرى تحتاج إحالة واعتمادًا ومراسلة خارجية من المدير.',
    href: '/services/other?new=1',
    badge: 'أخرى',
  },
];

export default function ServiceRequestsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d6d7d4] bg-[linear-gradient(135deg,#016564_0%,#0b6d6b_100%)] p-6 text-white shadow-[0_20px_60px_-40px_rgba(1,101,100,0.45)]">
        <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold">مسار مستقل</div>
        <h1 className="mt-4 text-[28px] font-extrabold leading-[1.3]">طلبات الخدمات التشغيلية</h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-8 text-white/85">
          هذه الصفحة مخصصة فقط لطلبات الخدمات التشغيلية، وهي منفصلة عن طلبات المواد من المخزون. من هنا يمكنك رفع طلب صيانة أو نظافة أو شراء مباشر أو طلب آخر، ثم متابعته لاحقًا حتى قرار المدير وتحويله إلى المراسلات الخارجية عند الاعتماد.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {serviceCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-[24px] border border-[#d6d7d4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="inline-flex rounded-full border border-[#d6d7d4] bg-[#f8fbfb] px-3 py-1 text-[11px] font-bold text-[#016564]">{card.badge}</div>
            <div className="mt-4 text-[20px] font-extrabold text-[#016564]">{card.title}</div>
            <p className="mt-2 text-[13px] leading-7 text-[#61706f]">{card.description}</p>
            <div className="mt-5 inline-flex rounded-full bg-[#016564] px-4 py-2 text-[13px] font-bold text-white">بدء الطلب</div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Link href="/services/approvals" className="rounded-[24px] border border-[#d6d7d4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="text-[18px] font-extrabold text-[#016564]">متابعة واعتماد طلبات الخدمات</div>
          <p className="mt-2 text-[13px] leading-7 text-[#61706f]">الطلبات تظهر داخل أقسامها الصحيحة: صيانة، نظافة، مشتريات، وطلبات أخرى، ثم تنتقل للمراسلات الخارجية بعد الاعتماد.</p>
        </Link>
        <Link href="/materials/requests" className="rounded-[24px] border border-[#d6d7d4] bg-[#fbf7ee] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="text-[18px] font-extrabold text-[#7b6334]">الانتقال إلى طلبات المواد</div>
          <p className="mt-2 text-[13px] leading-7 text-[#6b5a4a]">إذا كان احتياجك مواد تدريبية من المخزون، فالمسار الصحيح هو طلبات المواد من المخزون وليس طلبات الخدمات.</p>
        </Link>
      </section>
    </div>
  );
}
