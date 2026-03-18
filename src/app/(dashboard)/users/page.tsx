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
  fullName: string;
  email: string;
  phone?: string | null;
  extension?: string | null;
  role: 'manager' | 'warehouse' | 'user';
  status: 'active' | 'pending' | 'disabled';
  operationalProject?: string | null;
  createdAt?: string;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  extension: string;
  role: 'manager' | 'warehouse' | 'user';
  status: 'active' | 'pending' | 'disabled';
  operationalProject: string;
};

const emptyForm: FormState = {
  fullName: '',
  email: '',
  phone: '',
  extension: '',
  role: 'user',
  status: 'active',
  operationalProject: '',
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
  if (role === 'manager') return 'مدير';
  if (role === 'warehouse') return 'مسؤول مخزن';
  return 'موظف';
}

function statusLabel(status: UserRow['status']) {
  if (status === 'active') return 'نشط';
  if (status === 'pending') return 'قيد المراجعة';
  return 'معطل';
}

function statusVariant(status: UserRow['status']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'disabled') return 'danger';
  return 'neutral';
}

export default function UsersPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'manager' | 'warehouse' | 'user'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'pending' | 'disabled'>('ALL');

  const [selected, setSelected] = useState<UserRow | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await fetch('/api/users', { cache: 'no-store' });
        const data = await res.json();

        if (mounted) {
          setRows(Array.isArray(data?.data) ? data.data : []);
        }
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchUsers();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === 'active').length,
      pending: rows.filter((row) => row.status === 'pending').length,
      disabled: rows.filter((row) => row.status === 'disabled').length,
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
          row.phone,
          row.extension,
          row.operationalProject,
          roleLabel(row.role),
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
      phone: row.phone || '',
      extension: row.extension || '',
      role: row.role,
      status: row.status,
      operationalProject: row.operationalProject || '',
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/users/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || 'تعذر حفظ التعديلات');
        return;
      }

      setRows((prev) =>
        prev.map((item) =>
          item.id === editing.id
            ? {
                ...item,
                ...form,
              }
            : item
        )
      );

      closeEdit();
    } finally {
      setSaving(false);
    }
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
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="space-y-2">
          <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">
            المستخدمون
          </h1>
          <p className="text-[13px] leading-7 text-[#61706f] sm:text-sm">
            إدارة المستخدمين، مراجعة حالاتهم، وتحديث أدوارهم ومعلوماتهم التشغيلية.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">إجمالي المستخدمين</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.total}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">النشطون</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#016564] sm:text-xl">
              {stats.active}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">قيد المراجعة</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#d0b284] sm:text-xl">
              {stats.pending}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-[#d6d7d4] p-3 shadow-none sm:rounded-2xl">
            <div className="text-[12px] text-[#6f7b7a]">المعطلون</div>
            <div className="mt-1 text-[22px] font-extrabold leading-none text-[#7c1e3e] sm:text-xl">
              {stats.disabled}
            </div>
          </Card>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <Input
            label="بحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="الاسم، البريد، الجوال، أو المشروع التشغيلي"
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
              <option value="manager">مدير</option>
              <option value="warehouse">مسؤول مخزن</option>
              <option value="user">موظف</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">الحالة</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'ALL' | 'active' | 'pending' | 'disabled')
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
            >
              <option value="ALL">الكل</option>
              <option value="active">نشط</option>
              <option value="pending">قيد المراجعة</option>
              <option value="disabled">معطل</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-32 w-full rounded-[24px] sm:rounded-3xl" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm sm:rounded-[28px]">
            لا توجد نتائج مطابقة
          </Card>
        ) : (
          filteredRows.map((row) => (
            <Card
              key={row.id}
              className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm sm:rounded-[28px] sm:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="break-words text-[16px] font-bold leading-7 text-[#152625] sm:text-[18px]">
                      {row.fullName}
                    </div>
                    <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                    <Badge variant="info">{roleLabel(row.role)}</Badge>
                  </div>

                  <div className="grid gap-2 text-[12px] text-[#61706f] sm:grid-cols-2 sm:text-xs">
                    <div className="break-all">البريد: {row.email}</div>
                    <div>الجوال: {row.phone || '—'}</div>
                    <div>التحويلة: {row.extension || '—'}</div>
                    <div className="break-words">المشروع: {row.operationalProject || '—'}</div>
                    <div className="sm:col-span-2">تاريخ الإنشاء: {formatDate(row.createdAt)}</div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setSelected(row)}>
                    عرض
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={() => openEdit(row)}>
                    تعديل
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `تفاصيل المستخدم: ${selected.fullName}` : 'تفاصيل المستخدم'}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الاسم</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                  {selected.fullName}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">البريد الإلكتروني</div>
                <div className="mt-1 break-all text-sm leading-7 text-[#304342]">
                  {selected.email}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الدور</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{roleLabel(selected.role)}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الحالة</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{statusLabel(selected.status)}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">الجوال</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{selected.phone || '—'}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">التحويلة</div>
                <div className="mt-1 text-sm leading-7 text-[#304342]">{selected.extension || '—'}</div>
              </div>

              <div className="rounded-[18px] border border-[#e7ebea] bg-white px-4 py-3 sm:col-span-2 sm:rounded-2xl">
                <div className="text-xs font-bold text-[#016564]">المشروع التشغيلي</div>
                <div className="mt-1 break-words text-sm leading-7 text-[#304342]">
                  {selected.operationalProject || '—'}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">
                إغلاق
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
          <div className="space-y-4">
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
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />

              <Input
                label="التحويلة"
                value={form.extension}
                onChange={(e) => setForm((prev) => ({ ...prev, extension: e.target.value }))}
              />

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">الدور</label>
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
                  <option value="manager">مدير</option>
                  <option value="warehouse">مسؤول مخزن</option>
                  <option value="user">موظف</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as 'active' | 'pending' | 'disabled',
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
                >
                  <option value="active">نشط</option>
                  <option value="pending">قيد المراجعة</option>
                  <option value="disabled">معطل</option>
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
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
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