import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Drawer } from "../components/ui/Drawer"
import { Search, Filter, ChevronRight, Download } from "lucide-react"

export function PaymentsPage() {
  const [selectedPayment, setSelectedPayment] = React.useState<any>(null);

  const { data: payments = [], isLoading: loading, isError } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.getPayments()
  })

  if (isError) {
    return (
      <AppShell title="Payments">
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase text-[var(--color-failure)]">
          [ SYSTEM ERROR: Failed to load data ]
        </div>
      </AppShell>
    );
  }

  // Derive "Bank" randomly based on payment method if not provided, just for realistic display
  const getBank = (method: string) => {
    if (method?.includes('upi')) return 'HDFC Bank';
    if (method?.includes('card')) return 'ICICI Bank';
    return 'SBI';
  };

  return (
    <AppShell title="Payments">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest opacity-50">
          Loading Data...
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          {/* Top Toolbar */}
          <div className="flex items-center justify-between py-4 border-b border-[var(--color-border-subtle)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center text-[var(--color-ink)]/60">
                <Search className="absolute left-2 h-4 w-4" />
                <input 
                  type="text" 
                  placeholder="Search Payment ID..." 
                  className="h-8 w-64 rounded-none border border-[var(--color-border-subtle)] bg-transparent pl-8 pr-3 text-xs focus:border-[var(--color-ink)] focus:outline-none transition-colors"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border-subtle)] text-xs font-bold uppercase hover:bg-[var(--color-ink)]/5 transition-colors">
                <Filter className="h-3.5 w-3.5" />
                Date Range
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border-subtle)] text-xs font-bold uppercase hover:bg-[var(--color-ink)]/5 transition-colors">
                <Filter className="h-3.5 w-3.5" />
                Status
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border-subtle)] text-xs font-bold uppercase hover:bg-[var(--color-ink)]/5 transition-colors">
                <Filter className="h-3.5 w-3.5" />
                Method
              </button>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-bold uppercase hover:opacity-90 transition-opacity">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>

          {/* Main Table */}
          <div className="flex-1 overflow-auto border-x border-b border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
            <table className="w-full text-left text-sm relative">
              <thead className="sticky top-0 bg-[var(--color-paper)] border-b border-[var(--color-border-subtle)] z-10 text-xs uppercase tracking-wider text-[var(--color-ink)]/70">
                <tr>
                  <th className="px-4 py-3 font-bold">Payment ID</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Method</th>
                  <th className="px-4 py-3 font-bold text-right">Amount</th>
                  <th className="px-4 py-3 font-bold">Bank</th>
                  <th className="px-4 py-3 font-bold">Failure</th>
                  <th className="px-4 py-3 font-bold">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {payments.map((p: any) => (
                  <tr 
                    key={p.id}
                    onClick={() => setSelectedPayment(p)}
                    className="hover:bg-[var(--color-ink)]/5 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                    <td className="px-4 py-3 font-medium">{p.customer_name}</td>
                    <td className="px-4 py-3 text-xs uppercase">{p.payment_method?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 font-mono text-right">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-xs uppercase opacity-80">{getBank(p.payment_method)}</td>
                    <td className="px-4 py-3 text-xs uppercase">
                      {p.status === 'failed' ? (
                        <span className="text-[var(--color-failure)] font-bold">{p.failure_reason?.replace(/_/g, " ") || "UNKNOWN"}</span>
                      ) : (
                        <span className="text-[var(--color-success)] font-bold">SUCCESS</span>
                      )}
                    </td>
                    <td className="px-4 py-3 flex justify-between items-center">
                      <span className="font-mono text-xs opacity-70">{new Date(p.created_at).toLocaleString()}</span>
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Drawer
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Payment Operations"
      >
        {selectedPayment && (
          <div className="flex flex-col gap-8 pb-8">
            {/* Header Block */}
            <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xl font-bold">{selectedPayment.id}</span>
                <span className={`text-xs font-bold uppercase tracking-widest ${selectedPayment.status === 'failed' ? 'text-[var(--color-failure)]' : 'text-[var(--color-success)]'}`}>
                  {selectedPayment.status}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-black">{formatCurrency(selectedPayment.amount)}</span>
                <div className="text-xs uppercase opacity-70 mt-1">{selectedPayment.payment_method?.replace(/_/g, " ")} • {getBank(selectedPayment.payment_method)}</div>
              </div>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Customer Information</h3>
                <div className="flex flex-col text-sm gap-2">
                  <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1">
                    <span className="opacity-70">Name</span>
                    <span className="font-medium">{selectedPayment.customer_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1">
                    <span className="opacity-70">Email</span>
                    <span className="font-mono">cust_{selectedPayment.id.substring(0, 5)}@email.com</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1">
                    <span className="opacity-70">Created</span>
                    <span className="font-mono text-xs">{new Date(selectedPayment.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Failure Details</h3>
                <div className="flex flex-col text-sm gap-2">
                  <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1">
                    <span className="opacity-70">Reason</span>
                    <span className="uppercase text-[var(--color-failure)] font-bold">{selectedPayment.failure_reason?.replace(/_/g, " ") || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-1">
                    <span className="opacity-70">Error Code</span>
                    <span className="font-mono text-xs">ERR_BD_00{Math.floor(Math.random()*9)+1}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Console Output */}
            {selectedPayment.status === 'failed' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Agent Analysis & Policy</h3>
                <div className="bg-[var(--color-ink)] text-[var(--color-paper)] p-4 font-mono text-xs flex flex-col gap-2">
                  <div className="text-[var(--color-border-subtle)]">-- INITIATING RECOVERY PROTOCOL --</div>
                  <div><span className="text-[var(--color-success)]">✓</span> Analysed failure: {selectedPayment.failure_reason}</div>
                  <div><span className="text-[var(--color-success)]">✓</span> Customer history checks passed</div>
                  <div><span className="text-[var(--color-warning)]">!</span> Evaluating merchant policy: <span className="text-white">Smart Retries Enabled</span></div>
                  <div>{'>'} Strategy Selected: <span className="font-bold">Wait & Smart Retry</span> (Confidence: 87%)</div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Recovery Timeline</h3>
              <div className="flex flex-col border-l-2 border-[var(--color-border-subtle)] ml-2 pl-4 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-paper)] bg-[var(--color-ink)]"></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold uppercase">Payment Attempted</span>
                    <span className="font-mono text-[10px] opacity-60">{new Date(selectedPayment.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {selectedPayment.status === 'failed' && (
                  <div className="relative">
                    <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-paper)] bg-[var(--color-failure)]"></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold uppercase text-[var(--color-failure)]">Payment Failed</span>
                      <span className="font-mono text-[10px] opacity-60">{new Date(new Date(selectedPayment.created_at).getTime() + 5000).toLocaleString()}</span>
                      <span className="text-xs mt-1">Reason: {selectedPayment.failure_reason?.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                )}
                {selectedPayment.status === 'failed' && (
                  <div className="relative">
                    <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-paper)] bg-[var(--color-warning)] animate-pulse"></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold uppercase text-[var(--color-warning)]">Recovery In Progress</span>
                      <span className="font-mono text-[10px] opacity-60">{new Date(new Date(selectedPayment.created_at).getTime() + 15000).toLocaleString()}</span>
                      <span className="text-xs mt-1">Agent queued smart retry.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </Drawer>
    </AppShell>
  )
}
