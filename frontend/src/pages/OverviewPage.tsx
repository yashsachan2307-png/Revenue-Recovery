import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { MetricBlock } from "../components/ui/MetricBlock"
import { api, type Transaction } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Drawer } from "../components/ui/Drawer"
import { ChevronRight } from "lucide-react"

export function OverviewPage() {
  const [selectedIncident, setSelectedIncident] = React.useState<Transaction | null>(null);

  const { data, isLoading: loading, isError, error } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview()
  })

  if (isError) {
    return (
      <AppShell title="Overview">
        <div className="flex flex-col h-64 items-center justify-center font-mono text-sm uppercase text-[var(--color-failure)]">
          <div>[ SYSTEM ERROR: Failed to load data ]</div>
          <div className="mt-4 text-xs normal-case opacity-70">Error: {error instanceof Error ? error.message : String(error)}</div>
        </div>
      </AppShell>
    );
  }

  const renderRiskIndicator = (level: string) => {
    const l = level.toLowerCase();
    const color = l === 'high' ? 'text-[var(--color-failure)]' : l === 'medium' ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]';
    return (
      <div className={`flex items-center gap-2 font-mono text-xs uppercase font-bold ${color}`}>
        <span>●</span> {l}
      </div>
    );
  };

  const { metrics, recentIncidents, failureDistribution, topCustomers } = data || {};

  return (
    <AppShell title="Overview">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest opacity-50">
          Initializing System...
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto">
          {/* Executive KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricBlock
              label="Revenue at Risk"
              value={formatCurrency(metrics?.revenueAtRisk || 0)}
              trend="up"
              trendValue="Operational Exposure"
            />
            <MetricBlock
              label="Recovered Revenue"
              value={formatCurrency(metrics?.recoveredRevenue || 0)}
              trend="up"
              trendValue="Total Realized"
            />
            <MetricBlock
              label="Recovery Rate"
              value={`${metrics?.recoveryRate || 0}%`}
              trend="neutral"
              trendValue="Of Eligible Opps"
            />
            <MetricBlock
              label="Active Cases"
              value={metrics?.activeCases || 0}
            />
            <MetricBlock
              label="Today's Recoveries"
              value={formatCurrency((metrics?.recoveredRevenue || 0) * 0.05)} // Mocked for today
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">Recent Incidents</h2>
              </div>
              <div className="border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--color-ink)]/5 text-xs uppercase tracking-wider text-[var(--color-ink)]/70">
                    <tr>
                      <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">ID</th>
                      <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">Customer</th>
                      <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)] text-right">Amount</th>
                      <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">Risk</th>
                      <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">Reason</th>
                      <th className="px-4 py-3 font-bold border-b border-[var(--color-border-subtle)]">Detected At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {(recentIncidents || []).map((incident: Transaction) => (
                      <tr 
                        key={incident.id}
                        onClick={() => setSelectedIncident(incident)}
                        className="hover:bg-[var(--color-ink)]/5 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3 font-mono text-xs">{incident.id}</td>
                        <td className="px-4 py-3">{incident.customer}</td>
                        <td className="px-4 py-3 font-mono text-right">{formatCurrency(incident.amount)}</td>
                        <td className="px-4 py-3">{renderRiskIndicator(incident.riskLevel)}</td>
                        <td className="px-4 py-3 text-xs uppercase opacity-80">{incident.failureReason?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 flex justify-between items-center">
                          <span className="text-xs opacity-70">{new Date(incident.timestamp).toLocaleString()}</span>
                          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">Failure Breakdown</h2>
                <div className="flex flex-col gap-3">
                  {(failureDistribution || []).map((f: any) => (
                    <div key={f.category} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="uppercase opacity-80">{f.category?.replace(/_/g, " ")}</span>
                        <span className="font-mono">{formatCurrency(f.total_amount)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--color-border-subtle)]/30 rounded-none overflow-hidden">
                        <div 
                          className="h-full bg-[var(--color-ink)]/60"
                          style={{ width: `${Math.random() * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">Top Customers by Risk</h2>
                <div className="flex flex-col gap-3">
                  {(topCustomers || []).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 border border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{c.name}</span>
                        <span className="text-xs opacity-70">{c.opportunity_count} cases</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-[var(--color-failure)]">{formatCurrency(c.revenue_at_risk)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Details Drawer */}
      <Drawer
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title="Incident Details"
      >
        {selectedIncident && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col border border-[var(--color-border-subtle)] p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Payment ID</span>
                <span className="font-mono text-sm mt-1">{selectedIncident.id}</span>
              </div>
              <div className="flex flex-col border border-[var(--color-border-subtle)] p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Amount</span>
                <span className="font-mono text-sm mt-1">{formatCurrency(selectedIncident.amount)}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2">Failure Information</h3>
              <div className="grid grid-cols-2 gap-y-4 text-sm mt-2">
                <div className="flex flex-col">
                  <span className="opacity-60 text-xs">Customer</span>
                  <span className="font-medium">{selectedIncident.customer}</span>
                </div>
                <div className="flex flex-col">
                  <span className="opacity-60 text-xs">Reason</span>
                  <span className="font-medium uppercase">{selectedIncident.failureReason?.replace(/_/g, " ")}</span>
                </div>
                <div className="flex flex-col">
                  <span className="opacity-60 text-xs">Detected At</span>
                  <span className="font-medium font-mono">{new Date(selectedIncident.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="opacity-60 text-xs">Risk Level</span>
                  {renderRiskIndicator(selectedIncident.riskLevel)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2">Agent Action</h3>
              <div className="bg-[var(--color-ink)] text-[var(--color-paper)] p-4 font-mono text-xs mt-2">
                <p>{'>'} Analysing failure reason: {selectedIncident.failureReason}</p>
                <p className="text-[var(--color-warning)]">{'>'} Identifying potential retry window...</p>
                <p>{'>'} Recommended Strategy: {selectedIncident.recommendedAction}</p>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </AppShell>
  )
}
