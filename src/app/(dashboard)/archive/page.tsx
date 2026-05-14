'use client';

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type ArchiveSource = 'materials' | 'service';
type FolderKey =
  | 'service-correspondence'
  | 'service-maintenance'
  | 'service-cleaning'
  | 'service-purchase'
  | 'service-other'
  | 'material-consumable'
  | 'material-returnable'
  | 'material-custody-returned';

type ArchiveRow = {
  id: string;
  source: ArchiveSource;
  folder: FolderKey;
  title: string;
  code: string;
  status: string;
  requesterName: string;
  requesterDepartment: string;
  description: string;
  createdAt?: string | null;
  extra?: string;
};

type FolderMeta = {
  key: FolderKey;
  source: ArchiveSource;
  title: string;
  subtitle: string;
  tone: string;
};

type ArchiveStats = {
  total: number;
  folders: number;
  activeFolderCount: number;
};

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const FOLDERS: FolderMeta[] = [
  {
    key: 'service-correspondence',
    source: 'service',
    title: 'المراسلات الخارجية',
    subtitle: 'المعاملات المنتهية بعد التنزيل أو الإرسال',
    tone: 'text-[#016564]',
  },
  {
    key: 'service-maintenance',
    source: 'service',
    title: 'طلبات الصيانة',
    subtitle: 'طلبات الصيانة المؤرشفة',
    tone: 'text-[#016564]',
  },
  {
    key: 'service-cleaning',
    source: 'service',
    title: 'طلبات النظافة',
    subtitle: 'طلبات النظافة المؤرشفة',
    tone: 'text-[#016564]',
  },
  {
    key: 'service-purchase',
    source: 'service',
    title: 'طلبات المشتريات المباشرة',
    subtitle: 'طلبات الشراء المباشر المؤرشفة',
    tone: 'text-[#8a6a28]',
  },
  {
    key: 'service-other',
    source: 'service',
    title: 'طلبات أخرى',
    subtitle: 'الطلبات الأخرى المؤرشفة',
    tone: 'text-[#6d5b7a]',
  },
  {
    key: 'material-consumable',
    source: 'materials',
    title: 'الطلبات المستهلكة',
    subtitle: 'طلبات المواد الاستهلاكية المصروفة',
    tone: 'text-[#498983]',
  },
  {
    key: 'material-returnable',
    source: 'materials',
    title: 'الطلبات المسترجعة',
    subtitle: 'طلبات المواد المسترجعة المكتملة',
    tone: 'text-[#498983]',
  },
  {
    key: 'material-custody-returned',
    source: 'materials',
    title: 'العهد المعادة',
    subtitle: 'العهد التي أغلقت وتمت إعادتها',
    tone: 'text-[#498983]',
  },
];

const PAGE_LIMIT = 5;
const EMPTY_COUNTS: Record<FolderKey, number> = {
  'service-correspondence': 0,
  'service-maintenance': 0,
  'service-cleaning': 0,
  'service-purchase': 0,
  'service-other': 0,
  'material-consumable': 0,
  'material-returnable': 0,
  'material-custody-returned': 0,
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '-';
  }
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path
        d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l1.8 2H18a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M3.5 9H20.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function ArchivePage() {
  const pathname = usePathname();
  const { user } = useAuth();
  const systemSource: ArchiveSource = pathname?.startsWith('/services')
    ? 'service'
    : 'materials';
  const defaultFolder: FolderKey =
    systemSource === 'service'
      ? 'service-correspondence'
      : 'material-consumable';
  const visibleFolders = useMemo(
    () => FOLDERS.filter((folder) => folder.source === systemSource),
    [systemSource]
  );
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selected, setSelected] = useState<ArchiveRow | null>(null);
  const [activeFolder, setActiveFolder] = useState<FolderKey>(defaultFolder);
  const [folderCounts, setFolderCounts] =
    useState<Record<FolderKey, number>>(EMPTY_COUNTS);
  const [stats, setStats] = useState<ArchiveStats>({
    total: 0,
    folders: visibleFolders.length,
    activeFolderCount: 0,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    setActiveFolder(defaultFolder);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [defaultFolder]);

  useEffect(() => {
    setSelected(null);
  }, [activeFolder, systemSource]);

  useEffect(() => {
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [activeFolder, systemSource, deferredSearch]);

  useEffect(() => {
    if (user?.role !== 'manager' && user?.role !== 'warehouse') return;

    let mounted = true;

    (async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          source: systemSource,
          folder: activeFolder,
          page: String(pagination.page),
          limit: String(pagination.limit),
        });

        if (deferredSearch.trim()) {
          params.set('search', deferredSearch.trim());
        }

        const response = await fetch(`/api/archive?${params.toString()}`, {
          cache: 'no-store',
        });
        const json = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(String(json?.error || 'تعذر جلب الأرشيف'));
        }

        const nextPagination: PaginationState = {
          page: Number(json?.pagination?.page || pagination.page || 1),
          limit: Number(json?.pagination?.limit || pagination.limit || PAGE_LIMIT),
          total: Number(json?.pagination?.total || 0),
          totalPages: Math.max(1, Number(json?.pagination?.totalPages || 1)),
        };

        if (pagination.page > nextPagination.totalPages && nextPagination.totalPages > 0) {
          if (mounted) {
            setPagination((prev) => ({
              ...prev,
              page: nextPagination.totalPages,
            }));
          }
          return;
        }

        if (!mounted) {
          return;
        }

        setRows(Array.isArray(json?.data) ? json.data : []);
        setFolderCounts({
          ...EMPTY_COUNTS,
          ...(json?.folderCounts || {}),
        });
        setStats({
          total: Number(json?.stats?.total || 0),
          folders: Number(json?.stats?.folders || visibleFolders.length),
          activeFolderCount: Number(json?.stats?.activeFolderCount || 0),
        });
        setPagination(nextPagination);
      } catch {
        if (!mounted) {
          return;
        }

        setRows([]);
        setFolderCounts(EMPTY_COUNTS);
        setStats({
          total: 0,
          folders: visibleFolders.length,
          activeFolderCount: 0,
        });
        setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    activeFolder,
    deferredSearch,
    pagination.limit,
    pagination.page,
    systemSource,
    user?.role,
    visibleFolders.length,
  ]);

  const activeFolderMeta =
    visibleFolders.find((folder) => folder.key === activeFolder) || visibleFolders[0];

  if (user?.role !== 'manager' && user?.role !== 'warehouse') {
    return (
      <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-700">
        غير مصرح لك بالوصول لهذه الصفحة
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">
            {systemSource === 'service' ? 'أرشيف طلبات الخدمات' : 'أرشيف طلبات المواد'}
          </h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
            {systemSource === 'service'
              ? 'أرشيف منظم بمجلدات مستقلة للمراسلات الخارجية وطلبات الصيانة والنظافة والمشتريات والطلبات الأخرى.'
              : 'أرشيف منظم بمجلدات مستقلة للطلبات المستهلكة والطلبات المسترجعة والعهد المعادة.'}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:max-w-[540px] xl:grid-cols-3">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none">
            <div className="text-[12px] text-[#6f7b7a]">إجمالي السجلات</div>
            <div className="mt-1 text-[22px] font-extrabold text-[#016564]">{stats.total}</div>
          </Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none">
            <div className="text-[12px] text-[#6f7b7a]">عدد المجلدات</div>
            <div className="mt-1 text-[22px] font-extrabold text-[#498983]">{stats.folders}</div>
          </Card>
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none">
            <div className="text-[12px] text-[#6f7b7a]">محتوى المجلد الحالي</div>
            <div className="mt-1 text-[22px] font-extrabold text-[#d0b284]">
              {stats.activeFolderCount}
            </div>
          </Card>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <div className="mb-4 text-[16px] font-extrabold text-[#152625]">مجلدات الأرشيف</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleFolders.map((folder) => {
            const isActive = folder.key === activeFolder;

            return (
              <button
                key={folder.key}
                type="button"
                onClick={() => setActiveFolder(folder.key)}
                className={`rounded-[22px] border p-4 text-right transition ${
                  isActive
                    ? 'border-[#c7d9d5] bg-[#f4faf9] shadow-[0_16px_30px_-28px_rgba(1,101,100,0.28)]'
                    : 'border-[#d6d7d4] bg-white hover:border-[#cfd9d6] hover:bg-[#fbfcfc]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-[16px] font-extrabold ${folder.tone}`}>
                      {folder.title}
                    </div>
                    <div className="mt-1 text-[12px] leading-6 text-[#6b7b79]">
                      {folder.subtitle}
                    </div>
                  </div>
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-[16px] ${
                      isActive
                        ? 'bg-[#e4f0ee] text-[#016564]'
                        : 'bg-[#f5f7f7] text-[#6f7b7a]'
                    }`}
                  >
                    <FolderIcon />
                  </div>
                </div>
                <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#425554]">
                  {folderCounts[folder.key] || 0} سجل
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <Input
            label="بحث داخل المجلد"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="الرمز، العنوان، مقدم الطلب، أو وصف الحالة"
          />
          <div className="self-end rounded-full bg-[#f5f8f7] px-4 py-2 text-xs font-bold text-[#425554]">
            {activeFolderMeta?.title || 'المجلد'}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-32 w-full rounded-[24px]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">
            لا توجد سجلات مطابقة
          </Card>
        ) : (
          rows.map((row) => (
            <Card key={row.id} className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] ${
                        row.source === 'materials'
                          ? 'bg-[#498983]/10 text-[#498983]'
                          : 'bg-[#d0b284]/15 text-[#8a6a28]'
                      }`}
                    >
                      {row.source === 'materials' ? 'مواد' : 'خدمي'}
                    </span>
                    <span className="rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] text-[#016564]">
                      {row.code}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700">
                      {row.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#152625]">{row.title}</h3>
                  <p className="text-sm leading-7 text-[#61706f]">{row.description}</p>
                  <div className="grid gap-2 text-sm text-[#425554] sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <span className="font-semibold text-[#016564]">مقدم الطلب: </span>
                      {row.requesterName}
                    </div>
                    <div>
                      <span className="font-semibold text-[#016564]">الإدارة: </span>
                      {row.requesterDepartment}
                    </div>
                    <div>
                      <span className="font-semibold text-[#016564]">التاريخ: </span>
                      {formatDate(row.createdAt)}
                    </div>
                    {row.extra ? (
                      <div className="sm:col-span-2 xl:col-span-3">
                        <span className="font-semibold text-[#016564]">معلومة إضافية: </span>
                        {row.extra}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 lg:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className="rounded-full bg-[#016564] px-5 py-2 text-sm font-bold text-white"
                  >
                    فتح التفاصيل
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      {!loading && pagination.totalPages > 1 ? (
        <section className="flex items-center justify-between rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))
            }
            disabled={pagination.page <= 1}
            className="rounded-full border border-[#d6d7d4] px-4 py-2 text-sm font-bold text-[#425554] disabled:cursor-not-allowed disabled:opacity-40"
          >
            السابق
          </button>
          <div className="text-center">
            <div className="text-sm font-bold text-[#016564]">
              الصفحة {pagination.page} من {pagination.totalPages}
            </div>
            <div className="text-xs text-slate-500">
              إجمالي السجلات في هذا المجلد: {pagination.total}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                page: Math.min(prev.page + 1, prev.totalPages),
              }))
            }
            disabled={pagination.page >= pagination.totalPages}
            className="rounded-full border border-[#d6d7d4] px-4 py-2 text-sm font-bold text-[#425554] disabled:cursor-not-allowed disabled:opacity-40"
          >
            التالي
          </button>
        </section>
      ) : null}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `تفاصيل الأرشيف: ${selected.code}` : 'تفاصيل الأرشيف'}
        maxWidth="4xl"
      >
        {selected ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['المجلد', FOLDERS.find((folder) => folder.key === selected.folder)?.title || '-'],
              ['الرمز', selected.code],
              ['العنوان', selected.title],
              ['الحالة', selected.status],
              ['مقدم الطلب', selected.requesterName],
              ['الإدارة', selected.requesterDepartment],
              ['التاريخ', formatDate(selected.createdAt)],
              ['معلومة إضافية', selected.extra || '-'],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-3"
              >
                <div className="text-xs font-bold text-[#016564]">{label}</div>
                <div className="mt-1 text-sm text-[#425554]">{value}</div>
              </div>
            ))}
            <div className="sm:col-span-2 rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-3">
              <div className="text-xs font-bold text-[#016564]">الوصف</div>
              <div className="mt-1 text-sm leading-7 text-[#425554]">
                {selected.description || '-'}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
