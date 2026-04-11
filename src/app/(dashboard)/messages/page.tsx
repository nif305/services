'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

function formatDate(date?: string) {
  if (!date) return '-';
  try { return new Date(date).toLocaleString('ar-SA'); } catch { return date; }
}

function normalizeArabic(value: string) {
  return (value || '').toLowerCase().trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '').replace(/\s+/g, ' ');
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

  const fetchMessages = async (box = activeBox) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/messages?box=${box}`, {
        cache: 'no-store',
              });
      const json = await response.json().catch(() => null);
      setMessages(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(activeBox); }, [user?.id, activeBox]);

  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || !messages.length) return;
    const match = messages.find((message) => message.id === openId);
    if (match) setSelected(match);
  }, [searchParams, messages]);

  const recipients = useMemo(() => allUsers.filter((item) => item.id !== user?.id && item.status === 'active'), [allUsers, user?.id]);

  const filtered = useMemo(() => {
    const q = normalizeArabic(search);
    return messages.filter((message) => {
      const otherName = activeBox === 'inbox' ? message.sender?.fullName : message.receiver?.fullName;
      const haystack = normalizeArabic([message.subject, message.body, message.relatedId, message.relatedType, otherName].filter(Boolean).join(' '));
      return q ? haystack.includes(q) : true;
    });
  }, [messages, search, activeBox]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-[#d6d7d4] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[24px] font-extrabold leading-[1.25] text-[#016564] sm:text-[30px]">المراسلات الداخلية</h1>
            <p className="mt-2 text-[13px] leading-7 text-[#61706f] sm:text-sm">مراسلات داخلية حقيقية بين مستخدمي المنصة، مرتبطة بالطلبات والعمليات عند الحاجة.</p>
          </div>
          <Button onClick={() => setComposeOpen(true)}>رسالة جديدة</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setActiveBox('inbox')} className={`rounded-full px-4 py-2 text-sm ${activeBox === 'inbox' ? 'bg-[#016564] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>الوارد</button>
          <button type="button" onClick={() => setActiveBox('sent')} className={`rounded-full px-4 py-2 text-sm ${activeBox === 'sent' ? 'bg-[#016564] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>الصادر</button>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#d6d7d4] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <Input label="بحث" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="العنوان، النص، الرقم المرجعي، أو اسم الطرف الآخر" />
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map((item) => <Skeleton key={item} className="h-28 w-full rounded-[24px]" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-[24px] border border-[#d6d7d4] p-8 text-center text-sm text-[#61706f] shadow-sm">لا توجد مراسلات مطابقة</Card>
        ) : filtered.map((message) => {
          const otherParty = activeBox === 'inbox' ? message.sender : message.receiver;
          return (
            <Card key={message.id} className="rounded-[24px] border border-[#d6d7d4] p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {!message.isRead && activeBox === 'inbox' ? <span className="rounded-full bg-[#7c1e3e]/10 px-3 py-1 text-[11px] text-[#7c1e3e]">غير مقروءة</span> : null}
                    {message.relatedType ? <span className="rounded-full bg-[#016564]/10 px-3 py-1 text-[11px] text-[#016564]">{relatedTypeLabels[message.relatedType]}</span> : null}
                    {message.relatedId ? <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700">{message.relatedId}</span> : null}
                  </div>
                  <h3 className="text-lg font-bold text-[#152625]">{message.subject}</h3>
                  <p className="text-sm leading-7 text-[#61706f] line-clamp-2">{message.body}</p>
                  <div className="grid gap-2 text-sm text-[#425554] sm:grid-cols-2 xl:grid-cols-3">
                    <div><span className="font-semibold text-[#016564]">{activeBox === 'inbox' ? 'من' : 'إلى'}: </span>{otherParty?.fullName || '—'}</div>
                    <div><span className="font-semibold text-[#016564]">الدور: </span>{otherParty?.role || '—'}</div>
                    <div><span className="font-semibold text-[#016564]">التاريخ: </span>{formatDate(message.createdAt)}</div>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 lg:w-auto">
                  <Button className="w-full lg:w-36" onClick={async () => {
                    setSelected(message);
                    if (activeBox === 'inbox' && !message.isRead && user?.id) {
                      await fetch('/api/messages', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: message.id }),
                      }).catch(() => null);
                      fetchMessages(activeBox);
                    }
                  }}>فتح الرسالة</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="رسالة داخلية جديدة" size="lg">
        <div className="space-y-4">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#425554]">إلى</label>
            <select value={receiverId} onChange={(e) => setReceiverId(e.target.value)} className="w-full rounded-2xl border border-[#d6d7d4] bg-white px-4 py-3 text-sm outline-none focus:border-[#016564]">
              <option value="">اختر المستلم</option>
              {recipients.map((item) => <option key={item.id} value={item.id}>{item.fullName} — {item.role}</option>)}
            </select>
          </div>
          <Input label="الموضوع" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="عنوان مختصر وواضح" />
          <Textarea label="نص الرسالة" value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب الرسالة هنا" rows={7} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#425554]">النوع المرتبط</label>
              <select value={relatedType} onChange={(e) => setRelatedType(e.target.value as RelatedType | '')} className="w-full rounded-2xl border border-[#d6d7d4] bg-white px-4 py-3 text-sm outline-none focus:border-[#016564]">
                <option value="">بدون ربط</option>
                {Object.entries(relatedTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <Input label="الرقم المرجعي" value={relatedId} onChange={(e) => setRelatedId(e.target.value)} placeholder="مثال: MNT-2026-0004" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setComposeOpen(false)}>إلغاء</Button>
            <Button onClick={async () => {
              setError('');
              if (!user?.id || !receiverId || !subject.trim() || !body.trim()) {
                setError('يرجى تعبئة المستلم والموضوع ونص الرسالة');
                return;
              }
              const response = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverId, subject: subject.trim(), body: body.trim(), relatedType: relatedType || undefined, relatedId: relatedId.trim() || undefined }),
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
              setActiveBox('sent');
              fetchMessages('sent');
            }}>إرسال الرسالة</Button>
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
