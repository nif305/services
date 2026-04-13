'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { type AppRole, type WorkspaceKey, getWorkspaceGroups, WORKSPACE_TITLES } from '@/lib/workspace';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function iconFor(label: string) {
  if (label.includes('لوحة')) return '◫';
  if (label.includes('مواد')) return '▣';
  if (label.includes('مخزون')) return '◧';
  if (label.includes('إرجاع')) return '↺';
  if (label.includes('عهد')) return '⌂';
  if (label.includes('صيانة')) return '✎';
  if (label.includes('نظافة')) return '⤒';
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
    <aside className="sticky top-3 flex max-h-[calc(100vh-24px)] min-h-[calc(100vh-24px)] w-full flex-col overflow-hidden rounded-[28px] border border-[#dce5e3] bg-white shadow-soft">
      <div className="shrink-0 border-b border-[#edf2f1] px-5 py-5">
        <div className="rounded-[22px] border border-[#e8efed] bg-[#fbfcfc] p-4">
          <img src="/nauss-gold-logo.png" alt="شعار جامعة نايف" className="h-auto w-full object-contain" />
        </div>
        <div className="mt-4 text-right">
          <div className="text-[12px] font-semibold text-[#97a6a4]">{WORKSPACE_TITLES[workspace]}</div>
          <div className="mt-1 text-[18px] font-bold text-[#214040]">وكالة التدريب</div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 px-2 text-[11px] font-semibold text-[#9aa9a7]">{group.title}</div>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-[22px] border px-3 py-3.5 text-[15px] font-semibold transition',
                        active
                          ? 'border-[#2A6364] bg-[#2A6364] text-white shadow-[0_16px_34px_-24px_rgba(42,99,100,0.7)]'
                          : 'border-[#e7efed] bg-[#fcfdfd] text-[#365454] hover:border-[#d5e2df] hover:bg-[#f8fbfa]'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] text-[16px]',
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
