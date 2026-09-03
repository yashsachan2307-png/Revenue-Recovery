import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { Terminal, AlertCircle, Loader2 } from 'lucide-react';

export function SignUpPage() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(name, email, password, companyName);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
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
          <p className="text-xs uppercase tracking-widest opacity-60 mt-2">New Merchant Registration</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 border border-[var(--color-failure)] bg-[var(--color-failure)]/10 text-[var(--color-failure)] text-xs font-mono">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest opacity-80">Your Full Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm focus:outline-none focus:border-[var(--color-ink)] transition-colors disabled:opacity-50" 
              placeholder="Aarav Sharma"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest opacity-80">Merchant / Company Name</label>
            <input 
              type="text" 
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isSubmitting}
              className="border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm focus:outline-none focus:border-[var(--color-ink)] transition-colors disabled:opacity-50" 
              placeholder="Desi Gadgets Pvt Ltd"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest opacity-80">Work Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm focus:outline-none focus:border-[var(--color-ink)] transition-colors disabled:opacity-50" 
              placeholder="admin@desigadgets.in"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest opacity-80">Password (Min 6 chars)</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className="border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm focus:outline-none focus:border-[var(--color-ink)] transition-colors disabled:opacity-50" 
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest opacity-80">Confirm Password</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              className="border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm focus:outline-none focus:border-[var(--color-ink)] transition-colors disabled:opacity-50" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="mt-2 bg-[var(--color-ink)] text-[var(--color-paper)] py-3 px-4 font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Registering Merchant...</span>
              </>
            ) : (
              <span>Create Merchant Account</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs opacity-60">
          Already have an account? <Link to="/login" className="font-bold uppercase hover:opacity-100 transition-opacity underline ml-1">Log In</Link>
        </div>
      </div>
    </div>
  );
}
