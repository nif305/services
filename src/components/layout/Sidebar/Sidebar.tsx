'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils/cn';
import { detectSystemFromPath, getSystemEntryRoute } from '@/lib/system';

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'requests': return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M9 4h6l1 2h3v14H5V6h3l1-2Z" /><path {...common} d="M9 10h6M9 14h6" /></svg>;
    case 'inventory': return <svg viewBox="0 0 24 24" className={className}><path {...common} d="m12 3 8 4.5v9L12 21 4 16.5v-9L12 3Z" /><path {...common} d="M12 12 4 7.5M12 12l8-4.5M12 12v9" /></svg>;
    case 'returns': return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M8 7H4v4" /><path {...common} d="M4 11a8 8 0 1 0 2-5.3L8 7" /></svg>;
    case 'custody': return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M9 7V5h6v2" /><path {...common} d="M4 8h16v10H4z" /><path {...common} d="M4 12h16" /></svg>;
    case 'maintenance': return <svg viewBox="0 0 24 24" className={className}><path {...common} d="m14.7 6.3 3 3-8.4 8.4H6.3v-3L14.7 6.3Z" /><path {...common} d="m13.3 7.7 3 3" /></svg>;
    case 'cleaning': return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M7 21h10" /><path {...common} d="M12 3v12" /><path {...common} d="m8 7 4-4 4 4" /><path {...common} d="M8 15h8" /></svg>;
    case 'purchases': return <svg viewBox="0 0 24 24" className={className}><circle {...common} cx="9" cy="20" r="1.5" /><circle {...common} cx="17" cy="20" r="1.5" /><path {...common} d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7" /></svg>;
    case 'other': return <svg viewBox="0 0 24 24" className={className}><circle {...common} cx="12" cy="12" r="8" /><path {...common} d="M9.5 9a2.5 2.5 0 1 1 4 2c-.8.6-1.5 1.1-1.5 2" /><path {...common} d="M12 17h.01" /></svg>;
    case 'messages': return <svg viewBox="0 0 24 24" className={className}><rect {...common} x="3" y="5" width="18" height="14" rx="2" /><path {...common} d="m4 7 8 6 8-6" /></svg>;
    case 'users': return <svg viewBox="0 0 24 24" className={className}><path {...common} d="M16 19a4 4 0 0 0-8 0" /><circle {...common} cx="12" cy="11" r="3" /></svg>;
    case 'email': return <svg viewBox="0 0 24 24" className={className}><rect {...common} x="3" y="5" width="18" height="14" rx="2" /><path {...common} d="m4 7 8 6 8-6" /></svg>;
    default: return <svg viewBox="0 0 24 24" className={className}><rect {...common} x="4" y="4" width="16" height="16" rx="3" /></svg>;
  }
}

function groupTitle(title: string) {
  return <div className="mb-2 px-2 text-[11px] font-semibold tracking-wide text-slate-400">{title}</div>;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || 'user';
  const system = detectSystemFromPath(pathname);

  const materialsEntry = getSystemEntryRoute('materials', role);
  const servicesEntry = getSystemEntryRoute('services', role);

  const materialsItems: NavItem[] = [
    { href: materialsEntry, label: 'نظام المواد والمخزون', icon: 'inventory' },
    { href: '/requests', label: 'طلبات المواد', icon: 'requests' },
    { href: '/inventory', label: 'مخزون المواد', icon: 'inventory' },
    { href: '/returns', label: 'إرجاعات المواد', icon: 'returns' },
  ];

  if (role === 'user') {
    materialsItems.splice(2, 0, { href: '/custody', label: 'عهدتي', icon: 'custody' });
  }

  const servicesItems: NavItem[] = [
    { href: servicesEntry, label: 'نظام الخدمات والمراسلات', icon: 'maintenance' },
    { href: '/suggestions?type=MAINTENANCE&new=1', label: 'طلب صيانة', icon: 'maintenance' },
    { href: '/suggestions?type=CLEANING&new=1', label: 'طلب نظافة', icon: 'cleaning' },
    { href: '/suggestions?type=PURCHASE&new=1', label: 'شراء مباشر', icon: 'purchases' },
    { href: '/suggestions?type=OTHER&new=1', label: 'طلبات أخرى', icon: 'other' },
  ];

  if (role === 'manager') {
    servicesItems.push({ href: '/service-approvals', label: 'اعتماد الخدمات', icon: 'maintenance' });
    servicesItems.push({ href: '/email-drafts', label: 'المراسلات الخارجية', icon: 'email' });
  }

  const sharedItems: NavItem[] = [{ href: '/messages', label: 'المراسلات الداخلية', icon: 'messages' }];
  const managerItems: NavItem[] = role === 'manager' ? [{ href: '/users', label: 'المستخدمون', icon: 'users' }] : [];

  const renderItem = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href.includes('?') && pathname === item.href.split('?')[0]);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'group flex min-h-[52px] items-center gap-3 rounded-2xl px-3 py-3 text-sm transition sm:px-4',
          active ? 'bg-[#016564] text-white shadow-[0_10px_25px_rgba(1,101,100,0.18)]' : 'text-slate-700 hover:bg-[#f5f9f8] hover:text-[#016564]'
        )}
      >
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition', active ? 'bg-white/10 text-white' : 'bg-[#016564]/8 text-[#016564] group-hover:bg-[#016564]/12')}><Icon name={item.icon} /></span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-b border-[#dbe6e4] bg-white lg:min-h-screen lg:w-80 lg:border-b-0 lg:border-r">
      <div className="shrink-0 border-b border-[#dbe6e4] bg-[linear-gradient(135deg,#016564_0%,#0b6d6b_100%)] px-4 py-4 text-white sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <img src="https://nauss.edu.sa/Style%20Library/ar-sa/Styles/images/home/Logo.svg" alt="شعار جامعة نايف" className="h-14 w-auto object-contain" />
        <h2 className="mt-4 text-[20px] leading-[1.25] sm:text-[22px]">منصة حوكمة وإدارة المخزون</h2>
        <p className="mt-2 text-[12px] leading-6 text-white/80">{system === 'services' ? 'مسار الخدمات' : system === 'materials' ? 'مسار المواد' : 'الواجهة الرئيسية'}</p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        <div className="space-y-6">
          <div>
            {groupTitle('الأنظمة')}
            <div className="space-y-1.5">
              <Link href="/dashboard" className={cn('group flex min-h-[52px] items-center gap-3 rounded-2xl px-3 py-3 text-sm transition sm:px-4', pathname === '/dashboard' ? 'bg-[#016564] text-white shadow-[0_10px_25px_rgba(1,101,100,0.18)]' : 'text-slate-700 hover:bg-[#f5f9f8] hover:text-[#016564]')}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition', pathname === '/dashboard' ? 'bg-white/10 text-white' : 'bg-[#016564]/8 text-[#016564] group-hover:bg-[#016564]/12')}><Icon name="requests" /></span>
                <span className="min-w-0 flex-1 truncate">اختيار النظام</span>
              </Link>
              {renderItem({ href: materialsEntry, label: 'نظام المواد والمخزون', icon: 'inventory' })}
              {renderItem({ href: servicesEntry, label: 'نظام الخدمات والمراسلات', icon: 'maintenance' })}
            </div>
          </div>

          {system === 'materials' ? (
            <div>
              {groupTitle('عمليات المواد')}
              <div className="space-y-1.5">{materialsItems.slice(1).map(renderItem)}</div>
            </div>
          ) : null}

          {system === 'services' ? (
            <div>
              {groupTitle('عمليات الخدمات')}
              <div className="space-y-1.5">{servicesItems.slice(1).map(renderItem)}</div>
            </div>
          ) : null}

          <div>
            {groupTitle('المراسلات')}
            <div className="space-y-1.5">{sharedItems.map(renderItem)}</div>
          </div>

          {managerItems.length ? (
            <div>
              {groupTitle('الإدارة العامة')}
              <div className="space-y-1.5">{managerItems.map(renderItem)}</div>
            </div>
          ) : null}
        </div>
      </nav>
    </aside>
  );
}
