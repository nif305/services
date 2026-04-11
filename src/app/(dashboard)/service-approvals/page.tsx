import Link from 'next/link';

const approvalCards = [
  {
    title: 'طلبات الصيانة',
    description: 'مراجعة واعتماد طلبات الصيانة التشغيلية قبل تحويلها إلى المراسلات الخارجية.',
    href: '/suggestions?type=MAINTENANCE',
  },
  {
    title: 'طلبات النظافة',
    description: 'مراجعة طلبات النظافة واعتمادها أو إعادتها أو رفضها حسب الحاجة.',
    href: '/suggestions?type=CLEANING',
  },
  {
    title: 'طلبات الشراء المباشر',
    description: 'اعتماد طلبات الشراء المباشر وإحالتها للمسار الخارجي المناسب.',
    href: '/suggestions?type=PURCHASE',
  },
  {
    title: 'الطلبات الأخرى',
    description: 'مراجعة الطلبات التشغيلية الأخرى وتحديد الجهة المستلمة قبل الإحالة.',
    href: '/suggestions?type=OTHER',
  },
];

export default function ServiceApprovalsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d6d7d4] bg-white p-6 shadow-sm">
        <div className="inline-flex rounded-full border border-[#d6d7d4] bg-[#f8fbfb] px-3 py-1 text-[11px] font-bold text-[#016564]">مسار المدير</div>
        <h1 className="mt-4 text-[28px] font-extrabold leading-[1.3] text-[#016564]">اعتماد طلبات الخدمات ومراسلاتها</h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-8 text-[#61706f]">
          هذا المسار مستقل عن طلبات المواد من المخزون. من هنا تتم مراجعة طلبات الصيانة والنظافة والشراء المباشر والطلبات الأخرى، ثم اعتمادها أو إعادتها أو رفضها، ومتابعة المراسلات الخارجية الخاصة بها.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {approvalCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-[24px] border border-[#d6d7d4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="text-[20px] font-extrabold text-[#016564]">{card.title}</div>
            <p className="mt-2 text-[13px] leading-7 text-[#61706f]">{card.description}</p>
            <div className="mt-5 inline-flex rounded-full bg-[#016564] px-4 py-2 text-[13px] font-bold text-white">فتح المسار</div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Link href="/email-drafts" className="rounded-[24px] border border-[#d6d7d4] bg-[#f8fbfb] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="text-[18px] font-extrabold text-[#016564]">المراسلات الخارجية للخدمات</div>
          <p className="mt-2 text-[13px] leading-7 text-[#61706f]">عرض جميع المسودات الخارجية الجاهزة للتنزيل والإرسال ومتابعة حالاتها ضمن مسار الخدمات فقط.</p>
        </Link>
        <Link href="/requests" className="rounded-[24px] border border-[#d6d7d4] bg-[#fbf7ee] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="text-[18px] font-extrabold text-[#7b6334]">العودة إلى طلبات المواد</div>
          <p className="mt-2 text-[13px] leading-7 text-[#6b5a4a]">طلبات المواد من المخزون ومسار صرفها وإرجاعها بقيت مستقلة تمامًا عن هذا المسار.</p>
        </Link>
      </section>
    </div>
  );
}
