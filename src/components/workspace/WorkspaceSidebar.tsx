'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { type AppRole, type WorkspaceKey, getWorkspaceGroups, WORKSPACE_TITLES } from '@/lib/workspace';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ICONS: Record<string, string> = {
  'لوحة معلومات المواد': '▦',
  'طلبات المواد': '◫',
  'طلب مواد من المخزون': '◫',
  'مخزون المواد': '◩',
  'إرجاعات المواد': '↺',
  'طلبات الإرجاع': '↺',
  'عهدتي': '▣',
  'المراسلات الداخلية': '✉',
  'لوحة معلومات الخدمات': '▦',
  'بوابة طلبات الخدمات': '⌘',
  'طلبات الصيانة': '🛠',
  'طلبات النظافة': '🧹',
  'طلبات الشراء المباشر': '🛒',
  'الطلبات الأخرى': '◌',
  'اعتماد طلبات الخدمات': '✓',
  'المراسلات الخارجية': '↗',
  'المستخدمون': '👥',
  'التقارير': '◫',
  'الأرشيف': '🗂',
  'سجل التدقيق': '≣',
  'نظام المواد والمخزون': '◧',
  'نظام الخدمات والمراسلات': '◨',
};

export function WorkspaceSidebar({ workspace, role }: { workspace: WorkspaceKey; role: AppRole }) {
  const pathname = usePathname();
  const groups = getWorkspaceGroups(workspace, role);

  return (
    <aside className="order-first overflow-hidden rounded-[28px] border border-[#dde5e3] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] lg:order-last lg:min-h-[calc(100vh-2rem)]">
      <div className="border-b border-[#e6ecea] p-4">
        <div className="rounded-[20px] border border-[#e6ecea] bg-[#fbfcfc] p-4 text-center">
          <img src="/nauss-gold-logo.png" alt="شعار الجامعة" className="mx-auto h-16 w-auto object-contain" />
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 text-center">
        <div className="text-[11px] font-semibold text-[#93a29f]">{WORKSPACE_TITLES[workspace]}</div>
      </div>

      <nav className="max-h-[calc(100vh-220px)] space-y-5 overflow-y-auto px-4 pb-5">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            <div className="px-2 text-[11px] font-semibold text-[#9aa8a6]">{group.title}</div>
            <div className="space-y-2">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between rounded-[20px] border px-4 py-3 text-[15px] font-semibold transition',
                      active
                        ? 'border-[#2A6364] bg-[#2A6364] text-white shadow-[0_10px_24px_-18px_rgba(42,99,100,0.55)]'
                        : 'border-[#e6ecea] bg-white text-[#244142] hover:border-[#c7d8d4] hover:bg-[#f7faf9]'
                    )}
                  >
                    <span>{item.label}</span>
                    <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm', active ? 'bg-white/10' : 'bg-[#f3f7f6] text-[#2A6364]')}>
                      {ICONS[item.label] || '•'}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
