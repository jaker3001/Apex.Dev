import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'apex_auth_token';
const EMAIL_KEY = 'apex_auth_email';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
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
    email: null,
    error: null,
  });

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const email = localStorage.getItem(EMAIL_KEY);

    if (token) {
      // Verify token is still valid
      verifyToken(token).then((valid) => {
        if (valid) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            email: email,
            error: null,
          });
        } else {
          // Token is invalid, clear it
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(EMAIL_KEY);
          setState({
            isAuthenticated: false,
            isLoading: false,
            email: null,
            error: null,
          });
        }
      });
    } else {
      setState({
        isAuthenticated: false,
        isLoading: false,
        email: null,
        error: null,
      });
    }
  }, []);

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
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

      // Store token and email
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(EMAIL_KEY, data.email);

      setState({
        isAuthenticated: true,
        isLoading: false,
        email: data.email,
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

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setState({
      isAuthenticated: false,
      isLoading: false,
      email: null,
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
