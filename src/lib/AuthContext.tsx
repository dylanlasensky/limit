import React, { createContext, useState, useContext, useEffect } from "react";
import { limitApi } from "@/api/client";
import type { ApiUser } from "../../packages/contracts/entities";
import { queryClientInstance } from "@/lib/query-client";
import { clearPrivateState, storageGet, storageSet, storageRemove } from "@/lib/storage";
import { resetHealthDataSession } from "@/lib/health/health-data";
export interface AuthError {
  type: string;
  message: string;
}
export interface AuthContextValue {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError | null;
  appPublicSettings: unknown;
  authChecked: boolean;
  logout: (redirect?: boolean) => Promise<void>;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
  checkAppState: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null),
    [loading, setLoading] = useState(true),
    [authError, setError] = useState<AuthError | null>(null),
    [checked, setChecked] = useState(false);
  const clear = () => {
    resetHealthDataSession();
    void queryClientInstance.cancelQueries();
    queryClientInstance.clear();
  };
  const checkUserAuth = async () => {
    setLoading(true);
    try {
      const next = await limitApi.auth.me();
      if (next.id !== user?.id) clear();
      setUser(next);
      storageSet(
        "localStorage",
        "limit-offline-identity",
        JSON.stringify({
          id: next.id,
          name: next.name,
          email: next.email,
          emailVerified: next.emailVerified,
        })
      );
      setError(null);
    } catch (e: any) {
      if (!navigator.onLine) {
        try {
          const cached = JSON.parse(storageGet("localStorage", "limit-offline-identity") || "null");
          if (cached?.id && typeof cached.name === "string") {
            setUser(cached);
            setError(null);
            return;
          }
        } catch {
          /* Storage can be unavailable. */
        }
      }
      clear();
      setUser(null);
      setError({
        type: [401, 403].includes(e.status) ? "auth_required" : "network",
        message: e.message,
      });
    } finally {
      setLoading(false);
      setChecked(true);
    }
  };
  useEffect(() => {
    void checkUserAuth();
  }, []);
  const logout = async (redirect = true) => {
    await limitApi.auth.logout();
    clear();
    clearPrivateState(user?.id);
    storageRemove("localStorage", "limit-offline-identity");
    setUser(null);
    setError({ type: "auth_required", message: "Sign in to continue." });
    if (redirect) window.location.assign("/login");
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth: loading,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        authChecked: checked,
        logout,
        navigateToLogin: () => limitApi.auth.redirectToLogin(window.location.pathname),
        checkUserAuth,
        checkAppState: checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within an AuthProvider");
  return value;
}
