import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Download, TrendingUp, BarChart2, PieChart } from "lucide-react"

export function ReportsPage() {
  const [days, setDays] = useState<number>(30);

  const { data: reportData, isLoading: loading, isError } = useQuery({
    queryKey: ['reports-data', days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    }
  })

  // We need the top-level metrics which are still in /api/dashboard/summary for the selected range.
  // Wait, I can fetch both, or just calculate from trendData if I want, but I'll fetch summary too.
  const { data: summaryData } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getOverview()
  });

  const exportCSV = () => {
    const data = [
      ["Metric", "Value"],
      ["Revenue At Risk", summaryData?.metrics?.revenueAtRisk || 0],
      ["Recovered Revenue", summaryData?.metrics?.recoveredRevenue || 0],
      ["Recovery Rate", summaryData?.metrics?.recoveryRate || 0],
    ];
    let csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "merchant_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isError) {
    return (
      <AppShell title="Reports">
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase text-[var(--color-failure)]">
          [ SYSTEM ERROR: Failed to load data ]
        </div>
      </AppShell>
    );
  }

  const { failureBreakdown, methodBreakdown, bankBreakdown, riskCohorts, trendData } = reportData || {};
  const metrics = summaryData?.metrics;

  return (
    <AppShell title="Reports">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest opacity-50">
          Generating Analytics...
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
          
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold uppercase tracking-widest text-[var(--color-ink)]">Advanced Analytics</h1>
            </div>
            <div className="flex items-center gap-4">
              <select 
                className="text-xs font-bold uppercase px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] outline-none cursor-pointer"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
              <button 
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-bold uppercase hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Top Level KPIs with Trends */}
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 opacity-70" /> Performance Snapshot
              </h2>
              <div className="flex flex-col gap-4 border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)]">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Revenue At Risk</span>
                  <div className="flex items-end justify-between mt-2">
                    <span className="font-mono text-3xl font-black text-[var(--color-failure)]">{formatCurrency(metrics?.revenueAtRisk || 0)}</span>
                  </div>
                </div>
                <div className="h-px bg-[var(--color-border-subtle)] my-2"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Recovered Revenue</span>
                  <div className="flex items-end justify-between mt-2">
                    <span className="font-mono text-3xl font-black">{formatCurrency(metrics?.recoveredRevenue || 0)}</span>
                  </div>
                </div>
                <div className="h-px bg-[var(--color-border-subtle)] my-2"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Recovery Rate</span>
                  <div className="flex items-end justify-between mt-2">
                    <span className="font-mono text-3xl font-black">{metrics?.recoveryRate || 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Failure Breakdown Chart */}
            <div className="flex flex-col gap-4 lg:col-span-2">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="h-4 w-4 opacity-70" /> Revenue at Risk by Failure Reason
              </h2>
              <div className="flex flex-col border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] h-full justify-center gap-6">
                {(failureBreakdown || []).map((f: any) => {
                  const max = Math.max(...failureBreakdown.map((x: any) => x.total_amount));
                  const pct = Math.max(10, (f.total_amount / max) * 100);
                  return (
                    <div key={f.failure_reason} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="uppercase">{f.failure_reason?.replace(/_/g, " ")}</span>
                        <span className="font-mono">{formatCurrency(f.total_amount)} ({f.count} cases)</span>
                      </div>
                      <div className="h-4 w-full bg-[var(--color-border-subtle)]/30 overflow-hidden relative">
                        <div 
                          className="absolute top-0 left-0 h-full bg-[var(--color-ink)] transition-all duration-1000"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!failureBreakdown || failureBreakdown.length === 0) && (
                   <div className="text-center text-xs font-mono uppercase opacity-50 py-8">No Failure Data</div>
                )}
              </div>
            </div>

            {/* Bottom Row - Breakdowns */}
            <div className="flex flex-col gap-4 lg:col-span-1">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <PieChart className="h-4 w-4 opacity-70" /> Recovery by Method
              </h2>
              <div className="flex flex-col border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] h-full justify-start">
                 <div className="flex flex-col gap-4 text-sm font-mono">
                   {(methodBreakdown || []).map((m: any, i: number) => (
                     <div key={m.payment_method} className={`flex justify-between pb-2 ${i !== methodBreakdown.length - 1 ? 'border-b border-[var(--color-border-subtle)]' : ''}`}>
                       <span className="opacity-70 uppercase">{m.payment_method?.replace(/_/g, " ")}</span>
                       <span className="font-bold">{formatCurrency(m.total_amount)}</span>
                     </div>
                   ))}
                   {(!methodBreakdown || methodBreakdown.length === 0) && (
                      <div className="text-xs opacity-50 uppercase text-center mt-4">No data</div>
                   )}
                 </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-2">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="h-4 w-4 opacity-70" /> Top Failing Banks (Cohort Analysis)
              </h2>
              <div className="flex flex-col border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] h-full justify-start">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm font-mono">
                   {(bankBreakdown || []).map((b: any, i: number) => (
                     <div key={b.bank} className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                       <span className="opacity-70 uppercase">{b.bank}</span>
                       <span className="font-bold text-[var(--color-failure)]">{formatCurrency(b.total_amount)}</span>
                     </div>
                   ))}
                   {(!bankBreakdown || bankBreakdown.length === 0) && (
                      <div className="text-xs opacity-50 uppercase col-span-2 text-center mt-4">No bank data available</div>
                   )}
                 </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 lg:col-span-3">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="h-4 w-4 opacity-70" /> Risk Segments
              </h2>
              <div className="flex flex-col border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)]">
                <table className="w-full text-left text-sm font-mono">
                  <thead className="text-xs uppercase opacity-70 border-b border-[var(--color-border-subtle)]">
                    <tr>
                      <th className="pb-3">Risk Level</th>
                      <th className="pb-3 text-right">Failed Payments</th>
                      <th className="pb-3 text-right">Revenue at Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {(riskCohorts || []).map((r: any) => (
                      <tr key={r.risk_level}>
                        <td className={`py-3 uppercase font-bold ${r.risk_level === 'HIGH' ? 'text-[var(--color-failure)]' : r.risk_level === 'MEDIUM' ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                          ● {r.risk_level}
                        </td>
                        <td className="py-3 text-right">{r.failed_payments}</td>
                        <td className="py-3 text-right font-bold">{formatCurrency(r.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </AppShell>
  )
}
