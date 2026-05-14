'use client';

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { type AppLanguage, useAuth } from '@/context/AuthContext';

type RoleValue = 'manager' | 'warehouse' | 'user';
type UserStatus = 'active' | 'disabled';

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
  role: RoleValue;
  roles: RoleValue[];
  preferredLanguage: AppLanguage;
  status: UserStatus;
  createdAt?: string | null;
};

type FormState = {
  fullName: string;
  email: string;
  mobile: string;
  extension: string;
  operationalProject: string;
  hasManagerRole: boolean;
  hasWarehouseRole: boolean;
  preferredLanguage: AppLanguage;
  status: UserStatus;
  password: string;
  confirmPassword: string;
};

type UserStats = {
  total: number;
  active: number;
  disabled: number;
  managers: number;
  warehouses: number;
  usersOnly: number;
};

type PaginationState = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
};

const emptyForm: FormState = {
  fullName: '',
  email: '',
  mobile: '',
  extension: '',
  operationalProject: '',
  hasManagerRole: false,
  hasWarehouseRole: false,
  preferredLanguage: 'ar',
  status: 'active',
  password: '',
  confirmPassword: '',
};

function formatDate(value?: string | null) {
  if (!value) return 'â€”';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return 'â€”';
  }
}

function normalizeArabic(value: string) {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[ط£ط¥ط¢]/g, 'ط§')
    .replace(/ط©/g, 'ظ‡')
    .replace(/ظ‰/g, 'ظٹ')
    .replace(/ط¤/g, 'ظˆ')
    .replace(/ط¦/g, 'ظٹ')
    .replace(/ط،/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeRoles(value: unknown): RoleValue[] {
  const allowed: RoleValue[] = ['user', 'warehouse', 'manager'];

  const incoming = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const normalized = incoming
    .map((item) => String(item).toLowerCase())
    .filter((item): item is RoleValue => allowed.includes(item as RoleValue));

  const set = new Set<RoleValue>(['user', ...normalized]);

  return allowed.filter((role) => set.has(role));
}

function normalizeLanguage(value: unknown): AppLanguage {
  return value === 'en' ? 'en' : 'ar';
}

function languageLabel(language: AppLanguage) {
  return language === 'en' ? 'English' : 'ط§ظ„ط¹ط±ط¨ظٹط©';
}

function getPrimaryRole(roles: RoleValue[]): RoleValue {
  if (roles.includes('manager')) return 'manager';
  if (roles.includes('warehouse')) return 'warehouse';
  return 'user';
}

function roleLabelFromRoles(roles: RoleValue[]) {
  const normalized = normalizeRoles(roles);

  if (normalized.includes('manager') && normalized.includes('warehouse')) {
    return 'ظ…ط¯ظٹط± + ظ…ط³ط¤ظˆظ„ ظ…ط®ط²ظ† + ظ…ظˆط¸ظپ';
  }

  if (normalized.includes('manager')) return 'ظ…ط¯ظٹط± + ظ…ظˆط¸ظپ';
  if (normalized.includes('warehouse')) return 'ظ…ط³ط¤ظˆظ„ ظ…ط®ط²ظ† + ظ…ظˆط¸ظپ';
  return 'ظ…ظˆط¸ظپ';
}

function roleShortBadges(roles: RoleValue[]) {
  const normalized = normalizeRoles(roles);
  const badges: string[] = [];

  if (normalized.includes('manager')) badges.push('ظ…ط¯ظٹط±');
  if (normalized.includes('warehouse')) badges.push('ظ…ط³ط¤ظˆظ„ ظ…ط®ط²ظ†');
  badges.push('ظ…ظˆط¸ظپ');

  return badges;
}

function roleDescriptionFromRoles(roles: RoleValue[]) {
  const normalized = normalizeRoles(roles);

  if (normalized.includes('manager') && normalized.includes('warehouse')) {
    return 'ظ„ظ‡ طµظ„ط§ط­ظٹط© ط§ظ„ط¥ط¯ط§ط±ط© ظˆط§ظ„ظ…ط®ط²ظ†طŒ ظˆظٹط­طھظپط¸ ط¯ط§ط¦ظ…ظ‹ط§ ط¨طµظ„ط§ط­ظٹط© ط§ظ„ظ…ظˆط¸ظپ ط¯ط§ط®ظ„ ط§ظ„ظ…ظ†طµط©.';
  }

  if (normalized.includes('manager')) {
    return 'ظ„ظ‡ طµظ„ط§ط­ظٹط© ط§ظ„ط¥ط¯ط§ط±ط©طŒ ظˆظٹط­طھظپط¸ ط¨ط¥ظ…ظƒط§ظ†ظٹط© ط§ظ„ط¹ظ…ظ„ ظƒظ…ظˆط¸ظپ ط¯ط§ط®ظ„ ط§ظ„ظ…ظ†طµط©.';
  }

  if (normalized.includes('warehouse')) {
    return 'ظ„ظ‡ طµظ„ط§ط­ظٹط© ط§ظ„ظ…ط®ط²ظ†طŒ ظˆظٹط­طھظپط¸ ط¨ط¥ظ…ظƒط§ظ†ظٹط© ط§ظ„ط¹ظ…ظ„ ظƒظ…ظˆط¸ظپ ط¯ط§ط®ظ„ ط§ظ„ظ…ظ†طµط©.';
  }

  return 'ظٹط¹ظ…ظ„ ط¨طµظ„ط§ط­ظٹط§طھ ط§ظ„ظ…ظˆط¸ظپ ظپظ‚ط·.';
}

function statusLabel(status: UserStatus) {
  return status === 'active' ? 'ظ†ط´ط·' : 'ظ…ظˆظ‚ظˆظپ';
}

function statusVariant(status: UserStatus): 'success' | 'danger' {
  return status === 'active' ? 'success' : 'danger';
}

function normalizeUser(row: any): UserRow {
  const roles = normalizeRoles(row?.roles ?? row?.role);

  return {
    id: row?.id || '',
    employeeId: row?.employeeId,
    fullName: row?.fullName || '',
    email: row?.email || '',
    mobile: row?.mobile ?? '',
    extension: row?.extension ?? '',
    department: row?.department ?? '',
    jobTitle: row?.jobTitle ?? '',
    operationalProject: row?.operationalProject ?? '',
    role: getPrimaryRole(roles),
    roles,
    preferredLanguage: normalizeLanguage(row?.preferredLanguage),
    status: row?.status === 'disabled' ? 'disabled' : 'active',
    createdAt: row?.createdAt ?? null,
  };
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
      <div className="mt-1 text-sm text-[#243635]">{value || 'â€”'}</div>
    </div>
  );
}

export default function UsersPage() {
  const { user, refreshUsers } = useAuth();
  const isManager = user?.role === 'manager';

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'manager' | 'warehouse' | 'user'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'disabled'>('ALL');
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    disabled: 0,
    managers: 0,
    warehouses: 0,
    usersOnly: 0,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 5,
  });

  const [selected, setSelected] = useState<UserRow | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (deferredSearch.trim()) params.set('search', deferredSearch.trim());
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      const nextRows = Array.isArray(data?.data) ? data.data.map(normalizeUser) : [];
      const nextPagination: PaginationState = {
        page: Number(data?.pagination?.page || pagination.page),
        totalPages: Number(data?.pagination?.totalPages || 1),
        total: Number(data?.pagination?.total || nextRows.length),
        limit: Number(data?.pagination?.limit || pagination.limit),
      };

      if (pagination.page > nextPagination.totalPages && nextPagination.totalPages > 0) {
        setPagination((prev) => ({ ...prev, page: nextPagination.totalPages }));
        return;
      }

      setRows(nextRows);
      setStats({
        total: Number(data?.stats?.total || 0),
        active: Number(data?.stats?.active || 0),
        disabled: Number(data?.stats?.disabled || 0),
        managers: Number(data?.stats?.managers || 0),
        warehouses: Number(data?.stats?.warehouses || 0),
        usersOnly: Number(data?.stats?.usersOnly || 0),
      });
      setPagination(nextPagination);
    } catch {
      setRows([]);
      setStats({
        total: 0,
        active: 0,
        disabled: 0,
        managers: 0,
        warehouses: 0,
        usersOnly: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [deferredSearch, pagination.limit, pagination.page, roleFilter, statusFilter]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [deferredSearch, roleFilter, statusFilter]);

  const filteredRows = useMemo(() => rows, [rows]);

  const openEdit = (row: UserRow) => {
    setEditing(row);
    setForm({
      fullName: row.fullName || '',
      email: row.email || '',
      mobile: row.mobile || '',
      extension: row.extension || '',
      operationalProject: row.operationalProject || row.department || '',
      hasManagerRole: row.roles.includes('manager'),
      hasWarehouseRole: row.roles.includes('warehouse'),
      preferredLanguage: row.preferredLanguage || 'ar',
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
      alert('ط§ظ„ط§ط³ظ… ظˆط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ط·ظ„ظˆط¨ط§ظ†');
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      alert('ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظˆطھط£ظƒظٹط¯ظ‡ط§ ط؛ظٹط± ظ…طھط·ط§ط¨ظ‚ظٹظ†');
      return;
    }

    setSaving(true);

    try {
      const roles: RoleValue[] = ['user'];
      if (form.hasWarehouseRole) roles.push('warehouse');
      if (form.hasManagerRole) roles.push('manager');

      const payload: Record<string, string | string[]> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        extension: form.extension.trim(),
        operationalProject: form.operationalProject.trim(),
        preferredLanguage: form.preferredLanguage,
        status: form.status,
        roles,
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
        alert(data?.error || 'طھط¹ط°ط± ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ');
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
        alert(data?.error || 'طھط¹ط°ط± طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ط­ط³ط§ط¨');
        return;
      }

      await fetchUsers();
      await refreshUsers();

      if (selected?.id === row.id) {
        setSelected((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
    } catch {
      alert('طھط¹ط°ط± طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ط­ط³ط§ط¨');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  if (!isManager) {
    return (
      <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-700 sm:rounded-[26px]">
        ط؛ظٹط± ظ…طµط±ط­ ظ„ظƒ ط¨ط§ظ„ظˆطµظˆظ„ ظ„ظ‡ط°ظ‡ ط§ظ„طµظپط­ط©
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
                ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ†
              </h1>
              <p className="max-w-3xl text-[13px] leading-7 text-[#536463] sm:text-sm">
                ظ„ظˆط­ط© ط£ظƒط«ط± ظˆط¶ظˆط­ظ‹ط§ ظ„ط¥ط¯ط§ط±ط© ط§ظ„ط­ط³ط§ط¨ط§طھطŒ ظ…ط¹ ط¥ط¨ط±ط§ط² ط£ظ† ط§ظ„ظ…ط¯ظٹط± ظˆظ…ط³ط¤ظˆظ„ ط§ظ„ظ…ط®ط²ظ† ظٹط­طھظپط¸ط§ظ† ط¯ط§ط¦ظ…ظ‹ط§
                ط¨ط¯ظˆط± ط§ظ„ظ…ظˆط¸ظپ ط¯ط§ط®ظ„ ط§ظ„ظ…ظ†طµط©.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatCard
                title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط­ط³ط§ط¨ط§طھ"
                value={stats.total}
                accent="bg-[#016564]"
                active={roleFilter === 'ALL' && statusFilter === 'ALL'}
                onClick={() => {
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }}
              />
              <StatCard
                title="ط§ظ„ظ…ط¯ظٹط±ظˆظ†"
                value={stats.managers}
                accent="bg-[#d0b284]"
                active={roleFilter === 'manager'}
                onClick={() => setRoleFilter('manager')}
              />
              <StatCard
                title="ظ…ط³ط¤ظˆظ„ظˆ ط§ظ„ظ…ط®ط²ظ†"
                value={stats.warehouses}
                accent="bg-[#498983]"
                active={roleFilter === 'warehouse'}
                onClick={() => setRoleFilter('warehouse')}
              />
              <StatCard
                title="ط§ظ„ظ…ظˆط¸ظپظˆظ† ظپظ‚ط·"
                value={stats.usersOnly}
                accent="bg-[#98aaaa]"
                active={roleFilter === 'user'}
                onClick={() => setRoleFilter('user')}
              />
              <StatCard
                title="ط§ظ„ط­ط³ط§ط¨ط§طھ ط§ظ„ظ†ط´ط·ط©"
                value={stats.active}
                accent="bg-emerald-500"
                active={statusFilter === 'active'}
                onClick={() => setStatusFilter('active')}
              />
              <StatCard
                title="ط§ظ„ط­ط³ط§ط¨ط§طھ ط§ظ„ظ…ظˆظ‚ظˆظپط©"
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
              label="ط¨ط­ط«"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ط§ظ„ط§ط³ظ…طŒ ط§ظ„ط¨ط±ظٹط¯طŒ ط§ظ„ط¬ظˆط§ظ„طŒ ط§ظ„طھط­ظˆظٹظ„ط©طŒ ط£ظˆ ط§ظ„ظ…ط´ط±ظˆط¹"
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">ط§ظ„ط¯ظˆط±</label>
              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as 'ALL' | 'manager' | 'warehouse' | 'user')
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
              >
                <option value="ALL">ط§ظ„ظƒظ„</option>
                <option value="manager">ظٹظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ظ…ط¯ظٹط±</option>
                <option value="warehouse">ظٹظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ظ…ط³ط¤ظˆظ„ ظ…ط®ط²ظ†</option>
                <option value="user">ظ…ظˆط¸ظپ ظپظ‚ط·</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">ط§ظ„ط­ط§ظ„ط©</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'active' | 'disabled')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
              >
                <option value="ALL">ط§ظ„ظƒظ„</option>
                <option value="active">ظ†ط´ط·</option>
                <option value="disabled">ظ…ظˆظ‚ظˆظپ</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="ghost" className="w-full xl:w-auto" onClick={clearFilters}>
                ط¥ط¹ط§ط¯ط© ط§ظ„ط¶ط¨ط·
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white shadow-sm sm:rounded-[28px]">
        <div className="flex flex-col gap-2 border-b border-[#edf1f0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <div className="text-[18px] font-bold text-[#152625]">ظ‚ط§ط¦ظ…ط© ط§ظ„ط­ط³ط§ط¨ط§طھ</div>
            <div className="mt-1 text-sm text-[#61706f]">
              {loading ? 'ط¬ط§ط±ظچ طھط­ظ…ظٹظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ...' : `ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ†طھط§ط¦ط¬ ط§ظ„ظ…ط·ط§ط¨ظ‚ط©: ${pagination.total}`}
            </div>
          </div>
          <div className="text-xs text-[#61706f]">
            ط§ظ„طµظ„ط§ط­ظٹط§طھ ط§ظ„ط¥ط¶ط§ظپظٹط© طھط¸ظ‡ط± ظپظˆظ‚ طµظ„ط§ط­ظٹط© ط§ظ„ظ…ظˆط¸ظپ ط§ظ„ط£ط³ط§ط³ظٹط©.
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
            <div className="p-8 text-center text-sm text-[#61706f]">ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬ ظ…ط·ط§ط¨ظ‚ط©</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#edf1f0]">
                <thead className="bg-[#fbfcfc]">
                  <tr className="text-right text-sm text-[#61706f]">
                    <th className="px-5 py-4 font-semibold">ط§ظ„ظ…ط³طھط®ط¯ظ…</th>
                    <th className="px-5 py-4 font-semibold">ط§ظ„طµظ„ط§ط­ظٹط§طھ</th>
                    <th className="px-5 py-4 font-semibold">ط§ظ„ط­ط§ظ„ط©</th>
                    <th className="px-5 py-4 font-semibold">ط§ظ„طھظˆط§طµظ„</th>
                    <th className="px-5 py-4 font-semibold">ط§ظ„ظ…ط´ط±ظˆط¹</th>
                    <th className="px-5 py-4 font-semibold">ط§ظ„ط¥ظ†ط´ط§ط،</th>
                    <th className="px-5 py-4 font-semibold">ط§ظ„ط¥ط¬ط±ط§ط،ط§طھ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f0]">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="align-top transition hover:bg-[#fcfdfd]">
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#152625]">{row.fullName}</div>
                        <div className="mt-1 break-all text-sm text-[#61706f]">{row.email}</div>
                        <div className="mt-1 text-xs text-[#91a09f]">{row.jobTitle || 'â€”'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {roleShortBadges(row.roles).map((badge) => (
                            <Badge key={`${row.id}-${badge}`} variant={badge === 'ظ…ظˆط¸ظپ' ? 'success' : 'info'}>
                              {badge}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-[#61706f]">
                          {roleDescriptionFromRoles(row.roles)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#304342]">
                        <div>ط§ظ„ط¬ظˆط§ظ„: {row.mobile || 'â€”'}</div>
                        <div className="mt-1">ط§ظ„طھط­ظˆظٹظ„ط©: {row.extension || 'â€”'}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#304342]">
                        {row.operationalProject || row.department || 'â€”'}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#304342]">{formatDate(row.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" className="!px-4" onClick={() => setSelected(row)}>
                            ط¹ط±ط¶
                          </Button>
                          <Button className="!px-4" onClick={() => openEdit(row)}>
                            طھط¹ط¯ظٹظ„
                          </Button>
                          <Button
                            variant={row.status === 'active' ? 'danger' : 'secondary'}
                            className="!px-4"
                            onClick={() => quickToggleStatus(row)}
                          >
                            {row.status === 'active' ? 'ط¥ظٹظ‚ط§ظپ' : 'طھظ†ط´ظٹط·'}
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
              ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬ ظ…ط·ط§ط¨ظ‚ط©
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
                      {roleShortBadges(row.roles).map((badge) => (
                        <Badge key={`${row.id}-mobile-${badge}`} variant={badge === 'ظ…ظˆط¸ظپ' ? 'success' : 'info'}>
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoPill label="ط§ظ„ط¬ظˆط§ظ„" value={row.mobile || 'â€”'} />
                    <InfoPill label="ط§ظ„طھط­ظˆظٹظ„ط©" value={row.extension || 'â€”'} />
                    <InfoPill label="ط§ظ„ظ…ط´ط±ظˆط¹" value={row.operationalProject || row.department || 'â€”'} />
                    <InfoPill label="طھط§ط±ظٹط® ط§ظ„ط¥ظ†ط´ط§ط،" value={formatDate(row.createdAt)} />
                  </div>

                  <div className="rounded-2xl border border-[#edf1f0] bg-[#fbfcfc] px-3 py-3 text-sm text-[#556867]">
                    {roleDescriptionFromRoles(row.roles)}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button variant="ghost" className="w-full" onClick={() => setSelected(row)}>
                      ط¹ط±ط¶
                    </Button>
                    <Button className="w-full" onClick={() => openEdit(row)}>
                      طھط¹ط¯ظٹظ„
                    </Button>
                    <Button
                      variant={row.status === 'active' ? 'danger' : 'secondary'}
                      className="w-full"
                      onClick={() => quickToggleStatus(row)}
                    >
                      {row.status === 'active' ? 'ط¥ظٹظ‚ط§ظپ ط§ظ„ط­ط³ط§ط¨' : 'طھظ†ط´ظٹط· ط§ظ„ط­ط³ط§ط¨'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {!loading && pagination.totalPages > 1 ? (
          <div className="border-t border-[#edf1f0] px-4 py-4 sm:px-5">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="text-sm font-bold text-[#016564]">
                ط§ظ„طµظپط­ط© {pagination.page} ظ…ظ† {pagination.totalPages}
              </div>
              <div className="text-xs text-[#61706f]">ط¹ط¯ط¯ ط§ظ„ط³ط¬ظ„ط§طھ ظپظٹ ظ‡ط°ط§ ط§ظ„ط¹ط±ط¶: {pagination.total}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page <= 1}
                  className="rounded-full border border-[#d6d7d4] px-4 py-2 text-sm font-bold text-[#425554] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ط§ظ„ط³ط§ط¨ظ‚
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-full border border-[#d6d7d4] px-4 py-2 text-sm font-bold text-[#425554] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ط§ظ„طھط§ظ„ظٹ
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `طھظپط§طµظٹظ„ ط§ظ„ظ…ط³طھط®ط¯ظ…: ${selected.fullName}` : 'طھظپط§طµظٹظ„ ط§ظ„ظ…ط³طھط®ط¯ظ…'}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoPill label="ط§ظ„ط§ط³ظ…" value={selected.fullName} />
              <InfoPill label="ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ" value={selected.email} />
              <InfoPill label="ط§ظ„طµظ„ط§ط­ظٹط§طھ" value={roleLabelFromRoles(selected.roles)} />
              <InfoPill label="ط§ظ„ط­ط§ظ„ط©" value={statusLabel(selected.status)} />
              <InfoPill label="ظ„ط؛ط© ط§ظ„ظˆط§ط¬ظ‡ط©" value={languageLabel(selected.preferredLanguage)} />
              <InfoPill label="ط§ظ„ط¬ظˆط§ظ„" value={selected.mobile || 'â€”'} />
              <InfoPill label="ط§ظ„طھط­ظˆظٹظ„ط©" value={selected.extension || 'â€”'} />
              <div className="sm:col-span-2">
                <InfoPill
                  label="ط§ظ„ظ…ط´ط±ظˆط¹ ط§ظ„طھط´ط؛ظٹظ„ظٹ"
                  value={selected.operationalProject || selected.department || 'â€”'}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#edf1f0] bg-[#fbfcfc] px-4 py-3 text-sm text-[#556867]">
              {roleDescriptionFromRoles(selected.roles)}
            </div>

            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <Button variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">
                ط¥ط؛ظ„ط§ظ‚
              </Button>

              <Button
                variant={selected.status === 'active' ? 'danger' : 'secondary'}
                onClick={async () => {
                  await quickToggleStatus(selected);
                  setSelected(null);
                }}
                className="w-full sm:w-auto"
              >
                {selected.status === 'active' ? 'ط¥ظٹظ‚ط§ظپ ط§ظ„ط­ط³ط§ط¨' : 'طھظ†ط´ظٹط· ط§ظ„ط­ط³ط§ط¨'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!editing}
        onClose={closeEdit}
        title={editing ? `طھط¹ط¯ظٹظ„ ط§ظ„ظ…ط³طھط®ط¯ظ…: ${editing.fullName}` : 'طھط¹ط¯ظٹظ„ ط§ظ„ظ…ط³طھط®ط¯ظ…'}
      >
        {editing ? (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-[#d6d7d4] bg-[#fbfcfc] px-4 py-4 text-sm text-[#556867]">
              <div className="font-bold text-[#016564]">ظ…ظ„ط§ط­ط¸ط© ط§ظ„طµظ„ط§ط­ظٹط§طھ</div>
              <div className="mt-2 leading-7">
                ط§ظ„ظ…ظˆط¸ظپ ظٹظ…ظ„ظƒ ط¯ط§ط¦ظ…ظ‹ط§ طµظ„ط§ط­ظٹط© <span className="font-bold">ظ…ظˆط¸ظپ</span> ظƒط£ط³ط§ط³ ط«ط§ط¨طھطŒ
                ظˆظٹظ…ظƒظ† ط¥ط¶ط§ظپط© طµظ„ط§ط­ظٹط© <span className="font-bold">ظ…ط¯ظٹط±</span> ظˆ/ط£ظˆ طµظ„ط§ط­ظٹط©
                <span className="font-bold"> ظ…ط³ط¤ظˆظ„ ظ…ط®ط²ظ†</span> ظپظˆظ‚ظ‡ط§ ط¨ط­ط³ط¨ ط§ظ„ط­ط§ط¬ط©.
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="ط§ظ„ط§ط³ظ…"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              />

              <Input
                label="ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />

              <Input
                label="ط§ظ„ط¬ظˆط§ظ„"
                value={form.mobile}
                onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
              />

              <Input
                label="ط§ظ„طھط­ظˆظٹظ„ط©"
                value={form.extension}
                onChange={(e) => setForm((prev) => ({ ...prev, extension: e.target.value }))}
              />

              <div className="space-y-2 sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">ط§ظ„طµظ„ط§ط­ظٹط§طھ ط§ظ„ط¥ط¶ط§ظپظٹط©</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      checked={form.hasManagerRole}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, hasManagerRole: e.target.checked }))
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#016564] focus:ring-[#016564]"
                    />
                    <div>
                      <div className="text-sm font-bold text-[#152625]">ظ…ط¯ظٹط±</div>
                      <div className="mt-1 text-xs leading-6 text-[#61706f]">
                        ظٹط¶ظٹظپ طµظ„ط§ط­ظٹط§طھ ط§ظ„ط¥ط¯ط§ط±ط© ظ…ط¹ ط¨ظ‚ط§ط، طµظ„ط§ط­ظٹط© ط§ظ„ظ…ظˆط¸ظپ.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      checked={form.hasWarehouseRole}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, hasWarehouseRole: e.target.checked }))
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#016564] focus:ring-[#016564]"
                    />
                    <div>
                      <div className="text-sm font-bold text-[#152625]">ظ…ط³ط¤ظˆظ„ ظ…ط®ط²ظ†</div>
                      <div className="mt-1 text-xs leading-6 text-[#61706f]">
                        ظٹط¶ظٹظپ طµظ„ط§ط­ظٹط§طھ ط§ظ„طµط±ظپ ظˆط§ظ„ط§ط³طھظ„ط§ظ… ظ…ط¹ ط¨ظ‚ط§ط، طµظ„ط§ط­ظٹط© ط§ظ„ظ…ظˆط¸ظپ.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="rounded-2xl border border-[#edf1f0] bg-[#fbfcfc] px-4 py-3 text-sm text-[#556867]">
                  ط§ظ„طµظ„ط§ط­ظٹط© ط§ظ„ظ†ظ‡ط§ط¦ظٹط© ظ„ظ‡ط°ط§ ط§ظ„ظ…ط³طھط®ط¯ظ…: {roleLabelFromRoles([
                    'user',
                    ...(form.hasWarehouseRole ? ['warehouse' as const] : []),
                    ...(form.hasManagerRole ? ['manager' as const] : []),
                  ])}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">ط§ظ„ط­ط§ظ„ط©</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as UserStatus,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
                >
                  <option value="active">ظ†ط´ط·</option>
                  <option value="disabled">ظ…ظˆظ‚ظˆظپ</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="ط§ظ„ظ…ط´ط±ظˆط¹ ط§ظ„طھط´ط؛ظٹظ„ظٹ"
                  value={form.operationalProject}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, operationalProject: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">ظ„ط؛ط© ط§ظ„ظˆط§ط¬ظ‡ط©</label>
                <select
                  value={form.preferredLanguage}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      preferredLanguage: normalizeLanguage(e.target.value),
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#016564] focus:ring-4 focus:ring-[#016564]/10"
                >
                  <option value="ar">ط§ظ„ط¹ط±ط¨ظٹط©</option>
                  <option value="en">English</option>
                </select>
              </div>

              <Input
                label="ظƒظ„ظ…ط© ظ…ط±ظˆط± ط¬ط¯ظٹط¯ط©"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="ط§طھط±ظƒظ‡ ظپط§ط±ط؛ظ‹ط§ ط¥ط°ط§ ظ„ط§ طھط±ظٹط¯ طھط؛ظٹظٹط±ظ‡ط§"
              />

              <Input
                label="طھط£ظƒظٹط¯ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط¬ط¯ظٹط¯ط©"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="ط£ط¹ط¯ ظƒطھط§ط¨ط© ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#edf1f0] pt-4 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={closeEdit} className="w-full sm:w-auto">
                ط¥ظ„ط؛ط§ط،
              </Button>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? 'ط¬ط§ط±ظچ ط§ظ„ط­ظپط¸...' : 'ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

