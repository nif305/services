'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type Role = 'manager' | 'warehouse' | 'user';
type Status = 'active' | 'disabled';

export type AppUser = {
  id: string;
  employeeId?: string;
  fullName: string;
  email: string;
  mobile?: string;
  extension?: string;
  department?: string;
  jobTitle?: string;
  operationalProject?: string;
  role: Role;
  roles: Role[];
  status: Status;
  avatar?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  mustChangePassword?: boolean;
};

type LoginResponse = {
  data?: AppUser;
  error?: string;
};

type MeResponse = {
  user?: AppUser | null;
};

type AuthContextType = {
  user: AppUser | null;
  originalUser: AppUser | null;
  allUsers: AppUser[];
  loading: boolean;
  isAuthenticated: boolean;
  canUseRoleSwitch: boolean;
  availableRoles: Role[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
  switchViewRole: (role: Role) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'inventory-auth-user';
const AUTH_ORIGINAL_STORAGE_KEY = 'inventory-auth-original-user';

function normalizeRole(role?: string | null): Role {
  const value = (role || '').toLowerCase();
  if (value === 'manager') return 'manager';
  if (value === 'warehouse') return 'warehouse';
  return 'user';
}

function normalizeRoles(roles?: unknown, fallbackRole?: string | null): Role[] {
  const raw = Array.isArray(roles) && roles.length > 0 ? roles : [fallbackRole || 'user'];
  const normalized = Array.from(new Set(raw.map((role) => normalizeRole(String(role)))));

  if (!normalized.includes('user')) {
    normalized.push('user');
  }

  if (normalized.includes('manager')) {
    return ['manager', ...normalized.filter((role) => role !== 'manager')];
  }

  if (normalized.includes('warehouse')) {
    return ['warehouse', ...normalized.filter((role) => role !== 'warehouse')];
  }

  return normalized;
}

function normalizeStatus(status?: string | null): Status {
  const value = (status || '').toLowerCase();
  if (value === 'disabled') return 'disabled';
  return 'active';
}

function normalizeUser(user: any): AppUser {
  const roles = normalizeRoles(user?.roles, user?.role);
  const role = roles.includes(normalizeRole(user?.role)) ? normalizeRole(user?.role) : roles[0] || 'user';

  return {
    id: user?.id || '',
    employeeId: user?.employeeId || '',
    fullName: user?.fullName || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    extension: user?.extension || '',
    department: user?.department || '',
    jobTitle: user?.jobTitle || '',
    operationalProject: user?.operationalProject || user?.department || '',
    role,
    roles,
    status: normalizeStatus(user?.status),
    avatar: user?.avatar || null,
    createdAt: user?.createdAt || null,
    lastLoginAt: user?.lastLoginAt || null,
    mustChangePassword: !!user?.mustChangePassword,
  };
}

function saveAuthUser(user: AppUser | null) {
  if (typeof window === 'undefined') return;

  if (!user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

function saveOriginalAuthUser(user: AppUser | null) {
  if (typeof window === 'undefined') return;

  if (!user) {
    localStorage.removeItem(AUTH_ORIGINAL_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_ORIGINAL_STORAGE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [originalUser, setOriginalUser] = useState<AppUser | null>(null);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users', {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!res.ok) {
        setAllUsers([]);
        return;
      }

      const json = await res.json().catch(() => null);
      const rows = Array.isArray(json?.data) ? json.data.map(normalizeUser) : [];
      setAllUsers(rows);
    } catch {
      setAllUsers([]);
    }
  }, []);

  const hydrateFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      const json: MeResponse = await res.json().catch(() => ({ user: null }));

      if (res.ok && json?.user) {
        const normalized = normalizeUser(json.user);
        setUser(normalized);
        setOriginalUser(normalized);
        saveAuthUser(normalized);
        saveOriginalAuthUser(normalized);
      } else {
        setUser(null);
        setOriginalUser(null);
        setAllUsers([]);
        saveAuthUser(null);
        saveOriginalAuthUser(null);
      }
    } catch {
      setUser(null);
      setOriginalUser(null);
      setAllUsers([]);
      saveAuthUser(null);
      saveOriginalAuthUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrateFromServer();
  }, [hydrateFromServer]);

  useEffect(() => {
    if (user?.role === 'manager') {
      refreshUsers();
    } else {
      setAllUsers([]);
    }
  }, [user?.role, refreshUsers]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const json: LoginResponse = await res.json().catch(() => ({
      error: 'تعذر تسجيل الدخول',
    }));

    if (!res.ok || !json?.data) {
      throw new Error(json?.error || 'تعذر تسجيل الدخول');
    }

    const normalized = normalizeUser(json.data);

    if (normalized.status === 'disabled') {
      throw new Error('الحساب موقوف. يرجى التواصل مع المدير.');
    }

    setUser(normalized);
    setOriginalUser(normalized);
    saveAuthUser(normalized);
    saveOriginalAuthUser(normalized);
  }, []);

  const logout = useCallback(() => {
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }).finally(() => {
      saveAuthUser(null);
      saveOriginalAuthUser(null);
      setUser(null);
      setOriginalUser(null);
      setAllUsers([]);
      window.location.replace('/login');
    });
  }, []);

  const switchViewRole = useCallback(
    async (role: Role) => {
      if (!originalUser || !originalUser.roles.includes(role) || role === user?.role) {
        return;
      }

      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || 'تعذر تبديل الدور');
      }

      const nextUser = normalizeUser({ ...originalUser, role, roles: originalUser.roles });
      setUser(nextUser);
      saveAuthUser(nextUser);

      if (role === 'manager') {
        await refreshUsers();
      } else {
        setAllUsers([]);
      }
    },
    [originalUser, refreshUsers, user?.role]
  );

  const availableRoles = useMemo(() => originalUser?.roles || [], [originalUser]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      originalUser,
      allUsers,
      loading,
      isAuthenticated: !!user,
      canUseRoleSwitch: availableRoles.length > 1,
      availableRoles,
      login,
      logout,
      refreshUsers,
      switchViewRole,
    }),
    [user, originalUser, allUsers, loading, availableRoles, login, logout, refreshUsers, switchViewRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
