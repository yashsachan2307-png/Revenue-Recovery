import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"
import { MetricBlock } from "../components/ui/MetricBlock"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { AlertCircle, Clock, Bell, TrendingUp } from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

export function OverviewPage() {
  const { data, isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview()
  });

  if (isError) {
    return (
      <AppShell title="Overview">
        <div className="max-w-4xl mx-auto p-6">
          <ErrorState
            title="Failed to load merchant overview"
            message={error instanceof Error ? error.message : "Unable to reach the recovery analytics service."}
            onRetry={() => refetch()}
          />
        </div>
      </AppShell>
    );
  }

  const {
    metrics,
    failureDistribution = [],
    topCustomers = [],
    trendData = [],
    needsAttention,
    riskDistribution = []
  } = data || {};

  return (
    <AppShell title="Overview">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest opacity-50">
          Initializing Merchant Telemetry...
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto p-6">
          
          {/* Needs Attention Alert Banner */}
          {(needsAttention?.notifications?.length > 0 || needsAttention?.pendingJobsCount > 0) && (
            <div className="flex flex-col gap-2 border border-[var(--color-warning)] bg-[var(--color-warning)]/10 p-4">
              <div className="flex items-center gap-2 text-[var(--color-warning)] text-xs font-bold uppercase tracking-wider mb-1">
                <AlertCircle className="h-4 w-4" /> Operational Attention Required
              </div>
              <div className="flex flex-wrap items-center gap-6">
                {needsAttention?.pendingJobsCount > 0 && (
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <Clock className="h-4 w-4 opacity-70" /> {needsAttention.pendingJobsCount} scheduled recovery retries pending
                  </div>
                )}
                {needsAttention?.notifications?.length > 0 && (
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <Bell className="h-4 w-4 opacity-70" /> {needsAttention.notifications.length} high-priority gateway alerts
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Executive KPIs - All Live From Database */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricBlock
              label="Revenue at Risk"
              value={formatCurrency(metrics?.revenueAtRisk || 0)}
              trend="up"
              trendValue="Active Exposure"
            />
            <MetricBlock
              label="Recovered Revenue"
              value={formatCurrency(metrics?.recoveredRevenue || 0)}
              trend="up"
              trendValue="Realized Savings"
            />
            <MetricBlock
              label="Recovery Rate"
              value={`${metrics?.recoveryRate || 0}%`}
              trend="neutral"
              trendValue="Resolution Efficiency"
            />
            <MetricBlock
              label="Active Cases"
              value={metrics?.activeCases || 0}
            />
            <MetricBlock
              label="Avg Failed Ticket"
              value={formatCurrency(metrics?.averageFailedValue || 0)}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 flex flex-col gap-8">
              
              {/* Dynamic 7-Day Trend Chart */}
              {/* 1. Revenue At Risk vs Recovered (Stacked Area Chart) */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 opacity-70" />
                    Revenue At Risk vs Recovered (7 Days)
                  </h2>
                </div>
                <div className="h-72 w-full border border-[var(--color-border-subtle)] bg-[var(--color-paper)] p-4">
                  {trendData.length === 0 ? (
                    <EmptyState message="No trend telemetry recorded in the last 7 days." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-ink)', opacity: 0.7 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-ink)', opacity: 0.7 }} tickFormatter={(value) => `₹${Math.round(value/1000)}k`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }}
                          formatter={(val: any) => formatCurrency(Number(val))}
                        />
                        <Legend iconType="square" wrapperStyle={{ fontSize: '12px', opacity: 0.8 }} />
                        <Area type="monotone" name="Recovered Revenue" dataKey="recovered" stackId="1" stroke="var(--color-ink)" fill="var(--color-ink)" fillOpacity={0.6} />
                        <Area type="monotone" name="Revenue at Risk" dataKey="atRisk" stackId="1" stroke="var(--color-failure)" fill="var(--color-failure)" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* 2. Recovery Trend (Line Chart) */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 opacity-70" />
                    Recovery Trend
                  </h2>
                </div>
                <div className="h-64 w-full border border-[var(--color-border-subtle)] bg-[var(--color-paper)] p-4">
                  {trendData.length === 0 ? (
                    <EmptyState message="No trend telemetry recorded." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-ink)', opacity: 0.7 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-ink)', opacity: 0.7 }} tickFormatter={(value) => `₹${Math.round(value/1000)}k`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }}
                          formatter={(val: any) => formatCurrency(Number(val))}
                        />
                        <Line type="monotone" name="Recovered Revenue" dataKey="recovered" stroke="var(--color-ink)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              {/* 3. Failure Reason Breakdown (Donut Chart) */}
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                  Gateway Failure Breakdown
                </h2>
                <div className="h-56 w-full border border-[var(--color-border-subtle)] bg-[var(--color-paper)] p-4">
                  {failureDistribution.length === 0 ? (
                    <EmptyState title="No Failures" message="Zero active failure incidents recorded." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={failureDistribution}
                          dataKey="total_amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          stroke="var(--color-paper)"
                          strokeWidth={2}
                        >
                          {failureDistribution.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--color-ink)' : 'var(--color-border-subtle)'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }}
                          formatter={(val: any) => formatCurrency(Number(val))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* 4. Risk Distribution (Donut Chart) */}
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                  Risk Distribution (Severity)
                </h2>
                <div className="h-56 w-full border border-[var(--color-border-subtle)] bg-[var(--color-paper)] p-4">
                  {riskDistribution.length === 0 ? (
                    <EmptyState title="No Risks" message="Zero active risk distributions recorded." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskDistribution}
                          dataKey="total_amount"
                          nameKey="severity"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          stroke="var(--color-paper)"
                          strokeWidth={2}
                        >
                          {riskDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.severity === 'HIGH' ? 'var(--color-failure)' : entry.severity === 'MEDIUM' ? 'var(--color-warning)' : 'var(--color-ink)'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }}
                          formatter={(val: any) => formatCurrency(Number(val))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* 5. Top At-Risk Customers (Horizontal Bar Chart) */}
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                  High Value Exposure by Customer
                </h2>
                <div className="h-64 w-full border border-[var(--color-border-subtle)] bg-[var(--color-paper)] p-4">
                  {topCustomers.length === 0 ? (
                    <EmptyState title="No Customers At Risk" message="No customers currently have at-risk payment cases." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topCustomers} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" horizontal={true} vertical={false} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} tickFormatter={(value) => `₹${Math.round(value/1000)}k`} />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)' }} width={80} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }}
                          formatter={(val: any) => formatCurrency(Number(val))}
                          cursor={{ fill: 'var(--color-ink)', opacity: 0.05 }}
                        />
                        <Bar name="Revenue at Risk" dataKey="revenue_at_risk" fill="var(--color-failure)" barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
