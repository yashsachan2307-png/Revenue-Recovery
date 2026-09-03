import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Panel, PanelHeader } from '../components/ui/Panel';
import { ErrorState } from '../components/ui/ErrorState';
import { Shield, ShieldAlert, Zap, Store, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import { AppShell } from '../layouts/AppShell';
import { api } from '../lib/api';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [isResetting, setIsResetting] = React.useState(false);
  const [resetSuccess, setResetSuccess] = React.useState(false);
  const [merchantName, setMerchantName] = React.useState('');
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const { data: policies, isLoading: loadingPolicies, isError: isPoliciesError, error: policiesError, refetch: refetchPolicies } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const token = localStorage.getItem('recoverai_auth_token');
      const res = await fetch('/api/policies', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch policies');
      return res.json();
    }
  });

  const { data: profileData, isLoading: loadingProfile, isError: isProfileError, refetch: refetchProfile } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: () => api.getMerchantProfile()
  });

  React.useEffect(() => {
    if (profileData?.merchant?.name) {
      setMerchantName(profileData.merchant.name);
    }
  }, [profileData]);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const token = localStorage.getItem('recoverai_auth_token');
      const res = await fetch(`/api/policies`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id, is_active: !is_active })
      });
      if (!res.ok) throw new Error('Failed to update policy');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    }
  });

  const handleUpdateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateMerchantProfile({ name: merchantName });
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['merchant-profile'] });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save merchant profile: ${err.message}`);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset demo environment to factory synthetic state? This will regenerate 450+ Indian transactions and refresh all metrics.')) {
      return;
    }

    setIsResetting(true);
    setResetSuccess(false);
    try {
      await api.resetDemo();
      setResetSuccess(true);
      queryClient.invalidateQueries();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      alert(`Failed to reset demo: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const isError = isPoliciesError || isProfileError;
  const isLoading = loadingPolicies || loadingProfile;

  if (isError) {
    return (
      <AppShell title="Settings">
        <div className="max-w-4xl mx-auto p-6">
          <ErrorState
            title="Failed to load configuration"
            message={policiesError instanceof Error ? policiesError.message : "Unable to retrieve merchant settings."}
            onRetry={() => {
              refetchPolicies();
              refetchProfile();
            }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest opacity-50">
          Loading Merchant Settings...
        </div>
      ) : (
        <div className="space-y-8 max-w-5xl mx-auto p-6 pb-12">
          
          <div className="flex flex-col gap-1 border-b border-[var(--color-border-subtle)] pb-4">
            <h1 className="text-xl font-bold uppercase tracking-widest text-[var(--color-ink)]">
              Merchant Settings & Guardrails
            </h1>
            <p className="text-xs opacity-70 font-mono">
              Configure autonomous execution policies, Indian payment rail limits, and merchant profiles.
            </p>
          </div>

          {/* Merchant Profile Form */}
          <Panel className="flex flex-col gap-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
            <PanelHeader>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4" /> Merchant Business Profile
              </div>
            </PanelHeader>

            <form onSubmit={handleUpdateMerchant} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-70">Company Name</label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    className="border border-[var(--color-border-subtle)] bg-transparent p-2.5 text-xs font-bold focus:border-[var(--color-ink)] outline-none"
                    placeholder="Desi Gadgets Pvt Ltd"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-70">Merchant ID</label>
                  <input
                    type="text"
                    disabled
                    value={profileData?.merchant?.id || "M-IND-001"}
                    className="border border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5 p-2.5 text-xs font-mono opacity-80"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-70">Base Currency</label>
                  <input
                    type="text"
                    disabled
                    value="INR (Indian Rupee - ₹)"
                    className="border border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5 p-2.5 text-xs font-mono opacity-80"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-70">Payment Gateway Routing</label>
                  <input
                    type="text"
                    disabled
                    value="Razorpay Sandbox Node (UPI / Cards / NetBanking)"
                    className="border border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5 p-2.5 text-xs font-mono opacity-80"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold uppercase tracking-wider px-5 py-2 text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Business Profile
                </button>
                {saveSuccess && (
                  <span className="text-xs text-[var(--color-success)] font-mono flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved successfully
                  </span>
                )}
              </div>
            </form>
          </Panel>

          {/* Demo Sandbox Management */}
          <Panel className="border-l-4 border-l-[var(--color-failure)] bg-[var(--color-failure)]/5 flex flex-col gap-3">
            <PanelHeader>Demo Environment Management</PanelHeader>
            <p className="text-xs opacity-80 font-mono leading-relaxed">
              Reset the demo environment with fresh synthetic Indian merchant data (120 customers, 450 transactions, INR currency, UPI / RuPay / NetBanking rails, and pre-evaluated autonomous policies).
            </p>
            <div className="flex items-center gap-4">
              <button 
                className="bg-[var(--color-failure)] text-white font-bold uppercase tracking-widest px-5 py-2 text-xs hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer disabled:opacity-50"
                disabled={isResetting}
                onClick={handleResetDemo}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`} />
                {isResetting ? "Reseeding Database..." : "Reset Synthetic Demo Data"}
              </button>
              {resetSuccess && (
                <span className="text-xs text-[var(--color-success)] font-mono">
                  Demo restored! Refreshing page...
                </span>
              )}
            </div>
          </Panel>

          {/* Policy Engine Guardrails */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                <Shield className="h-4 w-4" /> AI Policy Engine Guardrails
              </h2>
            </div>

            <div className="grid gap-4">
              {policies?.map((policy: any) => (
                <Panel key={policy.id} className="flex flex-col gap-3 relative overflow-hidden bg-[var(--color-paper)] border border-[var(--color-border-subtle)]">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    {policy.type === 'LIMIT' ? <ShieldAlert className="h-20 w-20" /> : 
                     policy.type === 'APPROVAL_REQUIRED' ? <Shield className="h-20 w-20" /> : 
                     <Zap className="h-20 w-20" />}
                  </div>

                  <div className="flex items-start justify-between relative z-10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-[var(--color-ink)]/10 px-1.5 py-0.5">{policy.id}</span>
                        <h3 className="font-bold text-[var(--color-ink)] uppercase tracking-wider text-xs">{policy.name}</h3>
                      </div>
                      <p className="text-xs opacity-70 font-mono">{policy.description}</p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={policy.is_active === 1}
                          onChange={() => toggleMutation.mutate({ id: policy.id, is_active: policy.is_active === 1 })}
                          disabled={toggleMutation.isPending}
                        />
                        <div className={`block w-10 h-5 rounded-full transition-colors ${policy.is_active === 1 ? 'bg-[var(--color-ink)]' : 'bg-[var(--color-border-subtle)]'}`}></div>
                        <div className={`dot absolute left-0.5 top-0.5 bg-[var(--color-paper)] w-4 h-4 rounded-full transition-transform ${policy.is_active === 1 ? 'transform translate-x-5' : ''}`}></div>
                      </div>
                    </label>
                  </div>

                  <div className="bg-[var(--color-ink)]/5 p-2.5 font-mono text-[11px] relative z-10">
                    <span className="font-bold uppercase opacity-60 mr-2">Parameters:</span>
                    {policy.parameters ? JSON.stringify(JSON.parse(policy.parameters)) : '{}'}
                  </div>
                </Panel>
              ))}
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
