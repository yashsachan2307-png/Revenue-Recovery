import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Shield, Cpu, Play, FastForward, CheckSquare, AlertTriangle, CheckCircle2 } from "lucide-react"

export function AgentConsolePage() {
  const [selectedCaseId, setSelectedCaseId] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: allCases = [], isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['recovery-opportunities'],
    queryFn: () => api.getRecoveryOpportunities()
  });

  const cases = allCases.filter((c: any) => c.status !== 'recovered');

  const [analyzing, setAnalyzing] = React.useState(false);
  const [analysisData, setAnalysisData] = React.useState<any>(null);
  const [isExecuting, setIsExecuting] = React.useState(false);

  React.useEffect(() => {
    if (cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId]);

  React.useEffect(() => {
    if (!selectedCaseId) return;
    
    let isMounted = true;
    setAnalyzing(true);
    setAnalysisData(null);
    
    api.analyzeCase(selectedCaseId)
      .then(data => {
        if (!isMounted) return;
        setAnalysisData(data);
        setAnalyzing(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setAnalysisData({ error: err.message || "Analysis request failed." });
        setAnalyzing(false);
      });

    return () => { isMounted = false; };
  }, [selectedCaseId]);

  if (isError) {
    return (
      <AppShell title="Agent Console">
        <div className="max-w-4xl mx-auto p-6">
          <ErrorState
            title="Failed to load agent console queue"
            message={error instanceof Error ? error.message : "Unable to retrieve opportunities for analysis."}
            onRetry={() => refetch()}
          />
        </div>
      </AppShell>
    );
  }

  const handleExecute = async (actionType: string) => {
    if (!selectedCaseId || !analysisData) return;
    setIsExecuting(true);

    try {
      await api.executeAction(selectedCaseId, {
        agentDecision: analysisData.agentDecision,
        policyResult: analysisData.policyResult,
        actionType
      });

      setAnalysisData({
        ...analysisData,
        executionResult: `Recovery strategy "${actionType}" committed successfully to gateway queue.`,
        auditEvent: `[${new Date().toISOString()}] AI_AGENT: Executed strategy ${actionType} on Case ${selectedCaseId}`
      });

      queryClient.invalidateQueries({ queryKey: ['recovery-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['recovery-stats'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    } catch (err: any) {
      alert(`Action execution failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AppShell title="Agent Console">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest opacity-50">
          Initializing AI Recovery Core...
        </div>
      ) : (
        <div className="flex h-[calc(100vh-8rem)] p-6 max-w-7xl mx-auto w-full gap-4">
          
          {/* Left: Queue */}
          <div className="w-1/4 border border-[var(--color-border-subtle)] flex flex-col bg-[var(--color-paper)]">
            <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest">Active Queue</span>
              <span className="text-xs font-mono bg-[var(--color-ink)] text-[var(--color-paper)] px-2 py-0.5">{cases.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {cases.length === 0 ? (
                <EmptyState title="Queue Empty" message="No pending cases for AI analysis." className="m-3" />
              ) : (
                cases.map((c: any) => (
                  <div 
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`p-3 border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors hover:bg-[var(--color-ink)]/5 ${selectedCaseId === c.id ? 'bg-[var(--color-ink)]/10 border-l-4 border-l-[var(--color-ink)]' : 'border-l-4 border-l-transparent'}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="font-mono text-xs font-bold">{c.id.substring(0, 12)}</span>
                        <span className="font-mono font-bold text-xs">{formatCurrency(c.amount_at_risk)}</span>
                      </div>
                      <span className="text-[10px] uppercase opacity-70 truncate">{c.failure_reason?.replace(/_/g, " ") || c.category}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Center: Analysis Terminal */}
          <div className="w-2/4 border border-[var(--color-border-subtle)] flex flex-col bg-[var(--color-paper)]">
            <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5 shrink-0 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <Cpu className="h-4 w-4" />
              Agent Diagnostic Engine
            </div>
            <div className="flex-1 overflow-y-auto p-6 font-mono text-xs bg-[#1e1e1e] text-[#d4d4d4] rounded-none m-4 shadow-inner">
              {analyzing ? (
                <div className="flex flex-col gap-2 opacity-75">
                  <span className="animate-pulse">{'>'} CONNECTING TO REVENUE INTELLIGENCE NODE...</span>
                  <span className="animate-pulse delay-75">{'>'} PARSING INDIAN BANKING ERROR CODE...</span>
                  <span className="animate-pulse delay-150">{'>'} CALCULATING OPTIMAL SMART RETRY WINDOW...</span>
                </div>
              ) : analysisData ? (
                analysisData.error ? (
                  <div className="flex flex-col gap-2 text-[var(--color-failure)]">
                    <span className="font-bold">DIAGNOSTIC FAILURE</span>
                    <span>{analysisData.error}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="text-[#569cd6] font-bold">-- AI INFERENCE PROTOCOL COMPLETE --</div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[#4ec9b0]">Target Case:</span>
                      <span className="text-white">{selectedCaseId}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[#4ec9b0]">Diagnostic Reasoning:</span>
                      <span className="text-[#dcdcaa] leading-relaxed">{analysisData.agentDecision?.explanation || "Autonomous evaluation determined temporary gateway bottleneck."}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[#4ec9b0]">Proposed Strategy:</span>
                      <span className="text-[#ce9178] font-bold">"{analysisData.agentDecision?.recommendedStrategy || "Wait & Retry"}"</span>
                    </div>

                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-[#4ec9b0]">Confidence Rating:</span>
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-48 bg-[#333] border border-[#555]">
                          <div className="h-full bg-[#4ec9b0]" style={{ width: `${Math.min(100, Math.round((analysisData.agentDecision?.confidence || 0.9) * 100))}%` }}></div>
                        </div>
                        <span className="text-[#4ec9b0] font-bold">{Math.min(100, Math.round((analysisData.agentDecision?.confidence || 0.9) * 100))}%</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="opacity-50">Select a case from the queue to start diagnostics.</div>
              )}
            </div>
          </div>

          {/* Right: Policy & Action */}
          <div className="w-1/4 border border-[var(--color-border-subtle)] flex flex-col bg-[var(--color-paper)]">
            <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5 shrink-0 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <Shield className="h-4 w-4" />
              Policy Guardrails
            </div>
            
            <div className="flex-1 flex flex-col p-4 gap-6">
              {analyzing ? (
                <div className="opacity-50 text-xs font-mono uppercase text-center mt-8">Verifying policies...</div>
              ) : analysisData && !analysisData.error ? (
                <>
                  <div className="flex flex-col gap-2 p-3 border border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase">
                      {analysisData.policyResult?.approved ? (
                        <span className="text-[var(--color-success)] flex items-center gap-1"><CheckSquare className="h-4 w-4" /> Policy Cleared</span>
                      ) : (
                        <span className="text-[var(--color-failure)] flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Policy Blocked</span>
                      )}
                    </div>
                    <p className="text-xs opacity-80 font-mono">{analysisData.policyResult?.reason || "Within pre-approved transaction limit threshold."}</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Execute Autonomous Action</h3>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleExecute(analysisData.agentDecision?.recommendedStrategy || "Wait & Retry")}
                        disabled={isExecuting || !analysisData.policyResult?.approved || !!analysisData.executionResult}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Play className="h-4 w-4" />
                        {isExecuting ? "Executing..." : "Execute Strategy"}
                      </button>

                      <button 
                        onClick={() => handleExecute("Escalate")}
                        disabled={isExecuting || !!analysisData.executionResult}
                        className="flex items-center justify-center gap-2 w-full py-2.5 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] text-[var(--color-ink)] font-bold text-xs uppercase tracking-widest hover:bg-[var(--color-ink)]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <FastForward className="h-4 w-4" />
                        Escalate to Review
                      </button>
                    </div>
                  </div>

                  {analysisData.executionResult && (
                    <div className="mt-2 flex flex-col gap-2 p-3 border border-[var(--color-border-subtle)] bg-[var(--color-ink)] text-[var(--color-paper)] font-mono text-[11px]">
                      <div className="text-[var(--color-success)] flex items-center gap-1 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ACTION COMMITTED
                      </div>
                      <div className="opacity-80">{analysisData.executionResult}</div>
                      <div className="mt-1 text-[#4ec9b0] text-[10px] break-words">{analysisData.auditEvent}</div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
