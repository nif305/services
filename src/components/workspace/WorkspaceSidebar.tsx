'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { type AppRole, type WorkspaceKey, getWorkspaceGroups } from '@/lib/workspace';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ICONS: Record<string, string> = {
  'لوحة معلومات المواد': '▣',
  'طلبات المواد': '◫',
  'طلب مواد من المخزون': '◫',
  'مخزون المواد': '⬢',
  'المخزون': '⬢',
  'طلبات الإرجاع': '↺',
  'إرجاعات المواد': '↺',
  'عهدتي': '◌',
  'المراسلات الداخلية': '✉',
  'لوحة معلومات الخدمات': '▣',
  'بوابة طلبات الخدمات': '◫',
  'طلبات الصيانة': '🛠',
  'طلبات النظافة': '🧹',
  'طلبات الشراء المباشر': '🛒',
  'الطلبات الأخرى': '؟',
  'اعتماد طلبات الخدمات': '✓',
  'المراسلات الخارجية': '⇪',
  'المستخدمون': '👤',
  'التقارير': '▤',
  'الأرشيف': '⌂',
  'سجل التدقيق': '◷',
  'نظام المواد والمخزون': 'م',
  'نظام الخدمات والمراسلات': 'خ',
};

export function WorkspaceSidebar({ workspace, role }: { workspace: WorkspaceKey; role: AppRole }) {
  const pathname = usePathname();
  const groups = getWorkspaceGroups(workspace, role);

  return (
    <aside className="hidden min-h-screen border-r-0 border-l border-[#dde5e3] bg-white lg:block">
      <div className="sticky top-0 flex h-screen w-[290px] flex-col overflow-hidden">
        <div className="border-b border-[#dde5e3] px-5 py-5">
          <div className="rounded-[24px] border border-[#e4ecea] bg-[#fbfcfc] p-4">
            <img src="/nauss-gold-logo.png" alt="شعار الجامعة" className="h-auto w-full object-contain" />
          </div>
          <div className="mt-4 text-right">
            <div className="text-[11px] font-semibold text-slate-400">{workspace === 'materials' ? 'نظام المواد التدريبية' : 'نظام الخدمات العامة'}</div>
            <div className="mt-1 text-[15px] font-bold text-[#1b4e50]">{workspace === 'materials' ? 'لوحة المواد' : 'لوحة الخدمات'}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.key}>
                <div className="mb-2 px-2 text-[11px] font-semibold text-slate-400">{group.title}</div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-[20px] border px-4 py-3 text-sm transition',
                          active
                            ? 'border-[#2A6364] bg-[#2A6364] text-white shadow-[0_12px_28px_-18px_rgba(42,99,100,0.45)]'
                            : 'border-[#e7eceb] bg-white text-slate-700 hover:border-[#d7e3e0] hover:bg-[#f7faf9]'
                        )}
                      >
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] text-[15px] font-bold', active ? 'bg-white/10 text-white' : 'bg-[#f3f8f7] text-[#2A6364]')}>
                          {ICONS[item.label] || item.label.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-right">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
