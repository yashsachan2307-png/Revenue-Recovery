
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Download, TrendingUp, BarChart2, PieChart } from "lucide-react"

export function ReportsPage() {
  const { data: reportData, isLoading: loading, isError } = useQuery({
    queryKey: ['reports-data'],
    queryFn: async () => {
      // getOverview now includes failureDistribution directly
      const overviewData = await api.getOverview();
      return {
        ...overviewData,
        // Mocking some trend data for demo
        trends: {
          recoveryRate7d: "+2.4%",
          recoveredRevenue30d: "+15.8%"
        }
      };
    }
  })

  const exportCSV = () => {
    // Basic CSV export logic
    const data = [
      ["Metric", "Value"],
      ["Revenue At Risk", reportData?.metrics?.revenueAtRisk || 0],
      ["Recovered Revenue", reportData?.metrics?.recoveredRevenue || 0],
      ["Recovery Rate", reportData?.metrics?.recoveryRate || 0],
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

  const { metrics, failureDistribution, trends } = reportData || {};

  return (
    <AppShell title="Reports">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest opacity-50">
          Generating Reports...
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
          
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
            <div className="flex items-center gap-4">
              <button className="text-xs font-bold uppercase px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)]">Summary</button>
              <button className="text-xs font-bold uppercase px-4 py-2 border border-transparent hover:border-[var(--color-border-subtle)]">Failures</button>
              <button className="text-xs font-bold uppercase px-4 py-2 border border-transparent hover:border-[var(--color-border-subtle)]">Recoveries</button>
            </div>
            <div className="flex items-center gap-4">
              <select className="text-xs font-bold uppercase px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] outline-none cursor-pointer">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>This Quarter</option>
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
                <TrendingUp className="h-4 w-4 opacity-70" /> Performance
              </h2>
              <div className="flex flex-col gap-4 border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)]">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Recovered Revenue</span>
                  <div className="flex items-end justify-between mt-2">
                    <span className="font-mono text-3xl font-black">{formatCurrency(metrics?.recoveredRevenue || 0)}</span>
                    <span className="text-xs font-bold text-[var(--color-success)]">{trends?.recoveredRevenue30d} vs 30d</span>
                  </div>
                </div>
                <div className="h-px bg-[var(--color-border-subtle)] my-2"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Recovery Rate</span>
                  <div className="flex items-end justify-between mt-2">
                    <span className="font-mono text-3xl font-black">{metrics?.recoveryRate || 0}%</span>
                    <span className="text-xs font-bold text-[var(--color-success)]">{trends?.recoveryRate7d} vs 7d</span>
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
                {(failureDistribution || []).map((f: any) => (
                  <div key={f.category} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="uppercase">{f.category?.replace(/_/g, " ")}</span>
                      <span className="font-mono">{formatCurrency(f.total_amount)}</span>
                    </div>
                    <div className="h-4 w-full bg-[var(--color-border-subtle)]/30 overflow-hidden relative">
                      <div 
                        className="absolute top-0 left-0 h-full bg-[var(--color-ink)] transition-all duration-1000"
                        style={{ width: `${Math.random() * 80 + 10}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!failureDistribution || failureDistribution.length === 0) && (
                   <div className="text-center text-xs font-mono uppercase opacity-50 py-8">No Failure Data</div>
                )}
              </div>
            </div>

            {/* Bottom Row - Breakdowns */}
            <div className="flex flex-col gap-4 lg:col-span-1">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <PieChart className="h-4 w-4 opacity-70" /> Recovery by Method
              </h2>
              <div className="flex flex-col border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] h-full justify-center">
                 <div className="flex flex-col gap-4 text-sm font-mono">
                   <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                     <span className="opacity-70">UPI</span>
                     <span className="font-bold">65%</span>
                   </div>
                   <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                     <span className="opacity-70">CREDIT CARD</span>
                     <span className="font-bold">20%</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="opacity-70">NET BANKING</span>
                     <span className="font-bold">15%</span>
                   </div>
                 </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-2">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="h-4 w-4 opacity-70" /> Top Failing Banks
              </h2>
              <div className="flex flex-col border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] h-full justify-center">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm font-mono">
                   <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                     <span className="opacity-70">HDFC BANK</span>
                     <span className="font-bold text-[var(--color-failure)]">{formatCurrency(45000)}</span>
                   </div>
                   <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                     <span className="opacity-70">ICICI BANK</span>
                     <span className="font-bold text-[var(--color-failure)]">{formatCurrency(32000)}</span>
                   </div>
                   <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                     <span className="opacity-70">SBI</span>
                     <span className="font-bold text-[var(--color-failure)]">{formatCurrency(28000)}</span>
                   </div>
                   <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                     <span className="opacity-70">AXIS BANK</span>
                     <span className="font-bold text-[var(--color-failure)]">{formatCurrency(19000)}</span>
                   </div>
                 </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </AppShell>
  )
}
