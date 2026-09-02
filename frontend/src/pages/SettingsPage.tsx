import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Panel, PanelHeader } from '../components/ui/Panel';
import { Shield, ShieldAlert, Zap } from 'lucide-react';
import { AppShell } from '../layouts/AppShell';

export function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const res = await fetch('/api/policies');
      if (!res.ok) throw new Error('Failed to fetch policies');
      return res.json();
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const res = await fetch(`/api/policies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !is_active })
      });
      if (!res.ok) throw new Error('Failed to update policy');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    }
  });

  if (isLoading) return <AppShell title="Settings"><div className="p-8">Loading...</div></AppShell>;

  return (
    <AppShell title="Settings">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col gap-1 border-b border-[var(--color-border-subtle)] pb-4">
          <h1 className="text-xl font-bold uppercase tracking-widest text-[var(--color-ink)]">Policy Engine Configuration</h1>
          <p className="text-sm opacity-70">
            Configure the hard bounds and guardrails that the AI must follow. Changes here immediately affect new recommendations.
          </p>
        </div>

        <div className="grid gap-6">
          {policies?.map((policy: any) => (
            <Panel key={policy.id} className="flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                {policy.type === 'LIMIT' ? <ShieldAlert className="h-24 w-24" /> : 
                 policy.type === 'APPROVAL_REQUIRED' ? <Shield className="h-24 w-24" /> : 
                 <Zap className="h-24 w-24" />}
              </div>

              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1">
                  <h3 className="font-bold text-[var(--color-ink)] uppercase tracking-wider text-sm">{policy.name}</h3>
                  <p className="text-xs opacity-70">{policy.description}</p>
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
                    <div className={`block w-10 h-6 rounded-full transition-colors ${policy.is_active === 1 ? 'bg-[var(--color-ink)]' : 'bg-[var(--color-border-subtle)]'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-[var(--color-paper)] w-4 h-4 rounded-full transition-transform ${policy.is_active === 1 ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>

              <div className="bg-[var(--color-ink)]/5 p-3 font-mono text-xs mt-2 relative z-10">
                <span className="font-bold uppercase opacity-60 mr-2">Parameters:</span>
                {policy.parameters ? JSON.stringify(JSON.parse(policy.parameters)) : '{}'}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
