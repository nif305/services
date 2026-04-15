'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { type AppRole, type WorkspaceKey, getWorkspaceGroups, WORKSPACE_TITLES } from '@/lib/workspace';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function iconFor(label: string) {
  if (label.includes('لوحة')) return '▦';
  if (label.includes('مواد')) return '▣';
  if (label.includes('مخزون')) return '◫';
  if (label.includes('إرجاع')) return '↺';
  if (label.includes('عهد')) return '◪';
  if (label.includes('صيانة')) return '✎';
  if (label.includes('نظافة')) return '⌁';
  if (label.includes('شراء')) return '🛒';
  if (label.includes('اعتماد')) return '✓';
  if (label.includes('خارجية')) return '✉';
  if (label.includes('داخلية')) return '◌';
  if (label.includes('مستخدم')) return '⚙';
  return '•';
}

export function WorkspaceSidebar({ workspace, role }: { workspace: WorkspaceKey; role: AppRole }) {
  const pathname = usePathname();
  const groups = getWorkspaceGroups(workspace, role);

  return (
    <aside className="sticky top-3 flex max-h-[calc(100vh-24px)] min-h-[calc(100vh-24px)] w-full flex-col overflow-hidden rounded-[24px] border border-[#dce5e3] bg-white shadow-soft">
      <div className="shrink-0 border-b border-[#edf2f1] px-4 py-4">
        <img src="/nauss-gold-logo.png" alt="شعار جامعة نايف" className="h-auto w-full object-contain" />
        <div className="mt-3 text-right">
          <div className="text-[11px] font-semibold text-[#97a6a4]">{WORKSPACE_TITLES[workspace]}</div>
          <div className="mt-1 text-[16px] font-bold text-[#214040]">وكالة التدريب</div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 px-2 text-[10px] font-semibold text-[#9aa9a7]">{group.title}</div>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-[18px] border px-3 py-2.5 text-[14px] font-semibold transition',
                        active
                          ? 'border-[#2A6364] bg-[#2A6364] text-white shadow-[0_14px_28px_-22px_rgba(42,99,100,0.75)]'
                          : 'border-[#e7efed] bg-[#fcfdfd] text-[#365454] hover:border-[#d5e2df] hover:bg-[#f8fbfa]'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[14px]',
                          active ? 'bg-white/12 text-white' : 'bg-[#f2f7f6] text-[#2A6364]'
                        )}
                      >
                        {iconFor(item.label)}
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
