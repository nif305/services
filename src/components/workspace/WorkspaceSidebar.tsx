'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { type AppRole, type WorkspaceKey, getWorkspaceGroups, WORKSPACE_TITLES } from '@/lib/workspace';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Icon({ name }: { name: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'dashboard': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="M4 13h7V4H4v9Z"/><path {...common} d="M13 20h7v-5h-7v5Z"/><path {...common} d="M13 11h7V4h-7v7Z"/><path {...common} d="M4 20h7v-5H4v5Z"/></svg>;
    case 'requests': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="M9 4h6l1 2h3v14H5V6h3l1-2Z"/><path {...common} d="M9 10h6M9 14h6"/></svg>;
    case 'inventory': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="m12 3 8 4.5v9L12 21 4 16.5v-9L12 3Z"/><path {...common} d="M12 12 4 7.5M12 12l8-4.5M12 12v9"/></svg>;
    case 'returns': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="M8 7H4v4"/><path {...common} d="M4 11a8 8 0 1 0 2-5.3L8 7"/></svg>;
    case 'custody': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="M9 7V5h6v2"/><path {...common} d="M4 8h16v10H4z"/><path {...common} d="M4 12h16"/></svg>;
    case 'maintenance': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="m14.7 6.3 3 3-8.4 8.4H6.3v-3L14.7 6.3Z"/><path {...common} d="m13.3 7.7 3 3"/></svg>;
    case 'cleaning': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="M7 21h10"/><path {...common} d="M12 3v12"/><path {...common} d="m8 7 4-4 4 4"/><path {...common} d="M8 15h8"/></svg>;
    case 'purchases': return <svg viewBox="0 0 24 24" className="h-5 w-5"><circle {...common} cx="9" cy="20" r="1.5"/><circle {...common} cx="17" cy="20" r="1.5"/><path {...common} d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7"/></svg>;
    case 'other': return <svg viewBox="0 0 24 24" className="h-5 w-5"><circle {...common} cx="12" cy="12" r="8"/><path {...common} d="M9.5 9a2.5 2.5 0 1 1 4 2c-.8.6-1.5 1.1-1.5 2"/><path {...common} d="M12 17h.01"/></svg>;
    case 'approvals': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="M7 12.5 10 15l7-7"/><rect {...common} x="4" y="4" width="16" height="16" rx="3"/></svg>;
    case 'email': return <svg viewBox="0 0 24 24" className="h-5 w-5"><rect {...common} x="3" y="5" width="18" height="14" rx="2"/><path {...common} d="m4 7 8 6 8-6"/></svg>;
    case 'messages': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H10l-4 3v-3.5A2.5 2.5 0 0 1 5 13.5v-6Z"/></svg>;
    case 'users': return <svg viewBox="0 0 24 24" className="h-5 w-5"><circle {...common} cx="12" cy="8" r="3.2"/><path {...common} d="M5 19c1.5-2.8 4-4.2 7-4.2S17.5 16.2 19 19"/></svg>;
    case 'reports': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="M7 18V10M12 18V6M17 18v-4"/><path {...common} d="M5 20h14"/></svg>;
    case 'archive': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="M5 7h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z"/><path {...common} d="M4 4h16v3H4V4ZM10 11h4"/></svg>;
    case 'audit': return <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...common} d="M12 7v5l3 2"/><circle {...common} cx="12" cy="12" r="8"/></svg>;
    default: return <svg viewBox="0 0 24 24" className="h-5 w-5"><rect {...common} x="4" y="4" width="16" height="16" rx="3"/></svg>;
  }
}

export function WorkspaceSidebar({ workspace, role }: { workspace: WorkspaceKey; role: AppRole }) {
  const pathname = usePathname();
  const groups = getWorkspaceGroups(workspace, role);

  return (
    <aside className="w-full border-b border-[#dfe7e5] bg-white lg:min-h-screen lg:w-[292px] lg:shrink-0 lg:border-b-0 lg:border-r-0 lg:border-l">
      <div className="sticky top-0 flex h-full flex-col">
        <div className="border-b border-[#eef3f2] px-5 py-5">
          <img src="https://nauss.edu.sa/Style%20Library/ar-sa/Styles/images/home/Logo.svg" alt="شعار جامعة نايف" className="h-16 w-auto object-contain" />
          <div className="mt-4 text-[12px] font-semibold text-[#95a3a2]">{WORKSPACE_TITLES[workspace]}</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.key}>
                <div className="mb-2 px-2 text-[11px] font-semibold text-[#a0adac]">{group.title}</div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-[20px] border px-3 py-3 text-[15px] font-semibold transition',
                          active
                            ? 'border-[#2A6364] bg-[#2A6364] text-white shadow-[0_14px_30px_-24px_rgba(42,99,100,0.7)]'
                            : 'border-[#e7eceb] bg-white text-[#2e4342] hover:border-[#d7e2df] hover:bg-[#f8fbfb]'
                        )}
                      >
                        <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', active ? 'bg-white/10' : 'bg-[#f1f6f5] text-[#2A6364]')}>
                          <Icon name={item.icon} />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
