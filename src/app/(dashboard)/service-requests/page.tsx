import Link from 'next/link';

const serviceCards = [
  {
    title: 'صيانة',
    description: 'أعطال القاعات، التكييف، الإنارة، الأبواب، النوافذ، الشاشات أو أي عنصر يحتاج معالجة فنية.',
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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[#d6d7d4] bg-white shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.05fr_0.95fr] lg:p-7">
          <div className="rounded-[24px] bg-[linear-gradient(135deg,#123f45_0%,#2A6364_58%,#8a6a37_100%)] px-5 py-6 text-white">
            <div className="text-[13px] font-bold text-white/75">وكالة الجامعة للتدريب</div>
            <h1 className="mt-3 text-[30px] font-extrabold leading-tight">خدمات مرافق التدريب</h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-8 text-white/88">
              ارفع ملاحظتك على مرافق المبنى خلال أقل من دقيقة. اختر النوع، التقط صورة مباشرة، أضف الموقع والوصف، ثم أرسلها لتدخل مسار الاعتماد والمراسلات الخارجية.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric title="لا يحتاج تسجيل دخول" value="زائر" />
              <Metric title="توثيق مباشر" value="صورة" />
              <Metric title="مسار رسمي" value="اعتماد" />
            </div>
          </div>
          <div className="grid content-center gap-3">
            <div className="rounded-[22px] border border-[#e2ebea] bg-[#f8fbfb] p-4">
              <div className="text-[18px] font-extrabold text-[#223738]">كيف تصل الملاحظة؟</div>
              <div className="mt-3 grid gap-2 text-[13px] leading-7 text-[#61706f]">
                <div>1. الزائر يرفع الملاحظة مع الاسم والجوال والصفة.</div>
                <div>2. المدير أو مراقب النظام يراجع ويعتمد.</div>
                <div>3. تتحول إلى مسودة مراسلة خارجية للجهة المعنية.</div>
                <div>4. بعد تنزيل المراسلة تحفظ المعاملة في الأرشيف.</div>
              </div>
            </div>
            <Link href="/login" className="inline-flex justify-center rounded-2xl border border-[#dbe5e3] bg-white px-4 py-3 text-sm font-bold text-[#27494a]">
              دخول الإدارة والمراقبين
            </Link>
          </div>
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

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/12 bg-white/10 px-4 py-3">
      <div className="text-[12px] text-white/70">{title}</div>
      <div className="mt-1 text-[20px] font-extrabold">{value}</div>
    </div>
  );
}
