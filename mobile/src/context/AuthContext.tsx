import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, authClient } from '../api/client';
import { environment } from '../config/env';
import { appStorage, STORAGE_KEYS } from '../lib/storage';
import { ApiResponse } from '../models/api-response';
import { AuthResult, LoginRequest, User } from '../models/user';

interface AuthContextValue {
  user: User | null;
  /** True until the persisted session has been restored on launch. */
  initializing: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Build the signed-in user record from a login/refresh auth result. */
function buildUser(auth: AuthResult | undefined): User {
  const data = auth ?? ({} as AuthResult);
  return {
    username: data.username,
    userName: data.username,
    isActive: true,
    menuPermissions: [],
    userMenu: data.userMenu ?? [],
    token: data.token,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  const persistUser = useCallback(async (next: User | null) => {
    setUser(next);
    if (next) await appStorage.set(STORAGE_KEYS.user, JSON.stringify(next));
    else await appStorage.remove(STORAGE_KEYS.user);
  }, []);

  const logout = useCallback(async () => {
    await authClient.clearTokens();
    await persistUser(null);
  }, [persistUser]);

  // Register client callbacks once, so a background refresh keeps the user's
  // menu fresh and a failed refresh signs the user out.
  useEffect(() => {
    authClient.registerCallbacks({
      onLogout: () => {
        void logout();
      },
      onTokensRefreshed: (auth) => {
        setUser((current) =>
          current
            ? {
                ...current,
                token: auth.token,
                userMenu: auth.userMenu?.length ? auth.userMenu : current.userMenu,
              }
            : current,
        );
      },
    });
  }, [logout]);

  // Restore any persisted session on launch.
  useEffect(() => {
    (async () => {
      try {
        await authClient.loadTokens();
        const stored = await appStorage.get(STORAGE_KEYS.user);
        if (stored) setUser(JSON.parse(stored) as User);
      } catch {
        // ignore corrupt cache
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const body: LoginRequest = { username, password, companyID: environment.companyCode };
      const res = await api.post<ApiResponse<AuthResult>>('/Authentication/Login', body);
      const auth = res?.data;
      await authClient.persistTokens(auth ?? ({} as AuthResult));
      await persistUser(buildUser(auth));
    },
    [persistUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, login, logout }),
    [user, initializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
