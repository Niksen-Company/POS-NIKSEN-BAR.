import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { SafeUser, Role } from "@shared/schema";
import { ROLE_PERMISSIONS } from "@shared/schema";

type AuthCtx = {
  user: SafeUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (perm: keyof typeof ROLE_PERMISSIONS[Role]) => boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Login failed");
    setUser(d.user);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  async function refreshUser() {
    try {
      const r = await fetch("/api/auth/me");
      if (r.ok) {
        const d = await r.json();
        setUser(d?.user ?? null);
      } else if (r.status === 401 || r.status === 403) {
        setUser(null);
      }
      // For other errors (5xx, network hiccups), leave existing user state unchanged
    } catch {
      // silently ignore network errors
    }
  }

  function can(perm: keyof typeof ROLE_PERMISSIONS[Role]): boolean {
    if (!user) return false;
    const role = user.role as Role;
    const perms = ROLE_PERMISSIONS[role];
    return perms ? (perms[perm] as boolean) : false;
  }

  return <Ctx.Provider value={{ user, loading, login, logout, refreshUser, can }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
