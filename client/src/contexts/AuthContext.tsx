import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  balance: number;
  displayName?: string;
  profilePhoto?: string | null;
  permissions?: string | {
    editaveis: string[];
    ferramentas: string[];
  };
  free_documents?: string[];
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; password: string; email?: string; displayName?: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = "/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem("docmaster_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem("docmaster_user", JSON.stringify(data.user));
        } else {
          setUser(null);
          localStorage.removeItem("docmaster_user");
        }
      } else if (res.status === 401) {
        // Apenas limpa se for explicitamente não autorizado (401)
        setUser(null);
        localStorage.removeItem("docmaster_user");
      }
      // Se for 500 ou erro de rede, mantém o usuário local (se existir)
    } catch (err) {
      console.error("Auth sync error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();

    // Ouvinte universal de eventos de atualização de permissão
    const handleSync = () => fetchMe();

    window.addEventListener("focus", handleSync);
    window.addEventListener("visibilitychange", handleSync);
    window.addEventListener("online", handleSync);
    window.addEventListener("docmaster:permissions-updated", handleSync);

    // Polling universal a cada 10 segundos em segundo plano para capturar liberações em tempo real do Admin
    const interval = setInterval(handleSync, 10000);

    return () => {
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("visibilitychange", handleSync);
      window.removeEventListener("online", handleSync);
      window.removeEventListener("docmaster:permissions-updated", handleSync);
      clearInterval(interval);
    };
  }, [fetchMe]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Credenciais inválidas");
    }
    setUser(data.user);
    localStorage.setItem("docmaster_user", JSON.stringify(data.user));
  }, []);

  const register = useCallback(async (input: { username: string; password: string; email?: string; displayName?: string }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao criar conta");
    }
    setUser(data.user);
    localStorage.setItem("docmaster_user", JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" }).finally(() => {
      setUser(null);
      localStorage.removeItem("docmaster_user");
    });
  }, []);

  const refresh = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  const updateBalance = useCallback((newBalance: number) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, balance: newBalance };
      localStorage.setItem("docmaster_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem("docmaster_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      refresh,
      updateBalance,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
