'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type UserRow = {
  id: string;
  employeeId?: string;
  fullName: string;
  email: string;
  mobile?: string | null;
  extension?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  operationalProject?: string | null;
  role: 'manager' | 'warehouse' | 'user';
  status: 'active' | 'disabled';
  createdAt?: string | null;
};

type FormState = {
  fullName: string;
  email: string;
  mobile: string;
  extension: string;
  operationalProject: string;
  role: 'manager' | 'warehouse' | 'user';
  status: 'active' | 'disabled';
  password: string;
  confirmPassword: string;
};

const emptyForm: FormState = {
  fullName: '',
  email: '',
  mobile: '',
  extension: '',
  operationalProject: '',
  role: 'user',
  status: 'active',
  password: '',
  confirmPassword: '',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function normalizeArabic(value: string) {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/\s+/g, ' ');
}

function roleLabel(role: UserRow['role']) {
  if (role === 'manager') return 'مدير + موظف';
  if (role === 'warehouse') return 'مسؤول مخزن + موظف';
  return 'موظف';
}

function roleShortLabel(role: UserRow['role']) {
  if (role === 'manager') return 'مدير';
  if (role === 'warehouse') return 'مسؤول مخزن';
  return 'موظف';
}

function roleDescription(role: UserRow['role']) {
  if (role === 'manager') return 'له صلاحية الإدارة، ويحتفظ بإمكانية العمل كموظف.';
  if (role === 'warehouse') return 'له صلاحية المخزون، ويحتفظ بإمكانية العمل كموظف.';
  return 'يعمل بصلاحيات الموظف فقط.';
}

function statusLabel(status: UserRow['status']) {
  return status === 'active' ? 'نشط' : 'موقوف';
}

function statusVariant(status: UserRow['status']): 'success' | 'danger' {
  return status === 'active' ? 'success' : 'danger';
}

function StatCard({
  title,
  value,
  accent,
  active,
  onClick,
}: {
  title: string;
  value: number;
  accent: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border bg-white p-4 text-right shadow-sm transition hover:-translate-y-[1px] hover:shadow-md sm:rounded-[26px] ${
        active ? 'border-[#016564] ring-4 ring-[#016564]/10' : 'border-[#d6d7d4]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] text-[#6f7b7a] sm:text-[13px]">{title}</div>
          <div className="mt-2 text-[28px] font-extrabold leading-none text-[#152625] sm:text-[32px]">
            {value}
          </div>
        </div>
        <span className={`h-3 w-3 rounded-full ${accent}`} />
      </div>
    </button>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e4e8e7] bg-[#fbfcfc] px-3 py-2">
      <div className="text-[11px] font-semibold text-[#7b8786]">{label}</div>
      <div className="mt-1 text-sm text-[#243635]">{value || '—'}</div>
    </div>
  );
}

export default function UsersPage() {
  const { user, refreshUsers } = useAuth();
  const isManager = user?.role === 'manager';

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'manager' | 'warehouse' | 'user'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'disabled'>('ALL');

  const [selected, setSelected] = useState<UserRow | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === 'active').length,
      disabled: rows.filter((row) => row.status === 'disabled').length,
      managers: rows.filter((row) => row.role === 'manager').length,
      warehouses: rows.filter((row) => row.role === 'warehouse').length,
      users: rows.filter((row) => row.role === 'user').length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);

    return rows.filter((row) => {
      const matchesRole = roleFilter === 'ALL' ? true : row.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' ? true : row.status === statusFilter;

      const haystack = normalizeArabic(
        [
          row.fullName,
          row.email,
          row.mobile,
          row.extension,
          row.operationalProject,
          row.department,
          row.jobTitle,
          roleLabel(row.role),
          roleShortLabel(row.role),
          statusLabel(row.status),
        ]
          .filter(Boolean)
          .join(' ')
      );

      const matchesSearch = q ? haystack.includes(q) : true;
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [rows, search, roleFilter, statusFilter]);

  const openEdit = (row: UserRow) => {
    setEditing(row);
    setForm({
      fullName: row.fullName || '',
      email: row.email || '',
      mobile: row.mobile || '',
      extension: row.extension || '',
      operationalProject: row.operationalProject || row.department || '',
      role: row.role,
      status: row.status,
      password: '',
      confirmPassword: '',
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!editing) return;

    if (!form.fullName.trim() || !form.email.trim()) {
      alert('الاسم والبريد الإلكتروني مطلوبان');
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      alert('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }

    setSaving(true);

    try {
      const payload: Record<string, string> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        extension: form.extension.trim(),
        operationalProject: form.operationalProject.trim(),
        role: form.role,
        status: form.status,
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const res = await fetch(`/api/users/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || 'تعذر حفظ التعديلات');
        return;
      }

      await fetchUsers();
      await refreshUsers();
      closeEdit();
    } finally {
      setSaving(false);
    }
  };

  const quickToggleStatus = async (row: UserRow) => {
    const nextStatus = row.status === 'active' ? 'disabled' : 'active';

    try {
      const res = await fetch(`/api/users/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || 'تعذر تحديث حالة الحساب');
        return;
      }

      await fetchUsers();
      await refreshUsers();

      if (selected?.id === row.id) {
        setSelected((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
    } catch {
      alert('تعذر تحديث حالة الحساب');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  };

  if (!isManager) {
    return (
      <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-700 sm:rounded-[26px]">
        غير مصرح لك بالوصول لهذه الصفحة
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-[#d6d7d4] bg-white shadow-sm sm:rounded-[28px]">
        <div className="border-b border-[#edf1f0] bg-[linear-gradient(135deg,rgba(1,101,100,0.06),rgba(208,178,132,0.08))] px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-[24px] font-extrabold leading-[1.2] text-[#016564] sm:text-[30px]">
                إدارة المستخدمين
              </h1>
              <p className="max-w-3xl text-[13px] leading-7 text-[#536463] sm:text-sm">
                لوحة أكثر وضوحًا لإدارة الحسابات، مع إبراز أن المدير ومسؤول المخزن يحتفظان دائمًا
                بدور الموظف داخل المنصة.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatCard
                title="إجمالي الحسابات"
                value={stats.total}
                accent="bg-[#016564]"
                active={roleFilter === 'ALL' && statusFilter === 'ALL'}
                onClick={() => {
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }}
              />
              <StatCard
                title="المديرون"
                value={stats.managers}
                accent="bg-[#d0b284]"
                active={roleFilter === 'manager'}
                onClick={() => setRoleFilter('manager')}
              />
              <StatCard
                title="مسؤولو المخزن"
                value={stats.warehouses}
                accent="bg-[#498983]"
                active={roleFilter === 'warehouse'}
                onClick={() => setRoleFilter('warehouse')}
              />
              <StatCard
                title="الموظفون فقط"
                value={stats.users}
                accent="bg-[#98aaaa]"
                active={roleFilter === 'user'}
                onClick={() => setRoleFilter('user')}
              />
              <StatCard
                title="الحسابات النشطة"
                value={stats.active}
                accent="bg-emerald-500"
                active={statusFilter === 'active'}
                onClick={() => setStatusFilter('active')}
              />
              <StatCard
                title="الحسابات الموقوفة"
                value={stats.disabled}
                accent="bg-rose-600"
                active={statusFilter === 'disabled'}
                onClick={() => setStatusFilter('disabled')}
              />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <Input
              label="بحث"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="الاسم، البريد، الجوال، التحويلة، أو المشروع"
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">الدور</label>
              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as 'ALL' | 'manager' | 'warehouse' | 'user')
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
              >
                <option value="ALL">الكل</option>
                <option value="manager">مدير + موظف</option>
                <option value="warehouse">مسؤول مخزن + موظف</option>
                <option value="user">موظف فقط</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">الحالة</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'active' | 'disabled')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
              >
                <option value="ALL">الكل</option>
                <option value="active">نشط</option>
                <option value="disabled">موقوف</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="ghost" className="w-full xl:w-auto" onClick={clearFilters}>
                إعادة الضبط
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white shadow-sm sm:rounded-[28px]">
        <div className="flex flex-col gap-2 border-b border-[#edf1f0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <div className="text-[18px] font-bold text-[#152625]">قائمة الحسابات</div>
            <div className="mt-1 text-sm text-[#61706f]">
              {loading ? 'جارٍ تحميل البيانات...' : `عدد النتائج الحالية: ${filteredRows.length}`}
            </div>
          </div>
          <div className="text-xs text-[#61706f]">
            المدير ومسؤول المخزن يظهران هنا بصلاحية إضافية فوق دور الموظف.
          </div>
        </div>

        <div className="hidden xl:block">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-20 w-full rounded-[20px]" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#61706f]">لا توجد نتائج مطابقة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#edf1f0]">
                <thead className="bg-[#fbfcfc]">
                  <tr className="text-right text-sm text-[#61706f]">
                    <th className="px-5 py-4 font-semibold">المستخدم</th>
                    <th className="px-5 py-4 font-semibold">الدور</th>
                    <th className="px-5 py-4 font-semibold">الحالة</th>
                    <th className="px-5 py-4 font-semibold">التواصل</th>
                    <th className="px-5 py-4 font-semibold">المشروع</th>
                    <th className="px-5 py-4 font-semibold">الإنشاء</th>
                    <th className="px-5 py-4 font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f0]">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="align-top transition hover:bg-[#fcfdfd]">
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#152625]">{row.fullName}</div>
                        <div className="mt-1 text-sm text-[#61706f] break-all">{row.email}</div>
                        <div className="mt-1 text-xs text-[#91a09f]">{row.jobTitle || '—'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="info">{roleShortLabel(row.role)}</Badge>
                          {row.role !== 'user' ? <Badge variant="success">موظف</Badge> : null}
                        </div>
                        <div className="mt-2 text-xs text-[#61706f]">{roleDescription(row.role)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#304342]">
                        <div>الجوال: {row.mobile || '—'}</div>
                        <div className="mt-1">التحويلة: {row.extension || '—'}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#304342]">
                        {row.operationalProject || row.department || '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#304342]">{formatDate(row.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" className="!px-4" onClick={() => setSelected(row)}>
                            عرض
                          </Button>
                          <Button className="!px-4" onClick={() => openEdit(row)}>
                            تعديل
                          </Button>
                          <Button
                            variant={row.status === 'active' ? 'danger' : 'secondary'}
                            className="!px-4"
                            onClick={() => quickToggleStatus(row)}
                          >
                            {row.status === 'active' ? 'إيقاف' : 'تنشيط'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3 p-3 xl:hidden sm:p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-44 w-full rounded-[24px]" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-none">
              لا توجد نتائج مطابقة
            </Card>
          ) : (
            filteredRows.map((row) => (
              <Card
                key={row.id}
                className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-none sm:rounded-[28px]"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-[17px] font-bold text-[#152625]">{row.fullName}</div>
                      <div className="mt-1 break-all text-sm text-[#61706f]">{row.email}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                      <Badge variant="info">{roleShortLabel(row.role)}</Badge>
                      {row.role !== 'user' ? <Badge variant="success">موظف</Badge> : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoPill label="الجوال" value={row.mobile || '—'} />
                    <InfoPill label="التحويلة" value={row.extension || '—'} />
                    <InfoPill label="المشروع" value={row.operationalProject || row.department || '—'} />
                    <InfoPill label="تاريخ الإنشاء" value={formatDate(row.createdAt)} />
                  </div>

                  <div className="rounded-2xl border border-[#edf1f0] bg-[#fbfcfc] px-3 py-3 text-sm text-[#556867]">
                    {roleDescription(row.role)}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button variant="ghost" className="w-full" onClick={() => setSelected(row)}>
                      عرض
                    </Button>
                    <Button className="w-full" onClick={() => openEdit(row)}>
                      تعديل
                    </Button>
                    <Button
                      variant={row.status === 'active' ? 'danger' : 'secondary'}
                      className="w-full"
                      onClick={() => quickToggleStatus(row)}
                    >
                      {row.status === 'active' ? 'إيقاف الحساب' : 'تنشيط الحساب'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `تفاصيل المستخدم: ${selected.fullName}` : 'تفاصيل المستخدم'}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoPill label="الاسم" value={selected.fullName} />
              <InfoPill label="البريد الإلكتروني" value={selected.email} />
              <InfoPill label="الدور" value={roleLabel(selected.role)} />
              <InfoPill label="الحالة" value={statusLabel(selected.status)} />
              <InfoPill label="الجوال" value={selected.mobile || '—'} />
              <InfoPill label="التحويلة" value={selected.extension || '—'} />
              <div className="sm:col-span-2">
                <InfoPill
                  label="المشروع التشغيلي"
                  value={selected.operationalProject || selected.department || '—'}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#edf1f0] bg-[#fbfcfc] px-4 py-3 text-sm text-[#556867]">
              {roleDescription(selected.role)}
            </div>

            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <Button variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">
                إغلاق
              </Button>

              <Button
                variant={selected.status === 'active' ? 'danger' : 'secondary'}
                onClick={async () => {
                  await quickToggleStatus(selected);
                  setSelected(null);
                }}
                className="w-full sm:w-auto"
              >
                {selected.status === 'active' ? 'إيقاف الحساب' : 'تنشيط الحساب'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!editing}
        onClose={closeEdit}
        title={editing ? `تعديل المستخدم: ${editing.fullName}` : 'تعديل المستخدم'}
      >
        {editing ? (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-[#d6d7d4] bg-[#fbfcfc] px-4 py-4 text-sm text-[#556867]">
              <div className="font-bold text-[#016564]">ملاحظة الدور</div>
              <div className="mt-2 leading-7">
                اختيار <span className="font-bold">مدير</span> يعني أن المستخدم يعمل كـ مدير مع احتفاظه
                بوضع الموظف داخل المنصة، واختيار <span className="font-bold">مسؤول مخزن</span> يعني
                أنه يعمل كمسؤول مخزن مع احتفاظه بوضع الموظف.
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="الاسم"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              />

              <Input
                label="البريد الإلكتروني"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />

              <Input
                label="الجوال"
                value={form.mobile}
                onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
              />

              <Input
                label="التحويلة"
                value={form.extension}
                onChange={(e) => setForm((prev) => ({ ...prev, extension: e.target.value }))}
              />

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">الدور الإضافي</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      role: e.target.value as 'manager' | 'warehouse' | 'user',
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
                >
                  <option value="user">موظف فقط</option>
                  <option value="manager">مدير + موظف</option>
                  <option value="warehouse">مسؤول مخزن + موظف</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as 'active' | 'disabled',
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
                >
                  <option value="active">نشط</option>
                  <option value="disabled">موقوف</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="المشروع التشغيلي"
                  value={form.operationalProject}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, operationalProject: e.target.value }))
                  }
                />
              </div>

              <Input
                label="كلمة مرور جديدة"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="اتركه فارغًا إذا لا تريد تغييرها"
              />

              <Input
                label="تأكيد كلمة المرور الجديدة"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="أعد كتابة كلمة المرور"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#edf1f0] pt-4 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={closeEdit} className="w-full sm:w-auto">
                إلغاء
              </Button>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
