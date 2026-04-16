'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

function normalizeArabic(value: string) {
  return (value || '').toLowerCase().trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '').replace(/\s+/g, ' ');
}

function ReportMetric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none">
      <div className="text-[12px] text-[#6f7b7a]">{label}</div>
      <div className="mt-1 text-[22px] font-extrabold" style={{ color }}>{value}</div>
    </Card>
  );
}

export default function ReportsPage() {
  const pathname = usePathname();
  const { user } = useAuth();
  const system = pathname?.startsWith('/services') ? 'services' : 'materials';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('year');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/summary?system=${system}&period=${period}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (mounted) setData(json && !json.error ? json : null);
      } catch {
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [system, period]);

  const q = normalizeArabic(search);
  const filteredTopItems = useMemo(() => (data?.topConsumedItems || []).filter((item: any) => normalizeArabic(`${item.name} ${item.code}`).includes(q)), [data, q]);
  const filteredTopUsers = useMemo(() => (data?.topIssuedUsers || data?.topRequesters || []).filter((item: any) => normalizeArabic(`${item.fullName} ${item.department}`).includes(q)), [data, q]);
  const filteredRecent = useMemo(() => (data?.recentRequests || []).filter((item: any) => normalizeArabic(`${item.code || ''} ${item.title || ''} ${item.requesterName || ''} ${item.department || ''}`).includes(q)), [data, q]);
  const filteredDrafts = useMemo(() => (data?.externalDrafts || []).filter((item: any) => normalizeArabic(`${item.subject} ${item.recipient}`).includes(q)), [data, q]);

  if (user?.role !== 'manager') {
    return <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-700">غير مصرح لك بالوصول لهذه الصفحة</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">{system === 'services' ? 'تقارير الخدمات' : 'تقارير المواد'}</h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
            {system === 'services'
              ? 'لوحة أوسع لمتابعة أحجام الطلبات، المسودات النشطة، كثافة الأنواع، وأحدث المعاملات في دورة الخدمات.'
              : 'لوحة أوسع لمتابعة المخزون والطلبات والعهد والإرجاعات، مع مؤشرات تشغيلية وأبرز الأنماط خلال الفترة المحددة.'}
          </p>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px]">
          <Input label="بحث داخل التقارير" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اسم، رمز، جهة، أو عنوان" />
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">الفترة</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10">
              <option value="year">من بداية السنة</option>
              <option value="30d">آخر 30 يومًا</option>
              <option value="90d">آخر 90 يومًا</option>
              <option value="all">كل الفترات</option>
            </select>
          </div>
        </div>
      </section>

      {loading || !data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          {[1, 2].map((i) => <Skeleton key={`section-${i}`} className="h-64 rounded-[24px]" />)}
        </div>
      ) : system === 'services' ? (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <ReportMetric label="إجمالي طلبات الخدمات" value={data.totalRequests} color="#016564" />
            <ReportMetric label="طلبات نشطة" value={data.activeRequests} color="#498983" />
            <ReportMetric label="بانتظار المدير" value={data.pendingManager} color="#d0b284" />
            <ReportMetric label="مسودات خارجية نشطة" value={data.activeDrafts} color="#7c1e3e" />
          </section>
          <section className="grid gap-4 xl:grid-cols-3">
            <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
              <h3 className="text-lg font-extrabold text-[#016564]">توزيع الطلبات حسب النوع</h3>
              <div className="mt-4 space-y-3">
                {[
                  ['الصيانة', data.categoryCounts?.maintenance, data.categoryPending?.maintenance],
                  ['النظافة', data.categoryCounts?.cleaning, data.categoryPending?.cleaning],
                  ['المشتريات المباشرة', data.categoryCounts?.purchase, data.categoryPending?.purchase],
                  ['طلبات أخرى', data.categoryCounts?.other, data.categoryPending?.other],
                ].map(([label, total, pending]) => (
                  <div key={String(label)} className="rounded-2xl border border-[#e7ebea] p-3">
                    <div className="font-bold text-[#152625]">{label}</div>
                    <div className="mt-1 text-sm text-[#61706f]">الإجمالي: {String(total || 0)}</div>
                    <div className="mt-1 text-sm font-semibold text-[#016564]">بانتظار القرار: {String(pending || 0)}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
              <h3 className="text-lg font-extrabold text-[#016564]">أكثر الجهات رفعًا للطلبات</h3>
              <div className="mt-4 space-y-3">
                {filteredTopUsers.length ? filteredTopUsers.map((item: any) => (
                  <div key={item.userId} className="rounded-2xl border border-[#e7ebea] p-3">
                    <div className="font-bold text-[#152625]">{item.fullName}</div>
                    <div className="mt-1 text-sm text-[#61706f]">{item.department}</div>
                    <div className="mt-2 text-sm font-semibold text-[#016564]">عدد الطلبات: {item.quantity}</div>
                  </div>
                )) : <div className="text-sm text-[#61706f]">لا توجد بيانات مطابقة</div>}
              </div>
            </Card>
            <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
              <h3 className="text-lg font-extrabold text-[#016564]">المراسلات الخارجية النشطة</h3>
              <div className="mt-4 space-y-3">
                {filteredDrafts.length ? filteredDrafts.map((item: any) => (
                  <div key={item.id} className="rounded-2xl border border-[#e7ebea] p-3">
                    <div className="font-bold text-[#152625]">{item.subject}</div>
                    <div className="mt-1 text-sm text-[#61706f]">{item.recipient}</div>
                    <div className="mt-2 text-sm font-semibold text-[#016564]">{new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(item.createdAt))}</div>
                  </div>
                )) : <div className="text-sm text-[#61706f]">لا توجد مسودات نشطة مطابقة</div>}
              </div>
            </Card>
          </section>
          <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm">
            <h3 className="text-lg font-extrabold text-[#016564]">أحدث الطلبات النشطة</h3>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {filteredRecent.length ? filteredRecent.map((item: any) => (
                <div key={item.id} className="rounded-2xl border border-[#e7ebea] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] text-[#016564]">{item.code}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700">{item.category}</span>
                    <span className="rounded-full bg-[#d0b284]/15 px-3 py-1 text-[11px] text-[#8a6a28]">{item.status}</span>
                  </div>
                  <div className="mt-2 font-bold text-[#152625]">{item.title}</div>
                  <div className="mt-1 text-sm text-[#61706f]">{item.requesterName} - {item.department}</div>
                </div>
              )) : <div className="text-sm text-[#61706f]">لا توجد بيانات مطابقة</div>}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <ReportMetric label="إجمالي الأصناف" value={data.totalItems} color="#016564" />
            <ReportMetric label="صحة المخزون" value={`${data.healthPercentage}%`} color="#498983" />
            <ReportMetric label="منخفضة المخزون" value={data.lowStockItems} color="#d0b284" />
            <ReportMetric label="العهد النشطة" value={data.activeCustody} color="#7c1e3e" />
          </section>
          <section className="grid gap-4 xl:grid-cols-3">
            <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
              <h3 className="text-lg font-extrabold text-[#016564]">ملخص الطلبات</h3>
              <div className="mt-4 space-y-3">
                {[
                  ['طلبات معلقة', data.requestsByStatus?.pending],
                  ['طلبات مصروفة', data.requestsByStatus?.issued],
                  ['طلبات معادة', data.requestsByStatus?.returned],
                  ['طلبات مرفوضة', data.requestsByStatus?.rejected],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-2xl border border-[#e7ebea] p-3">
                    <div className="font-bold text-[#152625]">{label}</div>
                    <div className="mt-2 text-sm font-semibold text-[#016564]">{String(value || 0)}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
              <h3 className="text-lg font-extrabold text-[#016564]">أكثر الأصناف استهلاكًا</h3>
              <div className="mt-4 space-y-3">
                {filteredTopItems.length ? filteredTopItems.map((item: any) => (
                  <div key={item.itemId} className="rounded-2xl border border-[#e7ebea] p-3">
                    <div className="font-bold text-[#152625]">{item.name}</div>
                    <div className="mt-1 text-sm text-[#61706f]">{item.code}</div>
                    <div className="mt-2 text-sm font-semibold text-[#016564]">الكمية: {item.quantity}</div>
                  </div>
                )) : <div className="text-sm text-[#61706f]">لا توجد بيانات مطابقة</div>}
              </div>
            </Card>
            <Card className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
              <h3 className="text-lg font-extrabold text-[#016564]">أكثر المستفيدين صرفًا</h3>
              <div className="mt-4 space-y-3">
                {filteredTopUsers.length ? filteredTopUsers.map((item: any) => (
                  <div key={item.userId} className="rounded-2xl border border-[#e7ebea] p-3">
                    <div className="font-bold text-[#152625]">{item.fullName}</div>
                    <div className="mt-1 text-sm text-[#61706f]">{item.department}</div>
                    <div className="mt-2 text-sm font-semibold text-[#016564]">إجمالي الكميات: {item.quantity}</div>
                  </div>
                )) : <div className="text-sm text-[#61706f]">لا توجد بيانات مطابقة</div>}
              </div>
            </Card>
          </section>
          <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm">
            <h3 className="text-lg font-extrabold text-[#016564]">أحدث طلبات المواد</h3>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {filteredRecent.length ? filteredRecent.map((item: any) => (
                <div key={item.id} className="rounded-2xl border border-[#e7ebea] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] text-[#016564]">{item.code}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700">{item.status}</span>
                  </div>
                  <div className="mt-2 font-bold text-[#152625]">{item.requesterName}</div>
                  <div className="mt-1 text-sm text-[#61706f]">{item.department} - عدد البنود: {item.itemCount}</div>
                </div>
              )) : <div className="text-sm text-[#61706f]">لا توجد بيانات مطابقة</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
