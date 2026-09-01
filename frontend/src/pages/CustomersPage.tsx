import * as React from "react"
import { AppShell } from "../layouts/AppShell"
import { DataTable } from "../components/ui/DataTable"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"

export function CustomersPage() {
  const [customers, setCustomers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getCustomers()
        setCustomers(data)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const columns = [
    {
      header: "Customer",
      accessorKey: "name",
      cell: (row: any) => (
        <div className="flex flex-col">
          <span>{row.name}</span>
          <span className="text-xs opacity-70 font-mono">{row.id}</span>
        </div>
      )
    },
    {
      header: "Lifetime Value",
      accessorKey: "lifetime_value",
      align: "right" as const,
      cell: (row: any) => <span className="financial-number">{formatCurrency(row.lifetime_value)}</span>
    },
    {
      header: "Payments",
      accessorKey: "successful_payments",
      align: "right" as const,
      cell: (row: any) => <span className="financial-number">{row.successful_payments + row.failed_payments}</span>
    },
    {
      header: "Failed Payments",
      accessorKey: "failed_payments",
      align: "right" as const,
      cell: (row: any) => (
        <span className={`financial-number ${row.failed_payments > 0 ? 'text-red-500' : ''}`}>
          {row.failed_payments}
        </span>
      )
    },
    {
      header: "Revenue at Risk",
      accessorKey: "revenue_at_risk",
      align: "right" as const,
      cell: (row: any) => <span className="financial-number">{formatCurrency(row.revenue_at_risk || 0)}</span>
    },
    {
      header: "Last Payment",
      accessorKey: "last_payment",
      cell: (row: any) => <span className="financial-number text-xs">{row.last_payment ? new Date(row.last_payment).toLocaleDateString() : '-'}</span>
    },
    {
      header: "Recovery Exposure",
      accessorKey: "revenue_at_risk",
      align: "right" as const,
      cell: (row: any) => <span className="financial-number text-amber-500">{formatCurrency(row.revenue_at_risk || 0)}</span>
    }
  ]

  return (
    <AppShell title="Customers">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest">
          Loading Data...
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable columns={columns} data={customers} />
        </div>
      )}
    </AppShell>
  )
}
