"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, refreshAccessToken, setSessionExpiredHandler, tokenStore } from "@/lib/api";
import type { User } from "@/types/models";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<User> {
  const data = await apiGet<User | { user: User }>("/auth/me");
  return "user" in data ? data.user : data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const clearSession = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  // Sesi habis di tengah pemakaian: kembali ke halaman login.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearSession();
      router.replace("/login");
    });
    return () => setSessionExpiredHandler(null);
  }, [clearSession, router]);

  // Pulihkan sesi dari cookie refresh token saat halaman dimuat.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refreshAccessToken();
        const me = await fetchMe();
        if (!active) return;
        setUser(me);
        setStatus("authenticated");
      } catch {
        if (!active) return;
        tokenStore.set(null);
        setStatus("unauthenticated");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiPost<{ accessToken: string; user: User }>("/auth/login", { email, password });
    tokenStore.set(res.accessToken);
    setUser(res.user);
    setStatus("authenticated");
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } catch {
      // Tetap keluar di sisi klien walau server tidak terjangkau.
    }
    clearSession();
    router.replace("/login");
  }, [clearSession, router]);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
