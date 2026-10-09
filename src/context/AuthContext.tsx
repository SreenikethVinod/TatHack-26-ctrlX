import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setApiUserId } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isOfficial: boolean;
  isAdmin: boolean;
  isDistrictAdmin: boolean;
  isCitizen: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsersAndMe = async () => {
    try {
      const [usersRes, meRes] = await Promise.all([
        api.getUsers().catch(() => ({ users: [] })),
        api.getMe().catch(() => ({
          user: {
            id: 'user-citizen-1',
            name: 'Aisha Chen',
            email: 'aisha.chen@citizen.demo',
            role: 'citizen' as const,
            createdAt: new Date().toISOString(),
          },
        })),
      ]);

      setUsers(usersRes.users || []);
      setCurrentUser(meRes.user || null);
    } catch (err) {
      console.error('Failed to load user session', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndMe();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setCurrentUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    if (users.length > 0) {
      const citizen = users.find((u) => u.role === 'citizen') || users[0];
      setApiUserId(citizen.id);
      setCurrentUser(citizen);
    }
  };

  const switchUser = async (userId: string) => {
    setLoading(true);
    setApiUserId(userId);
    try {
      const meRes = await api.getMe();
      setCurrentUser(meRes.user);
    } catch (err) {
      console.error('Failed to switch user', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const meRes = await api.getMe();
      setCurrentUser(meRes.user);
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  };

  const isOfficial = currentUser?.role === 'official' || currentUser?.role === 'admin';
  const isAdmin = currentUser?.role === 'admin';
  const isDistrictAdmin =
    (currentUser as any)?.systemRole === 'DISTRICT_REVIEWER' ||
    currentUser?.email === 'elena.rostova@district.demo';
  const isCitizen = currentUser?.role === 'citizen';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isOfficial,
        isAdmin,
        isDistrictAdmin,
        isCitizen,
        login,
        logout,
        switchUser,
        refreshUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
