import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { AppShell } from "../layouts/AppShell"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Drawer } from "../components/ui/Drawer"
import { ChevronRight, ArrowRight } from "lucide-react"

export function AtRiskPage() {
  const [selectedCase, setSelectedCase] = React.useState<any>(null);
  const navigate = useNavigate();

  const { data: allOpportunities = [], isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['recovery-opportunities'],
    queryFn: () => api.getRecoveryOpportunities()
  });

  if (isError) {
    return (
      <AppShell title="At Risk">
        <div className="max-w-4xl mx-auto p-6">
          <ErrorState
            title="Failed to load at-risk queue"
            message={error instanceof Error ? error.message : "Unable to retrieve at-risk cases."}
            onRetry={() => refetch()}
          />
        </div>
      </AppShell>
    );
  }

  // Filter only active at-risk cases
  const opportunities = allOpportunities.filter((o: any) => o.status !== 'recovered' && o.status !== 'failed');

  const getAge = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    return `${hours}h ago`;
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
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest opacity-50">
          Evaluating Risk Exposure...
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto p-6 pb-12">
          
          {/* Top KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">High Risk Exposure</span>
              <span className="font-mono text-2xl text-[var(--color-failure)]">{highRisk}</span>
              <span className="text-[10px] opacity-50 font-mono">Immediate manual review</span>
            </div>
            <div className="flex flex-col gap-1 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Medium Risk Exposure</span>
              <span className="font-mono text-2xl text-[var(--color-warning)]">{mediumRisk}</span>
              <span className="text-[10px] opacity-50 font-mono">Automated retry queue</span>
            </div>
            <div className="flex flex-col gap-1 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Low Risk Exposure</span>
              <span className="font-mono text-2xl text-[var(--color-success)]">{lowRisk}</span>
              <span className="text-[10px] opacity-50 font-mono">High recovery probability</span>
            </div>
            <div className="flex flex-col gap-1 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-ink)] text-[var(--color-paper)]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">Total Revenue at Risk</span>
              <span className="font-mono text-2xl">{formatCurrency(totalRisk)}</span>
              <span className="text-[10px] opacity-60 font-mono">{opportunities.length} open cases</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">
              Active Risk Assessment Queue ({opportunities.length})
            </h2>
          </div>

          {/* Structured List */}
          <div className="flex flex-col gap-3">
            {opportunities.length === 0 ? (
              <EmptyState
                title="Zero At-Risk Cases"
                message="No payment failures currently require intervention. All active transactions are healthy."
              />
            ) : (
              opportunities.map((opp: any) => (
                <div 
                  key={opp.id} 
                  onClick={() => setSelectedCase(opp)}
                  className={`grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-4 bg-[var(--color-paper)] border border-[var(--color-border-subtle)] cursor-pointer hover:bg-[var(--color-ink)]/5 transition-colors group ${getRiskBorderClass(opp.severity)}`}
                >
                  <div className="flex flex-col md:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Customer</span>
                    <span className="font-bold text-sm truncate">{opp.customer_name}</span>
                    <span className="font-mono text-[10px] opacity-50">{opp.id}</span>
                  </div>

                  <div className="flex flex-col md:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Amount</span>
                    <span className="font-mono text-base font-bold text-[var(--color-ink)]">{formatCurrency(opp.amount_at_risk)}</span>
                  </div>

                  <div className="flex flex-col md:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Failure Category</span>
                    <span className="text-xs font-mono uppercase">{opp.failure_reason?.replace(/_/g, " ") || opp.category}</span>
                  </div>

                  <div className="flex flex-col md:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Strategy</span>
                    <span className="text-xs font-medium">{opp.recommended_action?.replace(/_/g, " ")}</span>
                  </div>

                  <div className="flex items-center justify-between md:col-span-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] opacity-60 font-mono">{getAge(opp.created_at)}</span>
                      <span className={`text-xs font-bold uppercase ${getRiskTextClass(opp.severity)}`}>{opp.severity} RISK</span>
                    </div>
                    <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Drawer */}
      <Drawer
        isOpen={!!selectedCase}
        onClose={() => setSelectedCase(null)}
        title="Risk Analysis Details"
      >
        {selectedCase && (
          <div className="flex flex-col gap-8 pb-8">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Case Overview</span>
              <div className="grid grid-cols-2 gap-4 border border-[var(--color-border-subtle)] p-4">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest opacity-60">Amount at Risk</span>
                  <span className="font-mono text-xl font-bold">{formatCurrency(selectedCase.amount_at_risk)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest opacity-60">Severity Level</span>
                  <span className={`text-sm font-bold uppercase ${getRiskTextClass(selectedCase.severity)}`}>{selectedCase.severity}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">AI Resolution</span>
              <div className="bg-[var(--color-ink)] text-[var(--color-paper)] p-4 font-mono text-xs flex flex-col gap-3">
                <p>This case is queued for automated AI intervention and policy guardrail verification.</p>
                <button 
                  className="mt-2 px-4 py-2.5 bg-[var(--color-paper)] text-[var(--color-ink)] font-bold tracking-widest hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => navigate('/agent')}
                >
                  <span>Launch Agent Console</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}
