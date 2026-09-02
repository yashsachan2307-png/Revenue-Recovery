
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { api } from "../lib/api"
import { Search, Filter, Download } from "lucide-react"

export function AuditLogPage() {
  const { data: logs = [], isLoading: loading, isError } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.getRecoveryEvents() // Use existing audit event endpoint
  })

  if (isError) {
    return (
      <AppShell title="Audit Log">
        <div className="flex h-64 items-center justify-center font-mono text-sm uppercase text-[var(--color-failure)]">
          [ SYSTEM ERROR: Failed to load data ]
        </div>
      </AppShell>
    );
  }

  // Ensure data structure matches our requirements, we might need to map it if the backend returns different fields.
  const mappedLogs = logs.map((log: any) => ({
    timestamp: log.timestamp || log.created_at || new Date().toISOString(),
    actor: log.actor || "AI_AGENT",
    event: log.event_type || log.action || "POLICY_EVALUATION",
    payment_id: log.transaction_id || log.opportunity_id || "PAY_UNKNOWN",
    action: log.details?.action || log.event_type || "ANALYZE",
    policy: log.details?.policy || "DEFAULT_MERCHANT_POLICY",
    result: log.details?.result || log.status || "SUCCESS"
  }));

  const getResultClass = (result: string) => {
    const r = result.toLowerCase();
    if (r.includes('fail') || r.includes('error') || r.includes('block')) return 'text-[var(--color-failure)]';
    if (r.includes('warn') || r.includes('escalate')) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-success)]';
  };

  return (
    <AppShell title="Audit Log">
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
                  placeholder="Search logs by ID, Actor..." 
                  className="h-8 w-64 rounded-none border border-[var(--color-border-subtle)] bg-transparent pl-8 pr-3 text-xs focus:border-[var(--color-ink)] focus:outline-none transition-colors"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border-subtle)] text-xs font-bold uppercase hover:bg-[var(--color-ink)]/5 transition-colors">
                <Filter className="h-3.5 w-3.5" />
                Date Range
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border-subtle)] text-xs font-bold uppercase hover:bg-[var(--color-ink)]/5 transition-colors">
                <Filter className="h-3.5 w-3.5" />
                Actor
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border-subtle)] text-xs font-bold uppercase hover:bg-[var(--color-ink)]/5 transition-colors">
                <Filter className="h-3.5 w-3.5" />
                Event
              </button>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-bold uppercase hover:opacity-90 transition-opacity">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>

          {/* Dense Table */}
          <div className="flex-1 overflow-auto border-x border-b border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
            <table className="w-full text-left text-[11px] leading-tight font-mono relative">
              <thead className="sticky top-0 bg-[var(--color-paper)] border-b border-[var(--color-border-subtle)] z-10 uppercase tracking-widest opacity-70">
                <tr>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">Timestamp</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">Actor</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">Event</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">Payment ID</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">Action</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">Policy</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]/50">
                {mappedLogs.map((log: any, idx: number) => (
                  <tr 
                    key={idx}
                    className="hover:bg-[var(--color-ink)]/5 transition-colors"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(log.timestamp).toISOString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-bold">{log.actor}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{log.event}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-bold">{log.payment_id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{log.action}</td>
                    <td className="px-3 py-2 whitespace-nowrap opacity-70 truncate max-w-[200px]">{log.policy}</td>
                    <td className={`px-3 py-2 whitespace-nowrap font-bold ${getResultClass(log.result)}`}>
                      {log.result}
                    </td>
                  </tr>
                ))}
                {mappedLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center uppercase opacity-50">
                      No audit events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  )
}
