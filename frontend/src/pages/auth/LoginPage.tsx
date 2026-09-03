import * as React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { Terminal, AlertCircle, Loader2 } from 'lucide-react';

export function LoginPage() {
  const { login, demoLogin, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDemoLoading, setIsDemoLoading] = React.useState(false);

  const redirectPath = (location.state as any)?.from?.pathname || '/';

  React.useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccess = async () => {
    setError(null);
    setIsDemoLoading(true);

    try {
      await demoLogin();
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Demo access initialization failed.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-[var(--color-border-subtle)] p-8 flex flex-col gap-6 bg-[var(--color-paper)] shadow-sm">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Terminal className="h-10 w-10 text-[var(--color-ink)] mb-2" />
          <h1 className="text-xl font-black tracking-widest flex flex-col items-center">
            <span>REVENUE//</span>
            <span className="text-[var(--color-ink)]/70">RECOVERY</span>
          </h1>
          <p className="text-xs uppercase tracking-widest opacity-60 mt-2">Merchant Portal Access</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 border border-[var(--color-failure)] bg-[var(--color-failure)]/10 text-[var(--color-failure)] text-xs font-mono">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest opacity-80">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || isDemoLoading}
              className="border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm focus:outline-none focus:border-[var(--color-ink)] transition-colors disabled:opacity-50" 
              placeholder="merchant@example.com"
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-widest opacity-80">Password</label>
              <Link to="/forgot-password" className="text-xs opacity-60 hover:opacity-100 transition-opacity">Forgot?</Link>
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting || isDemoLoading}
              className="border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm focus:outline-none focus:border-[var(--color-ink)] transition-colors disabled:opacity-50" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || isDemoLoading}
            className="mt-2 bg-[var(--color-ink)] text-[var(--color-paper)] py-3 px-4 font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Authenticate</span>
            )}
          </button>
        </form>

        <div className="relative flex items-center justify-center border-t border-[var(--color-border-subtle)] pt-6 mt-1">
          <span className="absolute -top-3 bg-[var(--color-paper)] px-2 text-[10px] font-bold uppercase tracking-widest opacity-50">Or</span>
          <button 
            onClick={handleDemoAccess}
            disabled={isSubmitting || isDemoLoading}
            type="button"
            className="w-full border border-[var(--color-ink)] bg-[var(--color-ink)]/5 py-3 px-4 font-bold text-sm uppercase tracking-widest hover:bg-[var(--color-ink)]/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isDemoLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Entering Demo...</span>
              </>
            ) : (
              <span>Demo Access (Instant Entry)</span>
            )}
          </button>
        </div>

        <div className="text-center text-xs opacity-60">
          Don't have an account? <Link to="/signup" className="font-bold uppercase hover:opacity-100 transition-opacity underline ml-1">Create Account</Link>
        </div>

        <div className="border-t border-[var(--color-border-subtle)]/60 pt-3 text-[11px] font-mono opacity-50 text-center">
          Demo Credentials: demo@desigadgets.in / Demo@123Password
        </div>
      </div>
    </div>
  );
}
