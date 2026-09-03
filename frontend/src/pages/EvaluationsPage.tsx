import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Panel, PanelHeader } from '../components/ui/Panel';
import { Play, CheckCircle2, XCircle, ArrowRight, IndianRupee } from 'lucide-react';
import { AppShell } from '../layouts/AppShell';
import { formatCurrency } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export function EvaluationsPage() {
  const queryClient = useQueryClient();

  const { data: runs, isLoading } = useQuery({
    queryKey: ['evaluations'],
    queryFn: async () => {
      const token = localStorage.getItem('recoverai_auth_token');
      const res = await fetch('/api/evaluations', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch evaluations');
      return res.json();
    }
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('recoverai_auth_token');
      const res = await fetch('/api/evaluations/run', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to run evaluation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    }
  });

  const latestRun = runs?.[0];

  const chartData = latestRun ? [
    {
      name: 'Baseline',
      Recovered: latestRun.revenue_recovered_baseline,
      Lost: latestRun.revenue_at_risk - latestRun.revenue_recovered_baseline
    },
    {
      name: 'AI Agent',
      Recovered: latestRun.revenue_recovered_ai,
      Lost: latestRun.revenue_at_risk - latestRun.revenue_recovered_ai
    }
  ] : [];

  return (
    <AppShell title="Evaluations">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-[var(--color-ink)] flex items-center gap-2">
               Synthetic Evaluation
            </h1>
            <p className="text-sm opacity-70 mt-1">
              Deterministic batch evaluation demonstrating measurable revenue recovery vs. baseline rules.
            </p>
          </div>
          <button 
            onClick={() => runMutation.mutate()} 
            disabled={runMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
          >
            {runMutation.isPending ? 'Processing 500 Cases...' : (
              <><Play className="h-4 w-4" /> Run Evaluation</>
            )}
          </button>
        </div>

        {isLoading && <div className="animate-pulse">Loading runs...</div>}

        {latestRun && (
          <>
            {/* Revenue Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Total Cases" value={latestRun.total_cases} icon={<Play className="h-4 w-4" />} />
              <MetricCard title="Revenue at Risk" value={formatCurrency(latestRun.revenue_at_risk)} />
              <MetricCard title="AI Revenue Recovered" value={formatCurrency(latestRun.revenue_recovered_ai)} highlight={true} />
              <MetricCard title="AI Improvement" value={`+${(latestRun.improvement_percentage * 100).toFixed(1)}%`} highlight={true} subtext={`vs Baseline (${(latestRun.baseline_recovery_rate * 100).toFixed(1)}%)`} />
            </div>

            {/* Detailed Performance Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <MetricCard title="Baseline Recovery Rate" value={`${(latestRun.baseline_recovery_rate * 100).toFixed(1)}%`} subtext="Legacy Rules Engine" />
              <MetricCard title="AI Recovery Rate" value={`${(latestRun.ai_recovery_rate * 100).toFixed(1)}%`} subtext="AI Agent + Policy Engine" />
              <MetricCard title="AI Escalations" value={latestRun.escalations} subtext="Routed to manual review" />
              <MetricCard title="AI Policy Blocks" value={latestRun.policy_blocks} subtext="Actions rejected by constraints" />
            </div>

            {/* Visual Comparison */}
            <Panel className="mt-8 border-2 border-[var(--color-ink)]">
              <PanelHeader>Revenue Recovery Comparison</PanelHeader>
              <div className="h-80 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                    <YAxis tickFormatter={(val) => `₹${val/1000}k`} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      cursor={{fill: 'rgba(0,0,0,0.05)'}}
                      contentStyle={{ borderRadius: '0', border: '1px solid var(--color-ink)' }}
                    />
                    <Legend iconType="square" />
                    <Bar dataKey="Recovered" stackId="a" fill="var(--color-success)" />
                    <Bar dataKey="Lost" stackId="a" fill="var(--color-failure)" opacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <RunDetails runId={latestRun.id} />
          </>
        )}
      </div>
    </AppShell>
  );
}

function MetricCard({ title, value, subtext, icon, highlight }: { title: string, value: string | number, subtext?: string, icon?: React.ReactNode, highlight?: boolean }) {
  return (
    <Panel className={`flex flex-col gap-2 ${highlight ? 'bg-[var(--color-ink)] text-[var(--color-paper)]' : ''}`}>
      <span className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${highlight ? 'opacity-80' : 'opacity-60'}`}>
        {icon} {title}
      </span>
      <span className="text-3xl font-mono">{value}</span>
      {subtext && <span className={`text-xs ${highlight ? 'opacity-80' : 'opacity-60'}`}>{subtext}</span>}
    </Panel>
  );
}

function RunDetails({ runId }: { runId: string }) {
  const { data } = useQuery({
    queryKey: ['evaluations', runId],
    queryFn: async () => {
      const res = await fetch(`/api/evaluations/${runId}`);
      if (!res.ok) throw new Error('Failed to fetch run cases');
      return res.json();
    }
  });

  if (!data) return null;

  return (
    <Panel className="mt-8 p-0 border-0">
      <PanelHeader className="px-4 pt-4 text-[var(--color-ink)] flex items-center gap-2">
        Case Audit Log <span className="text-xs font-mono bg-[var(--color-ink)]/10 px-2 py-0.5 rounded-full">{data.cases.length} records</span>
      </PanelHeader>
      <div className="border border-[var(--color-border-subtle)] bg-[var(--color-paper)] mt-4">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-ink)]/5 text-[10px] uppercase tracking-wider font-bold opacity-80">
            <tr>
              <th className="px-4 py-3 border-b border-[var(--color-border-subtle)]">Case ID</th>
              <th className="px-4 py-3 border-b border-[var(--color-border-subtle)]">Amount</th>
              <th className="px-4 py-3 border-b border-[var(--color-border-subtle)]">Failure Reason</th>
              <th className="px-4 py-3 border-b border-[var(--color-border-subtle)]">Baseline Action</th>
              <th className="px-4 py-3 border-b border-[var(--color-border-subtle)]">AI Action</th>
              <th className="px-4 py-3 border-b border-[var(--color-border-subtle)]">Policy Block</th>
              <th className="px-4 py-3 border-b border-[var(--color-border-subtle)] text-right">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {data.cases.slice(0, 100).map((c: any) => (
              <tr key={c.id} className="hover:bg-[var(--color-ink)]/5 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3 font-mono text-xs font-bold">{formatCurrency(c.amount_at_risk)}</td>
                <td className="px-4 py-3 opacity-80 text-xs uppercase">{c.failure_category?.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 opacity-60 text-xs uppercase">{c.baseline_action}</td>
                <td className="px-4 py-3 font-bold text-[var(--color-ink)] text-xs uppercase flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 opacity-50" /> {c.ai_action}
                </td>
                <td className="px-4 py-3">
                  {!c.policy_approved && <span className="inline-flex items-center gap-1 text-[var(--color-failure)] text-[10px] font-bold uppercase"><XCircle className="h-3 w-3" /> Blocked</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.ai_success ? (
                    <span className="text-[var(--color-success)] text-xs font-bold uppercase flex items-center gap-1 justify-end"><CheckCircle2 className="h-3 w-3" /> Recovered</span>
                  ) : c.ai_action === 'Escalate' ? (
                     <span className="opacity-60 text-xs font-bold uppercase">Escalated</span>
                  ) : (
                    <span className="text-[var(--color-failure)] text-xs font-bold uppercase flex items-center gap-1 justify-end"><XCircle className="h-3 w-3" /> Failed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.cases.length > 100 && (
          <div className="p-4 text-center text-xs font-bold opacity-60 uppercase tracking-widest bg-[var(--color-ink)]/5">
            Showing first 100 cases
          </div>
        )}
      </div>
    </Panel>
  );
}
