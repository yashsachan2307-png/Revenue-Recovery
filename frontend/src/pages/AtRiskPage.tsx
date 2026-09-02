import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Drawer } from "../components/ui/Drawer"
import { AlertCircle, Clock, ChevronRight } from "lucide-react"

export function AtRiskPage() {
  const [selectedCase, setSelectedCase] = React.useState<any>(null);

  const { data: opportunities = [], isLoading: loading, isError } = useQuery({
    queryKey: ['recovery-opportunities'],
    queryFn: () => api.getRecoveryOpportunities()
  })

  if (isError) {
    return (
      <AppShell title="At Risk">
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase text-[var(--color-failure)]">
          [ SYSTEM ERROR: Failed to load data ]
        </div>
      </AppShell>
    );
  }

  const getAge = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    return `${hours}h`;
  };

  const getRiskBorderClass = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === 'high') return 'border-[var(--color-failure)] border-l-4';
    if (s === 'medium') return 'border-[var(--color-warning)] border-l-4';
    return 'border-[var(--color-success)] border-l-4';
  };

  const getRiskTextClass = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === 'high') return 'text-[var(--color-failure)]';
    if (s === 'medium') return 'text-[var(--color-warning)]';
    return 'text-[var(--color-success)]';
  };

  // KPIs
  const totalRisk = opportunities.reduce((acc: number, curr: any) => acc + (curr.amount_at_risk || 0), 0);
  const highRisk = opportunities.filter((o: any) => o.severity?.toLowerCase() === 'high').length;
  const mediumRisk = opportunities.filter((o: any) => o.severity?.toLowerCase() === 'medium').length;
  const lowRisk = opportunities.filter((o: any) => o.severity?.toLowerCase() === 'low').length;

  return (
    <AppShell title="At Risk">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest opacity-50">
          Loading Risk Data...
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
          
          {/* Top KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-2 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">High Risk</span>
              <span className="font-mono text-2xl text-[var(--color-failure)]">{highRisk}</span>
            </div>
            <div className="flex flex-col gap-2 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Medium Risk</span>
              <span className="font-mono text-2xl text-[var(--color-warning)]">{mediumRisk}</span>
            </div>
            <div className="flex flex-col gap-2 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Low Risk</span>
              <span className="font-mono text-2xl text-[var(--color-success)]">{lowRisk}</span>
            </div>
            <div className="flex flex-col gap-2 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-ink)] text-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">Total At Risk</span>
              <span className="font-mono text-2xl">{formatCurrency(totalRisk)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">Risk Assessment Queue</h2>
          </div>

          {/* Structured List */}
          <div className="flex flex-col gap-3">
            {opportunities.map((opp: any) => (
              <div 
                key={opp.id} 
                onClick={() => setSelectedCase(opp)}
                className={`grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-4 bg-[var(--color-paper)] border border-[var(--color-border-subtle)] border-l-2 cursor-pointer hover:bg-[var(--color-ink)]/5 transition-colors group ${getRiskBorderClass(opp.severity)}`}
              >
                {/* ID & Customer */}
                <div className="flex flex-col md:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Customer</span>
                  <span className="font-bold text-sm">{opp.customer_name}</span>
                  <span className="font-mono text-[10px] opacity-70 mt-1">{opp.id}</span>
                </div>
                
                {/* Amount */}
                <div className="flex flex-col md:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Amount</span>
                  <span className="font-mono text-lg font-black">{formatCurrency(opp.amount_at_risk)}</span>
                </div>

                {/* Failure Type */}
                <div className="flex flex-col md:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Failure Reason</span>
                  <span className="text-xs uppercase font-medium">{opp.failure_reason?.replace(/_/g, " ")}</span>
                </div>

                {/* Age */}
                <div className="flex flex-col md:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Detected</span>
                  <div className="flex items-center gap-1 text-sm font-mono">
                    <Clock className="h-3 w-3 opacity-60" />
                    <span>{getAge(opp.created_at)} ago</span>
                  </div>
                </div>

                {/* Severity & Action */}
                <div className="flex items-center justify-between md:col-span-1 border-l border-[var(--color-border-subtle)] pl-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-4 w-4 ${getRiskTextClass(opp.severity)}`} />
                    <span className={`text-xs font-bold uppercase ${getRiskTextClass(opp.severity)}`}>{opp.severity} RISK</span>
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
            
            {opportunities.length === 0 && (
              <div className="p-8 text-center border border-[var(--color-border-subtle)] text-sm uppercase font-mono opacity-50">
                No active risk cases found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer */}
      <Drawer
        isOpen={!!selectedCase}
        onClose={() => setSelectedCase(null)}
        title="Risk Analysis"
      >
        {selectedCase && (
          <div className="flex flex-col gap-8 pb-8">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Case Overview</span>
              <div className="grid grid-cols-2 gap-4 border border-[var(--color-border-subtle)] p-4">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest opacity-60">Amount</span>
                  <span className="font-mono text-xl">{formatCurrency(selectedCase.amount_at_risk)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest opacity-60">Severity</span>
                  <span className={`text-sm font-bold uppercase ${getRiskTextClass(selectedCase.severity)}`}>{selectedCase.severity}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Analysis Required</span>
              <div className="bg-[var(--color-ink)] text-[var(--color-paper)] p-4 font-mono text-xs">
                <p>To proceed with resolving this risk, please transition to the Agent Console for automated policy evaluation.</p>
                <button 
                  className="mt-4 px-4 py-2 bg-[var(--color-paper)] text-[var(--color-ink)] font-bold tracking-widest hover:opacity-90"
                  onClick={() => window.location.href = '/agent'}
                >
                  OPEN AGENT CONSOLE
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </AppShell>
  )
}
