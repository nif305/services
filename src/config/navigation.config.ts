export type AppRole = 'manager' | 'warehouse' | 'user';

export type NavigationGroup = 'dashboard' | 'materials' | 'services' | 'messages' | 'governance';

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
    label: 'مخزون المواد',
    icon: 'inventory',
    roles: ['manager', 'warehouse'],
    group: 'materials',
  },
  {
    href: '/requests',
    label: 'طلبات المواد',
    icon: 'requests',
    roles: ['manager', 'warehouse'],
    group: 'materials',
  },
  {
    href: '/returns',
    label: 'إرجاعات المواد',
    icon: 'returns',
    roles: ['manager', 'warehouse'],
    group: 'materials',
  },
  {
    href: '/requests',
    label: 'طلب مواد من المخزون',
    icon: 'requests',
    roles: ['user'],
    group: 'materials',
  },
  {
    href: '/custody',
    label: 'عهدتي',
    icon: 'custody',
    roles: ['user'],
    group: 'materials',
  },
  {
    href: '/returns',
    label: 'طلبات الإرجاع',
    icon: 'returns',
    roles: ['user'],
    group: 'materials',
  },

  {
    href: '/service-approvals',
    label: 'اعتماد طلبات الخدمات',
    icon: 'maintenance',
    roles: ['manager'],
    group: 'services',
  },
  {
    href: '/service-requests',
    label: 'طلب خدمات',
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
    label: 'مراسلات الخدمات الخارجية',
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
