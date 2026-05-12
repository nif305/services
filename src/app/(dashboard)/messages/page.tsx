'use client';

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

type RelatedType = 'REQUEST' | 'RETURN' | 'CUSTODY' | 'MAINTENANCE' | 'PURCHASE' | 'OTHER';

type MessageItem = {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string;
  body: string;
  relatedType?: RelatedType | null;
  relatedId?: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; fullName?: string; role?: string | null; email?: string | null } | null;
  receiver?: { id: string; fullName?: string; role?: string | null; email?: string | null } | null;
};

type MessageStats = {
  total: number;
  unread: number;
};

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function formatDate(date?: string) {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString('ar-SA');
  } catch {
    return date;
  }
}

const relatedTypeLabels: Record<RelatedType, string> = {
  REQUEST: 'طلب مواد',
  RETURN: 'إرجاع',
  CUSTODY: 'عهدة',
  MAINTENANCE: 'صيانة',
  PURCHASE: 'شراء مباشر',
  OTHER: 'طلب آخر',
};

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const { user, allUsers } = useAuth();
  const [activeBox, setActiveBox] = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [stats, setStats] = useState<MessageStats>({ total: 0, unread: 0 });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MessageItem | null>(null);
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [receiverId, setReceiverId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [relatedType, setRelatedType] = useState<RelatedType | ''>('');
  const [relatedId, setRelatedId] = useState('');
  const [error, setError] = useState('');
  const deferredSearch = useDeferredValue(search);
  const openMessageId = searchParams.get('open') || '';

  const fetchMessages = async (box = activeBox, page = pagination.page) => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const params = new URLSearchParams({
        box,
        page: String(page),
        limit: String(pagination.limit),
      });

      if (deferredSearch.trim()) {
        params.set('search', deferredSearch.trim());
      }

      if (openMessageId) {
        params.set('open', openMessageId);
      }

      const response = await fetch(`/api/messages?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await response.json().catch(() => null);
      const rows = Array.isArray(json?.data) ? json.data : [];
      const nextPagination: PaginationState = {
        page: Number(json?.pagination?.page || page || 1),
        limit: Number(json?.pagination?.limit || pagination.limit || 5),
        total: Number(json?.pagination?.total || 0),
        totalPages: Math.max(1, Number(json?.pagination?.totalPages || 1)),
      };

      if (page > nextPagination.totalPages && nextPagination.totalPages > 0) {
        setPagination((prev) => ({ ...prev, page: nextPagination.totalPages }));
        return;
      }

      setMessages(rows);
      setStats({
        total: Number(json?.stats?.total || 0),
        unread: Number(json?.stats?.unread || 0),
      });
      setPagination(nextPagination);

      const focusMessage =
        (json?.focusMessage as MessageItem | null | undefined) ||
        (openMessageId ? rows.find((message: MessageItem) => message.id === openMessageId) : null);

      if (focusMessage) {
        setSelected(focusMessage);
      }
    } catch {
      setMessages([]);
      setStats({ total: 0, unread: 0 });
      setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    void fetchMessages(activeBox, pagination.page);
  }, [user?.id, activeBox, pagination.page, pagination.limit, deferredSearch, openMessageId]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [activeBox, deferredSearch]);

  const recipients = useMemo(
    () => allUsers.filter((item) => item.id !== user?.id && item.status === 'active'),
    [allUsers, user?.id]
  );

  const openMessage = async (message: MessageItem) => {
    setSelected(message);

    if (activeBox !== 'inbox' || message.isRead || !user?.id) {
      return;
    }

    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: message.id }),
    }).catch(() => null);

    setMessages((prev) =>
      prev.map((item) => (item.id === message.id ? { ...item, isRead: true } : item))
    );
    setSelected((prev) => (prev?.id === message.id ? { ...prev, isRead: true } : prev));
    setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">
              المراسلات الداخلية
            </h1>
            <p className="mt-2 text-[13px] leading-7 text-[#61706f] sm:text-sm">
              مراسلات داخلية حقيقية بين مستخدمي المنصة، مرتبطة بالطلبات والعمليات عند الحاجة.
            </p>
          </div>
          <Button onClick={() => setComposeOpen(true)}>رسالة جديدة</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveBox('inbox')}
            className={`rounded-full px-4 py-2 text-sm ${
              activeBox === 'inbox' ? 'bg-[#016564] text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            الوارد
          </button>
          <button
            type="button"
            onClick={() => setActiveBox('sent')}
            className={`rounded-full px-4 py-2 text-sm ${
              activeBox === 'sent' ? 'bg-[#016564] text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            الصادر
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-[#425554]">
          <div className="rounded-full bg-[#f4faf9] px-4 py-2 text-[#016564]">إجمالي الرسائل: {stats.total}</div>
          {activeBox === 'inbox' ? (
            <div className="rounded-full bg-[#d0b284]/15 px-4 py-2 text-[#8a6a28]">غير المقروءة: {stats.unread}</div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <Input
          label="بحث"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="العنوان، النص، الرقم المرجعي، أو اسم الطرف الآخر"
        />
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-28 w-full rounded-[24px]" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">
            لا توجد مراسلات مطابقة
          </Card>
        ) : (
          messages.map((message) => {
            const otherParty = activeBox === 'inbox' ? message.sender : message.receiver;

            return (
              <Card key={message.id} className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {!message.isRead && activeBox === 'inbox' ? (
                        <span className="rounded-full bg-[#7c1e3e]/10 px-3 py-1 text-[11px] text-[#7c1e3e]">
                          غير مقروءة
                        </span>
                      ) : null}
                      {message.relatedType ? (
                        <span className="rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] text-[#016564]">
                          {relatedTypeLabels[message.relatedType]}
                        </span>
                      ) : null}
                      {message.relatedId ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700">
                          {message.relatedId}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-bold text-[#152625]">{message.subject}</h3>
                    <p className="text-sm leading-7 text-[#61706f] line-clamp-2">{message.body}</p>
                    <div className="grid gap-2 text-sm text-[#425554] sm:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <span className="font-semibold text-[#016564]">{activeBox === 'inbox' ? 'من' : 'إلى'}: </span>
                        {otherParty?.fullName || '—'}
                      </div>
                      <div>
                        <span className="font-semibold text-[#016564]">الدور: </span>
                        {otherParty?.role || '—'}
                      </div>
                      <div>
                        <span className="font-semibold text-[#016564]">التاريخ: </span>
                        {formatDate(message.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 lg:w-auto">
                    <Button className="w-full lg:w-36" onClick={() => openMessage(message)}>
                      فتح الرسالة
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </section>

      {!loading && pagination.totalPages > 1 ? (
        <section className="flex items-center justify-between rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
            disabled={pagination.page <= 1}
            className="rounded-full border border-[#d6d7d4] px-4 py-2 text-sm font-bold text-[#425554] disabled:cursor-not-allowed disabled:opacity-40"
          >
            السابق
          </button>
          <div className="text-center">
            <div className="text-sm font-bold text-[#016564]">
              الصفحة {pagination.page} من {pagination.totalPages}
            </div>
            <div className="text-xs text-slate-500">إجمالي الرسائل في هذا العرض: {pagination.total}</div>
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

      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="رسالة داخلية جديدة" size="lg">
        <div className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#425554]">إلى</label>
            <select
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              className="w-full rounded-2xl border border-[#d6d7d4] bg-white px-4 py-3 text-sm outline-none focus:border-[#016564]"
            >
              <option value="">اختر المستلم</option>
              {recipients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName} — {item.role}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="الموضوع"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="عنوان مختصر وواضح"
          />
          <Textarea
            label="نص الرسالة"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب الرسالة هنا"
            rows={7}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#425554]">النوع المرتبط</label>
              <select
                value={relatedType}
                onChange={(e) => setRelatedType(e.target.value as RelatedType | '')}
                className="w-full rounded-2xl border border-[#d6d7d4] bg-white px-4 py-3 text-sm outline-none focus:border-[#016564]"
              >
                <option value="">بدون ربط</option>
                {Object.entries(relatedTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="الرقم المرجعي"
              value={relatedId}
              onChange={(e) => setRelatedId(e.target.value)}
              placeholder="مثال: MNT-2026-0004"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setComposeOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={async () => {
                setError('');
                if (!user?.id || !receiverId || !subject.trim() || !body.trim()) {
                  setError('يرجى تعبئة المستلم والموضوع ونص الرسالة');
                  return;
                }

                const response = await fetch('/api/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    receiverId,
                    subject: subject.trim(),
                    body: body.trim(),
                    relatedType: relatedType || undefined,
                    relatedId: relatedId.trim() || undefined,
                  }),
                });
                const json = await response.json().catch(() => null);

                if (!response.ok) {
                  setError(json?.error || 'تعذر إرسال الرسالة');
                  return;
                }

                setComposeOpen(false);
                setReceiverId('');
                setSubject('');
                setBody('');
                setRelatedType('');
                setRelatedId('');
                setPagination((prev) => ({ ...prev, page: 1 }));
                setActiveBox('sent');
              }}
            >
              إرسال الرسالة
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.subject || 'تفاصيل الرسالة'} size="xl">
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [activeBox === 'inbox' ? 'من' : 'إلى', activeBox === 'inbox' ? selected.sender?.fullName || '—' : selected.receiver?.fullName || '—'],
                ['التاريخ', formatDate(selected.createdAt)],
                ['البريد الإلكتروني', activeBox === 'inbox' ? selected.sender?.email || '—' : selected.receiver?.email || '—'],
                ['النوع المرتبط', selected.relatedType ? relatedTypeLabels[selected.relatedType] : '—'],
                ['الرقم المرجعي', selected.relatedId || '—'],
                ['حالة القراءة', selected.isRead ? 'مقروءة' : 'غير مقروءة'],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-3">
                  <div className="text-xs font-bold text-[#016564]">{label}</div>
                  <div className="mt-1 text-sm text-[#425554]">{value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-[#e7ebea] bg-[#fcfdfd] p-4">
              <div className="text-xs font-bold text-[#016564]">نص الرسالة</div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#425554]">{selected.body}</div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
