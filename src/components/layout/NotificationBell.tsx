'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  InventoryNotification,
  NOTIFICATIONS_UPDATED_EVENT,
  NOTIFICATION_TOAST_EVENT,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications';

function isUrgentCenterItem(item: InventoryNotification) {
  const entityType = String(item.entityType || '').toLowerCase();
  return item.severity === 'critical' || item.kind === 'alert' || entityType === 'message';
}

function resolveItemLink(item: InventoryNotification): string | null {
  const entityType = String(item.entityType || '').toLowerCase();

  if (item.link && item.link !== '/notifications') return item.link;
  if (entityType === 'message' && item.entityId) return `/messages?open=${item.entityId}`;
  if (entityType === 'request' && item.entityId) return `/requests?open=${item.entityId}`;
  if (entityType === 'return' && item.entityId) return `/returns?open=${item.entityId}`;
  if (entityType === 'custody' && item.entityId) return `/custody?open=${item.entityId}`;
  if (entityType === 'inventory' && item.entityId) return `/inventory?open=${item.entityId}`;

  return '/notifications';
}

function formatRelative(value?: string | null) {
  if (!value) return '—';
  try {
    const now = Date.now();
    const then = new Date(value).getTime();
    const diff = Math.max(0, now - then);
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `منذ ${minutes || 1} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  } catch {
    return '—';
  }
}

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InventoryNotification[]>([]);
  const [toasts, setToasts] = useState<InventoryNotification[]>([]);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  useEffect(() => {
    const refresh = () => setItems(loadNotifications(userId));
    refresh();

    const handleUpdated = () => refresh();

    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<InventoryNotification>).detail;
      if (!detail || detail.userId !== userId) return;
      if (isUrgentCenterItem(detail)) return;

      setToasts((prev) => [detail, ...prev].slice(0, 3));
      refresh();

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== detail.id));
      }, 5000);
    };

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUpdated);
    window.addEventListener(NOTIFICATION_TOAST_EVENT, handleToast as EventListener);
    window.addEventListener('storage', handleUpdated);

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUpdated);
      window.removeEventListener(NOTIFICATION_TOAST_EVENT, handleToast as EventListener);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [userId]);

  const handleOpenItem = (item: InventoryNotification) => {
    if (!item.isRead) {
      markNotificationRead(item.id);
      setItems(loadNotifications(userId));
    }

    const target = resolveItemLink(item);
    setOpen(false);
    if (target) router.push(target);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#016564] shadow-soft transition hover:border-[#016564]/20 hover:bg-[#f7fbfa]"
        aria-label="الإشعارات"
        title="الإشعارات"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        {unreadCount > 0 ? (
          <span className="absolute -top-1 -left-1 flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#7c1e3e] px-1 text-[11px] text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {toasts.length > 0 ? (
        <div className="pointer-events-none fixed left-4 top-4 z-[96] flex w-[min(92vw,360px)] flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto rounded-[20px] border border-[#d6e4e2] bg-white p-4 shadow-xl"
            >
              <div className="text-sm font-bold text-[#016564]">{toast.title}</div>
              <div className="mt-1 text-xs leading-6 text-slate-600">{toast.message}</div>
            </div>
          ))}
        </div>
      ) : null}

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/10"
            aria-label="إغلاق قائمة الإشعارات"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-[56px] z-50 w-[min(92vw,420px)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <div className="text-sm font-bold text-slate-900">الإشعارات</div>
                <div className="text-xs text-slate-500">{unreadCount} غير مقروءة</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    markAllNotificationsRead(userId);
                    setItems(loadNotifications(userId));
                  }}
                  className="text-xs text-[#016564]"
                >
                  تعليم الكل كمقروء
                </button>

                <Link href="/notifications" className="text-xs text-slate-500" onClick={() => setOpen(false)}>
                  عرض الكل
                </Link>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">لا توجد إشعارات</div>
              ) : (
                items.slice(0, 12).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenItem(item)}
                    className={`block w-full border-b border-slate-100 px-4 py-3 text-right transition hover:bg-slate-50 ${
                      item.isRead ? 'bg-white' : 'bg-[#f8fbfb]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!item.isRead ? <span className="h-2 w-2 rounded-full bg-[#d0b284]" /> : null}
                          <div className="truncate text-sm font-bold text-slate-900">{item.title}</div>
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600">{item.message}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{formatRelative(item.createdAt)}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
