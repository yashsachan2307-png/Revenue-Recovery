import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Drawer } from "../components/ui/Drawer"
import { ChevronRight } from "lucide-react"

export function RecoveriesPage() {
  const [selectedCase, setSelectedCase] = React.useState<any>(null);

  const { data: cases = [], isLoading: loading, isError } = useQuery({
    queryKey: ['recovery-cases'],
    queryFn: () => api.getRecoveryOpportunities() // Note: assuming this endpoint returns all cases, adjust if there's a specific recoveries endpoint
  })

  if (isError) {
    return (
      <AppShell title="Recoveries">
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase text-[var(--color-failure)]">
          [ SYSTEM ERROR: Failed to load data ]
        </div>
      </AppShell>
    );
  }

  // Derive some mock recovery states based on existing data if the API doesn't provide them yet
  const enrichCase = (c: any) => {
    return {
      ...c,
      recovery_strategy: "Smart Retry & Email",
      attempts: Math.floor(Math.random() * 3) + 1,
      last_attempt: c.created_at, // Use creation as last attempt for demo
      outcome: c.recovery_status || "In Progress"
    };
  };

  const enrichedCases = cases.map(enrichCase);

  const totalOpportunity = enrichedCases.reduce((acc: number, curr: any) => acc + (curr.amount_at_risk || 0), 0);
  const recovered = totalOpportunity * 0.4; // Mock calculation
  const inProgress = totalOpportunity * 0.5; // Mock calculation
  const failed = totalOpportunity * 0.1; // Mock calculation

  const getOutcomeClass = (outcome: string) => {
    const o = outcome.toLowerCase();
    if (o.includes('recover')) return 'text-[var(--color-success)]';
    if (o.includes('fail')) return 'text-[var(--color-failure)]';
    return 'text-[var(--color-warning)]';
  };

  return (
    <AppShell title="Recoveries">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest opacity-50">
          Loading Data...
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
            <div className="flex flex-col gap-2 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-ink)] text-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">Total Opportunity</span>
              <span className="font-mono text-xl">{formatCurrency(totalOpportunity)}</span>
            </div>
            <div className="flex flex-col gap-2 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Recovered</span>
              <span className="font-mono text-xl text-[var(--color-success)]">{formatCurrency(recovered)}</span>
            </div>
            <div className="flex flex-col gap-2 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">In Progress</span>
              <span className="font-mono text-xl text-[var(--color-warning)]">{formatCurrency(inProgress)}</span>
            </div>
            <div className="flex flex-col gap-2 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Failed to Recover</span>
              <span className="font-mono text-xl text-[var(--color-failure)]">{formatCurrency(failed)}</span>
            </div>
          </div>

          {/* Main Table */}
          <div className="flex-1 overflow-auto border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
            <table className="w-full text-left text-sm relative">
              <thead className="sticky top-0 bg-[var(--color-paper)] border-b border-[var(--color-border-subtle)] z-10 text-xs uppercase tracking-wider text-[var(--color-ink)]/70">
                <tr>
                  <th className="px-4 py-3 font-bold">Case ID</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold text-right">Amount</th>
                  <th className="px-4 py-3 font-bold">Failure</th>
                  <th className="px-4 py-3 font-bold">Strategy</th>
                  <th className="px-4 py-3 font-bold text-center">Attempts</th>
                  <th className="px-4 py-3 font-bold">Last Attempt</th>
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
                    <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                    <td className="px-4 py-3 font-medium">{c.customer_name}</td>
                    <td className="px-4 py-3 font-mono text-right">{formatCurrency(c.amount_at_risk)}</td>
                    <td className="px-4 py-3 text-xs uppercase opacity-80">{c.failure_reason?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-xs font-medium">{c.recovery_strategy}</td>
                    <td className="px-4 py-3 text-center font-mono">{c.attempts}</td>
                    <td className="px-4 py-3 text-xs opacity-70">{new Date(c.last_attempt).toLocaleString()}</td>
                    <td className="px-4 py-3 flex justify-between items-center">
                      <span className={`text-xs font-bold uppercase ${getOutcomeClass(c.outcome)}`}>{c.outcome}</span>
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-paper)] bg-[var(--color-ink)]"></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold uppercase">Action Taken</span>
                    <span className="font-mono text-[10px] opacity-60">{new Date(new Date(selectedCase.created_at).getTime() + 5000).toLocaleString()}</span>
                    <span className="text-xs mt-1">Retry scheduled for optimal time window based on BIN logic.</span>
                  </div>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-paper)] ${selectedCase.outcome.includes('Recovered') ? 'bg-[var(--color-success)]' : selectedCase.outcome.includes('Failed') ? 'bg-[var(--color-failure)]' : 'bg-[var(--color-warning)] animate-pulse'}`}></div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold uppercase ${getOutcomeClass(selectedCase.outcome)}`}>{selectedCase.outcome}</span>
                    <span className="font-mono text-[10px] opacity-60">{new Date(new Date(selectedCase.created_at).getTime() + 3600000).toLocaleString()}</span>
                    {selectedCase.outcome === 'In Progress' && <span className="text-xs mt-1">Waiting for retry execution...</span>}
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
  )
}
