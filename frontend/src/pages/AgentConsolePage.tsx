import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Terminal, Shield, Cpu, Play, FastForward, CheckSquare } from "lucide-react"

export function AgentConsolePage() {
  const [selectedCaseId, setSelectedCaseId] = React.useState<string | null>(null);

  const { data: cases = [], isLoading: loading, isError } = useQuery({
    queryKey: ['recovery-opportunities'],
    queryFn: () => api.getRecoveryOpportunities()
  })

  const [analyzing, setAnalyzing] = React.useState(false);
  const [analysisData, setAnalysisData] = React.useState<any>(null);

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
    
    fetch(`/api/recovery/cases/${selectedCaseId}/analyse`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        setAnalysisData(data);
        setAnalyzing(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error(err);
        setAnalyzing(false);
      });

    return () => { isMounted = false; };
  }, [selectedCaseId]);

  if (isError) {
    return (
      <AppShell title="Agent Console">
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase text-[var(--color-failure)]">
          [ SYSTEM ERROR: Failed to load data ]
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Agent Console">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase tracking-widest opacity-50">
          Initializing Console...
        </div>
      ) : (
        <div className="flex h-[calc(100vh-8rem)] gap-4">
          
          {/* Left: Queue */}
          <div className="w-1/4 border border-[var(--color-border-subtle)] flex flex-col bg-[var(--color-paper)]">
            <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest">Active Queue</span>
              <span className="text-xs font-mono bg-[var(--color-ink)] text-[var(--color-paper)] px-2 py-0.5">{cases.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {cases.map((c: any) => (
                <div 
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`p-3 border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors hover:bg-[var(--color-ink)]/5 ${selectedCaseId === c.id ? 'bg-[var(--color-ink)]/10 border-l-4 border-l-[var(--color-ink)]' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="font-mono text-xs">{c.id.substring(0,8)}</span>
                      <span className="font-mono font-bold text-xs">{formatCurrency(c.amount_at_risk)}</span>
                    </div>
                    <span className="text-[10px] uppercase opacity-70">{c.failure_reason?.replace(/_/g, " ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Analysis */}
          <div className="w-2/4 border border-[var(--color-border-subtle)] flex flex-col bg-[var(--color-paper)]">
            <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5 shrink-0 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <Cpu className="h-4 w-4" />
              Agent Analysis
            </div>
            <div className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] rounded-none m-4 shadow-inner">
              {analyzing ? (
                <div className="flex flex-col gap-2 opacity-70">
                  <span className="animate-pulse">{'>'} INITIALIZING AI CORE...</span>
                  <span className="animate-pulse delay-75">{'>'} FETCHING PAYMENT CONTEXT...</span>
                  <span className="animate-pulse delay-150">{'>'} RUNNING RISK MODELS...</span>
                </div>
              ) : analysisData ? (
                analysisData.error ? (
                  <div className="flex flex-col gap-2 text-[var(--color-failure)]">
                    <span className="font-bold">ANALYSIS FAILED</span>
                    <span>{analysisData.error}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="text-[#569cd6]">-- ANALYSIS COMPLETE --</div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[#4ec9b0]">Target ID:</span>
                      <span>{selectedCaseId}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[#4ec9b0]">Diagnostic Reasoning:</span>
                      <span>{analysisData.agentDecision?.reason}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[#4ec9b0]">Proposed Vector:</span>
                      <span className="text-[#ce9178]">"{analysisData.agentDecision?.recoveryType}"</span>
                    </div>

                    <div className="flex flex-col gap-1 mt-4">
                      <span className="text-[#4ec9b0]">Confidence Metric:</span>
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-48 bg-[#333] border border-[#555]">
                          <div className="h-full bg-[#4ec9b0]" style={{ width: `${analysisData.agentDecision?.confidence || 0}%` }}></div>
                        </div>
                        <span>{analysisData.agentDecision?.confidence || 0}%</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="opacity-50">Select a case to begin analysis.</div>
              )}
            </div>
          </div>

          {/* Right: Policy & Action */}
          <div className="w-1/4 border border-[var(--color-border-subtle)] flex flex-col bg-[var(--color-paper)]">
            <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5 shrink-0 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <Shield className="h-4 w-4" />
              Policy Evaluation
            </div>
            
            <div className="flex-1 flex flex-col p-4 gap-6">
              {analyzing ? (
                <div className="opacity-50 text-xs font-mono uppercase text-center mt-8">Waiting for agent output...</div>
              ) : analysisData && !analysisData.error ? (
                <>
                  <div className="flex flex-col gap-4 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5">
                    <div className="flex items-center gap-2 text-sm font-bold uppercase">
                      {analysisData.policyResult?.approved ? (
                        <><CheckSquare className="h-5 w-5 text-[var(--color-success)]" /> Policy Cleared</>
                      ) : (
                        <><Terminal className="h-5 w-5 text-[var(--color-failure)]" /> Policy Blocked</>
                      )}
                    </div>
                    <p className="text-sm opacity-80">{analysisData.policyResult?.reason}</p>
                  </div>

                  <div className="mt-auto flex flex-col gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Required Action</h3>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          fetch(`/api/recovery/cases/${selectedCaseId}/action`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(analysisData)
                          }).then(() => alert('Action executed!'));
                        }}
                        disabled={!analysisData.policyResult?.approved}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">
                        <Play className="h-4 w-4" />
                        Execute Auto Strategy
                      </button>
                      <button className="flex items-center justify-center gap-2 w-full py-3 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] text-[var(--color-ink)] font-bold text-xs uppercase tracking-widest hover:bg-[var(--color-ink)]/5 transition-colors">
                        <FastForward className="h-4 w-4" />
                        Escalate to Human
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

        </div>
      )}
    </AppShell>
  )
}
