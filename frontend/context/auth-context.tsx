"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, authApi, type AuthResponse, type User } from "@/lib/api";
import { clearStoredToken, getStoredToken, storeToken } from "@/lib/auth-storage";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: { username?: string; phone?: string; password: string; otp: string; display_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applySession(response: AuthResponse, setUser: (user: User) => void, setToken: (token: string) => void): void {
  storeToken(response.access_token);
  setToken(response.access_token);
  setUser(response.user);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = getStoredToken();
    if (!savedToken) {
      setIsLoading(false);
      return;
    }
    authApi.me(savedToken)
      .then((currentUser) => {
        setToken(savedToken);
        setUser(currentUser);
      })
      .catch(() => clearStoredToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const response = await authApi.login({ identifier, password });
    applySession(response, setUser, setToken);
  }, []);

  const register = useCallback(async (payload: { username?: string; phone?: string; password: string; otp: string; display_name?: string }) => {
    const response = await authApi.register(payload);
    applySession(response, setUser, setToken);
  }, []);

  const logout = useCallback(async () => {
    const activeToken = token;
    clearStoredToken();
    setUser(null);
    setToken(null);
    if (activeToken) {
      try {
        await authApi.logout(activeToken);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      }
    }
  }, [token]);

  const value = useMemo(() => ({ user, token, isLoading, login, register, logout }), [user, token, isLoading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
