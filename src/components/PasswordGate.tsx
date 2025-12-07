import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface PasswordGateProps {
  children: ReactNode;
}

// Auth token management
export function getAuthToken(): string | null {
  return localStorage.getItem('tandem_auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('tandem_auth_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('tandem_auth_token');
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [_requiresAuth, setRequiresAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if auth is required and if we have a valid token
  useEffect(() => {
    async function checkAuth() {
      try {
        // Check if server requires auth
        const statusRes = await fetch(`${API_BASE}/api/auth/status`);
        const statusData = await statusRes.json();

        if (!statusData.requiresAuth) {
          // No auth required
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        setRequiresAuth(true);

        // Check if we have a valid token
        const token = getAuthToken();
        if (token) {
          // Verify token by trying to access a protected endpoint
          const verifyRes = await fetch(`${API_BASE}/api/documents`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (verifyRes.ok) {
            setIsAuthenticated(true);
          } else {
            clearAuthToken();
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        // If we can't connect, assume no auth required (for local dev)
        setIsAuthenticated(true);
      }

      setIsLoading(false);
    }

    checkAuth();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        setAuthToken(data.token);
        setIsAuthenticated(true);
      } else {
        setError('密碼錯誤');
      }
    } catch (err) {
      setError('連線失敗');
    }

    setIsSubmitting(false);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Authenticated or no auth required
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Password prompt
  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-zinc-800">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Tandem
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
              請輸入密碼以繼續
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密碼"
                autoFocus
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm mb-4">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || !password}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  驗證中...
                </>
              ) : (
                '進入'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-zinc-600 mt-6">
          Human + AI Collaboration
        </p>
      </div>
    </div>
  );
}
