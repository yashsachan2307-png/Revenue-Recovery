import * as React from "react"
import { AppShell } from "../layouts/AppShell"
import { MetricBlock } from "../components/ui/MetricBlock"
import { DataTable } from "../components/ui/DataTable"
import { api, type Transaction } from "../lib/api"
import { formatCurrency } from "../lib/utils"

export function OverviewPage() {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      try {
        const result = await api.getOverview()
        setData(result)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const renderRiskIndicator = (level: string) => {
    const l = level.toLowerCase();
    const color = l === 'high' ? 'text-red-500' : l === 'medium' ? 'text-amber-500' : 'text-emerald-500';
    return (
      <div className="flex items-center gap-2 font-mono text-xs uppercase font-bold">
        <span className={color}>●</span> {l}
      </div>
    );
  };

  const columns = [
    {
      header: "ID",
      accessorKey: "id",
      cell: (row: Transaction) => <span className="financial-number text-xs">{row.id}</span>
    },
    {
      header: "Customer",
      accessorKey: "customer",
    },
    {
      header: "Amount",
      accessorKey: "amount",
      align: "right" as const,
      cell: (row: Transaction) => <span className="financial-number">{formatCurrency(row.amount)}</span>
    },
    {
      header: "Risk",
      accessorKey: "riskLevel",
      cell: (row: Transaction) => renderRiskIndicator(row.riskLevel)
    },
    {
      header: "Reason",
      accessorKey: "failureReason",
      cell: (row: Transaction) => <span className="text-xs uppercase opacity-80">{row.failureReason?.replace(/_/g, " ")}</span>
    },
    {
      header: "Detected",
      accessorKey: "timestamp",
      cell: (row: Transaction) => <span className="text-xs opacity-70">{new Date(row.timestamp).toLocaleString()}</span>
    }
  ]

  const { metrics, recentIncidents, failureDistribution, riskDistribution, topCustomers } = data || {};

  return (
    <AppShell title="Merchant Recovery Operations">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest">
          Initializing System...
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              trendValue="Of Eligible Opportunities"
            />
            <MetricBlock
              label="Active Cases"
              value={metrics?.activeCases || 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
                <h2 className="text-lg font-bold uppercase tracking-wider">Recent Incidents</h2>
              </div>
              <DataTable columns={columns} data={recentIncidents || []} />
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2">Top Customers by Risk</h2>
                <div className="flex flex-col gap-3">
                  {(topCustomers || []).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-bold">{c.name}</span>
                        <span className="text-xs opacity-70">{c.opportunity_count} cases</span>
                      </div>
                      <span className="financial-number">{formatCurrency(c.revenue_at_risk)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2">Failure Breakdown</h2>
                <div className="flex flex-col gap-2">
                  {(failureDistribution || []).map((f: any) => (
                    <div key={f.category} className="flex items-center justify-between text-sm">
                      <span className="uppercase text-xs">{f.category?.replace(/_/g, " ")}</span>
                      <span className="financial-number">{formatCurrency(f.total_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2">Risk Summary</h2>
                <div className="flex flex-col gap-2">
                  {(riskDistribution || []).map((r: any) => (
                    <div key={r.severity} className="flex items-center justify-between text-sm">
                      {renderRiskIndicator(r.severity)}
                      <span className="financial-number">{formatCurrency(r.total_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
