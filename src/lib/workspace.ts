import type { AppLanguage } from '@/context/AuthContext';
import { getTranslation } from '@/lib/i18n';

export type AppRole = 'manager' | 'warehouse' | 'user';
export type WorkspaceKey = 'materials' | 'services';

export const WORKSPACE_TITLES: Record<WorkspaceKey, string> = {
  materials: getTranslation('ar', 'workspace.materialsTitle'),
  services: getTranslation('ar', 'workspace.servicesTitle'),
};

export const WORKSPACE_DESCRIPTIONS: Record<WorkspaceKey, string> = {
  materials: getTranslation('ar', 'workspace.materialsDescription'),
  services: getTranslation('ar', 'workspace.servicesDescription'),
};

export function getWorkspaceTitle(workspace: WorkspaceKey, language: AppLanguage = 'ar') {
  return getTranslation(
    language,
    workspace === 'materials' ? 'workspace.materialsTitle' : 'workspace.servicesTitle'
  );
}

export function getWorkspaceDescription(workspace: WorkspaceKey, language: AppLanguage = 'ar') {
  return getTranslation(
    language,
    workspace === 'materials' ? 'workspace.materialsDescription' : 'workspace.servicesDescription'
  );
}

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
  normalizeRole(role);
  return '/portal';
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

function label(language: AppLanguage, key: string) {
  return getTranslation(language, key);
}

function getSharedMessagesItem(workspace: WorkspaceKey, language: AppLanguage): WorkspaceNavItem {
  return {
    href: workspace === 'materials' ? '/materials/messages' : '/services/messages',
    label: label(language, 'workspace.internalMessages'),
    roles: ['manager', 'warehouse', 'user'],
  };
}

export function getWorkspaceGroups(
  workspace: WorkspaceKey,
  role: AppRole,
  language: AppLanguage = 'ar'
): WorkspaceNavGroup[] {
  const systemItems: WorkspaceNavItem[] = [];

  if (canAccessWorkspace(role, 'materials')) {
    systemItems.push({
      href: '/materials/dashboard',
      label: label(language, 'workspace.materialsTitle'),
    });
  }

  if (canAccessWorkspace(role, 'services')) {
    systemItems.push({
      href: '/services/dashboard',
      label: label(language, 'workspace.servicesTitle'),
    });
  }

  const groups: WorkspaceNavGroup[] = [
    {
      key: 'systems',
      title: label(language, 'workspace.systems'),
      items: systemItems,
    },
  ];

  if (workspace === 'materials') {
    groups.push(
      {
        key: 'dashboard',
        title: label(language, 'workspace.materialsDashboard'),
        items: [
          {
            href: '/materials/dashboard',
            label: label(language, 'workspace.materialsDashboardItem'),
            roles: ['manager', 'warehouse', 'user'],
          },
        ],
      },
      {
        key: 'operations',
        title: label(language, 'workspace.materialsOperations'),
        items: [
          {
            href: '/materials/requests',
            label: label(language, role === 'user' ? 'workspace.materialsRequestUser' : 'workspace.materialsRequests'),
            roles: ['manager', 'warehouse', 'user'],
          },
          {
            href: '/materials/inventory',
            label: label(language, 'workspace.inventory'),
            roles: ['manager', 'warehouse'],
          },
          {
            href: '/materials/returns',
            label: label(language, role === 'user' ? 'workspace.returnsUser' : 'workspace.returns'),
            roles: ['manager', 'warehouse', 'user'],
          },
          {
            href: '/materials/custody',
            label: label(language, 'workspace.custody'),
            roles: ['user'],
          },
        ],
      },
      {
        key: 'communications',
        title: label(language, 'workspace.communications'),
        items: [getSharedMessagesItem(workspace, language)],
      }
    );
  }

  if (workspace === 'services') {
    groups.push(
      {
        key: 'dashboard',
        title: label(language, 'workspace.servicesDashboard'),
        items: [
          {
            href: '/services/dashboard',
            label: label(language, 'workspace.servicesDashboardItem'),
            roles: ['manager', 'user'],
          },
        ],
      },
      {
        key: 'requests',
        title: label(language, 'workspace.serviceRequests'),
        items: [
          {
            href: '/services/requests',
            label: label(language, 'workspace.serviceRequestsPortal'),
            roles: ['manager', 'user'],
          },
          {
            href: '/services/maintenance',
            label: label(language, 'workspace.maintenance'),
            roles: ['manager', 'user'],
          },
          {
            href: '/services/cleaning',
            label: label(language, 'workspace.cleaning'),
            roles: ['manager', 'user'],
          },
          {
            href: '/services/purchases',
            label: label(language, 'workspace.purchases'),
            roles: ['manager', 'user'],
          },
          {
            href: '/services/other',
            label: label(language, 'workspace.otherRequests'),
            roles: ['manager', 'user'],
          },
        ],
      },
      {
        key: 'approvals',
        title: label(language, 'workspace.approvalsAndMessages'),
        items: [
          {
            href: '/services/approvals',
            label: label(language, 'workspace.serviceApprovals'),
            roles: ['manager'],
          },
          {
            href: '/services/email-drafts',
            label: label(language, 'workspace.externalMessages'),
            roles: ['manager'],
          },
          getSharedMessagesItem(workspace, language),
        ],
      }
    );
  }

  if (role === 'manager') {
    groups.push({
      key: 'governance',
      title: label(language, 'workspace.governance'),
      items: [
        {
          href: workspace === 'materials' ? '/materials/users' : '/services/users',
          label: label(language, 'workspace.users'),
          roles: ['manager'],
        },
        {
          href: workspace === 'materials' ? '/materials/reports' : '/services/reports',
          label: label(language, 'workspace.reports'),
          roles: ['manager'],
        },
        {
          href: workspace === 'materials' ? '/materials/archive' : '/services/archive',
          label: label(language, 'workspace.archive'),
          roles: ['manager'],
        },
        {
          href: workspace === 'materials' ? '/materials/audit-logs' : '/services/audit-logs',
          label: label(language, 'workspace.auditLogs'),
          roles: ['manager'],
        },
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
