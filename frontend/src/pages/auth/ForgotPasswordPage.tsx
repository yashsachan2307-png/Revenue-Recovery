import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { Terminal, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export function ForgotPasswordPage() {
  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = React.useState('');
  const [token, setToken] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [step, setStep] = React.useState<'request' | 'reset' | 'done'>('request');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [demoTokenMessage, setDemoTokenMessage] = React.useState<string | null>(null);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await forgotPassword(email);
      if (data.resetToken) {
        setToken(data.resetToken);
        setDemoTokenMessage(`Demo environment: Reset token generated automatically: ${data.resetToken}`);
        setStep('reset');
      } else {
        setStep('done');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate password reset request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(token, newPassword);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
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
          <p className="text-xs uppercase tracking-widest opacity-60 mt-2">Password Recovery</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 border border-[var(--color-failure)] bg-[var(--color-failure)]/10 text-[var(--color-failure)] text-xs font-mono">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {demoTokenMessage && step === 'reset' && (
          <div className="p-3 border border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-xs font-mono">
            <div className="font-bold uppercase text-[var(--color-warning)] mb-1">Sandbox Reset Mode</div>
            <p className="opacity-80 text-[11px]">{demoTokenMessage}</p>
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestToken} className="flex flex-col gap-4">
            <p className="text-xs text-[var(--color-ink)]/70 font-mono">
              Enter your registered merchant account email. In this demo sandbox, you can immediately set a new password.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest opacity-80">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm focus:outline-none focus:border-[var(--color-ink)] transition-colors disabled:opacity-50" 
                placeholder="demo@desigadgets.in"
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
                  <span>Generating Token...</span>
                </>
              ) : (
                <span>Request Password Reset</span>
              )}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest opacity-80">Reset Token</label>
              <input 
                type="text" 
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isSubmitting}
                className="border border-[var(--color-border-subtle)] bg-transparent p-3 text-xs font-mono focus:outline-none focus:border-[var(--color-ink)] transition-colors disabled:opacity-50" 
                placeholder="Enter reset token"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest opacity-80">New Password (Min 6 chars)</label>
              <input 
                type="password" 
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Confirm New Password</span>
              )}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-[var(--color-success)]" />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-success)]">Password Updated</h3>
              <p className="text-xs text-[var(--color-ink)]/70 font-mono">
                Your password has been successfully reset. You can now authenticate with your new credentials.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="mt-2 w-full bg-[var(--color-ink)] text-[var(--color-paper)] py-3 px-4 font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <span>Back to Login</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="text-center text-xs opacity-60">
          Remember your password? <Link to="/login" className="font-bold uppercase hover:opacity-100 transition-opacity underline ml-1">Log In</Link>
        </div>
      </div>
    </div>
  );
}
