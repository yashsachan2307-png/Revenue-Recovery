import * as React from "react"
import { AppShell } from "../layouts/AppShell"
import { DataTable } from "../components/ui/DataTable"
import { Badge } from "../components/ui/Badge"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"

export function RecoveriesPage() {
  const [opportunities, setOpportunities] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getRecoveryOpportunities() // Ideally filter by status or hit recovery-events
        setOpportunities(data)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const columns = [
    {
      header: "Recovery ID",
      accessorKey: "id",
      cell: (row: any) => <span className="financial-number text-xs">{row.id}</span>
    },
    {
      header: "Customer",
      accessorKey: "customer_name",
    },
    {
      header: "Payment",
      accessorKey: "payment_id",
      cell: (row: any) => <span className="financial-number text-xs opacity-70">{row.payment_id}</span>
    },
    {
      header: "Amount",
      accessorKey: "amount_at_risk",
      align: "right" as const,
      cell: (row: any) => <span className="financial-number">{formatCurrency(row.amount_at_risk)}</span>
    },
    {
      header: "Recovery Type",
      accessorKey: "recommended_action",
      cell: (row: any) => <span className="text-xs uppercase">{row.recommended_action?.replace(/_/g, " ")}</span>
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => (
        <span className={`text-xs font-bold uppercase ${row.status === 'recovered' ? 'text-emerald-500' : ''}`}>
          {row.status?.replace(/_/g, " ")}
        </span>
      )
    },
    {
      header: "Created",
      accessorKey: "created_at",
      cell: (row: any) => <span className="financial-number text-xs">{new Date(row.created_at).toLocaleString()}</span>
    },
    {
      header: "Updated",
      accessorKey: "updated_at",
      cell: (row: any) => <span className="financial-number text-xs">{new Date(row.updated_at).toLocaleString()}</span>
    }
  ]

  return (
    <AppShell title="Recoveries">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest">
          Loading Data...
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable columns={columns} data={opportunities} />
        </div>
      )}
    </AppShell>
  )
}
