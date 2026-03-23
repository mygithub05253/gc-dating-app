import { create } from 'zustand';
import type { AdminUser, AdminRole } from '@/types/common';

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: AdminUser) => void;
  logout: () => void;
  hasPermission: (requiredRole: AdminRole) => boolean;
  setLoading: (loading: boolean) => void;
  initAuth: () => void;
}

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  VIEWER: 1,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (accessToken, refreshToken, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/admin/login';
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  hasPermission: (requiredRole: AdminRole) => {
    const user = get().user;
    if (!user) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  initAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as AdminUser;
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  },
}));
