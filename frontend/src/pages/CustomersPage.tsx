import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Search, User, Mail, Phone, CreditCard, AlertTriangle, ShieldCheck, History } from "lucide-react"

export function CustomersPage() {
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: customers = [], isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.getCustomers()
  });

  React.useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  // Fetch real customer payment history & recovery opportunities from database
  const { data: customerDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['customer-detail', selectedCustomerId],
    queryFn: () => selectedCustomerId ? api.getCustomerDetails(selectedCustomerId) : null,
    enabled: !!selectedCustomerId
  });

  if (isError) {
    return (
      <AppShell title="Customers">
        <div className="max-w-4xl mx-auto p-6">
          <ErrorState
            title="Failed to load customer registry"
            message={error instanceof Error ? error.message : "Unable to retrieve customers."}
            onRetry={() => refetch()}
          />
        </div>
      </AppShell>
    );
  }

  const filteredCustomers = customers.filter((c: any) => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const customer = customerDetails?.customer || customers.find((c: any) => c.id === selectedCustomerId);
  const payments = customerDetails?.payments || [];
  const opportunities = customerDetails?.opportunities || [];

  const recoveryRate = customer?.failed_payments > 0 
    ? Math.round(((opportunities.filter((o: any) => o.status === 'recovered').length) / customer.failed_payments) * 100) 
    : 100;

  return (
    <AppShell title="Customers">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest opacity-50">
          Loading Customer Registry...
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, ID..." 
                  className="h-8 w-full rounded-none border border-[var(--color-border-subtle)] bg-transparent pl-8 pr-3 text-xs focus:border-[var(--color-ink)] focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <EmptyState title="No match" message="No customer matches your search." className="m-4" />
              ) : (
                filteredCustomers.map((c: any) => {
                  const risk = c.risk_level?.toLowerCase() || 'low';
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <div 
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`p-4 border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors hover:bg-[var(--color-ink)]/5 ${isSelected ? 'bg-[var(--color-ink)]/10 border-l-4 border-l-[var(--color-ink)]' : 'border-l-4 border-l-transparent'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{c.name}</span>
                          <span className="font-mono text-[11px] opacity-60 mt-0.5">{c.email}</span>
                          <span className="font-mono text-[10px] opacity-40 mt-0.5">{c.id}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${risk === 'high' ? 'text-[var(--color-failure)]' : risk === 'medium' ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                          {risk} Risk
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Customer Profile */}
          <div className="flex-1 flex flex-col bg-[var(--color-paper)] overflow-y-auto">
            {customer ? (
              <div className="p-8 flex flex-col gap-8">
                
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-[var(--color-ink)]/5 border border-[var(--color-border-subtle)] flex items-center justify-center">
                      <User className="h-7 w-7 opacity-60 text-[var(--color-ink)]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h2 className="text-xl font-black">{customer.name}</h2>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono opacity-75">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {customer.email}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phone || "+91 98765 43210"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Customer ID</span>
                    <span className="font-mono text-xs">{customer.id}</span>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex flex-col p-4 border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1"><CreditCard className="h-3 w-3" /> Lifetime Value</span>
                    <span className="font-mono text-xl mt-2">{formatCurrency(customer.lifetime_value || 0)}</span>
                  </div>
                  <div className="flex flex-col p-4 border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Successful Payments</span>
                    <span className="font-mono text-xl mt-2 text-[var(--color-success)]">{customer.successful_payments || 0}</span>
                  </div>
                  <div className="flex flex-col p-4 border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Failed Payments</span>
                    <span className="font-mono text-xl mt-2 text-[var(--color-failure)]">{customer.failed_payments || 0}</span>
                  </div>
                  <div className="flex flex-col p-4 border border-[var(--color-border-subtle)] bg-[var(--color-ink)] text-[var(--color-paper)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Recovery Success</span>
                    <span className="font-mono text-xl mt-2">{recoveryRate}%</span>
                  </div>
                </div>

                {/* Real Payment History */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                      <History className="h-4 w-4 opacity-70" />
                      Live Transaction History ({payments.length})
                    </h3>
                  </div>

                  {loadingDetails ? (
                    <div className="font-mono text-xs opacity-50 py-4">Fetching ledger records...</div>
                  ) : payments.length === 0 ? (
                    <EmptyState title="No Transactions" message="No payment transactions logged for this customer." />
                  ) : (
                    <div className="border border-[var(--color-border-subtle)] overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[var(--color-ink)]/5 border-b border-[var(--color-border-subtle)] font-mono uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Payment ID</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Bank</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Failure Reason</th>
                            <th className="p-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-subtle)] font-mono">
                          {payments.map((p: any) => {
                            const isRecovered = p.status === 'recovered';
                            const isSuccess = p.status === 'successful';
                            return (
                              <tr key={p.id} className="hover:bg-[var(--color-ink)]/5">
                                <td className="p-3 font-bold">{p.id}</td>
                                <td className="p-3 uppercase">{p.payment_method}</td>
                                <td className="p-3">{p.bank || "—"}</td>
                                <td className="p-3 text-right font-bold">{formatCurrency(p.amount)}</td>
                                <td className="p-3">
                                  <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${isSuccess ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : isRecovered ? 'bg-[var(--color-ink)] text-[var(--color-paper)]' : 'bg-[var(--color-failure)]/10 text-[var(--color-failure)]'}`}>
                                    {p.status}
                                  </span>
                                </td>
                                <td className="p-3 text-[11px] opacity-70">{p.failure_reason || "—"}</td>
                                <td className="p-3 opacity-60 text-[11px]">{new Date(p.created_at).toLocaleDateString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-xs opacity-50">
                Select a customer to inspect profile
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
