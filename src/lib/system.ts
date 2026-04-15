export type SystemKey = 'materials' | 'services' | 'portal';

const LEGACY_SERVICE_PATHS = [
  '/suggestions',
  '/maintenance',
  '/cleaning',
  '/purchases',
  '/other',
  '/service-approvals',
  '/service-requests',
  '/email-drafts',
  '/approvals',
];

const LEGACY_MATERIAL_PATHS = [
  '/inventory',
  '/requests',
  '/returns',
  '/custody',
];

const MATERIAL_PATHS = ['/materials', ...LEGACY_MATERIAL_PATHS];
const SERVICE_PATHS = ['/services', ...LEGACY_SERVICE_PATHS];

export function getSystemEntryRoute(system: Exclude<SystemKey, 'portal'>, _role?: string) {
  return system === 'materials' ? '/materials/dashboard' : '/services/dashboard';
}

function mapLegacyPath(pathname: string, role?: string | null): string | null {
  const normalizedRole = String(role || '').toLowerCase();
  const managerPath = (materialsPath: string, servicesPath: string) =>
    normalizedRole === 'manager' ? servicesPath : materialsPath;

  if (pathname === '/dashboard' || pathname === '/index') return '/portal';
  if (pathname === '/requests') return '/materials/requests';
  if (pathname === '/inventory') return '/materials/inventory';
  if (pathname === '/returns') return '/materials/returns';
  if (pathname === '/custody') return '/materials/custody';
  if (pathname === '/service-requests') return '/services/requests';
  if (pathname === '/service-approvals' || pathname === '/approvals') return '/services/approvals';
  if (pathname === '/maintenance') return '/services/maintenance';
  if (pathname === '/cleaning') return '/services/cleaning';
  if (pathname === '/purchases') return '/services/purchases';
  if (pathname === '/other') return '/services/other';
  if (pathname === '/suggestions') return '/services/suggestions';
  if (pathname === '/email-drafts') return '/services/email-drafts';
  if (pathname === '/messages') return managerPath('/materials/messages', '/services/messages');
  if (pathname === '/reports') return managerPath('/materials/reports', '/services/reports');
  if (pathname === '/users') return managerPath('/materials/users', '/services/users');
  if (pathname === '/archive') return managerPath('/materials/archive', '/services/archive');
  if (pathname === '/audit-logs') return managerPath('/materials/audit-logs', '/services/audit-logs');
  if (pathname === '/notifications') return managerPath('/materials/notifications', '/services/notifications');
  return null;
}

export function canonicalizeAppHref(href?: string | null, role?: string | null): string {
  if (!href) return '/portal';
  if (/^(https?:)?\/\//i.test(href)) return href;

  const [pathname, search = ''] = href.split('?');
  const directMatch =
    pathname === '/portal' ||
    pathname === '/login' ||
    pathname.startsWith('/materials/') ||
    pathname.startsWith('/services/');

  if (directMatch) return href;

  const mappedPath = mapLegacyPath(pathname, role);
  if (!mappedPath) return href;
  return search ? `${mappedPath}?${search}` : mappedPath;
}

export function detectSystemFromPath(pathname: string): SystemKey {
  if (pathname === '/portal' || pathname === '/dashboard' || pathname === '/index') return 'portal';
  if (SERVICE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return 'services';
  if (MATERIAL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return 'materials';
  return 'portal';
}

export function getDefaultRouteForRole() {
  return '/portal';
}

export const systemMeta = {
  portal: {
    title: 'اختيار النظام',
    shortTitle: 'اختيار النظام',
  },
  materials: {
    title: 'نظام طلبات المواد والمخزون',
    shortTitle: 'نظام المواد',
  },
  services: {
    title: 'نظام طلبات الخدمات والمراسلات',
    shortTitle: 'نظام الخدمات',
  },
} as const;
