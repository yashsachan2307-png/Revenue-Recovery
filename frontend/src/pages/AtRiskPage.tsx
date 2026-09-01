import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { DataTable } from "../components/ui/DataTable"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { AgentConsole } from "../components/AgentConsole"

export function AtRiskPage() {
  const queryClient = useQueryClient()
  const [selectedOpportunityId, setSelectedOpportunityId] = React.useState<string | null>(null)

  const { data: opportunities = [], isLoading: loading, isError } = useQuery({
    queryKey: ['recovery-opportunities'],
    queryFn: () => api.getRecoveryOpportunities()
  })

  if (isError) {
    return (
      <AppShell title="At Risk">
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase text-red-500">
          [ SYSTEM ERROR: Failed to load data ]
        </div>
      </AppShell>
    );
  }

  const renderRiskIndicator = (level: string) => {
    const l = level.toLowerCase();
    const color = l === 'high' ? 'text-red-500' : l === 'medium' ? 'text-amber-500' : 'text-emerald-500';
    return (
      <div className="flex items-center gap-2 font-mono text-xs uppercase font-bold">
        <span className={color}>●</span> {l}
      </div>
    );
  };

  const getAge = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    return `${hours}h`;
  };

  const columns = [
    {
      header: "Recovery ID",
      accessorKey: "id",
      cell: (row: any) => <span className="financial-number text-xs cursor-pointer text-blue-500 hover:underline" onClick={() => setSelectedOpportunityId(row.id)}>{row.id}</span>
    },
    {
      header: "Customer",
      accessorKey: "customer_name",
    },
    {
      header: "Amount",
      accessorKey: "amount_at_risk",
      align: "right" as const,
      cell: (row: any) => <span className="financial-number">{formatCurrency(row.amount_at_risk)}</span>
    },
    {
      header: "Risk",
      accessorKey: "severity",
      cell: (row: any) => renderRiskIndicator(row.severity)
    },
    {
      header: "Failure",
      accessorKey: "failure_reason",
      cell: (row: any) => <span className="text-xs uppercase opacity-80">{row.failure_reason?.replace(/_/g, " ")}</span>
    },
    {
      header: "Detected",
      accessorKey: "created_at",
      cell: (row: any) => <span className="financial-number text-xs">{new Date(row.created_at).toLocaleString()}</span>
    },
    {
      header: "Age",
      accessorKey: "created_at",
      align: "right" as const,
      cell: (row: any) => <span className="financial-number text-xs">{getAge(row.created_at)}</span>
    },
    {
      header: "",
      accessorKey: "actions",
      cell: (row: any) => (
        <button 
          onClick={() => setSelectedOpportunityId(row.id)}
          className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          [ ANALYZE ]
        </button>
      )
    }
  ]

  return (
    <AppShell title="At Risk">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest">
          Loading Data...
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable columns={columns} data={opportunities} />
        </div>
      )}
      
      {selectedOpportunityId && (
        <AgentConsole 
          opportunityId={selectedOpportunityId} 
          onClose={() => setSelectedOpportunityId(null)}
          onComplete={() => {
            setSelectedOpportunityId(null);
            queryClient.invalidateQueries({ queryKey: ['recovery-opportunities'] });
          }}
        />
      )}
    </AppShell>
  )
}
