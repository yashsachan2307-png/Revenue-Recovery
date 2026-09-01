import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { DataTable } from "../components/ui/DataTable"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"

export function PaymentsPage() {
  const { data: payments = [], isLoading: loading, isError } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.getPayments()
  })

  if (isError) {
    return (
      <AppShell title="Payments">
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase text-red-500">
          [ SYSTEM ERROR: Failed to load data ]
        </div>
      </AppShell>
    );
  }

  const columns = [
    {
      header: "Payment ID",
      accessorKey: "id",
      cell: (row: any) => <span className="financial-number text-xs">{row.id}</span>
    },
    {
      header: "Customer",
      accessorKey: "customer_name",
    },
    {
      header: "Amount",
      accessorKey: "amount",
      align: "right" as const,
      cell: (row: any) => <span className="financial-number">{formatCurrency(row.amount)}</span>
    },
    {
      header: "Method",
      accessorKey: "payment_method",
      cell: (row: any) => <span className="text-xs uppercase">{row.payment_method?.replace(/_/g, " ")}</span>
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => (
        <span className={`text-xs font-bold uppercase ${row.status === 'failed' ? 'text-red-500' : 'text-emerald-500'}`}>
          {row.status}
        </span>
      )
    },
    {
      header: "Failure Reason",
      accessorKey: "failure_reason",
      cell: (row: any) => <span className="text-xs uppercase opacity-80">{row.failure_reason?.replace(/_/g, " ") || "-"}</span>
    },
    {
      header: "Created",
      accessorKey: "created_at",
      cell: (row: any) => <span className="financial-number text-xs">{new Date(row.created_at).toLocaleString()}</span>
    }
  ]

  return (
    <AppShell title="Payments">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest">
          Loading Data...
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable columns={columns} data={payments} />
        </div>
      )}
    </AppShell>
  )
}
