'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useAuth } from '@/context/AuthContext';

type Role = 'manager' | 'warehouse' | 'user';
type SystemKey = 'materials' | 'services';

type NavItem = { href: string; label: string; icon: string; roles?: Role[] };
type NavGroup = { title: string; items: NavItem[] };

const ROLE_LABELS: Record<Role, string> = {
  manager: 'ظ…ط¯ظٹط±',
  warehouse: 'ظ…ط³ط¤ظˆظ„ ط§ظ„ظ…ط®ط²ظ†',
  user: 'ظ…ظˆط¸ظپ',
};

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'dashboard':
      return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M4 13h7V4H4v9Z" /><path {...common} d="M13 20h7v-5h-7v5Z" /><path {...common} d="M13 11h7V4h-7v7Z" /><path {...common} d="M4 20h7v-5H4v5Z" /></svg>;
    case 'requests':
      return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M9 4h6l1 2h3v14H5V6h3l1-2Z" /><path {...common} d="M9 10h6M9 14h6" /></svg>;
    case 'inventory':
      return <svg viewBox="0 0 24 24" className={className}><path {...common} d="m12 3 8 4.5v9L12 21 4 16.5v-9L12 3Z" /><path {...common} d="M12 12 4 7.5M12 12l8-4.5M12 12v9" /></svg>;
    case 'returns':
      return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M8 7H4v4" /><path {...common} d="M4 11a8 8 0 1 0 2-5.3L8 7" /></svg>;
    case 'custody':
      return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M9 7V5h6v2" /><path {...common} d="M4 8h16v10H4z" /><path {...common} d="M4 12h16" /></svg>;
    case 'maintenance':
      return <svg viewBox="0 0 24 24" className={className}><path {...common} d="m14.7 6.3 3 3-8.4 8.4H6.3v-3L14.7 6.3Z" /><path {...common} d="m13.3 7.7 3 3" /></svg>;
    case 'cleaning':
      return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M7 21h10" /><path {...common} d="M12 3v12" /><path {...common} d="m8 7 4-4 4 4" /><path {...common} d="M8 15h8" /></svg>;
    case 'purchases':
      return <svg viewBox="0 0 24 24" className={className}><circle {...common} cx="9" cy="20" r="1.5" /><circle {...common} cx="17" cy="20" r="1.5" /><path {...common} d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7" /></svg>;
    case 'other':
      return <svg viewBox="0 0 24 24" className={className}><circle {...common} cx="12" cy="12" r="8" /><path {...common} d="M9.5 9a2.5 2.5 0 1 1 4 2c-.8.6-1.5 1.1-1.5 2" /><path {...common} d="M12 17h.01" /></svg>;
    case 'approvals':
      return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M9 12l2 2 4-5" /><rect {...common} x="4" y="4" width="16" height="16" rx="3" /></svg>;
    case 'messages':
      return <svg viewBox="0 0 24 24" className={className}><rect {...common} x="3" y="5" width="18" height="14" rx="2" /><path {...common} d="m4 7 8 6 8-6" /></svg>;
    case 'email':
      return <svg viewBox="0 0 24 24" className={className}><rect {...common} x="3" y="5" width="18" height="14" rx="2" /><path {...common} d="m4 7 8 6 8-6" /></svg>;
    case 'users':
      return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M16 19a4 4 0 0 0-8 0" /><circle {...common} cx="12" cy="11" r="3" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" className={className}><rect {...common} x="4" y="4" width="16" height="16" rx="3" /></svg>;
  }
}

function buildGroups(system: SystemKey, role: Role): NavGroup[] {
  if (system === 'materials') {
    const ops: NavItem[] = [
      { href: '/materials/dashboard', label: 'ظ„ظˆط­ط© ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ…ظˆط§ط¯', icon: 'dashboard', roles: ['manager', 'warehouse', 'user'] },
      { href: '/materials/requests', label: role === 'user' ? 'ط·ظ„ط¨ ظ…ظˆط§ط¯ ظ…ظ† ط§ظ„ظ…ط®ط²ظˆظ†' : 'ط·ظ„ط¨ط§طھ ط§ظ„ظ…ظˆط§ط¯', icon: 'requests', roles: ['manager', 'warehouse', 'user'] },
      { href: '/materials/inventory', label: 'ط§ظ„ظ…ط®ط²ظˆظ†', icon: 'inventory', roles: ['manager', 'warehouse'] },
      { href: '/materials/returns', label: role === 'user' ? 'ط·ظ„ط¨ط§طھ ط§ظ„ط¥ط±ط¬ط§ط¹' : 'ط§ظ„ظ…ط±طھط¬ط¹ط§طھ', icon: 'returns', roles: ['manager', 'warehouse', 'user'] },
      { href: '/materials/custody', label: 'ط§ظ„ط¹ظ‡ط¯', icon: 'custody', roles: ['manager', 'warehouse', 'user'] },
    ];
    const messagingGroup: NavGroup = {
      title: 'ط§ظ„ظ…ط±ط§ط³ظ„ط§طھ',
      items: [
        {
          href: '/materials/messages',
          label: 'ط§ظ„ظ…ط±ط§ط³ظ„ط§طھ ط§ظ„ط¯ط§ط®ظ„ظٹط©',
          icon: 'messages',
          roles: ['manager', 'warehouse', 'user'],
        },
      ],
    };
    const materialsAdminGroup: NavGroup = {
      title: 'ط§ظ„ط¥ط¯ط§ط±ط© ط§ظ„ط¹ط§ظ…ط©',
      items: [
        { href: '/materials/users', label: 'ط§ظ„ظ…ط³طھط®ط¯ظ…ظˆظ†', icon: 'users', roles: ['manager'] },
      ],
    };

    return [
      {
        title: 'ظ†ط¸ط§ظ… ط§ظ„ظ…ظˆط§ط¯ ط§ظ„طھط¯ط±ظٹط¨ظٹط©',
        items: ops.filter((item) => !item.roles || item.roles.includes(role)),
      },
      {
        ...messagingGroup,
        items: messagingGroup.items.filter((item) => !item.roles || item.roles.includes(role)),
      },
      ...(role === 'manager' ? [materialsAdminGroup] : []),
    ];
  }

  const requestItems: NavItem[] = [
    { href: '/services/dashboard', label: 'ظ„ظˆط­ط© ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ط®ط¯ظ…ط§طھ', icon: 'dashboard', roles: ['manager', 'user'] },
    { href: '/services/requests', label: 'ط¨ظˆط§ط¨ط© ط·ظ„ط¨ط§طھ ط§ظ„ط®ط¯ظ…ط§طھ', icon: 'requests', roles: ['manager', 'user'] },
    { href: '/services/maintenance', label: 'ط·ظ„ط¨ط§طھ ط§ظ„طµظٹط§ظ†ط©', icon: 'maintenance', roles: ['manager', 'user'] },
    { href: '/services/cleaning', label: 'ط·ظ„ط¨ط§طھ ط§ظ„ظ†ط¸ط§ظپط©', icon: 'cleaning', roles: ['manager', 'user'] },
    { href: '/services/purchases', label: 'ط·ظ„ط¨ط§طھ ط§ظ„ط´ط±ط§ط، ط§ظ„ظ…ط¨ط§ط´ط±', icon: 'purchases', roles: ['manager', 'user'] },
    { href: '/services/other', label: 'ط§ظ„ط·ظ„ط¨ط§طھ ط§ظ„ط£ط®ط±ظ‰', icon: 'other', roles: ['manager', 'user'] },
  ];
  const governance: NavItem[] = [
    { href: '/services/approvals', label: 'ط§ط¹طھظ…ط§ط¯ ط·ظ„ط¨ط§طھ ط§ظ„ط®ط¯ظ…ط§طھ', icon: 'approvals', roles: ['manager'] },
    { href: '/services/email-drafts', label: 'ط§ظ„ظ…ط±ط§ط³ظ„ط§طھ ط§ظ„ط®ط§ط±ط¬ظٹط©', icon: 'email', roles: ['manager'] },
    { href: '/services/messages', label: 'ط§ظ„ظ…ط±ط§ط³ظ„ط§طھ ط§ظ„ط¯ط§ط®ظ„ظٹط©', icon: 'messages', roles: ['manager', 'user'] },
  ];
  const servicesAdminGroup: NavGroup = {
    title: 'ط§ظ„ط¥ط¯ط§ط±ط© ط§ظ„ط¹ط§ظ…ط©',
    items: [
      { href: '/services/users', label: 'ط§ظ„ظ…ط³طھط®ط¯ظ…ظˆظ†', icon: 'users', roles: ['manager'] },
    ],
  };

  return [
    {
      title: 'ظ†ط¸ط§ظ… ط§ظ„ط®ط¯ظ…ط§طھ ط§ظ„ط¹ط§ظ…ط©',
      items: requestItems.filter((item) => !item.roles || item.roles.includes(role)),
    },
    {
      title: 'ط§ظ„ط§ط¹طھظ…ط§ط¯ط§طھ ظˆط§ظ„ظ…ط±ط§ط³ظ„ط§طھ',
      items: governance.filter((item) => !item.roles || item.roles.includes(role)),
    },
    ...(role === 'manager' ? [servicesAdminGroup] : []),
  ];
}

export function SystemShell({ system, children }: { system: SystemKey; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, originalUser, switchViewRole, canUseRoleSwitch, logout } = useAuth();
  const role = (user?.role || 'user') as Role;
  const roles = (Array.isArray(originalUser?.roles) ? originalUser?.roles : [role]).filter((r): r is Role => ['manager', 'warehouse', 'user'].includes(String(r)));
  const groups = buildGroups(system, role);
  const title = system === 'materials' ? 'ظ†ط¸ط§ظ… ط§ظ„ظ…ظˆط§ط¯ ط§ظ„طھط¯ط±ظٹط¨ظٹط©' : 'ظ†ط¸ط§ظ… ط§ظ„ط®ط¯ظ…ط§طھ ط§ظ„ط¹ط§ظ…ط©';
  const subtitle = system === 'materials' ? 'ظ„ظˆط­ط© طھظ†ظپظٹط° ظ…ط³طھظ‚ظ„ط© ظ„ط·ظ„ط¨ط§طھ ط§ظ„ظ…ظˆط§ط¯ ظˆط§ظ„ظ…ط®ط²ظˆظ† ظˆط§ظ„ظ…ط±طھط¬ط¹ط§طھ ظˆط§ظ„ط¹ظ‡ط¯.' : 'ظ„ظˆط­ط© طھظ†ظپظٹط° ظ…ط³طھظ‚ظ„ط© ظ„ط·ظ„ط¨ط§طھ ط§ظ„ط®ط¯ظ…ط§طھ ظˆط§ظ„ط§ط¹طھظ…ط§ط¯ط§طھ ظˆط§ظ„ظ…ط±ط§ط³ظ„ط§طھ ط§ظ„ط®ط§ط±ط¬ظٹط©.';

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7f7]">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-row-reverse gap-0">
        <aside className="hidden w-[318px] shrink-0 border-l border-[#e5ebea] bg-white xl:flex xl:flex-col">
          <div className="p-4">
            <div className="rounded-[28px] border border-[#e3e9e8] bg-[#fbfcfc] p-5">
              <div className="flex justify-center rounded-[22px] border border-[#d8dfde] bg-[#f8faf9] p-4">
                <Image src="/nauss-gold-logo.png" alt="ط´ط¹ط§ط± ط§ظ„ط¬ط§ظ…ط¹ط©" width={220} height={110} className="h-auto w-[210px]" />
              </div>
            </div>
          </div>
          <div className="px-4 pb-5">
            {groups.map((group) => (
              <div key={group.title} className="mb-6">
                <div className="mb-2 px-2 text-[12px] font-semibold text-[#9aa7a6]">{group.title}</div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link key={item.href} href={item.href} className={`flex items-center justify-between rounded-[22px] border px-4 py-4 transition ${active ? 'border-[#2A6364] bg-[#2A6364] text-white shadow-[0_16px_40px_-22px_rgba(42,99,100,0.55)]' : 'border-[#e2e9e8] bg-white text-[#335554] hover:border-[#cfd9d7] hover:bg-[#fbfcfc]'}`}>
                        <span className="text-[18px] font-semibold">{item.label}</span>
                        <span className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${active ? 'bg-white/12 text-white' : 'bg-[#f4f7f7] text-[#2A6364]'}`}>
                          <Icon name={item.icon} className="h-5 w-5" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="px-4 pt-4 sm:px-5 lg:px-6">
            <div className="rounded-[30px] border border-[#e2e9e8] bg-white p-4 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.25)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={() => router.push('/portal')} className="flex h-14 items-center gap-2 rounded-[20px] border border-[#d8dfde] bg-white px-4 text-[#2A6364] transition hover:bg-[#f7faf9]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M9 6 15 12 9 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    <span className="text-sm font-semibold">ط§ط®طھظٹط§ط± ط§ظ„ظ†ط¸ط§ظ…</span>
                  </button>

                  <div className="flex min-w-[260px] items-center gap-3 rounded-[22px] border border-[#d8dfde] bg-white px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[20px] font-bold text-[#223b3b]">{user?.fullName || 'ظ…ط³طھط®ط¯ظ… ط§ظ„ظ†ط¸ط§ظ…'}</div>
                      <div className="truncate text-[14px] text-[#7b8b8a]">{user?.email || ''}</div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#f5f8f8] text-[#2A6364]">
                      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" /><path d="M5 19c1.7-3.1 4.5-4.7 7-4.7s5.3 1.6 7 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    </div>
                  </div>

                  {user?.id ? <NotificationBell userId={user.id} /> : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {canUseRoleSwitch && roles.length > 1 ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[#d8dfde] bg-white px-3 py-2">
                      {roles.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={async () => { await switchViewRole(r); router.replace(pathname); router.refresh(); }}
                          className={`min-w-[96px] rounded-full px-4 py-2.5 text-[15px] font-semibold transition ${role === r ? 'bg-[#2A6364] text-white' : 'bg-transparent text-[#4b5f5f] hover:bg-[#f1f6f5]'}`}
                        >
                          {ROLE_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <button onClick={logout} className="flex h-14 items-center gap-2 rounded-[20px] border border-[#d8dfde] bg-white px-4 text-[#2A6364] transition hover:bg-[#f7faf9]">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M13 4H18C19.1 4 20 4.9 20 6V18C20 19.1 19.1 20 18 20H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    <span className="text-sm font-semibold">طھط³ط¬ظٹظ„ ط§ظ„ط®ط±ظˆط¬</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 py-4 sm:px-5 lg:px-6">
            <div className="mb-4 rounded-[28px] border border-[#e2e9e8] bg-white p-6 shadow-soft">
              <div className="text-right">
                <div className="text-[14px] font-semibold text-[#8ea2a1]">{title}</div>
                <div className="mt-1 text-[38px] font-bold text-[#2A6364]">{title}</div>
                <div className="mt-2 text-[16px] text-[#6c7d7b]">{subtitle}</div>
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
