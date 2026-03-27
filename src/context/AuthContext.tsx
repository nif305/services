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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
  switchViewRole: (role: Role) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'inventory-auth-user';
const AUTH_ORIGINAL_STORAGE_KEY = 'inventory-auth-original-user';

function normalizeRole(role?: string | null): Role {
  const value = String(role || '').toLowerCase();
  if (value === 'manager') return 'manager';
  if (value === 'warehouse') return 'warehouse';
  return 'user';
}

function normalizeRoles(roles?: unknown, fallbackRole?: string | null): Role[] {
  const raw = Array.isArray(roles) ? roles : fallbackRole ? [fallbackRole] : ['user'];
  const normalized = Array.from(new Set(raw.map((role) => normalizeRole(String(role)))));

  if (!normalized.includes('user')) {
    normalized.unshift('user');
  }

  return normalized;
}

function normalizeStatus(status?: string | null): Status {
  return String(status || '').toLowerCase() === 'disabled' ? 'disabled' : 'active';
}

function resolvePrimaryRole(roles: Role[], currentRole?: string | null): Role {
  const normalizedCurrent = normalizeRole(currentRole);

  if (roles.includes(normalizedCurrent)) {
    return normalizedCurrent;
  }

  if (roles.includes('manager')) return 'manager';
  if (roles.includes('warehouse')) return 'warehouse';
  return 'user';
}

function normalizeUser(user: any): AppUser {
  const roles = normalizeRoles(user?.roles, user?.role);
  const role = resolvePrimaryRole(roles, user?.role);

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

function loadStoredUser(key: string): AppUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return normalizeUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function syncRoleCookies(role: Role, roles: Role[]) {
  if (typeof document === 'undefined') return;

  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `active_role=${role}; path=/; max-age=${maxAge}; samesite=lax`;
  document.cookie = `user_role=${role}; path=/; max-age=${maxAge}; samesite=lax`;
  document.cookie = `user_roles=${encodeURIComponent(JSON.stringify(roles))}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [originalUser, setOriginalUser] = useState<AppUser | null>(null);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      const rows = Array.isArray(json?.data) ? json.data.map(normalizeUser) : [];
      setAllUsers(rows);
    } catch {
      setAllUsers([]);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const storedUser = loadStoredUser(AUTH_STORAGE_KEY);
      const storedOriginalUser = loadStoredUser(AUTH_ORIGINAL_STORAGE_KEY);

      if (storedUser) {
        if (!isMounted) return;
        setUser(storedUser);

        if (storedOriginalUser) {
          setOriginalUser(storedOriginalUser);
        } else {
          setOriginalUser(storedUser);
          saveOriginalAuthUser(storedUser);
        }

        syncRoleCookies(storedUser.role, storedUser.roles);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        const json: MeResponse = await res.json().catch(() => ({ user: null }));

        if (!isMounted) return;

        if (res.ok && json?.user) {
          const normalized = normalizeUser(json.user);
          setUser(normalized);
          setOriginalUser(normalized);
          saveAuthUser(normalized);
          saveOriginalAuthUser(normalized);
          syncRoleCookies(normalized.role, normalized.roles);
        } else {
          setUser(null);
          setOriginalUser(null);
          saveAuthUser(null);
          saveOriginalAuthUser(null);
        }
      } catch {
        if (!isMounted) return;
        setUser(null);
        setOriginalUser(null);
        saveAuthUser(null);
        saveOriginalAuthUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      refreshUsers();
    }
  }, [user, refreshUsers]);

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
    syncRoleCookies(normalized.role, normalized.roles);
  }, []);

  const logout = useCallback(() => {
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }).finally(() => {
      saveAuthUser(null);
      saveOriginalAuthUser(null);
      setAllUsers([]);
      window.location.replace('/login');
    });
  }, []);

  const switchViewRole = useCallback(
    (role: Role) => {
      if (!originalUser) return;
      if (!originalUser.roles.includes(role)) return;

      const nextUser = { ...originalUser, role };
      setUser(nextUser);
      saveAuthUser(nextUser);
      syncRoleCookies(role, originalUser.roles);
    },
    [originalUser]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      originalUser,
      allUsers,
      loading,
      isAuthenticated: !!user,
      canUseRoleSwitch: (originalUser?.roles?.length || 0) > 1,
      login,
      logout,
      refreshUsers,
      switchViewRole,
    }),
    [user, originalUser, allUsers, loading, login, logout, refreshUsers, switchViewRole]
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
