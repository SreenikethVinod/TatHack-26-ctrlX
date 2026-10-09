import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setApiUserId, clearApiSession } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isOfficial: boolean;
  isAdmin: boolean;
  isDistrictAdmin: boolean;
  isMunicipalityAdmin: boolean;
  isCitizen: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { name: string; email: string; password: string; role?: string; department?: string }) => Promise<User>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Always reset session on initial load or browser refresh
  useEffect(() => {
    clearApiSession();
    setCurrentUser(null);
    api.getUsers().then((res) => setUsers(res.users || [])).catch(() => {});
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

  const register = async (payload: { name: string; email: string; password: string; role?: string; department?: string }): Promise<User> => {
    setLoading(true);
    try {
      const res = await api.register(payload);
      setCurrentUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearApiSession();
    setCurrentUser(null);
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

  const isDistrictAdmin = Boolean(
    currentUser &&
      ((currentUser as any)?.systemRole === 'DISTRICT_REVIEWER' ||
        (currentUser as any)?.systemRole === 'DISTRICT_ADMIN' ||
        currentUser?.email?.toLowerCase().includes('district') ||
        currentUser?.email === 'elena.rostova@district.demo')
  );

  const isMunicipalityAdmin = Boolean(
    currentUser &&
      !isDistrictAdmin &&
      (currentUser?.role === 'official' ||
        currentUser?.role === 'admin' ||
        (currentUser as any)?.systemRole === 'SUPERVISOR' ||
        (currentUser as any)?.systemRole === 'PANCHAYAT_OFFICER' ||
        currentUser?.email?.toLowerCase().includes('municipality') ||
        currentUser?.email?.toLowerCase().includes('gov.demo') ||
        currentUser?.email?.toLowerCase().includes('admin@civicpulse.demo'))
  );

  const isOfficial = isMunicipalityAdmin || isDistrictAdmin;
  const isAdmin = Boolean(isDistrictAdmin || currentUser?.role === 'admin');
  const isCitizen = Boolean(currentUser) && !isMunicipalityAdmin && !isDistrictAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isOfficial,
        isAdmin,
        isDistrictAdmin,
        isMunicipalityAdmin,
        isCitizen,
        login,
        register,
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
