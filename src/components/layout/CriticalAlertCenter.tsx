'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  InventoryNotification,
  NOTIFICATIONS_UPDATED_EVENT,
  NOTIFICATION_TOAST_EVENT,
  loadNotifications,
  markNotificationRead,
} from '@/lib/notifications';

function isUrgentCenterItem(item: InventoryNotification) {
  const entityType = String(item.entityType || '').toLowerCase();
  return item.severity === 'critical' || item.kind === 'alert' || entityType === 'message';
}

function resolveItemLink(item: InventoryNotification): string | null {
  const entityType = (item.entityType || '').toLowerCase();

  if (item.link && item.link !== '/notifications') {
    return item.link;
  }

  if (entityType === 'message' && item.entityId) return `/messages?open=${item.entityId}`;
  if (entityType === 'request' && item.entityId) return `/requests?open=${item.entityId}`;
  if (entityType === 'return' && item.entityId) return `/returns?open=${item.entityId}`;
  if (entityType === 'custody' && item.entityId) return `/custody?open=${item.entityId}`;
  if (entityType === 'inventory' && item.entityId) return `/inventory?open=${item.entityId}`;
  if (entityType === 'suggestion' && item.entityId) return '/dashboard';

  return '/notifications';
}

function getUrgentLabel(item: InventoryNotification) {
  const entityType = String(item.entityType || '').toLowerCase();
  if (entityType === 'message') return 'رسالة داخلية مهمة';
  if (item.severity === 'critical') return 'تنبيه مهم وعاجل';
  return 'تنبيه يحتاج انتباهًا مباشرًا';
}

function getUrgentNote(item: InventoryNotification) {
  const entityType = String(item.entityType || '').toLowerCase();
  if (entityType === 'message') {
    return 'هذه الرسالة الداخلية عُدّت ذات أولوية عالية، لذلك تظهر مباشرة عند فتح النظام حتى لا تفوتك.';
  }
  return 'سيبقى هذا التنبيه ظاهرًا حتى تطّلع عليه أو تفتح العنصر المرتبط به.';
}

export function CriticalAlertCenter({ userId }: { userId: string }) {
  const router = useRouter();
  const [active, setActive] = useState<InventoryNotification | null>(null);

  const unreadUrgent = useMemo(() => {
    return loadNotifications(userId).find((item) => !item.isRead && isUrgentCenterItem(item)) || null;
  }, [userId]);

  useEffect(() => {
    if (unreadUrgent && !active) {
      setActive(unreadUrgent);
    }
  }, [unreadUrgent, active]);

  useEffect(() => {
    const handleUpdated = () => {
      const nextUrgent =
        loadNotifications(userId).find((item) => !item.isRead && isUrgentCenterItem(item)) || null;
      setActive((current) => current || nextUrgent);
    };

    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<InventoryNotification>).detail;
      if (!detail || detail.userId !== userId) return;
      if (isUrgentCenterItem(detail)) {
        setActive(detail);
      }
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
    if (!active || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        markNotificationRead(active.id);
        setActive(null);
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = originalOverflow || '';
      window.removeEventListener('keydown', onEscape);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0b1716]/65 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#7c1e3e]/20 bg-white shadow-2xl">
        <div className="border-b border-[#ead7dd] bg-[#7c1e3e]/[0.05] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[#7c1e3e]">{getUrgentLabel(active)}</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{active.title}</div>
            </div>
            <span className="rounded-full bg-[#7c1e3e]/10 px-3 py-1 text-xs text-[#7c1e3e]">يتطلب انتباهًا مباشرًا</span>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p className="text-sm leading-8 text-slate-700">{active.message}</p>

          <div className="rounded-[20px] border border-[#efe7e9] bg-[#faf7f8] px-4 py-3 text-xs leading-7 text-slate-500">
            {getUrgentNote(active)}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                markNotificationRead(active.id);
                setActive(null);
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              إغلاق واعتباره مقروءًا
            </button>

            <button
              type="button"
              onClick={() => {
                const target = resolveItemLink(active);
                markNotificationRead(active.id);
                setActive(null);
                if (target) router.push(target);
              }}
              className="rounded-2xl bg-[#016564] px-4 py-3 text-sm text-white transition hover:bg-[#014f4e]"
            >
              فتح العنصر الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
