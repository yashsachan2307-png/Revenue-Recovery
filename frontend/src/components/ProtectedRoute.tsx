import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Terminal } from 'lucide-react';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex flex-col items-center justify-center gap-4 text-[var(--color-ink)]">
        <Terminal className="h-8 w-8 animate-pulse text-[var(--color-ink)]" />
        <div className="flex flex-col items-center gap-1 font-mono">
          <span className="text-xs uppercase tracking-widest font-bold">REVENUE//RECOVERY</span>
          <span className="text-[10px] uppercase tracking-wider opacity-60">Validating Merchant Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
