export type AppRole = 'manager' | 'warehouse' | 'user';
export type WorkspaceKey = 'materials' | 'services';

export const WORKSPACE_TITLES: Record<WorkspaceKey, string> = {
  materials: 'نظام المواد والمخزون',
  services: 'نظام الخدمات والمراسلات',
};

export const WORKSPACE_DESCRIPTIONS: Record<WorkspaceKey, string> = {
  materials: 'بيئة مستقلة لطلبات المواد، المخزون، الصرف، والإرجاعات.',
  services: 'بيئة مستقلة لطلبات الخدمات، الاعتمادات، والمراسلات الخارجية.',
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

export function getDefaultWorkspacePath(role?: string | null): string {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'manager') return '/services/dashboard';
  if (normalizedRole === 'warehouse') return '/materials/dashboard';
  return '/materials/dashboard';
}

export type WorkspaceNavItem = {
  href: string;
  label: string;
  roles?: AppRole[];
  badge?: string;
};

export type WorkspaceNavGroup = {
  key: string;
  title: string;
  items: WorkspaceNavItem[];
};

function getSharedMessagesItem(workspace: WorkspaceKey): WorkspaceNavItem {
  return {
    href: workspace === 'materials' ? '/materials/messages' : '/services/messages',
    label: 'المراسلات الداخلية',
    roles: ['manager', 'warehouse', 'user'],
  };
}

export function getWorkspaceGroups(workspace: WorkspaceKey, role: AppRole): WorkspaceNavGroup[] {
  const systemItems: WorkspaceNavItem[] = [];

  if (canAccessWorkspace(role, 'materials')) {
    systemItems.push({ href: '/materials/dashboard', label: 'نظام المواد والمخزون' });
  }

  if (canAccessWorkspace(role, 'services')) {
    systemItems.push({ href: '/services/dashboard', label: 'نظام الخدمات والمراسلات' });
  }

  const groups: WorkspaceNavGroup[] = [
    {
      key: 'systems',
      title: 'الأنظمة',
      items: systemItems,
    },
  ];

  if (workspace === 'materials') {
    groups.push(
      {
        key: 'dashboard',
        title: 'لوحة المواد',
        items: [
          { href: '/materials/dashboard', label: 'لوحة معلومات المواد', roles: ['manager', 'warehouse', 'user'] },
        ],
      },
      {
        key: 'operations',
        title: 'عمليات المواد',
        items: [
          { href: '/materials/requests', label: role === 'user' ? 'طلب مواد من المخزون' : 'طلبات المواد', roles: ['manager', 'warehouse', 'user'] },
          { href: '/materials/inventory', label: 'مخزون المواد', roles: ['manager', 'warehouse'] },
          { href: '/materials/returns', label: role === 'user' ? 'طلبات الإرجاع' : 'إرجاعات المواد', roles: ['manager', 'warehouse', 'user'] },
          { href: '/materials/custody', label: 'عهدتي', roles: ['user'] },
        ],
      },
      {
        key: 'communications',
        title: 'المراسلات',
        items: [getSharedMessagesItem(workspace)],
      }
    );
  }

  if (workspace === 'services') {
    groups.push(
      {
        key: 'dashboard',
        title: 'لوحة الخدمات',
        items: [
          { href: '/services/dashboard', label: 'لوحة معلومات الخدمات', roles: ['manager', 'user'] },
        ],
      },
      {
        key: 'requests',
        title: 'طلبات الخدمات',
        items: [
          { href: '/services/requests', label: 'بوابة طلبات الخدمات', roles: ['manager', 'user'] },
          { href: '/services/maintenance', label: 'طلبات الصيانة', roles: ['manager', 'user'] },
          { href: '/services/cleaning', label: 'طلبات النظافة', roles: ['manager', 'user'] },
          { href: '/services/purchases', label: 'طلبات الشراء المباشر', roles: ['manager', 'user'] },
          { href: '/services/other', label: 'الطلبات الأخرى', roles: ['manager', 'user'] },
        ],
      },
      {
        key: 'approvals',
        title: 'الاعتمادات والمراسلات',
        items: [
          { href: '/services/approvals', label: 'اعتماد طلبات الخدمات', roles: ['manager'] },
          { href: '/services/email-drafts', label: 'المراسلات الخارجية', roles: ['manager'] },
          getSharedMessagesItem(workspace),
        ],
      }
    );
  }

  if (role === 'manager') {
    groups.push({
      key: 'governance',
      title: 'الإدارة العامة',
      items: [
        { href: workspace === 'materials' ? '/materials/users' : '/services/users', label: 'المستخدمون', roles: ['manager'] },
        { href: workspace === 'materials' ? '/materials/reports' : '/services/reports', label: 'التقارير', roles: ['manager'] },
        { href: workspace === 'materials' ? '/materials/archive' : '/services/archive', label: 'الأرشيف', roles: ['manager'] },
        { href: workspace === 'materials' ? '/materials/audit-logs' : '/services/audit-logs', label: 'سجل التدقيق', roles: ['manager'] },
      ],
    });
  }

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
}
