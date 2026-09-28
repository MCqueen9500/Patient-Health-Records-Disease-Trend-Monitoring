'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api } from '@/lib/api';

/* ── Types ───────────────────────────────────────────────────────────── */

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface UserLocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface UserType {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isApproved: boolean;
  // Patient-specific
  residentialAddress?: string;
  pincode?: string;
  location?: UserLocation;
  // Doctor-specific
  licenseNumber?: string;
  hospitalName?: string;
  specialization?: string;
}

/* ── Context shape ───────────────────────────────────────────────────── */

interface AuthContextValue {
  user: UserType | null;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  loading: boolean;
  logout: () => Promise<void>;
}

/* ── Context creation ────────────────────────────────────────────────── */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ── Provider ────────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the current user on mount (uses HTTP-only cookie automatically)
  useEffect(() => {
    let cancelled = false;

    async function fetchMe() {
      try {
        const data = await api.get<{ user: UserType }>('/auth/me');
        if (!cancelled) setUser(data.user);
      } catch {
        // Not authenticated – keep user as null
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if logout API fails, clear local state
    } finally {
      setUser(null);
      // Hard-redirect to login so middleware clears protected page cache
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────────────────────── */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
