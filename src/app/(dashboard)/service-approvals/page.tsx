import Link from 'next/link';

const approvalCards = [
  {
    title: 'طلبات الصيانة',
    description: 'مراجعة واعتماد ملاحظات الصيانة قبل تحويلها إلى المراسلات الخارجية.',
    href: '/services/maintenance',
  },
  {
    title: 'طلبات النظافة',
    description: 'مراجعة ملاحظات النظافة واعتمادها أو رفضها حسب الحالة.',
    href: '/services/cleaning',
  },
  {
    title: 'ملاحظات الضيافة',
    description: 'اعتماد ملاحظات الضيافة وإحالتها إلى الجهة المعنية بنفس مسار المراسلات.',
    href: '/services/hospitality',
  },
  {
    title: 'الملاحظات الأخرى',
    description: 'مراجعة الملاحظات العامة وتحديد الجهة المستلمة قبل الإحالة.',
    href: '/services/other',
  },
];

export default function ServiceApprovalsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d6d7d4] bg-white p-6 shadow-sm">
        <div className="inline-flex rounded-full border border-[#d6d7d4] bg-[#f8fbfb] px-3 py-1 text-[11px] font-bold text-[#016564]">مسار الإدارة</div>
        <h1 className="mt-4 text-[28px] font-extrabold leading-[1.3] text-[#016564]">اعتماد الملاحظات وتحويلها للمراسلات</h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-8 text-[#61706f]">
          هنا تتم مراجعة ملاحظات الزوار ورواد المبنى. بعد الاعتماد تتحول المعاملة تلقائياً إلى مسودة مراسلة خارجية، وبعد تنزيلها تنتقل إلى الأرشيف.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {approvalCards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-[24px] border border-[#d6d7d4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="text-[20px] font-extrabold text-[#016564]">{card.title}</div>
            <p className="mt-2 min-h-[72px] text-[13px] leading-7 text-[#61706f]">{card.description}</p>
            <div className="mt-5 inline-flex rounded-full bg-[#016564] px-4 py-2 text-[13px] font-bold text-white">فتح المسار</div>
          </Link>
        ))}
      </section>

      <Link href="/services/email-drafts" className="block rounded-[24px] border border-[#d6d7d4] bg-[#f8fbfb] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="text-[18px] font-extrabold text-[#016564]">المراسلات الخارجية الجاهزة</div>
        <p className="mt-2 text-[13px] leading-7 text-[#61706f]">عرض المسودات التي تم توليدها بعد اعتماد الطلبات، وتنزيل ملفات الإرسال ثم أرشفتها.</p>
      </Link>
    </div>
  );
}
