import * as React from "react"
import { Button } from "./ui/Button"

interface AgentConsoleProps {
  opportunityId: string | null;
  onClose: () => void;
  onComplete: () => void;
}

export function AgentConsole({ opportunityId, onClose, onComplete }: AgentConsoleProps) {
  const [analyzing, setAnalyzing] = React.useState(true)
  const [executing, setExecuting] = React.useState(false)
  const [data, setData] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)
  
  React.useEffect(() => {
    if (!opportunityId) return;
    
    async function analyze() {
      setAnalyzing(true)
      try {
        const response = await fetch(`http://localhost:3001/api/recovery/${opportunityId}/analyze`, {
          method: 'POST'
        })
        const result = await response.json()
        setData(result)
      } catch (e) {
        setError("Failed to fetch recommendation")
      } finally {
        setAnalyzing(false)
        setAnalyzing(false)
      }
    }
    
    analyze()
  }, [opportunityId])

  if (!opportunityId) return null;

  const handleExecute = async (overrideAction?: string) => {
    if (!data) return;
    setExecuting(true)
    try {
      const payload = {
        agentDecision: overrideAction ? { ...data.agentDecision, recoveryType: overrideAction } : data.agentDecision,
        policyResult: overrideAction ? { ...data.policyResult, finalAction: overrideAction } : data.policyResult
      }
      await fetch(`http://localhost:3001/api/recovery/${opportunityId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      onComplete()
    } catch (e) {
      setError("Failed to execute action")
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-paper)] border border-[var(--color-border-subtle)] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between sticky top-0 bg-[var(--color-paper)] z-10">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[var(--color-ink)] animate-pulse" />
            <h2 className="font-bold uppercase tracking-widest text-sm">AI Agent Console</h2>
          </div>
          <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity uppercase text-xs font-bold tracking-widest">
            Close
          </button>
        </div>

        {error && (
          <div className="p-4 bg-[var(--color-failure)]/10 text-[var(--color-failure)] border-b border-[var(--color-failure)] text-xs font-mono">
            Error: {error}
          </div>
        )}

        {analyzing ? (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100"></div>
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
              Initializing AI Analysis...
            </p>
          </div>
        ) : data ? (
          <div className="mt-6 flex flex-col gap-8 font-mono text-sm">
            
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Active Case</h3>
              <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="flex justify-between"><span className="opacity-70">Opportunity ID</span><span className="font-bold">{opportunityId.substring(0,8)}</span></div>
                <div className="flex justify-between"><span className="opacity-70">Action</span><span className="font-bold text-amber-500">{data.policyResult?.finalAction?.replace(/_/g, " ")}</span></div>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Agent Assessment</h3>
              <div className="flex flex-col gap-2 border-l-2 border-zinc-900 pl-4 dark:border-zinc-100">
                <p><span className="opacity-70">Likely Cause:</span> {data.agentDecision?.reason}</p>
                <p><span className="opacity-70">Strategy:</span> <span className="font-bold">{data.agentDecision?.recoveryType}</span></p>
                <p><span className="opacity-70">Confidence:</span> {data.agentDecision?.confidence}%</p>
                <p><span className="opacity-70">Outcome:</span> {data.agentDecision?.expectedOutcome}</p>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Policy Check</h3>
              <div className="flex flex-col gap-2 border-l-2 border-zinc-900 pl-4 dark:border-zinc-100">
                <p className="flex items-center gap-2">
                  <span className={data.policyResult?.approved ? 'text-emerald-500' : 'text-red-500'}>
                    {data.policyResult?.approved ? '✓' : '✗'}
                  </span>
                  {data.policyResult?.reason}
                </p>
              </div>
            </section>

            <section className="mt-4 flex flex-col gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Decision</h3>
              
              <div className="flex flex-col gap-3">
                <Button onClick={() => handleExecute(data.policyResult?.finalAction)} className="w-full justify-center bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900" disabled={executing}>
                  {executing ? 'EXECUTING...' : `[ APPROVE: ${data.policyResult?.finalAction?.replace(/_/g, " ")} ]`}
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => handleExecute('ESCALATE')} variant="secondary" disabled={executing}>
                    [ ESCALATE ]
                  </Button>
                  <Button onClick={() => handleExecute('STOP')} variant="danger" disabled={executing}>
                    [ STOP ]
                  </Button>
                </div>
              </div>
            </section>

          </div>
        ) : (
          <div className="mt-6">Failed to load analysis.</div>
        )}
      </div>
    </div>
  )
}
