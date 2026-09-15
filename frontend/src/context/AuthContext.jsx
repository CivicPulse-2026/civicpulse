// Auth context: holds the current user, exposes login/register/logout,
// and restores the session from a stored token on first load.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getToken, setToken } from "../lib/apiClient";
import { authService } from "../lib/services";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, if we have a token, validate it against /auth/me.
  useEffect(() => {
    let active = true;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then((res) => {
        if (active) setUser(res.user);
      })
      .catch(() => {
        // Stale/invalid token — clear it.
        setToken(null);
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload) => {
    const res = await authService.register(payload);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    // Fire-and-forget; the server side is stateless.
    authService.logout().catch(() => {});
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isStaff: user?.role === "officer" || user?.role === "admin",
      login,
      register,
      logout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
