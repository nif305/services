'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  InventoryNotification,
  NOTIFICATIONS_UPDATED_EVENT,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications';

type FilterKey = 'ALL' | 'UNREAD' | 'ALERT' | 'NOTIFICATION' | 'CRITICAL';

type NotificationMeta = InventoryNotification & {
  entityType?: string;
  entityId?: string;
};

function formatDate(date?: string) {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date;
  }
}

function typeLabel(item: InventoryNotification) {
  return item.kind === 'alert' ? 'تنبيه' : 'إشعار';
}

function severityLabel(item: InventoryNotification) {
  if (item.severity === 'critical') return 'حرج';
  if (item.severity === 'action') return 'إجراء';
  return 'معلوماتي';
}

function itemClasses(item: InventoryNotification) {
  if (item.severity === 'critical') {
    return 'border-[#7c1e3e]/15 bg-[#7c1e3e]/[0.04]';
  }

  if (item.kind === 'alert' || item.severity === 'action') {
    return 'border-[#d0b284]/25 bg-[#d0b284]/[0.10]';
  }

  return 'border-slate-200 bg-white';
}

function resolveItemLink(item: InventoryNotification): string | null {
  const meta = item as NotificationMeta;

  if (item.link && item.link !== '/notifications') {
    return item.link;
  }

  const entityType = (meta.entityType || '').toLowerCase();

  if (entityType === 'message' && meta.entityId) {
    return `/messages?open=${meta.entityId}`;
  }

  if (entityType === 'request' && meta.entityId) {
    return `/requests?open=${meta.entityId}`;
  }

  if (entityType === 'return' && meta.entityId) {
    return `/returns?open=${meta.entityId}`;
  }

  if (entityType === 'custody' && meta.entityId) {
    return `/custody?open=${meta.entityId}`;
  }

  if (entityType === 'inventory' && meta.entityId) {
    return `/inventory?open=${meta.entityId}`;
  }

  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [items, setItems] = useState<InventoryNotification[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const refresh = () => setItems(loadNotifications(user.id));
    refresh();

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [user?.id]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      unread: items.filter((item) => !item.isRead).length,
      alerts: items.filter((item) => item.kind === 'alert').length,
      critical: items.filter((item) => item.severity === 'critical').length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === 'UNREAD') return items.filter((item) => !item.isRead);
    if (filter === 'ALERT') return items.filter((item) => item.kind === 'alert');
    if (filter === 'NOTIFICATION') return items.filter((item) => item.kind === 'notification');
    if (filter === 'CRITICAL') return items.filter((item) => item.severity === 'critical');
    return items;
  }, [filter, items]);

  const handleMarkAllRead = () => {
    if (!user?.id) return;
    markAllNotificationsRead(user.id);
    setItems(loadNotifications(user.id));
  };

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
    if (user?.id) setItems(loadNotifications(user.id));
  };

  const handleOpenItem = (item: InventoryNotification) => {
    const target = resolveItemLink(item);

    if (!target) {
      return;
    }

    if (!item.isRead) {
      markNotificationRead(item.id);
      if (user?.id) {
        setItems(loadNotifications(user.id));
      }
    }

    router.push(target);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-[24px] border border-surface-border bg-white p-4 shadow-soft sm:rounded-[28px] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[24px] leading-[1.25] text-primary sm:text-[30px]">
              الإشعارات والتنبيهات
            </h1>
            <p className="mt-2 text-[13px] leading-7 text-surface-subtle sm:text-[14px]">
              سجل موحد يوضح ما يخصك من مستجدات تشغيلية، واعتمادات، وإرجاعات، وتنبيهات مرتبطة بالمخزون أو العهد.
            </p>
          </div>

          <Button variant="secondary" onClick={handleMarkAllRead} className="w-full sm:w-auto">
            تعليم الكل كمقروء
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4 sm:mt-5 sm:gap-4">
          <Card className="rounded-[20px] border border-slate-200 bg-slate-50 p-3 shadow-none sm:rounded-[22px] sm:p-4">
            <div className="text-[12px] text-slate-600 sm:text-[13px]">إجمالي العناصر</div>
            <div className="mt-2 text-[24px] leading-none text-slate-900 sm:text-[32px]">
              {stats.total}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-3 shadow-none sm:rounded-[22px] sm:p-4">
            <div className="text-[12px] text-emerald-700 sm:text-[13px]">غير المقروء</div>
            <div className="mt-2 text-[24px] leading-none text-slate-900 sm:text-[32px]">
              {stats.unread}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-amber-200 bg-amber-50 p-3 shadow-none sm:rounded-[22px] sm:p-4">
            <div className="text-[12px] text-amber-700 sm:text-[13px]">التنبيهات</div>
            <div className="mt-2 text-[24px] leading-none text-slate-900 sm:text-[32px]">
              {stats.alerts}
            </div>
          </Card>

          <Card className="rounded-[20px] border border-rose-200 bg-rose-50 p-3 shadow-none sm:rounded-[22px] sm:p-4">
            <div className="text-[12px] text-rose-700 sm:text-[13px]">العناصر الحرجة</div>
            <div className="mt-2 text-[24px] leading-none text-slate-900 sm:text-[32px]">
              {stats.critical}
            </div>
          </Card>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
          {[
            { key: 'ALL', label: 'الكل' },
            { key: 'UNREAD', label: 'غير المقروء' },
            { key: 'ALERT', label: 'التنبيهات' },
            { key: 'NOTIFICATION', label: 'الإشعارات' },
            { key: 'CRITICAL', label: 'الحرجة' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as FilterKey)}
              className={`min-h-[42px] rounded-full px-4 py-2 text-sm transition ${
                filter === tab.key
                  ? 'bg-[#016564] text-white'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {filteredItems.length === 0 ? (
          <Card className="rounded-[24px] border border-dashed border-slate-200 p-8 text-center text-slate-500 sm:rounded-[28px] sm:p-10">
            لا توجد عناصر مطابقة لهذا التصنيف
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`rounded-[24px] border p-4 shadow-soft sm:rounded-[28px] sm:p-5 ${itemClasses(item)}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] leading-none text-slate-700">
                      {typeLabel(item)}
                    </span>
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] leading-none text-slate-700">
                      {severityLabel(item)}
                    </span>
                    {!item.isRead ? (
                      <span className="rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] leading-none text-[#016564]">
                        جديد
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 break-words text-[18px] leading-8 text-slate-900 sm:text-[20px]">
                    {item.title}
                  </h2>
                  <p className="mt-2 break-words text-[13px] leading-7 text-slate-600 sm:text-[14px] sm:leading-8">
                    {item.message}
                  </p>
                  <div className="mt-3 text-[12px] leading-6 text-slate-500">
                    {formatDate(item.createdAt)}
                  </div>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                  {!item.isRead ? (
                    <Button
                      variant="secondary"
                      onClick={() => handleMarkRead(item.id)}
                      className="w-full sm:w-auto"
                    >
                      تعليم كمقروء
                    </Button>
                  ) : null}

                  {resolveItemLink(item) ? (
                    <Button
                      onClick={() => handleOpenItem(item)}
                      className="w-full sm:w-auto"
                    >
                      فتح
                    </Button>
                  ) : (
                    <Button disabled className="w-full sm:w-auto">
                      لا يوجد مسار
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}