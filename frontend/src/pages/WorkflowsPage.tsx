import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { Panel, PanelHeader } from "../components/ui/Panel"
import { Play, CheckCircle2, XCircle, Plus, Workflow } from "lucide-react"

export function WorkflowsPage() {
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', amountThreshold: '', failureReason: '', action: 'WAIT_AND_RETRY' });

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await fetch('/api/workflows');
      if (!res.ok) throw new Error('Failed to fetch workflows');
      return res.json();
    }
  });

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const res = await fetch(`/api/workflows/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active })
      });
      if (!res.ok) throw new Error('Failed to update workflow');
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
        conditions.push({ field: 'failureReason', operator: '==', value: newRule.failureReason });
      }

      const payload = {
        name: newRule.name || 'Custom Rule',
        trigger: 'PAYMENT_FAILED',
        conditions_json: JSON.stringify(conditions),
        action: newRule.action
      };

      const res = await fetch(`/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create workflow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setShowBuilder(false);
      setNewRule({ name: '', amountThreshold: '', failureReason: '', action: 'WAIT_AND_RETRY' });
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
              Automated rules and actions executed by the agent before falling back to manual escalation.
            </p>
          </div>
          <button 
            onClick={() => setShowBuilder(!showBuilder)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold text-xs uppercase tracking-widest hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Create Rule
          </button>
        </div>

        {showBuilder && (
          <Panel className="border-2 border-[var(--color-ink)]">
            <PanelHeader>New Workflow Rule</PanelHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase opacity-70">Rule Name</label>
                <input 
                  type="text" 
                  value={newRule.name}
                  onChange={e => setNewRule({...newRule, name: e.target.value})}
                  className="px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] text-sm outline-none focus:border-[var(--color-ink)]"
                  placeholder="e.g. High Value Retry"
                />
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
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase opacity-70">THEN Action =</label>
                <select 
                  value={newRule.action}
                  onChange={e => setNewRule({...newRule, action: e.target.value})}
                  className="px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] text-sm outline-none focus:border-[var(--color-ink)] uppercase"
                >
                  <option value="WAIT_AND_RETRY">Schedule Retry</option>
                  <option value="RETRY_ALTERNATIVE_METHOD">Retry Alternative</option>
                  <option value="NOTIFY_CUSTOMER">Notify Customer</option>
                  <option value="ESCALATE">Escalate to Manual</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setShowBuilder(false)} className="px-4 py-2 text-xs font-bold uppercase hover:opacity-70">Cancel</button>
              <button 
                onClick={() => createMutation.mutate()}
                disabled={!newRule.name || createMutation.isPending}
                className="px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-bold uppercase disabled:opacity-50"
              >
                Save Rule
              </button>
            </div>
          </Panel>
        )}

        <div className="grid gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">Active Rules</h2>
          {isLoading ? <p>Loading...</p> : (workflows || []).map((wf: any) => (
            <Panel key={wf.id} className={`flex flex-col md:flex-row items-center justify-between gap-4 ${wf.is_active ? '' : 'opacity-50'}`}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm uppercase">{wf.name}</span>
                  <span className="text-[10px] font-mono bg-[var(--color-border-subtle)] px-2 py-0.5 rounded">{wf.id}</span>
                </div>
                <div className="font-mono text-xs mt-2 space-y-1">
                  <div className="text-[var(--color-ink)] opacity-70">WHEN <span className="font-bold">{wf.trigger}</span></div>
                  {JSON.parse(wf.conditions_json).map((c: any, i: number) => (
                     <div key={i} className="ml-4"><span className="opacity-70">AND</span> {c.field} {c.operator} <span className="font-bold">{c.value}</span></div>
                  ))}
                  <div className="text-[var(--color-success)] font-bold mt-1">THEN <span className="underline decoration-dashed">{wf.action}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={wf.is_active === 1}
                      onChange={() => toggleMutation.mutate({ id: wf.id, is_active: wf.is_active === 0 })}
                      disabled={toggleMutation.isPending}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${wf.is_active === 1 ? 'bg-[var(--color-ink)]' : 'bg-[var(--color-border-subtle)]'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-[var(--color-paper)] w-4 h-4 rounded-full transition-transform ${wf.is_active === 1 ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>
            </Panel>
          ))}
        </div>

        <div className="grid gap-4 mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider">Action Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(templates || []).map((tpl: any) => (
               <Panel key={tpl.id} className="flex flex-col gap-2">
                 <div className="flex justify-between items-start">
                   <span className="font-bold text-sm uppercase">{tpl.template_name}</span>
                   <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">{tpl.action_type}</span>
                 </div>
                 <pre className="mt-2 bg-[var(--color-ink)]/5 p-2 text-xs font-mono overflow-auto opacity-80 whitespace-pre-wrap">
                   {JSON.stringify(JSON.parse(tpl.content_json), null, 2)}
                 </pre>
               </Panel>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  )
}
