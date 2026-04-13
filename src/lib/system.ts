export type SystemKey = 'materials' | 'services' | 'portal';

const SERVICE_PATHS = [
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

const MATERIAL_PATHS = [
  '/inventory',
  '/requests',
  '/returns',
  '/custody',
];

export function detectSystemFromPath(pathname: string): SystemKey {
  if (pathname === '/dashboard' || pathname === '/index') return 'portal';
  if (SERVICE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return 'services';
  if (MATERIAL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return 'materials';
  return 'portal';
}

export function getSystemEntryRoute(system: Exclude<SystemKey, 'portal'>, role?: string) {
  if (system === 'materials') {
    if (role === 'warehouse') return '/inventory';
    return '/requests';
  }

  if (role === 'manager') return '/service-approvals';
  return '/service-requests';
}

export function getDefaultRouteForRole(role?: string) {
  if (role === 'warehouse') return '/inventory';
  return '/dashboard';
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
