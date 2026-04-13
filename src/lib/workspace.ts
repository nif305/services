export type AppRole = 'manager' | 'warehouse' | 'user';
export type WorkspaceKey = 'materials' | 'services';

export const WORKSPACE_TITLES: Record<WorkspaceKey, string> = {
  materials: 'نظام المواد والمخزون',
  services: 'نظام الخدمات والمراسلات',
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
  if (normalizedRole === 'warehouse') return '/materials/dashboard';
  return '/portal';
}

export type WorkspaceNavItem = {
  href: string;
  label: string;
  roles?: AppRole[];
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
  const groups: WorkspaceNavGroup[] = [];

  if (workspace === 'materials') {
    groups.push(
      {
        key: 'materials-core',
        title: 'نظام المواد التدريبية',
        items: [
          { href: '/materials/dashboard', label: 'لوحة معلومات المواد', roles: ['manager', 'warehouse', 'user'] },
          { href: '/materials/requests', label: 'طلبات المواد', roles: ['manager', 'warehouse', 'user'] },
          { href: '/materials/inventory', label: 'المخزون', roles: ['manager', 'warehouse'] },
          { href: '/materials/returns', label: 'المرتجعات', roles: ['manager', 'warehouse', 'user'] },
          { href: '/materials/custody', label: 'العهد', roles: ['user'] },
          getSharedMessagesItem(workspace),
        ],
      }
    );
  }

  if (workspace === 'services') {
    groups.push(
      {
        key: 'services-core',
        title: 'نظام الخدمات العامة',
        items: [
          { href: '/services/dashboard', label: 'لوحة معلومات الخدمات', roles: ['manager', 'user'] },
          { href: '/services/requests', label: 'بوابة الطلبات', roles: ['manager', 'user'] },
          { href: '/services/maintenance', label: 'طلبات الصيانة', roles: ['manager', 'user'] },
          { href: '/services/cleaning', label: 'طلبات النظافة', roles: ['manager', 'user'] },
          { href: '/services/purchases', label: 'الشراء المباشر', roles: ['manager', 'user'] },
          { href: '/services/other', label: 'الطلبات الأخرى', roles: ['manager', 'user'] },
          { href: '/services/approvals', label: 'اعتماد الطلبات', roles: ['manager'] },
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
