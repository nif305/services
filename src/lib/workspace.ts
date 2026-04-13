export type AppRole = 'manager' | 'warehouse' | 'user';
export type WorkspaceKey = 'materials' | 'services';

export const WORKSPACE_TITLES: Record<WorkspaceKey, string> = {
  materials: 'نظام المواد التدريبية',
  services: 'نظام الخدمات العامة',
};

export const WORKSPACE_DESCRIPTIONS: Record<WorkspaceKey, string> = {
  materials: 'طلبات المواد، المخزون، الصرف، المرتجعات، والعهد.',
  services: 'طلبات الخدمات، الاعتمادات، المراسلات الخارجية والداخلية.',
};

export function normalizeRole(role?: string | null): AppRole {
  const value = String(role || '').toLowerCase();
  if (value === 'manager') return 'manager';
  if (value === 'warehouse') return 'warehouse';
  return 'user';
}

export function canAccessWorkspace(role: AppRole, workspace: WorkspaceKey): boolean {
  if (workspace === 'materials') return true;
  return role === 'manager' || role === 'user';
}

export function getDefaultWorkspacePath(): string {
  return '/portal';
}

export type WorkspaceNavItem = {
  href: string;
  label: string;
  roles?: AppRole[];
  icon: string;
};

export type WorkspaceNavGroup = {
  key: string;
  title: string;
  items: WorkspaceNavItem[];
};

function sharedMessagesItem(workspace: WorkspaceKey): WorkspaceNavItem {
  return {
    href: workspace === 'materials' ? '/materials/messages' : '/services/messages',
    label: 'المراسلات الداخلية',
    roles: ['manager', 'warehouse', 'user'],
    icon: 'messages',
  };
}

export function getWorkspaceGroups(workspace: WorkspaceKey, role: AppRole): WorkspaceNavGroup[] {
  if (workspace === 'materials') {
    return [
      {
        key: 'main',
        title: 'المواد التدريبية',
        items: [
          { href: '/materials/dashboard', label: 'لوحة معلومات المواد', roles: ['manager', 'warehouse', 'user'], icon: 'dashboard' },
          { href: '/materials/requests', label: role === 'user' ? 'طلب مواد من المخزون' : 'طلبات المواد', roles: ['manager', 'warehouse', 'user'], icon: 'requests' },
          { href: '/materials/inventory', label: 'المخزون', roles: ['manager', 'warehouse'], icon: 'inventory' },
          { href: '/materials/returns', label: role === 'user' ? 'طلبات الإرجاع' : 'المرتجعات', roles: ['manager', 'warehouse', 'user'], icon: 'returns' },
          { href: '/materials/custody', label: 'العهد', roles: ['user'], icon: 'custody' },
        ],
      },
      {
        key: 'communications',
        title: 'المراسلات',
        items: [sharedMessagesItem(workspace)],
      },
      ...(role === 'manager'
        ? [
            {
              key: 'governance',
              title: 'الإدارة العامة',
              items: [
                { href: '/materials/users', label: 'المستخدمون', roles: ['manager'], icon: 'users' },
                { href: '/materials/reports', label: 'التقارير', roles: ['manager'], icon: 'reports' },
                { href: '/materials/archive', label: 'الأرشيف', roles: ['manager'], icon: 'archive' },
                { href: '/materials/audit-logs', label: 'سجل التدقيق', roles: ['manager'], icon: 'audit' },
              ],
            } satisfies WorkspaceNavGroup,
          ]
        : []),
    ]
      .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || item.roles.includes(role)) }))
      .filter((group) => group.items.length > 0);
  }

  return [
    {
      key: 'main',
      title: 'الخدمات العامة',
      items: [
        { href: '/services/dashboard', label: 'لوحة معلومات الخدمات', roles: ['manager', 'user'], icon: 'dashboard' },
        { href: '/services/maintenance', label: 'طلبات الصيانة', roles: ['manager', 'user'], icon: 'maintenance' },
        { href: '/services/cleaning', label: 'طلبات النظافة', roles: ['manager', 'user'], icon: 'cleaning' },
        { href: '/services/purchases', label: 'طلبات الشراء المباشر', roles: ['manager', 'user'], icon: 'purchases' },
        { href: '/services/other', label: 'الطلبات الأخرى', roles: ['manager', 'user'], icon: 'other' },
      ],
    },
    {
      key: 'flow',
      title: 'الاعتمادات والمراسلات',
      items: [
        { href: '/services/approvals', label: 'اعتماد طلبات الخدمات', roles: ['manager'], icon: 'approvals' },
        { href: '/services/email-drafts', label: 'المراسلات الخارجية', roles: ['manager'], icon: 'email' },
        sharedMessagesItem(workspace),
      ],
    },
    ...(role === 'manager'
      ? [
          {
            key: 'governance',
            title: 'الإدارة العامة',
            items: [
              { href: '/services/users', label: 'المستخدمون', roles: ['manager'], icon: 'users' },
              { href: '/services/reports', label: 'التقارير', roles: ['manager'], icon: 'reports' },
              { href: '/services/archive', label: 'الأرشيف', roles: ['manager'], icon: 'archive' },
              { href: '/services/audit-logs', label: 'سجل التدقيق', roles: ['manager'], icon: 'audit' },
            ],
          } satisfies WorkspaceNavGroup,
        ]
      : []),
  ]
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
}
