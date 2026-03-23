export type AppRole = 'manager' | 'warehouse' | 'user';

export type NavigationGroup = 'dashboard' | 'core' | 'services' | 'messages' | 'governance';

export type NavigationItem = {
  href: string;
  label: string;
  icon:
    | 'dashboard'
    | 'requests'
    | 'returns'
    | 'custody'
    | 'inventory'
    | 'notifications'
    | 'audit'
    | 'messages'
    | 'users'
    | 'archive'
    | 'maintenance'
    | 'cleaning'
    | 'purchases'
    | 'reports'
    | 'other'
    | 'email';
  roles?: AppRole[];
  group: NavigationGroup;
};

export const navigationItems: NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'لوحة التحكم',
    icon: 'dashboard',
    roles: ['manager', 'warehouse', 'user'],
    group: 'dashboard',
  },

  {
    href: '/inventory',
    label: 'المخزون',
    icon: 'inventory',
    roles: ['manager', 'warehouse'],
    group: 'core',
  },
  {
    href: '/requests',
    label: 'الطلبات التشغيلية',
    icon: 'requests',
    roles: ['manager', 'warehouse'],
    group: 'core',
  },
  {
    href: '/returns',
    label: 'الإرجاعات التشغيلية',
    icon: 'returns',
    roles: ['manager', 'warehouse'],
    group: 'core',
  },
  {
    href: '/requests',
    label: 'طلب مواد',
    icon: 'requests',
    roles: ['user'],
    group: 'core',
  },
  {
    href: '/custody',
    label: 'عهدتي',
    icon: 'custody',
    roles: ['user'],
    group: 'core',
  },
  {
    href: '/returns',
    label: 'طلبات الإرجاع',
    icon: 'returns',
    roles: ['user'],
    group: 'core',
  },

  {
    href: '/maintenance',
    label: 'الصيانة',
    icon: 'maintenance',
    roles: ['manager'],
    group: 'services',
  },
  {
    href: '/suggestions?category=CLEANING',
    label: 'النظافة',
    icon: 'cleaning',
    roles: ['manager'],
    group: 'services',
  },
  {
    href: '/purchases',
    label: 'الشراء المباشر',
    icon: 'purchases',
    roles: ['manager'],
    group: 'services',
  },
  {
    href: '/suggestions?category=OTHER',
    label: 'الطلبات الأخرى',
    icon: 'other',
    roles: ['manager'],
    group: 'services',
  },
  {
    href: '/suggestions',
    label: 'الطلبات الخدمية',
    icon: 'other',
    roles: ['user'],
    group: 'services',
  },

  {
    href: '/messages',
    label: 'المراسلات الداخلية',
    icon: 'messages',
    roles: ['manager', 'warehouse', 'user'],
    group: 'messages',
  },
  {
    href: '/email-drafts',
    label: 'المراسلات الخارجية',
    icon: 'email',
    roles: ['manager'],
    group: 'messages',
  },
  {
    href: '/notifications',
    label: 'الإشعارات',
    icon: 'notifications',
    roles: ['warehouse', 'user'],
    group: 'messages',
  },

  {
    href: '/reports',
    label: 'التقارير',
    icon: 'reports',
    roles: ['manager'],
    group: 'governance',
  },
  {
    href: '/archive',
    label: 'الأرشيف',
    icon: 'archive',
    roles: ['manager'],
    group: 'governance',
  },
  {
    href: '/audit-logs',
    label: 'سجل التدقيق',
    icon: 'audit',
    roles: ['manager'],
    group: 'governance',
  },
  {
    href: '/users',
    label: 'المستخدمون',
    icon: 'users',
    roles: ['manager'],
    group: 'governance',
  },
];
