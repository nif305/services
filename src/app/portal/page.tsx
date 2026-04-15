'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Role = 'manager' | 'warehouse' | 'user';

type SummaryMetrics = {
  pendingRequests: number;
  pendingReturns: number;
  lowStock: number;
  activeCustody: number;
  maintenancePending: number;
  cleaningPending: number;
  purchasePending: number;
  otherPending: number;
  unreadNotifications: number;
};

const ROLE_LABELS: Record<Role, string> = {
  manager: 'مدير',
  warehouse: 'مسؤول مخزن',
  user: 'موظف',
};

const ROLE_ORDER: Role[] = ['manager', 'warehouse', 'user'];
const MATERIALS_FEATURES = ['رفع طلبات المواد', 'صرف الطلبات', 'متابعة المرتجعات', 'إدارة العهد'];
const SERVICES_FEATURES = ['طلبات الصيانة', 'طلبات النظافة', 'الشراء المباشر', 'المراسلات والاعتمادات'];

export default function PortalPage() {
  const router = useRouter();
  const { user, originalUser, canUseRoleSwitch, switchViewRole, logout } = useAuth();
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);

  const availableRoles = useMemo<Role[]>(() => {
    const roles = Array.isArray(originalUser?.roles) ? originalUser.roles : [];
    return ROLE_ORDER.filter((role) => roles.includes(role));
  }, [originalUser?.roles]);

  useEffect(() => {
    fetch('/api/dashboard-summary', { cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => setMetrics(json?.metrics || null))
      .catch(() => setMetrics(null));
  }, []);

  const materialsHighlights = [
    { label: 'طلبات تنتظر الإجراء', value: metrics?.pendingRequests ?? 0 },
    { label: 'مرتجعات معلقة', value: metrics?.pendingReturns ?? 0 },
    { label: 'مواد منخفضة', value: metrics?.lowStock ?? 0 },
  ];

  const servicesHighlights = [
    { label: 'صيانة', value: metrics?.maintenancePending ?? 0 },
    { label: 'نظافة', value: metrics?.cleaningPending ?? 0 },
    { label: 'شراء مباشر', value: metrics?.purchasePending ?? 0 },
  ];

  const servicesLoad =
    (metrics?.maintenancePending ?? 0) +
    (metrics?.cleaningPending ?? 0) +
    (metrics?.purchasePending ?? 0) +
    (metrics?.otherPending ?? 0);

  const roleBrief =
    user?.role === 'manager'
      ? 'لديك رؤية إشرافية على النظامين مع موافقات وتنبيهات تحتاج متابعة سريعة.'
      : user?.role === 'warehouse'
        ? 'تركيزك الحالي على الصرف والاستلام وحركة المواد والمرتجعات.'
        : 'ابدأ من النظام الذي تحتاجه ثم تابع طلباتك وعهدتك من نفس البوابة.';

  return (
    <div dir="rtl" className="arabic-surface min-h-screen bg-[#f4f7f6]">
      <div className="mx-auto max-w-[1580px] px-4 py-5 lg:px-6 lg:py-6">
        <header className="overflow-hidden rounded-[34px] border border-white/70 bg-white/90 p-4 shadow-[0_22px_50px_-36px_rgba(15,23,42,0.28)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="rounded-[28px] border border-[#d8e4e1] bg-[linear-gradient(135deg,#0f5e61_0%,#6f8f90_100%)] px-5 py-5 text-white shadow-[0_18px_44px_-34px_rgba(1,101,100,0.75)]">
                <div className="text-[12px] text-white/70">بوابة تشغيل موحدة</div>
                <div className="mt-2 text-[28px] font-extrabold leading-tight">منصة المواد والخدمات</div>
                <div className="mt-2 max-w-[520px] text-[14px] leading-7 text-white/86">
                  {roleBrief}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <TopStat
                  title="طلبات المواد"
                  value={metrics?.pendingRequests ?? 0}
                  caption="بانتظار الاعتماد أو الصرف"
                  accent="text-[#0f5e61]"
                />
                <TopStat
                  title="طلبات الخدمات"
                  value={servicesLoad}
                  caption="حجم العمل الحالي"
                  accent="text-[#8a6a37]"
                />
                <TopStat
                  title="تنبيهات غير مقروءة"
                  value={metrics?.unreadNotifications ?? 0}
                  caption="إشعارات تتطلب مراجعة"
                  accent="text-[#7c1e3e]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:min-w-[420px] xl:max-w-[520px]">
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-12 items-center rounded-2xl border border-[#dce6e4] bg-white px-5 text-[14px] font-semibold text-[#27494a]"
                >
                  تسجيل الخروج
                </button>

                <div className="flex items-center gap-3 rounded-[24px] border border-[#dde7e5] bg-[#fbfcfc] px-4 py-3">
                  <div className="text-right">
                    <div className="text-[15px] font-bold text-[#223738]">
                      {user?.fullName || 'مستخدم النظام'}
                    </div>
                    <div className="text-[12px] text-[#7a8d8b]">{user?.email || ''}</div>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5f4] text-[#2A6364]">
                    <UserIcon />
                  </span>
                </div>
              </div>

              {canUseRoleSwitch && availableRoles.length > 1 ? (
                <div className="inline-flex w-full items-center gap-1 rounded-[24px] border border-[#dce6e4] bg-[#f7f9f9] p-1 shadow-inner">
                  {availableRoles.map((role) => {
                    const active = user?.role === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => switchViewRole(role)}
                        className={
                          active
                            ? 'flex-1 rounded-[18px] bg-[#2A6364] px-4 py-3 text-[15px] font-semibold text-white'
                            : 'flex-1 rounded-[18px] px-4 py-3 text-[15px] font-semibold text-[#455d5d] hover:bg-white'
                        }
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[34px] border border-white/70 bg-[linear-gradient(150deg,#0b575b_0%,#608687_58%,#8fa7a6_100%)] p-6 text-white shadow-[0_28px_60px_-44px_rgba(15,23,42,0.45)]">
            <div className="flex flex-col gap-6">
              <div className="rounded-[28px] border border-white/15 bg-white/8 p-5 backdrop-blur-sm">
                <img
                  src="/nauss-gold-logo.png"
                  alt="شعار جامعة نايف"
                  className="mx-auto h-28 w-auto object-contain sm:h-32"
                />
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/10 p-6 backdrop-blur-sm">
                <div className="text-[13px] text-white/70">هوية تشغيلية موحدة</div>
                <div className="mt-2 text-[26px] font-extrabold">وكالة التدريب</div>
                <div className="mt-3 text-[15px] leading-8 text-white/82">
                  بوابة واحدة تختصر العمل اليومي بين نظام طلب المواد من المخزن ونظام طلب
                  الخدمات، مع انتقال سريع ولوحات متابعة تنفيذية لكل دور.
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <IdentityChip title="عهد نشطة" value={metrics?.activeCustody ?? 0} />
                <IdentityChip title="طلبات أخرى" value={metrics?.otherPending ?? 0} />
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <PortalSystemCard
              eyebrow="النظام الأول"
              title="نظام طلب المواد من المخزن"
              description="تشغيل متكامل لطلبات المواد والصرف والعهد والمرتجعات مع متابعة المخزون والحالات الحرجة."
              highlights={materialsHighlights}
              features={MATERIALS_FEATURES}
              primaryActionLabel="الدخول إلى لوحة المواد"
              secondaryActionLabel="فتح الطلبات"
              onPrimaryAction={() => router.push('/materials/dashboard')}
              onSecondaryAction={() => router.push('/materials/requests')}
              accent="from-[#0f5e61] via-[#3d7375] to-[#7fa0a0]"
              badge="مواد ومخزون"
            />

            <PortalSystemCard
              eyebrow="النظام الثاني"
              title="نظام طلب الخدمات"
              description="لوحة تشغيل للخدمات العامة تشمل الصيانة والنظافة والشراء المباشر والمراسلات والاعتمادات."
              highlights={servicesHighlights}
              features={SERVICES_FEATURES}
              primaryActionLabel="الدخول إلى لوحة الخدمات"
              secondaryActionLabel="فتح البوابة"
              onPrimaryAction={() => router.push('/services/dashboard')}
              onSecondaryAction={() => router.push('/services/requests')}
              accent="from-[#7c1e3e] via-[#8a4d64] to-[#246a69]"
              badge="خدمات واعتمادات"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function TopStat({
  title,
  value,
  caption,
  accent,
}: {
  title: string;
  value: number;
  caption: string;
  accent: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#dfebe8] bg-[#fbfcfc] px-5 py-4 shadow-[0_14px_34px_-34px_rgba(15,23,42,0.3)]">
      <div className="text-[12px] font-semibold text-[#8a9a98]">{title}</div>
      <div className={`mt-3 text-[34px] font-extrabold ${accent}`}>{value}</div>
      <div className="mt-1 text-[12px] text-[#70807e]">{caption}</div>
    </div>
  );
}

function PortalSystemCard({
  eyebrow,
  title,
  description,
  highlights,
  features,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  accent,
  badge,
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights: Array<{ label: string; value: number }>;
  features: string[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  accent: string;
  badge: string;
}) {
  return (
    <section className="overflow-hidden rounded-[34px] border border-white/80 bg-white shadow-[0_24px_52px_-40px_rgba(15,23,42,0.34)]">
      <div className={`bg-gradient-to-l ${accent} px-6 py-6 text-white`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[720px]">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] text-white/90">
              {eyebrow}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h2 className="text-[30px] font-extrabold leading-tight">{title}</h2>
              <span className="rounded-full border border-white/20 bg-black/10 px-3 py-1 text-[12px] text-white/88">
                {badge}
              </span>
            </div>
            <p className="mt-3 max-w-[700px] text-[15px] leading-8 text-white/85">
              {description}
            </p>
          </div>

          <div className="grid min-w-[250px] gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {highlights.map((item) => (
              <div key={item.label} className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[12px] text-white/70">{item.label}</div>
                <div className="mt-2 text-[30px] font-extrabold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-3 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded-[22px] border border-[#e4eceb] bg-[#f8fbfb] px-4 py-4 text-[15px] font-semibold text-[#234040]"
            >
              {feature}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex min-w-[220px] items-center justify-center rounded-[20px] bg-[#163e44] px-5 py-4 text-[15px] font-bold text-white transition hover:bg-[#0f3337]"
          >
            {primaryActionLabel}
          </button>
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex min-w-[220px] items-center justify-center rounded-[20px] border border-[#d8e4e1] bg-white px-5 py-4 text-[15px] font-bold text-[#234040] transition hover:bg-[#f7fbfb]"
          >
            {secondaryActionLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

function IdentityChip({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
      <div className="text-[12px] text-white/72">{title}</div>
      <div className="mt-2 text-[28px] font-extrabold">{value}</div>
    </div>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 19c1.65-3.1 4.35-4.65 6.5-4.65S16.85 15.9 18.5 19"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
