'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

type GenericItem = Record<string, any>;

type DashboardData = {
  inventory: GenericItem[];
  requests: GenericItem[];
  returns: GenericItem[];
  custody: GenericItem[];
  maintenance: GenericItem[];
  purchases: GenericItem[];
  suggestions: GenericItem[];
  notifications: GenericItem[];
};

const EMPTY_DATA: DashboardData = {
  inventory: [],
  requests: [],
  returns: [],
  custody: [],
  maintenance: [],
  purchases: [],
  suggestions: [],
  notifications: [],
};

function getArrayPayload(payload: any): GenericItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function normalizeRole(role?: string | null) {
  const value = String(role || '').toLowerCase();
  if (value === 'manager') return 'manager';
  if (value === 'warehouse') return 'warehouse';
  return 'user';
}

function isOpenStatus(value: any) {
  const s = String(value || '').toUpperCase();
  return ['PENDING', 'OPEN', 'NEW', 'IN_PROGRESS', 'ACTIVE', 'RETURN_REQUESTED'].includes(s);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ar-SA').format(value || 0);
}

function getRequestItemsCount(requests: GenericItem[]) {
  return requests.reduce((sum, req) => sum + (Array.isArray(req?.items) ? req.items.length : 0), 0);
}

function SurfaceCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.28)] ${className}`}
    >
      {children}
    </div>
  );
}

function SmallStat({
  title,
  value,
  note,
  tone = 'default',
}: {
  title: string;
  value: number;
  note: string;
  tone?: 'default' | 'primary' | 'gold' | 'danger' | 'success';
}) {
  const tones: Record<string, string> = {
    default: 'bg-white text-slate-900',
    primary: 'bg-[#f4fbfa] text-[#016564]',
    gold: 'bg-[#fbf7ee] text-[#9b7a31]',
    danger: 'bg-[#fff7fa] text-[#7c1e3e]',
    success: 'bg-[#f2fbf7] text-[#21795c]',
  };

  return (
    <SurfaceCard className={`p-4 ${tones[tone]}`}>
      <div className="text-[12px] font-medium text-slate-500">{title}</div>
      <div className="mt-2 text-[28px] font-bold leading-none">{formatNumber(value)}</div>
      <div className="mt-2 text-[11px] leading-5 text-slate-500">{note}</div>
    </SurfaceCard>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SurfaceCard className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#016564]">{title}</h2>
          {subtitle ? <p className="mt-1 text-[12px] leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </SurfaceCard>
  );
}

function ActionItem({
  title,
  count,
  hint,
  href,
  critical = false,
}: {
  title: string;
  count: number;
  hint: string;
  href: string;
  critical?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm ${
        critical ? 'border-[#7c1e3e]/15 bg-[#fff8fa]' : 'border-slate-200 bg-slate-50 hover:bg-white'
      }`}
    >
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-[11px] leading-5 text-slate-500">{hint}</div>
      </div>
      <div
        className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
          critical ? 'bg-[#7c1e3e] text-white' : 'bg-[#016564] text-white'
        }`}
      >
        {formatNumber(count)}
      </div>
    </Link>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-[#016564]/25 hover:bg-[#f7fbfb] hover:text-[#016564]"
    >
      {label}
    </Link>
  );
}

function LegendDot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />;
}

function InventoryDonut({
  total,
  data,
}: {
  total: number;
  data: { name: string; value: number; color: string }[];
}) {
  const safeTotal = total || 1;
  let start = 0;
  const segments = data
    .map((item) => {
      const angle = (item.value / safeTotal) * 360;
      const seg = `${item.color} ${start}deg ${start + angle}deg`;
      start += angle;
      return seg;
    })
    .join(', ');

  return (
    <div className="grid gap-4 xl:grid-cols-[140px_1fr] xl:items-center">
      <div className="relative mx-auto h-[140px] w-[140px]">
        <div
          className="h-[140px] w-[140px] rounded-full"
          style={{ background: `conic-gradient(${segments})` }}
        />
        <div className="absolute inset-[18px] flex items-center justify-center rounded-full bg-white shadow-inner">
          <div className="text-center">
            <div className="text-[10px] text-slate-400">الإجمالي</div>
            <div className="mt-1 text-[26px] font-bold text-slate-900">{formatNumber(total)}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {data.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-[16px] bg-slate-50 px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <LegendDot color={item.color} />
              <span className="text-[13px] font-medium text-slate-700">{item.name}</span>
            </div>
            <span className="text-[13px] font-bold text-slate-900">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBars({
  data,
  color,
}: {
  data: { name: string; value: number }[];
  color: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.name}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className="text-[12px] font-medium text-slate-700">{item.name}</div>
            <div className="text-[12px] font-bold text-slate-900">{formatNumber(item.value)}</div>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: color,
                width: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniBarChart({
  title,
  subtitle,
  data,
  color,
}: {
  title: string;
  subtitle: string;
  data: { name: string; value: number }[];
  color: string;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <MiniBars data={data} color={color} />
    </SectionCard>
  );
}

function UnifiedDashboard() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchJson = async (url: string) => {
      try {
        const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        return getArrayPayload(json);
      } catch {
        return [];
      }
    };

    const load = async () => {
      setLoading(true);
      const [inventory, requests, returns, custody, maintenance, purchases, suggestions, notifications] =
        await Promise.all([
          fetchJson('/api/inventory'),
          fetchJson('/api/requests'),
          fetchJson('/api/returns'),
          fetchJson('/api/custody'),
          fetchJson('/api/maintenance'),
          fetchJson('/api/purchases'),
          fetchJson('/api/suggestions'),
          fetchJson('/api/notifications'),
        ]);

      if (!mounted) return;

      setData({
        inventory,
        requests,
        returns,
        custody,
        maintenance,
        purchases,
        suggestions,
        notifications,
      });
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const inventory = data.inventory;
    const requests = data.requests;
    const returns = data.returns;
    const custody = data.custody;
    const maintenance = data.maintenance;
    const purchases = data.purchases;
    const suggestions = data.suggestions;
    const notifications = data.notifications;

    const lowStock = inventory.filter((item) => {
      const qty = Number(item.availableQty ?? item.availableQuantity ?? item.qty ?? 0);
      return qty > 0 && qty <= 5;
    }).length;

    const outOfStock = inventory.filter((item) => {
      const qty = Number(item.availableQty ?? item.availableQuantity ?? item.qty ?? 0);
      return qty <= 0;
    }).length;

    const returnableItems = inventory.filter(
      (item) => String(item.type || '').toUpperCase() === 'RETURNABLE'
    ).length;
    const consumableItems = inventory.filter(
      (item) => String(item.type || '').toUpperCase() === 'CONSUMABLE'
    ).length;

    const pendingRequests = requests.filter(
      (item) => String(item.status || '').toUpperCase() === 'PENDING'
    ).length;
    const issuedRequests = requests.filter(
      (item) => String(item.status || '').toUpperCase() === 'ISSUED'
    ).length;
    const rejectedRequests = requests.filter(
      (item) => String(item.status || '').toUpperCase() === 'REJECTED'
    ).length;

    const pendingReturns = returns.filter(
      (item) => String(item.status || '').toUpperCase() === 'PENDING'
    ).length;

    const activeCustody = custody.filter(
      (item) => String(item.status || '').toUpperCase() === 'ACTIVE'
    ).length;
    const delayedCustody = custody.filter((item) => {
      const due = item.expectedReturn || item.dueDate;
      if (!due) return false;
      return (
        new Date(due).getTime() < Date.now() &&
        String(item.status || '').toUpperCase() !== 'RETURNED'
      );
    }).length;

    const openMaintenance = maintenance.filter((item) => isOpenStatus(item.status)).length;
    const openPurchases = purchases.filter((item) => isOpenStatus(item.status)).length;
    const cleaningRequests = suggestions.filter(
      (item) =>
        String(item.category || '').toUpperCase() === 'CLEANING' && isOpenStatus(item.status)
    ).length;
    const otherRequests = suggestions.filter(
      (item) =>
        String(item.category || '').toUpperCase() !== 'CLEANING' && isOpenStatus(item.status)
    ).length;

    const unreadNotifications = notifications.filter((item) => !item.isRead).length;

    return {
      totalInventory: inventory.length,
      lowStock,
      outOfStock,
      returnableItems,
      consumableItems,
      pendingRequests,
      issuedRequests,
      rejectedRequests,
      pendingReturns,
      activeCustody,
      delayedCustody,
      openMaintenance,
      openPurchases,
      cleaningRequests,
      otherRequests,
      unreadNotifications,
      requestItemsCount: getRequestItemsCount(requests),
    };
  }, [data]);

  const inventoryStatusData = useMemo(
    () => [
      {
        name: 'متاح',
        value: Math.max(metrics.totalInventory - metrics.lowStock - metrics.outOfStock, 0),
        color: '#016564',
      },
      { name: 'منخفض', value: metrics.lowStock, color: '#d0b284' },
      { name: 'نافد', value: metrics.outOfStock, color: '#7c1e3e' },
    ],
    [metrics]
  );

  const requestFlowData = useMemo(
    () => [
      { name: 'جديد', value: metrics.pendingRequests },
      { name: 'تم الصرف', value: metrics.issuedRequests },
      { name: 'مرفوض', value: metrics.rejectedRequests },
      { name: 'إرجاع مفتوح', value: metrics.pendingReturns },
    ],
    [metrics]
  );

  const servicesData = useMemo(
    () => [
      { name: 'صيانة', value: metrics.openMaintenance },
      { name: 'شراء مباشر', value: metrics.openPurchases },
      { name: 'نظافة', value: metrics.cleaningRequests },
      { name: 'طلبات أخرى', value: metrics.otherRequests },
    ],
    [metrics]
  );

  const quickLinks = useMemo(() => {
    if (role === 'manager') {
      return [
        { href: '/inventory', label: 'فتح المخزون' },
        { href: '/requests', label: 'فتح الطلبات' },
        { href: '/returns', label: 'فتح الإرجاعات' },
        { href: '/users', label: 'المستخدمون' },
        { href: '/notifications', label: 'الإشعارات' },
        { href: '/maintenance', label: 'الصيانة' },
      ];
    }
    if (role === 'warehouse') {
      return [
        { href: '/inventory', label: 'المخزون' },
        { href: '/requests', label: 'صرف الطلبات' },
        { href: '/returns', label: 'استلام الإرجاعات' },
        { href: '/custody', label: 'العهد' },
        { href: '/notifications', label: 'الإشعارات' },
        { href: '/maintenance', label: 'الصيانة' },
      ];
    }
    return [
      { href: '/requests', label: 'طلب مواد' },
      { href: '/custody', label: 'عهدتي' },
      { href: '/returns', label: 'طلبات الإرجاع' },
      { href: '/maintenance', label: 'طلبات الصيانة' },
      { href: '/notifications', label: 'الإشعارات' },
      { href: '/purchases', label: 'شراء مباشر' },
    ];
  }, [role]);

  const actionRows = useMemo(() => {
    if (role === 'manager') {
      return [
        {
          title: 'طلبات صرف بانتظار التنفيذ',
          count: metrics.pendingRequests,
          hint: 'طلبات مواد تتطلب تدخلًا مباشرًا',
          href: '/requests',
          critical: metrics.pendingRequests > 0,
        },
        {
          title: 'إرجاعات بانتظار الاستلام',
          count: metrics.pendingReturns,
          hint: 'مواد عائدة لم تُستلم بعد',
          href: '/returns',
          critical: metrics.pendingReturns > 0,
        },
        {
          title: 'عهد متأخرة',
          count: metrics.delayedCustody,
          hint: 'مواد تجاوزت تاريخ الإرجاع',
          href: '/custody',
          critical: metrics.delayedCustody > 0,
        },
        {
          title: 'مواد منخفضة أو نافدة',
          count: metrics.lowStock + metrics.outOfStock,
          hint: 'تحتاج قرارًا على المخزون أو التوريد',
          href: '/inventory',
          critical: metrics.outOfStock > 0,
        },
      ];
    }

    if (role === 'warehouse') {
      return [
        {
          title: 'طلبات بانتظار الصرف',
          count: metrics.pendingRequests,
          hint: 'نفّذ الصرف للطلبات الجديدة',
          href: '/requests',
          critical: metrics.pendingRequests > 0,
        },
        {
          title: 'إرجاعات تنتظر الاستلام',
          count: metrics.pendingReturns,
          hint: 'أغلق عمليات الاستلام والتوثيق',
          href: '/returns',
          critical: metrics.pendingReturns > 0,
        },
        {
          title: 'مواد منخفضة الكمية',
          count: metrics.lowStock,
          hint: 'أصناف قريبة من حد الأمان',
          href: '/inventory',
          critical: metrics.lowStock > 0,
        },
        {
          title: 'مواد نافدة الكمية',
          count: metrics.outOfStock,
          hint: 'ستؤثر على الطلبات الجديدة',
          href: '/inventory',
          critical: metrics.outOfStock > 0,
        },
      ];
    }

    return [
      {
        title: 'طلباتي الجديدة',
        count: metrics.pendingRequests,
        hint: 'طلبات مواد ما زالت قيد الانتظار',
        href: '/requests',
      },
      {
        title: 'طلباتي المصروفة',
        count: metrics.issuedRequests,
        hint: 'طلبات تم صرفها لك بالفعل',
        href: '/requests',
      },
      {
        title: 'عهدتي النشطة',
        count: metrics.activeCustody,
        hint: 'مواد مسترجعة مسجلة عليك',
        href: '/custody',
      },
      {
        title: 'إرجاعاتي المفتوحة',
        count: metrics.pendingReturns,
        hint: 'طلبات إرجاع لم تُستلم بعد',
        href: '/returns',
      },
    ];
  }, [metrics, role]);

  const latestUpdates = useMemo(() => {
    return (data.notifications || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 4);
  }, [data.notifications]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-[#016564]/10 bg-[radial-gradient(circle_at_top_right,rgba(208,178,132,0.20),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbfb_48%,#f1f8f7_100%)] p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-32 bg-[linear-gradient(180deg,rgba(1,101,100,0.06),transparent)] blur-2xl" />
        <div className="relative grid gap-5 xl:grid-cols-[320px_1fr]">
          <SurfaceCard className="p-4 sm:p-5">
            <div className="text-[14px] font-bold text-[#016564]">مؤشر المخزون</div>
            <div className="mt-1 text-[11px] leading-5 text-slate-500">قراءة سريعة لحالة الأصناف</div>
            <div className="mt-4">
              <InventoryDonut total={metrics.totalInventory} data={inventoryStatusData} />
            </div>
          </SurfaceCard>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-[#016564]/15 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-[#016564]">
                منصة مخزون المواد التدريبية
              </div>
            </div>

            <div>
              <h1 className="text-[22px] font-bold leading-[1.4] text-slate-900 sm:text-[28px]">
                {role === 'manager'
                  ? 'لوحة قيادة تشغيلية للمخزون والطلبات'
                  : role === 'warehouse'
                  ? 'لوحة تنفيذ يومية لمسؤول المخزن'
                  : 'لوحة متابعة الطلبات والعهدة'}
              </h1>
              <p className="mt-2 max-w-3xl text-[13px] leading-7 text-slate-600">
                {role === 'manager'
                  ? 'تركيز مباشر على حالة المخزون، الاختناقات التشغيلية، والطلبات التي تستدعي تدخلًا إداريًا.'
                  : role === 'warehouse'
                  ? 'تعرض ما يجب صرفه واستلامه الآن، مع حالة الأصناف الأكثر تأثيرًا على الجاهزية.'
                  : 'تعرض طلباتك، عهدتك، إرجاعاتك، وأحدث التحديثات المرتبطة بحسابك.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SmallStat title="إجمالي الأصناف" value={metrics.totalInventory} note="عدد المواد المعرفة في النظام" tone="primary" />
              <SmallStat title="طلبات بانتظار الإجراء" value={metrics.pendingRequests + metrics.pendingReturns} note="صرف أو استلام" tone="danger" />
              <SmallStat title="تنبيهات غير مقروءة" value={metrics.unreadNotifications} note="آخر ما وصلك داخل النظام" tone="gold" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SmallStat title="مواد منخفضة" value={metrics.lowStock} note="تحتاج متابعة قريبة" tone="gold" />
        <SmallStat title="مواد نافدة" value={metrics.outOfStock} note="تؤثر على الجاهزية" tone="danger" />
        <SmallStat title="مواد قابلة للإرجاع" value={metrics.returnableItems} note="مرتبطة بالعهدة" tone="success" />
        <SmallStat title="مواد استهلاكية" value={metrics.consumableItems} note="صرف مباشر واستهلاك" tone="default" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title={
            role === 'manager'
              ? 'أهم العناصر التي تستدعي تدخلًا مباشرًا'
              : role === 'warehouse'
              ? 'الإجراءات التشغيلية الحالية'
              : 'ما الذي يجب متابعته الآن؟'
          }
          subtitle="عناصر تنفيذية مباشرة"
        >
          <div className="space-y-2.5">
            {actionRows.map((row) => (
              <ActionItem key={row.title} {...row} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="وصول سريع" subtitle="اختصارات إلى أهم المسارات">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((link) => (
              <QuickAction key={link.href} href={link.href} label={link.label} />
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SurfaceCard className="p-4">
              <div className="text-[12px] font-semibold text-[#016564]">العهدة النشطة</div>
              <div className="mt-2 text-[24px] font-bold text-slate-900">{formatNumber(metrics.activeCustody)}</div>
              <div className="mt-1 text-[11px] text-slate-500">مواد ما زالت في عهدة المستخدمين</div>
            </SurfaceCard>
            <SurfaceCard className="p-4">
              <div className="text-[12px] font-semibold text-[#016564]">بنود الطلبات</div>
              <div className="mt-2 text-[24px] font-bold text-slate-900">{formatNumber(metrics.requestItemsCount)}</div>
              <div className="mt-1 text-[11px] text-slate-500">إجمالي البنود المسجلة داخل الطلبات</div>
            </SurfaceCard>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <MiniBarChart title="حركة الطلبات والإرجاعات" subtitle="قراءة سريعة للحالة الحالية" data={requestFlowData} color="#016564" />
        <MiniBarChart title="الخدمات التشغيلية المساندة" subtitle="صيانة وشراء ونظافة وطلبات أخرى" data={servicesData} color="#7c1e3e" />
      </div>

      <SectionCard
        title="آخر ما وصلك"
        subtitle="أحدث الإشعارات والتحديثات"
        action={
          <Link href="/notifications" className="text-[12px] font-semibold text-[#016564]">
            فتح الإشعارات
          </Link>
        }
      >
        {loading ? (
          <div className="rounded-[18px] bg-slate-50 p-5 text-center text-[13px] text-slate-500">جارٍ تحميل البيانات...</div>
        ) : latestUpdates.length === 0 ? (
          <div className="rounded-[18px] bg-slate-50 p-5 text-center text-[13px] text-slate-500">لا توجد تحديثات حديثة</div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {latestUpdates.map((item) => (
              <SurfaceCard key={item.id} className="p-4">
                <div className="text-[14px] font-bold text-slate-900">{item.title || 'إشعار'}</div>
                <div className="mt-1 text-[12px] leading-6 text-slate-600">
                  {item.message || 'لا توجد تفاصيل إضافية'}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('ar-SA') : '—'}
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default function DashboardPage() {
  return <UnifiedDashboard />;
}
