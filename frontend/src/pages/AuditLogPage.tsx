import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { api } from "../lib/api"
import { Search, Download, ShieldCheck } from "lucide-react"

export function AuditLogPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [actorFilter, setActorFilter] = React.useState<string>("all");

  const { data: logs = [], isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.getRecoveryEvents()
  });

  if (isError) {
    return (
      <AppShell title="Audit Log">
        <div className="max-w-4xl mx-auto p-6">
          <ErrorState
            title="Failed to load compliance audit trail"
            message={error instanceof Error ? error.message : "Unable to retrieve audit events."}
            onRetry={() => refetch()}
          />
        </div>
      </AppShell>
    );
  }

  const mappedLogs = logs.map((log: any) => ({
    id: log.id,
    timestamp: log.created_at || new Date().toISOString(),
    actor: log.actor || "AI_AGENT",
    payment_id: log.payment_id || "—",
    action: log.action || "POLICY_EVALUATION",
    result: log.result || "SUCCESS",
    reason: log.reason || "Autonomous decision verification",
    confidence: log.confidence ? `${Math.round(log.confidence * 100)}%` : "—"
  }));

  const filteredLogs = mappedLogs.filter((l: any) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      l.id?.toLowerCase().includes(q) ||
      l.payment_id?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.reason?.toLowerCase().includes(q)
    );

    const matchesActor = actorFilter === "all" || l.actor === actorFilter;
    return matchesSearch && matchesActor;
  });

  const getResultClass = (result: string) => {
    const r = (result || "").toLowerCase();
    if (r.includes('fail') || r.includes('error') || r.includes('block')) return 'text-[var(--color-failure)] bg-[var(--color-failure)]/10';
    if (r.includes('warn') || r.includes('escalat') || r.includes('require')) return 'text-[var(--color-warning)] bg-[var(--color-warning)]/10';
    return 'text-[var(--color-success)] bg-[var(--color-success)]/10';
  };

  const exportCSV = () => {
    const headers = ["Timestamp", "Audit ID", "Payment ID", "Actor", "Action", "Result", "Confidence", "Reason"];
    const rows = filteredLogs.map((l: any) => [
      l.timestamp,
      l.id,
      l.payment_id,
      l.actor,
      `"${l.action}"`,
      l.result,
      l.confidence,
      `"${l.reason.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_trail_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell title="Audit Log">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest opacity-50">
          Verifying Cryptographic Ledger...
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
                  placeholder="Search by Payment ID, Action, Log..." 
                  className="h-8 w-64 rounded-none border border-[var(--color-border-subtle)] bg-transparent pl-8 pr-3 text-xs focus:border-[var(--color-ink)] focus:outline-none transition-colors"
                />
              </div>

              {/* Actor Filter */}
              <div className="flex border border-[var(--color-border-subtle)] text-xs font-mono">
                {["all", "AI_AGENT", "WEBHOOK", "MERCHANT"].map((actor) => (
                  <button
                    key={actor}
                    onClick={() => setActorFilter(actor)}
                    className={`px-3 py-1 font-bold uppercase transition-colors ${actorFilter === actor ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : "hover:bg-[var(--color-ink)]/5 text-[var(--color-ink)]/70"}`}
                  >
                    {actor === "all" ? "All Actors" : actor}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export Audit Trail ({filteredLogs.length})
            </button>
          </div>

          {/* Main Table */}
          <div className="flex-1 overflow-auto border-x border-b border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
            {filteredLogs.length === 0 ? (
              <EmptyState title="No audit entries" message="No audit records match your query." />
            ) : (
              <table className="w-full text-left text-sm relative">
                <thead className="sticky top-0 bg-[var(--color-paper)] border-b border-[var(--color-border-subtle)] z-10 text-xs uppercase tracking-wider text-[var(--color-ink)]/70">
                  <tr>
                    <th className="px-4 py-3 font-bold">Timestamp</th>
                    <th className="px-4 py-3 font-bold">Actor</th>
                    <th className="px-4 py-3 font-bold">Payment ID</th>
                    <th className="px-4 py-3 font-bold">Action</th>
                    <th className="px-4 py-3 font-bold">Confidence</th>
                    <th className="px-4 py-3 font-bold">Result</th>
                    <th className="px-4 py-3 font-bold">Reasoning / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)] font-mono text-xs">
                  {filteredLogs.map((l: any) => (
                    <tr key={l.id} className="hover:bg-[var(--color-ink)]/5 transition-colors">
                      <td className="px-4 py-3 opacity-60 text-[11px] whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-bold uppercase text-[11px]">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 opacity-70" />
                          {l.actor}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[11px]">{l.payment_id}</td>
                      <td className="px-4 py-3 font-bold uppercase">{l.action?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-center">{l.confidence}</td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getResultClass(l.result)}`}>
                          {l.result}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] opacity-75 font-sans max-w-xs truncate" title={l.reason}>
                        {l.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
