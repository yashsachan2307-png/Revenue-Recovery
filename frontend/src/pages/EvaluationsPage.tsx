import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Panel, PanelHeader } from '../components/ui/Panel';
import { Play, CheckCircle2, XCircle } from 'lucide-react';
import { AppShell } from '../layouts/AppShell';

export function EvaluationsPage() {
  const queryClient = useQueryClient();

  const { data: runs, isLoading } = useQuery({
    queryKey: ['evaluations'],
    queryFn: async () => {
      const res = await fetch('/api/evaluations');
      if (!res.ok) throw new Error('Failed to fetch evaluations');
      return res.json();
    }
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/evaluations/run', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run evaluation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    }
  });

  const latestRun = runs?.[0];

  return (
    <AppShell title="Evaluations">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-[var(--color-ink)]">AI Evaluation Engine</h1>
            <p className="text-sm opacity-70 mt-1">
              Reproducible testing pipeline for deterministic and AI recovery logic.
            </p>
          </div>
          <button 
            onClick={() => runMutation.mutate()} 
            disabled={runMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
          >
            {runMutation.isPending ? 'Running 100 Cases...' : (
              <><Play className="h-4 w-4" /> Run New Evaluation</>
            )}
          </button>
        </div>

        {latestRun && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Accuracy" value={`${(latestRun.accuracy * 100).toFixed(1)}%`} />
              <MetricCard title="Precision" value={`${(latestRun.precision * 100).toFixed(1)}%`} />
              <MetricCard title="Recall" value={`${(latestRun.recall * 100).toFixed(1)}%`} />
              <MetricCard title="F1 Score" value={`${(latestRun.f1 * 100).toFixed(1)}%`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="False Positives" value={`${(latestRun.false_positive_rate * 100).toFixed(1)}%`} subtext="Action taken incorrectly" />
              <MetricCard title="False Negatives" value={`${(latestRun.false_negative_rate * 100).toFixed(1)}%`} subtext="Escalated incorrectly" />
              <MetricCard title="Policy Violations" value={latestRun.policy_violations} subtext="Blocked by Policy Engine" />
              <MetricCard title="Recovery Rate" value={`${(latestRun.successful_recovery_rate * 100).toFixed(1)}%`} subtext="Est. successful actions" />
            </div>

            <RunDetails runId={latestRun.id} />
          </>
        )}
      </div>
    </AppShell>
  );
}

function MetricCard({ title, value, subtext }: { title: string, value: string | number, subtext?: string }) {
  return (
    <Panel className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-widest opacity-60">{title}</span>
      <span className="text-3xl font-mono">{value}</span>
      {subtext && <span className="text-xs opacity-60">{subtext}</span>}
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
      <PanelHeader className="px-4 pt-4 text-[var(--color-ink)]">Case Results ({data.cases.length})</PanelHeader>
      <div className="border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-ink)]/5 text-xs uppercase tracking-wider text-[var(--color-ink)]/70">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">Case ID</th>
              <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">Failure Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">Expected Action</th>
              <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">Agent Action</th>
              <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">Policy Decision</th>
              <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">Correct</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {data.cases.map((c: any) => (
              <tr key={c.id} className="hover:bg-[var(--color-ink)]/5 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3 opacity-80 text-xs uppercase">{c.failure_category?.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 opacity-60 text-xs uppercase">{c.expected_action}</td>
                <td className="px-4 py-3 font-bold text-xs uppercase">{c.recommended_action}</td>
                <td className="px-4 py-3">
                  {c.policy_approved ? (
                    <span className="inline-flex items-center gap-1 text-[var(--color-success)] text-xs font-bold uppercase"><CheckCircle2 className="h-3 w-3" /> Approved</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[var(--color-failure)] text-xs font-bold uppercase"><XCircle className="h-3 w-3" /> Blocked</span>
                  )}
                  {!c.policy_approved && <div className="text-[10px] opacity-70 mt-1 uppercase">{c.policy_reason}</div>}
                </td>
                <td className="px-4 py-3">
                  {c.is_correct ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" /> : <XCircle className="h-4 w-4 text-[var(--color-failure)]" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
