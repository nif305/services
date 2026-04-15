'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { type AppRole, type WorkspaceKey, getWorkspaceGroups, WORKSPACE_TITLES } from '@/lib/workspace';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ICONS: Record<string, JSX.Element> = {
  'لوحة معلومات المواد': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 5h7v6H4zM13 5h7v10h-7zM4 13h7v6H4zM13 17h7v2h-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
  ),
  'طلبات المواد': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M7 4h10l2 2v14H5V6l2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 10h6M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
  'طلب مواد من المخزون': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M7 4h10l2 2v14H5V6l2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 10h6M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
  'مخزون المواد': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 9.5 12 5l8 4.5v8L12 22l-8-4.5v-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
  ),
  'إرجاعات المواد': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M8 8H4v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  'طلبات الإرجاع': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M8 8H4v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  'عهدتي': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M7 4h10l2 2v14H5V6l2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
  'المراسلات الداخلية': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 6h16v10H8l-4 4V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
  ),
  'لوحة معلومات الخدمات': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
  ),
  'بوابة طلبات الخدمات': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M7 4h10l2 2v14H5V6l2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 10h6M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
  'طلبات الصيانة': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="m4 20 6.5-6.5M13 13l7-7M14.5 4 20 9.5M3.5 14.5 9 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
  'طلبات النظافة': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 20h8M10 4v10M8 8h4M8 20c0-3 1-5 2-6 1 1 2 3 2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  'طلبات الشراء المباشر': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6h15l-1.5 7h-11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M6 6 5 3H3M9 19a1.5 1.5 0 1 1 0 .01M18 19a1.5 1.5 0 1 1 0 .01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
  'الطلبات الأخرى': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
  'اعتماد طلبات الخدمات': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  'المراسلات الخارجية': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="m5 7 7 6 7-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
  ),
  'المستخدمون': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="17" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M4 19c1.2-2.7 3.3-4 5-4s3.8 1.3 5 4M14 18c.7-1.7 2-2.6 3.3-2.6 1.1 0 2.2.6 3.1 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
  'التقارير': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 20V10M12 20V4M18 20v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
  'الأرشيف': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 7h16v13H4zM8 7V4h8v3M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
  'سجل التدقيق': (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7l-2.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
};

function getIcon(label: string) {
  return ICONS[label] || <span className="text-sm font-bold">•</span>;
}

export function WorkspaceSidebar({ workspace, role }: { workspace: WorkspaceKey; role: AppRole }) {
  const pathname = usePathname();
  const groups = getWorkspaceGroups(workspace, role);

  return (
    <aside className="w-full shrink-0 border-b border-[#dbe6e4] bg-white lg:min-h-screen lg:w-[320px] lg:border-b-0 lg:border-r">
      <div className="border-b border-[#dbe6e4] p-5">
        <div className="rounded-[24px] border border-[#e2e9e7] bg-[#fcfdfd] p-5 text-center">
          <img src="/nauss-gold-logo.png" alt="شعار الجامعة" className="mx-auto h-auto max-w-[220px] object-contain" />
          <div className="mt-3 text-[12px] text-[#8a9695]">{WORKSPACE_TITLES[workspace]}</div>
          <div className="mt-1 text-[28px] font-bold leading-[1.5] text-[#214344]">وكالة التدريب</div>
        </div>
      </div>

      <nav className="max-h-[calc(100vh-220px)] overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-3 px-2 text-[12px] font-semibold text-[#a0acaa]">{group.title}</div>
              <div className="space-y-2.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-[22px] border px-4 py-3.5 text-[15px] font-semibold transition',
                        active
                          ? 'border-[#2A6364] bg-[#2A6364] text-white shadow-[0_14px_30px_-24px_rgba(42,99,100,0.45)]'
                          : 'border-[#e3e9e7] bg-white text-[#355152] hover:border-[#d3dcda] hover:bg-[#fafcfc]'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] transition',
                          active ? 'bg-white/14 text-white' : 'bg-[#f4f7f7] text-[#2A6364]'
                        )}
                      >
                        {getIcon(item.label)}
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
    </aside>
  );
}
