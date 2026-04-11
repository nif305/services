'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { type AppRole, type WorkspaceKey, getWorkspaceGroups, WORKSPACE_TITLES } from '@/lib/workspace';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceSidebar({ workspace, role }: { workspace: WorkspaceKey; role: AppRole }) {
  const pathname = usePathname();
  const groups = getWorkspaceGroups(workspace, role);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-b border-[#dbe6e4] bg-white lg:min-h-screen lg:w-80 lg:border-b-0 lg:border-l">
      <div className="shrink-0 border-b border-[#dbe6e4] bg-[linear-gradient(135deg,#016564_0%,#0b6d6b_100%)] px-5 py-5 text-white lg:px-6 lg:py-6">
        <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] leading-5 text-white/95">
          {WORKSPACE_TITLES[workspace]}
        </div>
        <h2 className="mt-4 text-[22px] leading-[1.25]">وكالة التدريب</h2>
        <p className="mt-2 text-[12px] leading-6 text-white/80">
          {role === 'manager' ? 'وضع المدير' : role === 'warehouse' ? 'وضع مسؤول المخزن' : 'وضع الموظف'}
        </p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 px-2 text-[11px] font-semibold tracking-wide text-slate-400">
                {group.title}
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex min-h-[52px] items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                        active
                          ? 'bg-[#016564] text-white shadow-[0_10px_25px_rgba(1,101,100,0.18)]'
                          : 'text-slate-700 hover:bg-[#f5f9f8] hover:text-[#016564]'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold transition',
                          active
                            ? 'bg-white/10 text-white'
                            : 'bg-[#016564]/8 text-[#016564] group-hover:bg-[#016564]/12'
                        )}
                      >
                        {item.label.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
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
