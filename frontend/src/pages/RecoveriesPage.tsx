import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Drawer } from "../components/ui/Drawer"
import { ChevronRight } from "lucide-react"

export function RecoveriesPage() {
  const [selectedCase, setSelectedCase] = React.useState<any>(null);

  const { data: cases = [], isLoading: loadingCases, isError: isCasesError, error: casesError, refetch: refetchCases } = useQuery({
    queryKey: ['recovery-cases'],
    queryFn: () => api.getRecoveryOpportunities()
  });

  const { data: stats, isLoading: loadingStats, isError: isStatsError, refetch: refetchStats } = useQuery({
    queryKey: ['recovery-stats'],
    queryFn: () => api.getRecoveryStats()
  });

  const loading = loadingCases || loadingStats;
  const isError = isCasesError || isStatsError;

  if (isError) {
    return (
      <AppShell title="Recoveries">
        <div className="max-w-4xl mx-auto p-6">
          <ErrorState
            title="Failed to load recovery telemetry"
            message={casesError instanceof Error ? casesError.message : "Unable to reach recovery operations API."}
            onRetry={() => {
              refetchCases();
              refetchStats();
            }}
          />
        </div>
      </AppShell>
    );
  }

  const enrichCase = (c: any) => {
    let outcome = "In Progress";
    if (c.status === "recovered") outcome = "Recovered";
    else if (c.status === "failed") outcome = "Failed";
    else if (c.status === "action_pending") outcome = "Action Scheduled";
    else if (c.status === "recommended") outcome = "Recommended";

    return {
      ...c,
      recovery_strategy: c.recommended_action?.replace(/_/g, " ") || "Smart Retry Window",
      attempts: c.status === "recovered" ? 2 : 1,
      last_attempt: c.created_at,
      outcome
    };
  };

  const enrichedCases = cases.map(enrichCase);

  // Live Database Stats
  const totalOpportunity = stats?.totalOpportunity || enrichedCases.reduce((acc: number, curr: any) => acc + (curr.amount_at_risk || 0), 0);
  const recovered = stats?.recovered || 0;
  const inProgress = stats?.inProgress || 0;
  const failed = stats?.failed || 0;

  const getOutcomeClass = (outcome: string) => {
    const o = outcome.toLowerCase();
    if (o.includes('recover')) return 'text-[var(--color-success)]';
    if (o.includes('fail')) return 'text-[var(--color-failure)]';
    return 'text-[var(--color-warning)]';
  };

  return (
    <AppShell title="Recoveries">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest opacity-50">
          Loading Recovery Telemetry...
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-8rem)] p-6 max-w-7xl mx-auto w-full">
          
          {/* Live Database KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
            <div className="flex flex-col gap-1 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-ink)] text-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">Total Opportunity</span>
              <span className="font-mono text-xl">{formatCurrency(totalOpportunity)}</span>
              <span className="text-[10px] opacity-60 font-mono">{stats?.totalCases || enrichedCases.length} total cases</span>
            </div>
            <div className="flex flex-col gap-1 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Recovered</span>
              <span className="font-mono text-xl text-[var(--color-success)]">{formatCurrency(recovered)}</span>
              <span className="text-[10px] text-[var(--color-success)] font-mono">{stats?.recoveredCount || 0} resolved successfully</span>
            </div>
            <div className="flex flex-col gap-1 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">In Progress</span>
              <span className="font-mono text-xl text-[var(--color-warning)]">{formatCurrency(inProgress)}</span>
              <span className="text-[10px] text-[var(--color-warning)] font-mono">{stats?.inProgressCount || 0} active in pipeline</span>
            </div>
            <div className="flex flex-col gap-1 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Failed to Recover</span>
              <span className="font-mono text-xl text-[var(--color-failure)]">{formatCurrency(failed)}</span>
              <span className="text-[10px] text-[var(--color-failure)] font-mono">{stats?.failedCount || 0} exhausted retries</span>
            </div>
          </div>

          {/* Main Table */}
          <div className="flex-1 overflow-auto border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
            {enrichedCases.length === 0 ? (
              <EmptyState title="No Recovery Cases" message="There are currently no recovery opportunities recorded in the database." />
            ) : (
              <table className="w-full text-left text-sm relative">
                <thead className="sticky top-0 bg-[var(--color-paper)] border-b border-[var(--color-border-subtle)] z-10 text-xs uppercase tracking-wider text-[var(--color-ink)]/70">
                  <tr>
                    <th className="px-4 py-3 font-bold">Case ID</th>
                    <th className="px-4 py-3 font-bold">Customer</th>
                    <th className="px-4 py-3 font-bold text-right">Amount</th>
                    <th className="px-4 py-3 font-bold">Failure</th>
                    <th className="px-4 py-3 font-bold">Strategy</th>
                    <th className="px-4 py-3 font-bold text-center">Attempts</th>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {enrichedCases.map((c: any) => (
                    <tr 
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className="hover:bg-[var(--color-ink)]/5 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold">{c.id}</td>
                      <td className="px-4 py-3 font-medium">{c.customer_name}</td>
                      <td className="px-4 py-3 font-mono text-right font-bold">{formatCurrency(c.amount_at_risk)}</td>
                      <td className="px-4 py-3 text-xs uppercase opacity-80">{c.failure_reason?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-xs font-medium">{c.recovery_strategy}</td>
                      <td className="px-4 py-3 text-center font-mono">{c.attempts}</td>
                      <td className="px-4 py-3 text-xs opacity-70 font-mono">{new Date(c.last_attempt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 flex justify-between items-center">
                        <span className={`text-xs font-bold uppercase ${getOutcomeClass(c.outcome)}`}>{c.outcome}</span>
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Details Drawer */}
      <Drawer
        isOpen={!!selectedCase}
        onClose={() => setSelectedCase(null)}
        title="Recovery Operations"
      >
        {selectedCase && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start border-b border-[var(--color-border-subtle)] pb-4">
              <div className="flex flex-col">
                <span className="font-mono text-lg font-bold">{selectedCase.id}</span>
                <span className="text-sm font-medium">{selectedCase.customer_name}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-xl font-black">{formatCurrency(selectedCase.amount_at_risk)}</span>
                <span className={`block text-xs font-bold uppercase mt-1 ${getOutcomeClass(selectedCase.outcome)}`}>{selectedCase.outcome}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 border-b border-[var(--color-border-subtle)] pb-2">Operations Timeline</h3>
              <div className="flex flex-col border-l-2 border-[var(--color-border-subtle)] ml-2 pl-4 space-y-6 pt-2">
                
                <div className="relative">
                  <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-paper)] bg-[var(--color-ink)]"></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold uppercase">Detected</span>
                    <span className="font-mono text-[10px] opacity-60">{new Date(selectedCase.created_at).toLocaleString()}</span>
                    <span className="text-xs mt-1">Payment failed due to {selectedCase.failure_reason?.replace(/_/g, " ")}.</span>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-paper)] bg-[var(--color-ink)]"></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold uppercase">Analysed</span>
                    <span className="font-mono text-[10px] opacity-60">{new Date(new Date(selectedCase.created_at).getTime() + 1000).toLocaleString()}</span>
                    <span className="text-xs mt-1">AI agent evaluated customer history and risk profile.</span>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-paper)] bg-[var(--color-ink)]"></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold uppercase">Strategy Selected</span>
                    <span className="font-mono text-[10px] opacity-60">{new Date(new Date(selectedCase.created_at).getTime() + 2000).toLocaleString()}</span>
                    <span className="text-xs mt-1 font-medium text-[var(--color-ink)]">{selectedCase.recovery_strategy}</span>
                  </div>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-paper)] ${selectedCase.outcome.includes('Recover') ? 'bg-[var(--color-success)]' : selectedCase.outcome.includes('Fail') ? 'bg-[var(--color-failure)]' : 'bg-[var(--color-warning)] animate-pulse'}`}></div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold uppercase ${getOutcomeClass(selectedCase.outcome)}`}>{selectedCase.outcome}</span>
                    <span className="font-mono text-[10px] opacity-60">{new Date(new Date(selectedCase.created_at).getTime() + 3600000).toLocaleString()}</span>
                    {selectedCase.outcome === 'In Progress' && <span className="text-xs mt-1">Waiting for retry execution...</span>}
                    {selectedCase.outcome === 'Action Scheduled' && <span className="text-xs mt-1">Retry attempt queued in scheduler.</span>}
                    {selectedCase.outcome === 'Recovered' && <span className="text-xs mt-1">Funds successfully captured.</span>}
                    {selectedCase.outcome === 'Failed' && <span className="text-xs mt-1">All retry attempts exhausted. Marking as lost.</span>}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}
