import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { Panel, PanelHeader } from "../components/ui/Panel"
import { Plus, Workflow, Trash2, ShieldAlert, ArrowRight, Settings2 } from "lucide-react"

export function WorkflowsPage() {
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [newRule, setNewRule] = useState({ 
    name: '', 
    description: '',
    amountThreshold: '', 
    failureReason: '', 
    action: 'Wait & Retry',
    retryLimit: 3,
    cooldownHours: 24
  });

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const token = localStorage.getItem('recoverai_auth_token');
      const res = await fetch('/api/workflows', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch workflows');
      return res.json();
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const token = localStorage.getItem('recoverai_auth_token');
      const res = await fetch(`/api/workflows/${id}/toggle`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ is_active })
      });
      if (!res.ok) throw new Error('Failed to update workflow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('recoverai_auth_token');
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to delete workflow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const conditions = [];
      if (newRule.amountThreshold) {
        conditions.push({ field: 'amount', operator: '>', value: parseInt(newRule.amountThreshold) });
      }
      if (newRule.failureReason) {
        conditions.push({ field: 'failure_reason', operator: '==', value: newRule.failureReason });
      }

      const payload = {
        name: newRule.name || 'Custom Rule',
        description: newRule.description,
        trigger: 'PAYMENT_FAILED',
        conditions_json: JSON.stringify(conditions),
        action: newRule.action,
        retry_limit: newRule.retryLimit,
        cooldown_hours: newRule.cooldownHours
      };

      const token = localStorage.getItem('recoverai_auth_token');
      const res = await fetch(`/api/workflows`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create workflow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setShowBuilder(false);
      setNewRule({ name: '', description: '', amountThreshold: '', failureReason: '', action: 'Wait & Retry', retryLimit: 3, cooldownHours: 24 });
    }
  });

  return (
    <AppShell title="Workflows">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-[var(--color-ink)] flex items-center gap-2">
              <Workflow className="h-6 w-6" /> Workflow Automation
            </h1>
            <p className="text-sm opacity-70 mt-1">
              Automated rules and bounded actions executed deterministically when payments fail.
            </p>
          </div>
          <button 
            onClick={() => setShowBuilder(!showBuilder)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Rule
          </button>
        </div>

        {showBuilder && (
          <Panel className="border-2 border-[var(--color-ink)] shadow-md animate-in slide-in-from-top-4 fade-in">
            <PanelHeader>New Workflow Rule</PanelHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold uppercase opacity-70">Rule Name</label>
                <input 
                  type="text" 
                  value={newRule.name}
                  onChange={e => setNewRule({...newRule, name: e.target.value})}
                  className="px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] text-sm outline-none focus:border-[var(--color-ink)]"
                  placeholder="e.g. Recover High-Value Failed Payments"
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold uppercase opacity-70">Description</label>
                <input 
                  type="text" 
                  value={newRule.description}
                  onChange={e => setNewRule({...newRule, description: e.target.value})}
                  className="px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] text-sm outline-none focus:border-[var(--color-ink)]"
                  placeholder="Briefly describe what this workflow accomplishes."
                />
              </div>

              <div className="md:col-span-2 border-t border-[var(--color-border-subtle)] pt-4 mt-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink)] flex items-center gap-2 mb-4">
                  <Settings2 className="h-4 w-4" /> Conditions & Action
                </h3>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase opacity-70">IF Amount {'>'}</label>
                <input 
                  type="number" 
                  value={newRule.amountThreshold}
                  onChange={e => setNewRule({...newRule, amountThreshold: e.target.value})}
                  className="px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] text-sm outline-none focus:border-[var(--color-ink)]"
                  placeholder="₹ 0.00"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase opacity-70">AND Failure Reason ==</label>
                <select 
                  value={newRule.failureReason}
                  onChange={e => setNewRule({...newRule, failureReason: e.target.value})}
                  className="px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] text-sm outline-none focus:border-[var(--color-ink)] uppercase"
                >
                  <option value="">Any Reason</option>
                  <option value="INSUFFICIENT_FUNDS">Insufficient Funds</option>
                  <option value="NETWORK_ERROR">Network Error</option>
                  <option value="BANK_TIMEOUT">Bank Timeout</option>
                  <option value="AUTHENTICATION_FAILED">Auth Failed</option>
                  <option value="CARD_DECLINED">Card Declined</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold uppercase opacity-70 text-[var(--color-success)]">THEN Action =</label>
                <select 
                  value={newRule.action}
                  onChange={e => setNewRule({...newRule, action: e.target.value})}
                  className="px-3 py-2 border border-2 border-[var(--color-success)] bg-[var(--color-success)]/10 text-[var(--color-success)] font-bold text-sm outline-none uppercase"
                >
                  <option value="Wait & Retry">Wait & Retry (Automated)</option>
                  <option value="Notify Customer">Notify Customer (Email/SMS)</option>
                  <option value="Escalate">Escalate to Manual Review</option>
                  <option value="AI_AUTO">AI Recommendation (Unbounded)</option>
                </select>
              </div>

              <div className="md:col-span-2 border-t border-[var(--color-border-subtle)] pt-4 mt-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-orange-600 flex items-center gap-2 mb-4">
                  <ShieldAlert className="h-4 w-4" /> Safeguards & Limits
                </h3>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase opacity-70">Max Retries</label>
                <input 
                  type="number" 
                  value={newRule.retryLimit}
                  onChange={e => setNewRule({...newRule, retryLimit: parseInt(e.target.value) || 1})}
                  min="1"
                  className="px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] text-sm outline-none focus:border-[var(--color-ink)]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase opacity-70">Cooldown (Hours)</label>
                <input 
                  type="number" 
                  value={newRule.cooldownHours}
                  onChange={e => setNewRule({...newRule, cooldownHours: parseInt(e.target.value) || 1})}
                  min="1"
                  className="px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] text-sm outline-none focus:border-[var(--color-ink)]"
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-4 border-t border-[var(--color-border-subtle)] pt-4">
              <button onClick={() => setShowBuilder(false)} className="px-4 py-2 text-xs font-bold uppercase hover:opacity-70 transition-opacity">Cancel</button>
              <button 
                onClick={() => createMutation.mutate()}
                disabled={!newRule.name || createMutation.isPending}
                className="px-6 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-bold uppercase disabled:opacity-50 transition-opacity"
              >
                Save Rule
              </button>
            </div>
          </Panel>
        )}

        <div className="grid gap-4">
          {isLoading ? (
            <div className="animate-pulse h-32 bg-[var(--color-border-subtle)] rounded-lg"></div>
          ) : (workflows || []).map((wf: any) => (
            <Panel key={wf.id} className={`transition-all duration-300 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 border-l-4 ${wf.is_active ? 'border-l-[var(--color-success)]' : 'border-l-[var(--color-border-subtle)] opacity-60'}`}>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between md:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg uppercase tracking-wide">{wf.name}</span>
                    </div>
                    {wf.description && <p className="text-sm opacity-70 mt-1">{wf.description}</p>}
                  </div>
                  <span className="text-[10px] font-mono bg-[var(--color-border-subtle)] px-2 py-1 rounded hidden md:inline-block">{wf.id}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-[var(--color-border-subtle)]/30 p-4 rounded-sm">
                  {/* TRIGGER & CONDITIONS */}
                  <div className="font-mono text-xs space-y-2 border-l-2 border-[var(--color-ink)]/20 pl-3">
                    <div className="text-[var(--color-ink)] opacity-70">WHEN <span className="font-bold text-sm">{wf.trigger}</span></div>
                    {JSON.parse(wf.conditions_json).map((c: any, i: number) => (
                       <div key={i}><span className="opacity-70">AND</span> {c.field} {c.operator} <span className="font-bold">{c.value}</span></div>
                    ))}
                    {JSON.parse(wf.conditions_json).length === 0 && <div className="opacity-50 italic">No additional conditions</div>}
                  </div>

                  {/* ACTION */}
                  <div className="flex items-center gap-3 md:justify-center">
                    <ArrowRight className="hidden md:block h-5 w-5 opacity-30" />
                    <div className="border-2 border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)] px-3 py-2 text-center rounded-sm">
                      <div className="text-[10px] uppercase font-bold tracking-widest opacity-70 mb-1">EXECUTE ACTION</div>
                      <div className="font-bold text-sm uppercase">{wf.action}</div>
                    </div>
                  </div>

                  {/* SAFEGUARDS */}
                  <div className="font-mono text-xs space-y-2 border-l-2 border-orange-500/30 pl-3">
                    <div className="text-orange-600 font-bold uppercase tracking-widest text-[10px] mb-1"><ShieldAlert className="h-3 w-3 inline mr-1 -mt-0.5" /> Safeguards</div>
                    <div>STOP IF: <span className="font-bold">Recovered</span></div>
                    <div>LIMIT: <span className="font-bold">{wf.retry_limit}</span> retries</div>
                    <div>COOLDOWN: <span className="font-bold">{wf.cooldown_hours}h</span> per case</div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between md:flex-col md:justify-center gap-6 border-t md:border-t-0 md:border-l border-[var(--color-border-subtle)] pt-4 md:pt-0 md:pl-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">
                    {wf.is_active ? 'Enabled' : 'Disabled'}
                  </span>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={wf.is_active === 1}
                      onChange={() => toggleMutation.mutate({ id: wf.id, is_active: wf.is_active === 0 })}
                      disabled={toggleMutation.isPending}
                    />
                    <div className={`block w-12 h-6 rounded-full transition-colors ${wf.is_active === 1 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border-subtle)]'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-[var(--color-paper)] w-4 h-4 rounded-full transition-transform ${wf.is_active === 1 ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                </label>
                <button 
                  onClick={() => deleteMutation.mutate(wf.id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-500 hover:text-red-700 hover:bg-red-500/10 p-2 rounded-full transition-colors disabled:opacity-50"
                  title="Delete Workflow"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Panel>
          ))}
          {workflows?.length === 0 && (
            <div className="text-center p-12 border-2 border-dashed border-[var(--color-border-subtle)] opacity-60">
              <Workflow className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p className="text-sm font-bold uppercase">No active workflows</p>
              <p className="text-xs mt-2">Create a rule to automate recovery actions.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

