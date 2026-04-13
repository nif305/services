
export type SystemKey = 'materials' | 'services' | 'portal';

export function detectSystemFromPath(pathname: string): SystemKey {
  if (pathname === '/portal' || pathname === '/dashboard' || pathname === '/') return 'portal';
  if (pathname.startsWith('/services')) return 'services';
  if (pathname.startsWith('/materials')) return 'materials';
  return 'portal';
}

export function getSystemEntryRoute(system: Exclude<SystemKey, 'portal'>, role?: string) {
  if (system === 'materials') return '/materials/dashboard';
  return '/services/dashboard';
}

export function getDefaultRouteForRole() {
  return '/portal';
}

export const systemMeta = {
  portal: { title: 'اختيار النظام', shortTitle: 'اختيار النظام' },
  materials: { title: 'نظام المواد التدريبية', shortTitle: 'نظام المواد' },
  services: { title: 'نظام الخدمات العامة', shortTitle: 'نظام الخدمات' },
} as const;
