import Link from 'next/link';

const serviceCards = [
  {
    title: 'صيانة',
    description: 'أعطال الإنارة، التكييف، الأبواب، الشاشات، الأثاث أو أي عنصر يحتاج معالجة فنية.',
    href: '/services/maintenance?new=1',
    badge: 'بلاغ فني',
  },
  {
    title: 'نظافة',
    description: 'ملاحظات النظافة في القاعات، الممرات، دورات المياه، المداخل ومناطق الضيافة.',
    href: '/services/cleaning?new=1',
    badge: 'جاهزية المكان',
  },
  {
    title: 'ضيافة',
    description: 'ملاحظات القهوة، الماء، التقديم، ترتيب الضيافة أو جاهزية منطقة الاستقبال.',
    href: '/services/hospitality?new=1',
    badge: 'تجربة الضيافة',
  },
  {
    title: 'ملاحظة أخرى',
    description: 'أي ملاحظة عامة داخل مبنى وكالة التدريب لا تندرج تحت الصيانة أو النظافة أو الضيافة.',
    href: '/services/other?new=1',
    badge: 'مسار عام',
  },
];

export default function ServiceRequestsPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[#d6d7d4] bg-[linear-gradient(135deg,#123f45_0%,#2A6364_58%,#8a6a37_100%)] p-5 text-white shadow-[0_20px_60px_-40px_rgba(1,101,100,0.45)] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[13px] font-bold text-white/75">وكالة الجامعة للتدريب</div>
            <h1 className="mt-2 text-[30px] font-extrabold leading-tight sm:text-[40px]">خدمات مرافق التدريب</h1>
            <p className="mt-3 max-w-3xl text-[14px] leading-8 text-white/88">
              اختر نوع الملاحظة، أضف مكانها، التقط صورة مباشرة عند الحاجة، ثم أرسلها فوراً.
            </p>
          </div>
          <Link href="/login" className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15">
            دخول الإدارة والمراقبين
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {serviceCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-[24px] border border-[#d6d7d4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="inline-flex rounded-full border border-[#d6d7d4] bg-[#f8fbfb] px-3 py-1 text-[11px] font-bold text-[#016564]">{card.badge}</div>
            <div className="mt-4 text-[22px] font-extrabold text-[#016564]">{card.title}</div>
            <p className="mt-2 min-h-[84px] text-[13px] leading-7 text-[#61706f]">{card.description}</p>
            <div className="mt-5 inline-flex rounded-full bg-[#016564] px-4 py-2 text-[13px] font-bold text-white">رفع ملاحظة</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
