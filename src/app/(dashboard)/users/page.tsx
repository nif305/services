'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type RoleKey = 'manager' | 'warehouse' | 'user';
type StatusKey = 'active' | 'disabled';

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
  role?: RoleKey;
  roles?: RoleKey[];
  status: StatusKey;
  createdAt?: string | null;
};

type FormState = {
  fullName: string;
  email: string;
  mobile: string;
  extension: string;
  operationalProject: string;
  roles: RoleKey[];
  status: StatusKey;
  password: string;
  confirmPassword: string;
};

const emptyForm: FormState = {
  fullName: '',
  email: '',
  mobile: '',
  extension: '',
  operationalProject: '',
  roles: ['user'],
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

function normalizeRoles(row: Pick<UserRow, 'role' | 'roles'>): RoleKey[] {
  const fromRoles = Array.isArray(row.roles) ? row.roles.filter(Boolean) : [];
  const fallback = row.role ? [row.role] : [];
  const merged = [...fromRoles, ...fallback];
  const unique = Array.from(new Set(merged)) as RoleKey[];
  if (!unique.includes('user')) unique.unshift('user');
  return unique;
}

function hasRole(row: Pick<UserRow, 'role' | 'roles'>, role: RoleKey) {
  return normalizeRoles(row).includes(role);
}

function primaryRole(row: Pick<UserRow, 'role' | 'roles'>): RoleKey {
  const roles = normalizeRoles(row);
  if (roles.includes('manager')) return 'manager';
  if (roles.includes('warehouse')) return 'warehouse';
  return 'user';
}

function roleLabel(row: Pick<UserRow, 'role' | 'roles'>) {
  const roles = normalizeRoles(row);
  const labels: string[] = [];
  if (roles.includes('manager')) labels.push('مدير');
  if (roles.includes('warehouse')) labels.push('مسؤول مخزن');
  if (roles.includes('user')) labels.push('موظف');
  return labels.join(' + ');
}

function roleShortLabel(row: Pick<UserRow, 'role' | 'roles'>) {
  const main = primaryRole(row);
  if (main === 'manager') return 'مدير';
  if (main === 'warehouse') return 'مسؤول مخزن';
  return 'موظف';
}

function roleDescription(row: Pick<UserRow, 'role' | 'roles'>) {
  const roles = normalizeRoles(row);
  if (roles.includes('manager') && roles.includes('warehouse')) {
    return 'يملك صلاحيات المدير ومسؤول المخزن، ويحتفظ أيضًا بصلاحية الموظف.';
  }
  if (roles.includes('manager')) {
    return 'له صلاحية الإدارة، ويحتفظ أيضًا بصلاحية الموظف.';
  }
  if (roles.includes('warehouse')) {
    return 'له صلاحية المخزن، ويحتفظ أيضًا بصلاحية الموظف.';
  }
  return 'يعمل بصلاحية الموظف فقط.';
}

function statusLabel(status: StatusKey) {
  return status === 'active' ? 'نشط' : 'موقوف';
}

function statusVariant(status: StatusKey): 'success' | 'danger' {
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

function RoleCheckbox({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d6d7d4] bg-white px-4 py-3 transition hover:border-[#016564] hover:bg-[#f9fcfc]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-5 w-5 rounded border-[#c7d0cf] text-[#016564] focus:ring-[#016564]/20"
      />
      <div>
        <div className="text-sm font-bold text-[#152625]">{label}</div>
        <div className="mt-1 text-xs leading-6 text-[#61706f]">{description}</div>
      </div>
    </label>
  );
}

export default function UsersPage() {
  const { user, refreshUsers } = useAuth();
  const isManager = user?.role === 'manager';

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | RoleKey>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusKey>('ALL');

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
      managers: rows.filter((row) => hasRole(row, 'manager')).length,
      warehouses: rows.filter((row) => hasRole(row, 'warehouse')).length,
      users: rows.filter((row) => hasRole(row, 'user')).length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = normalizeArabic(search);

    return rows.filter((row) => {
      const matchesRole = roleFilter === 'ALL' ? true : hasRole(row, roleFilter);
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
          roleLabel(row),
          roleShortLabel(row),
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
      roles: normalizeRoles(row),
      status: row.status,
      password: '',
      confirmPassword: '',
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const toggleRole = (role: RoleKey) => {
    if (role === 'user') return;
    setForm((prev) => {
      const has = prev.roles.includes(role);
      const nextRoles = has ? prev.roles.filter((item) => item !== role) : [...prev.roles, role];
      const unique = Array.from(new Set(['user', ...nextRoles])) as RoleKey[];
      return { ...prev, roles: unique };
    });
  };

  const handleSave = async () => {
    if (!editing) return;

    if (!form.fullName.trim() || !form.email.trim()) {
      alert('الاسم والبريد الإلكتروني مطلوبان');
      return;
    }

    if (!form.roles.includes('user')) {
      alert('يجب أن تبقى صلاحية الموظف مفعلة');
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      alert('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        extension: form.extension.trim(),
        operationalProject: form.operationalProject.trim(),
        roles: Array.from(new Set(['user', ...form.roles])) as RoleKey[],
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
                لوحة واضحة لإدارة الحسابات والصلاحيات، مع دعم منح أكثر من صلاحية للمستخدم نفسه
                بطريقة مباشرة وبسيطة.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatCard title="إجمالي المستخدمين" value={stats.total} accent="bg-[#016564]" />
              <StatCard title="نشط" value={stats.active} accent="bg-emerald-500" />
              <StatCard title="موقوف" value={stats.disabled} accent="bg-rose-500" />
              <StatCard
                title="مدير"
                value={stats.managers}
                accent="bg-[#d0b284]"
                active={roleFilter === 'manager'}
                onClick={() => setRoleFilter((prev) => (prev === 'manager' ? 'ALL' : 'manager'))}
              />
              <StatCard
                title="مسؤول مخزن"
                value={stats.warehouses}
                accent="bg-sky-500"
                active={roleFilter === 'warehouse'}
                onClick={() => setRoleFilter((prev) => (prev === 'warehouse' ? 'ALL' : 'warehouse'))}
              />
              <StatCard
                title="موظف"
                value={stats.users}
                accent="bg-violet-500"
                active={roleFilter === 'user'}
                onClick={() => setRoleFilter((prev) => (prev === 'user' ? 'ALL' : 'user'))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <Input
              label="بحث"
              placeholder="ابحث بالاسم أو البريد أو المشروع"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">تصفية الصلاحية</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'ALL' | RoleKey)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
              >
                <option value="ALL">كل الصلاحيات</option>
                <option value="manager">مدير</option>
                <option value="warehouse">مسؤول مخزن</option>
                <option value="user">موظف</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">الحالة</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | StatusKey)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
              >
                <option value="ALL">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="disabled">موقوف</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="ghost" className="w-full lg:w-auto" onClick={clearFilters}>
                إعادة الضبط
              </Button>
            </div>
          </div>

          <div className="hidden overflow-x-auto xl:block">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <Card className="rounded-[24px] border border-[#d6d7d4] p-10 text-center text-sm text-[#61706f] shadow-none">
                لا توجد نتائج مطابقة
              </Card>
            ) : (
              <table className="min-w-full overflow-hidden rounded-[24px] border border-[#e4e8e7] text-right">
                <thead className="bg-[#f8faf9] text-sm text-[#516261]">
                  <tr>
                    <th className="px-4 py-3 font-bold">الاسم</th>
                    <th className="px-4 py-3 font-bold">البريد</th>
                    <th className="px-4 py-3 font-bold">الصلاحيات</th>
                    <th className="px-4 py-3 font-bold">الحالة</th>
                    <th className="px-4 py-3 font-bold">المشروع</th>
                    <th className="px-4 py-3 font-bold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-t border-[#edf1f0] bg-white text-sm text-[#243635]">
                      <td className="px-4 py-4 font-bold">{row.fullName}</td>
                      <td className="px-4 py-4">{row.email}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="info">{roleShortLabel(row)}</Badge>
                          {hasRole(row, 'warehouse') ? <Badge variant="secondary">مسؤول مخزن</Badge> : null}
                          {hasRole(row, 'manager') ? <Badge variant="success">مدير</Badge> : null}
                          {hasRole(row, 'user') ? <Badge variant="success">موظف</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                      </td>
                      <td className="px-4 py-4">{row.operationalProject || row.department || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => setSelected(row)}>
                            عرض
                          </Button>
                          <Button onClick={() => openEdit(row)}>تعديل</Button>
                          <Button
                            variant={row.status === 'active' ? 'danger' : 'secondary'}
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
                        <Badge variant="info">{roleShortLabel(row)}</Badge>
                        {hasRole(row, 'warehouse') ? <Badge variant="secondary">مسؤول مخزن</Badge> : null}
                        {hasRole(row, 'manager') ? <Badge variant="success">مدير</Badge> : null}
                        {hasRole(row, 'user') ? <Badge variant="success">موظف</Badge> : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoPill label="الجوال" value={row.mobile || '—'} />
                      <InfoPill label="التحويلة" value={row.extension || '—'} />
                      <InfoPill label="المشروع" value={row.operationalProject || row.department || '—'} />
                      <InfoPill label="تاريخ الإنشاء" value={formatDate(row.createdAt)} />
                    </div>

                    <div className="rounded-2xl border border-[#edf1f0] bg-[#fbfcfc] px-3 py-3 text-sm text-[#556867]">
                      {roleDescription(row)}
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
              <InfoPill label="الصلاحيات" value={roleLabel(selected)} />
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
              {roleDescription(selected)}
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
              <div className="font-bold text-[#016564]">الصلاحيات</div>
              <div className="mt-2 leading-7">
                ضع علامة على الصلاحيات المطلوبة فقط. تبقى صلاحية <span className="font-bold">الموظف</span>
                مفعلة دائمًا كأساس لكل مستخدم.
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

              <div className="sm:col-span-2 space-y-3">
                <label className="block text-sm font-semibold text-slate-700">اختيار الصلاحيات</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <RoleCheckbox
                    checked={form.roles.includes('user')}
                    label="موظف"
                    description="صلاحية أساسية ثابتة لكل مستخدم داخل المنصة."
                    onChange={() => {}}
                  />
                  <RoleCheckbox
                    checked={form.roles.includes('warehouse')}
                    label="مسؤول مخزن"
                    description="يستطيع الصرف والرفض واستلام الإرجاع وتحديث المخزون."
                    onChange={() => toggleRole('warehouse')}
                  />
                  <RoleCheckbox
                    checked={form.roles.includes('manager')}
                    label="مدير"
                    description="يراقب العمل ويدير المستخدمين ويمكنه التحول عند الحاجة إلى دور مناسب."
                    onChange={() => toggleRole('manager')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as StatusKey,
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
