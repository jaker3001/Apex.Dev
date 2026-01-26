import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'apex_auth_token';
const REFRESH_TOKEN_KEY = 'apex_refresh_token';
const USER_KEY = 'apex_auth_user';

interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  // Check for existing token on mount and verify it
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (!token) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
        return;
      }

      // Verify token is still valid
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const user = await response.json();
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          setState({
            isAuthenticated: true,
            isLoading: false,
            user,
            error: null,
          });
        } else {
          // Token invalid, try to refresh
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (refreshToken) {
            const refreshed = await tryRefreshToken(refreshToken);
            if (refreshed) {
              setState({
                isAuthenticated: true,
                isLoading: false,
                user: refreshed,
                error: null,
              });
              return;
            }
          }

          // Refresh failed, clear auth
          clearAuth();
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: null,
          });
        }
      } catch {
        // Network error - try using cached user if available
        if (storedUser) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: JSON.parse(storedUser),
            error: null,
          });
        } else {
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: null,
          });
        }
      }
    };

    checkAuth();
  }, []);

  const tryRefreshToken = async (refreshToken: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
    } catch {
      // Refresh failed
    }
    return null;
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        const error = data.detail || 'Login failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        return { success: false, error };
      }

      const data = await response.json();

      // Store tokens and user - API returns access_token, refresh_token, and user
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setState({
        isAuthenticated: true,
        isLoading: false,
        user: data.user,
        error: null,
      });

      return { success: true };
    } catch (err) {
      const error = 'Network error. Please try again.';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error,
      }));
      return { success: false, error };
    }
  }, []);

  const logout = useCallback(async () => {
    // Try to logout on server
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Ignore logout errors
      }
    }

    clearAuth();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
  }, []);

  const getToken = useCallback((): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  return {
    ...state,
    login,
    logout,
    getToken,
  };
}

// Helper to get auth header for API calls
export function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
