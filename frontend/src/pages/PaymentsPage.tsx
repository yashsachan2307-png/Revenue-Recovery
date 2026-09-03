import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Drawer } from "../components/ui/Drawer"
import { Search, ChevronRight, Download } from "lucide-react"

export function PaymentsPage() {
  const [selectedPayment, setSelectedPayment] = React.useState<any>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const { data: payments = [], isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['payments', statusFilter],
    queryFn: () => api.getPayments(statusFilter === 'all' ? undefined : statusFilter)
  });

  if (isError) {
    return (
      <AppShell title="Payments">
        <div className="max-w-4xl mx-auto p-6">
          <ErrorState
            title="Failed to load payment transactions"
            message={error instanceof Error ? error.message : "Unable to retrieve payments from backend."}
            onRetry={() => refetch()}
          />
        </div>
      </AppShell>
    );
  }

  const filteredPayments = payments.filter((p: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.id?.toLowerCase().includes(q) ||
      p.customer_name?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q) ||
      p.bank?.toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    const headers = ["Payment ID", "Customer", "Amount", "Currency", "Method", "Bank", "Status", "Failure Reason", "Created At"];
    const rows = filteredPayments.map((p: any) => [
      p.id,
      `"${p.customer_name || ""}"`,
      p.amount,
      p.currency,
      p.payment_method,
      `"${p.bank || ""}"`,
      p.status,
      `"${p.failure_reason || ""}"`,
      p.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell title="Payments">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest opacity-50">
          Loading Transactions...
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-8rem)] p-6 max-w-7xl mx-auto w-full">
          {/* Top Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-[var(--color-border-subtle)] shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex items-center text-[var(--color-ink)]/60">
                <Search className="absolute left-2.5 h-4 w-4" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, customer, bank..." 
                  className="h-8 w-64 rounded-none border border-[var(--color-border-subtle)] bg-transparent pl-8 pr-3 text-xs focus:border-[var(--color-ink)] focus:outline-none transition-colors"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex border border-[var(--color-border-subtle)] text-xs font-mono">
                {["all", "failed", "recovered", "successful"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 font-bold uppercase transition-colors ${statusFilter === status ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : "hover:bg-[var(--color-ink)]/5 text-[var(--color-ink)]/70"}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV ({filteredPayments.length})
            </button>
          </div>

          {/* Main Table */}
          <div className="flex-1 overflow-auto border-x border-b border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
            {filteredPayments.length === 0 ? (
              <EmptyState title="No transactions found" message="Try adjusting your search query or status filter." />
            ) : (
              <table className="w-full text-left text-sm relative">
                <thead className="sticky top-0 bg-[var(--color-paper)] border-b border-[var(--color-border-subtle)] z-10 text-xs uppercase tracking-wider text-[var(--color-ink)]/70">
                  <tr>
                    <th className="px-4 py-3 font-bold">Payment ID</th>
                    <th className="px-4 py-3 font-bold">Customer</th>
                    <th className="px-4 py-3 font-bold">Method</th>
                    <th className="px-4 py-3 font-bold text-right">Amount</th>
                    <th className="px-4 py-3 font-bold">Bank</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {filteredPayments.map((p: any) => (
                    <tr 
                      key={p.id}
                      onClick={() => setSelectedPayment(p)}
                      className="hover:bg-[var(--color-ink)]/5 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold">{p.id}</td>
                      <td className="px-4 py-3 font-medium">{p.customer_name}</td>
                      <td className="px-4 py-3 text-xs uppercase font-mono">{p.payment_method?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 font-mono text-right font-bold">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 text-xs opacity-80">{p.bank || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {p.status === 'failed' ? (
                          <span className="text-[var(--color-failure)] font-bold uppercase">{p.failure_reason?.replace(/_/g, " ") || "FAILED"}</span>
                        ) : p.status === 'recovered' ? (
                          <span className="text-[var(--color-ink)] font-bold uppercase bg-[var(--color-ink)]/10 px-1.5 py-0.5">RECOVERED</span>
                        ) : (
                          <span className="text-[var(--color-success)] font-bold uppercase">SUCCESS</span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex justify-between items-center">
                        <span className="font-mono text-xs opacity-70">{new Date(p.created_at).toLocaleDateString()}</span>
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

      {/* Payment Drawer */}
      <Drawer
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Payment Details"
      >
        {selectedPayment && (
          <div className="flex flex-col gap-8 pb-8">
            <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xl font-bold">{selectedPayment.id}</span>
                <span className={`text-xs font-bold uppercase tracking-widest ${selectedPayment.status === 'failed' ? 'text-[var(--color-failure)]' : selectedPayment.status === 'recovered' ? 'text-[var(--color-ink)]' : 'text-[var(--color-success)]'}`}>
                  {selectedPayment.status}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-black">{formatCurrency(selectedPayment.amount)}</span>
                <div className="text-xs uppercase opacity-70 mt-1 font-mono">
                  {selectedPayment.payment_method?.replace(/_/g, " ")} • {selectedPayment.bank || "Indian Gateway"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Customer Information</h3>
                <div className="flex flex-col text-sm gap-2">
                  <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1">
                    <span className="opacity-70 text-xs">Customer</span>
                    <span className="font-medium text-xs">{selectedPayment.customer_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1">
                    <span className="opacity-70 text-xs">Attempt Number</span>
                    <span className="font-mono text-xs">Attempt #{selectedPayment.attempt_number || 1}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1">
                    <span className="opacity-70 text-xs">Created</span>
                    <span className="font-mono text-xs">{new Date(selectedPayment.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Transaction Telemetry</h3>
                <div className="flex flex-col text-sm gap-2">
                  <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1">
                    <span className="opacity-70 text-xs">Failure Reason</span>
                    <span className="uppercase text-[var(--color-failure)] font-bold text-xs">
                      {selectedPayment.failure_reason?.replace(/_/g, " ") || "NONE"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1">
                    <span className="opacity-70 text-xs">Acquiring Bank</span>
                    <span className="font-mono text-xs">{selectedPayment.bank || "Razorpay Route"}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedPayment.status === 'failed' && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Recovery Protocol</h3>
                <div className="bg-[var(--color-ink)] text-[var(--color-paper)] p-4 font-mono text-xs flex flex-col gap-2">
                  <div className="text-[var(--color-border-subtle)]">-- RECOVERY PROTOCOL EVALUATION --</div>
                  <div><span className="text-[var(--color-success)]">✓</span> Failure Reason: {selectedPayment.failure_reason}</div>
                  <div><span className="text-[var(--color-success)]">✓</span> Verified Indian Banking Gateway Node</div>
                  <div><span className="text-[var(--color-warning)]">!</span> Recommended Action: <span className="font-bold">SMART_RETRY_WINDOW</span></div>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}
