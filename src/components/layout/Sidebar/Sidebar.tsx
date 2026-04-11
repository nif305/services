'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { navigationItems, type AppRole, type NavigationItem, type NavigationGroup } from '@/config/navigation.config';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils/cn';

function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name: NavigationItem['icon'];
  className?: string;
}) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <rect {...common} x="4" y="4" width="6" height="6" />
          <rect {...common} x="14" y="4" width="6" height="6" />
          <rect {...common} x="4" y="14" width="6" height="6" />
          <rect {...common} x="14" y="14" width="6" height="6" />
        </svg>
      );

    case 'requests':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <path {...common} d="M9 4h6l1 2h3v14H5V6h3l1-2Z" />
          <path {...common} d="M9 10h6M9 14h6" />
        </svg>
      );

    case 'returns':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <path {...common} d="M8 7H4v4" />
          <path {...common} d="M4 11a8 8 0 1 0 2-5.3L8 7" />
        </svg>
      );

    case 'custody':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <path {...common} d="M9 7V5h6v2" />
          <path {...common} d="M4 8h16v10H4z" />
          <path {...common} d="M4 12h16" />
        </svg>
      );

    case 'inventory':
    case 'archive':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <path {...common} d="m12 3 8 4.5v9L12 21 4 16.5v-9L12 3Z" />
          <path {...common} d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
        </svg>
      );

    case 'notifications':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <path {...common} d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path {...common} d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );

    case 'audit':
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <path {...common} d="M7 4h7l5 5v11H7z" />
          <path {...common} d="M14 4v5h5M10 13h4M10 17h6" />
        </svg>
      );

    case 'messages':
    case 'email':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <rect {...common} x="3" y="5" width="18" height="14" rx="2" />
          <path {...common} d="m4 7 8 6 8-6" />
        </svg>
      );

    case 'users':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <path {...common} d="M16 19a4 4 0 0 0-8 0" />
          <circle {...common} cx="12" cy="11" r="3" />
          <path {...common} d="M19 19a3 3 0 0 0-3-3M18 10a2.5 2.5 0 1 0-2.5-2.5" />
        </svg>
      );

    case 'maintenance':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <path {...common} d="m14.7 6.3 3 3-8.4 8.4H6.3v-3L14.7 6.3Z" />
          <path {...common} d="m13.3 7.7 3 3" />
        </svg>
      );

    case 'cleaning':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <path {...common} d="M7 21h10" />
          <path {...common} d="M12 3v12" />
          <path {...common} d="m8 7 4-4 4 4" />
          <path {...common} d="M8 15h8" />
        </svg>
      );

    case 'purchases':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <circle {...common} cx="9" cy="20" r="1.5" />
          <circle {...common} cx="17" cy="20" r="1.5" />
          <path {...common} d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7" />
        </svg>
      );

    case 'other':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M9.5 9a2.5 2.5 0 1 1 4 2c-.8.6-1.5 1.1-1.5 2" />
          <path {...common} d="M12 17h.01" />
        </svg>
      );

    default:
      return null;
  }
}

const groupLabels: Record<NavigationGroup, string> = {
  dashboard: 'لوحة التحكم',
  materials: 'طلبات المواد والمخزون',
  services: 'الخدمات والمراسلات الخارجية',
  messages: 'المراسلات',
  governance: 'الحوكمة',
};

function isItemActive(item: NavigationItem, pathname: string, category: string | null) {
  if (item.href === '/dashboard') return pathname === '/dashboard';

  if (item.href.startsWith('/suggestions?category=')) {
    const targetCategory = item.href.split('category=')[1] || '';
    return pathname === '/suggestions' && category === targetCategory;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const { user } = useAuth();
  const role = ((user?.role || 'user') as AppRole);

  const items = navigationItems.filter((item) => !item.roles || item.roles.includes(role));
  const groups: NavigationGroup[] = ['dashboard', 'materials', 'services', 'messages', 'governance'];

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-b border-[#dbe6e4] bg-white lg:min-h-screen lg:w-80 lg:border-b-0 lg:border-l">
      <div className="shrink-0 border-b border-[#dbe6e4] bg-[linear-gradient(135deg,#016564_0%,#0b6d6b_100%)] px-4 py-4 text-white sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <div className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] leading-5 text-white/95">
          <span className="truncate">منصة إدارة مخزون المواد التدريبية</span>
        </div>

        <h2 className="mt-4 text-[20px] leading-[1.25] sm:text-[22px]">وكالة التدريب</h2>

        <p className="mt-2 text-[12px] leading-6 text-white/80">
          {role === 'manager'
            ? 'وضع المدير'
            : role === 'warehouse'
            ? 'وضع مسؤول المخزن'
            : 'وضع الموظف'}
        </p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        <div className="space-y-6">
          {groups.map((group) => {
            const groupItems = items.filter((item) => item.group === group);
            if (groupItems.length === 0) return null;

            return (
              <div key={group}>
                <div className="mb-2 px-2 text-[11px] font-semibold tracking-wide text-slate-400">
                  {groupLabels[group]}
                </div>

                <div className="space-y-1.5">
                  {groupItems.map((item) => {
                    const active = isItemActive(item, pathname, category);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'group flex min-h-[52px] items-center gap-3 rounded-2xl px-3 py-3 text-sm transition sm:px-4',
                          active
                            ? 'bg-[#016564] text-white shadow-[0_10px_25px_rgba(1,101,100,0.18)]'
                            : 'text-slate-700 hover:bg-[#f5f9f8] hover:text-[#016564]'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition',
                            active
                              ? 'bg-white/10 text-white'
                              : 'bg-[#016564]/8 text-[#016564] group-hover:bg-[#016564]/12'
                          )}
                        >
                          <Icon name={item.icon} className="h-5 w-5" />
                        </span>

                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
