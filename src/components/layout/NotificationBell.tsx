'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  InventoryNotification,
  NOTIFICATIONS_UPDATED_EVENT,
  NOTIFICATION_TOAST_EVENT,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications';

function formatRelativeDate(value: string) {
  try {
    return new Date(value).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function kindLabel(item: InventoryNotification) {
  return item.kind === 'alert' ? 'تنبيه' : 'إشعار';
}

function resolveItemLink(item: InventoryNotification): string {
  const entityType = (item.entityType || '').toLowerCase();

  if (item.link && item.link !== '/notifications') {
    return item.link;
  }

  if (entityType === 'message' && item.entityId) return `/messages?open=${item.entityId}`;
  if (entityType === 'request' && item.entityId) return `/requests?open=${item.entityId}`;
  if (entityType === 'return' && item.entityId) return `/returns?open=${item.entityId}`;
  if (entityType === 'custody' && item.entityId) return `/custody?open=${item.entityId}`;
  if (entityType === 'inventory' && item.entityId) return `/inventory?open=${item.entityId}`;

  return '/notifications';
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

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InventoryNotification[]>([]);
  const [toasts, setToasts] = useState<InventoryNotification[]>([]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const refresh = () => setItems(loadNotifications(userId));
    refresh();

    const handleUpdated = () => refresh();
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<InventoryNotification>).detail;
      if (!detail || detail.userId !== userId) return;
      if (detail.severity === 'critical' || detail.kind === 'alert') return;

      setToasts((prev) => [detail, ...prev].slice(0, 3));

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== detail.id));
      }, 3500);
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

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    if (window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, [open]);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);
  const latestItems = useMemo(() => items.slice(0, 8), [items]);

  const handleOpenItem = (item: InventoryNotification) => {
    if (!item.isRead) {
      markNotificationRead(item.id);
    }
    setOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead(userId);
  };

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#016564] shadow-soft transition hover:border-[#016564]/20 sm:h-12 sm:w-12"
          aria-label="الإشعارات"
          title="الإشعارات"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 16.5h12l-1.5-2V10a4.5 4.5 0 1 0-9 0v4.5l-1.5 2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M10 19a2 2 0 0 0 4 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          {unreadCount > 0 ? (
            <span className="absolute -left-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#7c1e3e] px-1.5 text-[11px] font-bold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <>
            <button
              type="button"
              aria-label="إغلاق قائمة الإشعارات"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[59] bg-slate-950/30 sm:hidden"
            />

            <div className="fixed inset-x-3 bottom-3 top-[88px] z-[60] flex flex-col rounded-[24px] border border-slate-200 bg-white p-3 shadow-2xl sm:absolute sm:left-0 sm:right-auto sm:top-14 sm:inset-x-auto sm:bottom-auto sm:h-auto sm:max-h-[520px] sm:w-[360px] sm:max-w-[92vw]">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-2 pb-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[16px] font-bold text-slate-900">
                    الإشعارات والتنبيهات
                  </h3>
                  <p className="mt-1 text-[12px] text-slate-500">
                    آخر المستجدات المرتبطة بحسابك
                  </p>
                </div>

                {unreadCount > 0 ? (
                  <button
                    onClick={handleMarkAllRead}
                    className="shrink-0 text-[12px] text-[#016564] transition hover:text-[#014b4a]"
                  >
                    تعليم الكل
                  </button>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-1 py-3">
                {latestItems.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-[13px] text-slate-500">
                    لا توجد إشعارات أو تنبيهات حاليًا
                  </div>
                ) : (
                  latestItems.map((item) => (
                    <Link
                      key={item.id}
                      href={resolveItemLink(item)}
                      onClick={() => handleOpenItem(item)}
                      className={`block rounded-[18px] border p-3 transition hover:border-[#016564]/20 ${itemClasses(item)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] leading-none text-slate-700">
                              {kindLabel(item)}
                            </span>
                            {!item.isRead ? (
                              <span className="rounded-full bg-[#016564]/10 px-2 py-1 text-[11px] leading-none text-[#016564]">
                                جديد
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 break-words text-[14px] font-semibold leading-6 text-slate-900">
                            {item.title}
                          </div>
                          <div className="mt-1 break-words text-[12px] leading-6 text-slate-600">
                            {item.message}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        {formatRelativeDate(item.createdAt)}
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 px-2 pt-3 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="text-[13px] text-[#016564]"
                >
                  عرض جميع الإشعارات
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="pointer-events-none fixed left-3 right-3 top-20 z-[70] flex flex-col gap-2 sm:left-4 sm:right-auto sm:w-[340px] sm:max-w-[92vw]">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-[20px] border p-4 shadow-xl ${itemClasses(item)}`}
          >
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <span>{kindLabel(item)}</span>
            </div>
            <div className="mt-1 break-words text-[14px] font-semibold text-slate-900">
              {item.title}
            </div>
            <div className="mt-1 break-words text-[12px] leading-6 text-slate-600">
              {item.message}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}