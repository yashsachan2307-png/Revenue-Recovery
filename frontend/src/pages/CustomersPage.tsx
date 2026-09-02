import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Search, User, Mail, Phone, CreditCard, AlertTriangle, ShieldCheck } from "lucide-react"

export function CustomersPage() {
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);

  const { data: customers = [], isLoading: loading, isError } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.getCustomers()
  })

  // We need to fetch specific customer history here if backend supported it, but we'll use mock data derived from the customer for now
  const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId);

  React.useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  if (isError) {
    return (
      <AppShell title="Customers">
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase text-[var(--color-failure)]">
          [ SYSTEM ERROR: Failed to load data ]
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Customers">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest opacity-50">
          Loading Data...
        </div>
      ) : (
        <div className="flex h-[calc(100vh-8rem)] border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
          
          {/* Left: Customer List */}
          <div className="w-1/3 border-r border-[var(--color-border-subtle)] flex flex-col bg-[var(--color-paper)]">
            <div className="p-4 border-b border-[var(--color-border-subtle)] shrink-0">
              <div className="relative flex items-center text-[var(--color-ink)]/60">
                <Search className="absolute left-2 h-4 w-4" />
                <input 
                  type="text" 
                  placeholder="Search customers..." 
                  className="h-8 w-full rounded-none border border-[var(--color-border-subtle)] bg-transparent pl-8 pr-3 text-xs focus:border-[var(--color-ink)] focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {customers.map((c: any) => (
                <div 
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-4 border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors hover:bg-[var(--color-ink)]/5 ${selectedCustomerId === c.id ? 'bg-[var(--color-ink)]/10 border-l-4 border-l-[var(--color-ink)]' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{c.name}</span>
                      <span className="font-mono text-xs opacity-70 mt-1">{c.id}</span>
                    </div>
                    <span className={`text-xs font-bold uppercase ${c.risk_score > 70 ? 'text-[var(--color-failure)]' : c.risk_score > 40 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                      {c.risk_score > 70 ? 'High' : c.risk_score > 40 ? 'Med' : 'Low'} Risk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Customer Profile */}
          <div className="flex-1 flex flex-col bg-[var(--color-paper)] overflow-y-auto">
            {selectedCustomer ? (
              <div className="p-8 flex flex-col gap-8">
                
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-[var(--color-ink)]/10 border border-[var(--color-border-subtle)] flex items-center justify-center">
                      <User className="h-8 w-8 opacity-50" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h2 className="text-2xl font-black">{selectedCustomer.name}</h2>
                      <div className="flex items-center gap-4 text-xs font-mono opacity-70">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> cust_{selectedCustomer.id.substring(0, 5)}@email.com</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> +91 98765 43210</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Customer ID</span>
                    <span className="font-mono">{selectedCustomer.id}</span>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex flex-col p-4 border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1"><CreditCard className="h-3 w-3" /> Total Payments</span>
                    <span className="font-mono text-xl mt-2">{selectedCustomer.total_payments}</span>
                  </div>
                  <div className="flex flex-col p-4 border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Successful</span>
                    <span className="font-mono text-xl mt-2 text-[var(--color-success)]">{selectedCustomer.total_payments - selectedCustomer.failed_payments}</span>
                  </div>
                  <div className="flex flex-col p-4 border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Failed Payments</span>
                    <span className="font-mono text-xl mt-2 text-[var(--color-failure)]">{selectedCustomer.failed_payments}</span>
                  </div>
                  <div className="flex flex-col p-4 border border-[var(--color-border-subtle)] bg-[var(--color-ink)] text-[var(--color-paper)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Recovery Rate</span>
                    <span className="font-mono text-xl mt-2">{Math.floor(Math.random() * 40) + 40}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* Financial Metrics */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">Revenue Profile</h3>
                    <div className="flex flex-col text-sm border border-[var(--color-border-subtle)]">
                      <div className="flex justify-between p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5">
                        <span className="opacity-70 font-bold uppercase text-xs">Total Lifetime Value</span>
                        <span className="font-mono font-bold">{formatCurrency(selectedCustomer.total_payments * 2500)}</span>
                      </div>
                      <div className="flex justify-between p-3 border-b border-[var(--color-border-subtle)]">
                        <span className="opacity-70 font-bold uppercase text-xs">Revenue At Risk</span>
                        <span className="font-mono text-[var(--color-warning)]">{formatCurrency(selectedCustomer.failed_payments * 2500)}</span>
                      </div>
                      <div className="flex justify-between p-3">
                        <span className="opacity-70 font-bold uppercase text-xs">Recovered Revenue</span>
                        <span className="font-mono text-[var(--color-success)]">{formatCurrency(selectedCustomer.failed_payments * 2500 * 0.4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Failure History */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">Recent Failures</h3>
                    <div className="flex flex-col text-sm border border-[var(--color-border-subtle)]">
                      <div className="flex justify-between p-3 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-ink)]/5">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs opacity-60">2026-08-30</span>
                          <span className="text-[var(--color-failure)] font-bold text-xs uppercase">INSUFFICIENT FUNDS</span>
                        </div>
                        <span className="font-mono text-right">{formatCurrency(2500)}</span>
                      </div>
                      <div className="flex justify-between p-3 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-ink)]/5">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs opacity-60">2026-07-15</span>
                          <span className="text-[var(--color-failure)] font-bold text-xs uppercase">DO NOT HONOR</span>
                        </div>
                        <span className="font-mono text-right">{formatCurrency(4999)}</span>
                      </div>
                      <div className="p-3 text-center text-xs font-bold uppercase text-[var(--color-ink)]/50 cursor-pointer hover:bg-[var(--color-ink)]/5">
                        View All History
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center font-mono text-sm uppercase opacity-50">
                Select a customer to view profile
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
