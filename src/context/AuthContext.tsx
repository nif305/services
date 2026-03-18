'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { User, AppRole, AppStatus } from '@/features/auth/types/auth.types';

interface UserUpdateInput {
  fullName?: string;
  email?: string;
  mobile?: string;
  extension?: string;
  department?: string;
  jobTitle?: string;
  operationalProject?: string;
  role?: AppRole;
  status?: AppStatus;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  allUsers: User[];
  approveUser: (userId: string) => void;
  rejectUser: (userId: string) => void;
  activateUser: (userId: string) => void;
  disableUser: (userId: string) => void;
  archiveUser: (userId: string) => void;
  changeUserRole: (userId: string, role: AppRole) => void;
  updateUserProfile: (userId: string, updates: UserUpdateInput) => { ok: boolean; message?: string };
  resetUserPassword: (
    userId: string,
    newPassword?: string
  ) => { ok: boolean; password?: string; message?: string };
  setUserMustChangePassword: (userId: string, value: boolean) => { ok: boolean; message?: string };
  switchViewRole: (role: 'manager' | 'warehouse' | 'user') => void;
  resetViewRole: () => void;
  originalUser: User | null;
  canUseRoleSwitch: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewRole, setViewRole] = useState<'manager' | 'warehouse' | 'user' | null>(null);
  const router = useRouter();

  const fetchSessionUser = useCallback(async () => {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      setUser(null);
      setOriginalUser(null);
      return null;
    }

    const data = await response.json().catch(() => null);
    const sessionUser = data?.user || null;

    if (!sessionUser) {
      setUser(null);
      setOriginalUser(null);
      return null;
    }

    setOriginalUser(sessionUser);

    if (
      viewRole &&
      ((sessionUser.role === 'manager' && (viewRole === 'manager' || viewRole === 'user')) ||
        (sessionUser.role === 'warehouse' &&
          (viewRole === 'warehouse' || viewRole === 'user')))
    ) {
      setUser({ ...sessionUser, role: viewRole });
    } else {
      setUser(sessionUser);
    }

    return sessionUser;
  }, [viewRole]);

  const fetchUsers = useCallback(async () => {
    const response = await fetch('/api/users', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      setAllUsers([]);
      return [];
    }

    const data = await response.json().catch(() => null);
    const users = Array.isArray(data?.data) ? data.data : [];
    setAllUsers(users);
    return users;
  }, []);

  const refreshAll = useCallback(async () => {
    const sessionUser = await fetchSessionUser();
    if (sessionUser?.role === 'manager') {
      await fetchUsers();
    } else {
      setAllUsers([]);
    }
  }, [fetchSessionUser, fetchUsers]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await refreshAll();
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [refreshAll]);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizeEmail(identifier), password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'تعذر تسجيل الدخول');
      }

      setViewRole(null);
      await refreshAll();
      window.location.replace('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [refreshAll]);

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      setViewRole(null);
      setUser(null);
      setOriginalUser(null);
      setAllUsers([]);
      window.location.replace('/login');
    }
  }, []);

  const runUserAction = useCallback(
    async (userId: string, body: Record<string, unknown>) => {
      const response = await fetch(`/api/users/${userId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'تعذر تنفيذ العملية');
      }

      await refreshAll();
      return data;
    },
    [refreshAll]
  );

  const approveUser = useCallback((userId: string) => {
    runUserAction(userId, { action: 'approve' }).catch((error) => {
      alert(error.message || 'تعذر الاعتماد');
    });
  }, [runUserAction]);

  const rejectUser = useCallback((userId: string) => {
    runUserAction(userId, { action: 'reject' }).catch((error) => {
      alert(error.message || 'تعذر الرفض');
    });
  }, [runUserAction]);

  const activateUser = useCallback((userId: string) => {
    runUserAction(userId, { action: 'activate' }).catch((error) => {
      alert(error.message || 'تعذر التفعيل');
    });
  }, [runUserAction]);

  const disableUser = useCallback((userId: string) => {
    runUserAction(userId, { action: 'disable' }).catch((error) => {
      alert(error.message || 'تعذر الإيقاف');
    });
  }, [runUserAction]);

  const archiveUser = useCallback((userId: string) => {
    runUserAction(userId, { action: 'archive' }).catch((error) => {
      alert(error.message || 'تعذر الأرشفة');
    });
  }, [runUserAction]);

  const changeUserRole = useCallback((userId: string, role: AppRole) => {
    runUserAction(userId, { action: 'change-role', role }).catch((error) => {
      alert(error.message || 'تعذر تغيير الدور');
    });
  }, [runUserAction]);

  const updateUserProfile = useCallback(
    (userId: string, updates: UserUpdateInput) => {
      fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.error || 'تعذر تحديث المستخدم');
          }
          await refreshAll();
        })
        .catch((error) => {
          alert(error.message || 'تعذر تحديث المستخدم');
        });

      return { ok: true };
    },
    [refreshAll]
  );

  const resetUserPassword = useCallback(
    (userId: string, newPassword?: string) => {
      const password = (newPassword || '').trim();

      if (password && password.length < 6) {
        return { ok: false, message: 'كلمة المرور الجديدة قصيرة جدًا' };
      }

      runUserAction(userId, { action: 'reset-password', password })
        .then((data) => {
          if (!password && data?.password) {
            alert(`تمت إعادة التعيين. كلمة المرور الجديدة: ${data.password}`);
          }
        })
        .catch((error) => {
          alert(error.message || 'تعذر إعادة تعيين كلمة المرور');
        });

      return { ok: true, password: password || undefined };
    },
    [runUserAction]
  );

  const setUserMustChangePassword = useCallback(() => {
    return { ok: false, message: 'غير مدعوم حاليًا' };
  }, []);

  const switchViewRole = useCallback(
    (role: 'manager' | 'warehouse' | 'user') => {
      if (!originalUser) return;

      const allowed =
        (originalUser.role === 'manager' && (role === 'manager' || role === 'user')) ||
        (originalUser.role === 'warehouse' && (role === 'warehouse' || role === 'user'));

      if (!allowed) return;

      setViewRole(role);
      setUser({ ...originalUser, role });
      router.replace('/dashboard');
    },
    [originalUser, router]
  );

  const resetViewRole = useCallback(() => {
    if (!originalUser) return;
    setViewRole(null);
    setUser(originalUser);
    router.replace('/dashboard');
  }, [originalUser, router]);

  const canUseRoleSwitch = useMemo(() => {
    if (!originalUser || originalUser.status !== 'active') return false;
    return originalUser.role === 'manager' || originalUser.role === 'warehouse';
  }, [originalUser]);

  const canManageUsers = useMemo(() => {
    return originalUser?.role === 'manager' && originalUser?.status === 'active';
  }, [originalUser]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-primary">
        جاري التحميل...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        allUsers,
        approveUser,
        rejectUser,
        activateUser,
        disableUser,
        archiveUser,
        changeUserRole,
        updateUserProfile,
        resetUserPassword,
        setUserMustChangePassword,
        switchViewRole,
        resetViewRole,
        originalUser,
        canUseRoleSwitch,
        canManageUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};