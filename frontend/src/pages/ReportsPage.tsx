import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "../layouts/AppShell"

import { EmptyState } from "../components/ui/EmptyState"
import { ErrorState } from "../components/ui/ErrorState"
import { formatCurrency } from "../lib/utils"
import { Download } from "lucide-react"
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export function ReportsPage() {
  const [days, setDays] = useState<number>(30);

  const { data: reportData, isLoading: loadingReports, isError: isReportError, error: reportError, refetch: refetchReports } = useQuery({
    queryKey: ['reports-data', days],
    queryFn: async () => {
      const token = localStorage.getItem('recoverai_auth_token');
      const res = await fetch(`/api/analytics?days=${days}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    }
  });

  const loading = loadingReports;
  const isError = isReportError;

  const exportCSV = () => {
    const data = [
      ["Metric", "Value"],
      ["Reporting Period", `Last ${days} Days`]
    ];
    let csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `merchant_recovery_report_${days}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isError) {
    return (
      <AppShell title="Reports">
        <div className="max-w-4xl mx-auto p-6">
          <ErrorState
            title="Failed to generate analytics report"
            message={reportError instanceof Error ? reportError.message : "Unable to compile telemetry for the selected period."}
            onRetry={() => {
              refetchReports();
            }}
          />
        </div>
      </AppShell>
    );
  }

  const { 
    trendData = [], 
    methodBreakdown = [], 
    bankBreakdown = [], 
    failureBreakdown = [], 
    strategyPerformance = [], 
    segmentRecovery = [] 
  } = reportData || {};

  // Compute aggregated stats from trendData
  let totalRecovered = 0;
  let totalFailed = 0;
  
  const recoveryRateData = trendData.map((d: any) => {
    const total = d.recovered_amount + d.failed_amount;
    const rate = total > 0 ? (d.recovered_amount / total) * 100 : 0;
    totalRecovered += d.recovered_amount;
    totalFailed += d.failed_amount;
    return { day: d.day, rate: Math.round(rate) };
  });

  const overallRecoveryPie = [
    { name: 'Recovered', value: totalRecovered, fill: 'var(--color-ink)' },
    { name: 'Failed', value: totalFailed, fill: 'var(--color-failure)' }
  ];

  return (
    <AppShell title="Reports">
      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest opacity-50">
          Compiling Gateway Reports...
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto p-6 pb-12">
          
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-widest text-[var(--color-ink)]">Detailed Reports</h1>
              <p className="text-xs opacity-60 font-mono mt-1">Comprehensive breakdown of recovery performance</p>
            </div>
            <div className="flex items-center gap-3">
              <select 
                className="text-xs font-bold uppercase px-3 py-2 border border-[var(--color-border-subtle)] bg-[var(--color-paper)] outline-none cursor-pointer"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
              <button 
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-bold uppercase hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 1. Revenue Recovered Over Time */}
            <div className="border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                Revenue Recovered Over Time
              </h2>
              <div className="h-64 w-full">
                {trendData.length === 0 ? <EmptyState message="No data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} tickFormatter={(val) => `₹${Math.round(val/1000)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }} formatter={(val: any) => formatCurrency(Number(val))} />
                      <Area type="monotone" name="Recovered" dataKey="recovered_amount" stroke="var(--color-ink)" fill="var(--color-ink)" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 2. Recovery Rate Over Time */}
            <div className="border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                Recovery Rate Over Time (%)
              </h2>
              <div className="h-64 w-full">
                {recoveryRateData.length === 0 ? <EmptyState message="No data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recoveryRateData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} tickFormatter={(val) => `${val}%`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }} formatter={(val: any) => `${val}%`} />
                      <Line type="monotone" name="Recovery Rate" dataKey="rate" stroke="var(--color-ink)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 3. Recovery by Payment Method */}
            <div className="border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                Recovery by Payment Method
              </h2>
              <div className="h-64 w-full">
                {methodBreakdown.length === 0 ? <EmptyState message="No data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={methodBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} tickFormatter={(val) => `₹${Math.round(val/1000)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }} formatter={(val: any) => formatCurrency(Number(val))} />
                      <Legend iconType="square" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar name="Recovered" dataKey="recovered_amount" fill="var(--color-ink)" />
                      <Bar name="Failed" dataKey="failed_amount" fill="var(--color-failure)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 4. Recovery by Bank */}
            <div className="border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                Recovery by Bank
              </h2>
              <div className="h-64 w-full">
                {bankBreakdown.length === 0 ? <EmptyState message="No data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bankBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} tickFormatter={(val) => `₹${Math.round(val/1000)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }} formatter={(val: any) => formatCurrency(Number(val))} />
                      <Legend iconType="square" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar name="Recovered" dataKey="recovered_amount" fill="var(--color-ink)" />
                      <Bar name="Failed" dataKey="failed_amount" fill="var(--color-failure)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 5. Recovery by Failure Reason */}
            <div className="border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                Recovery by Failure Reason
              </h2>
              <div className="h-64 w-full">
                {failureBreakdown.length === 0 ? <EmptyState message="No data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={failureBreakdown} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" horizontal={true} vertical={false} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} tickFormatter={(val) => `₹${Math.round(val/1000)}k`} />
                      <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)' }} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }} formatter={(val: any) => formatCurrency(Number(val))} />
                      <Legend iconType="square" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar name="Recovered" dataKey="recovered_amount" fill="var(--color-ink)" />
                      <Bar name="Failed" dataKey="failed_amount" fill="var(--color-failure)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 6. Recovery Strategy Performance */}
            <div className="border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                Strategy Performance
              </h2>
              <div className="h-64 w-full">
                {strategyPerformance.length === 0 ? <EmptyState message="No data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={strategyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} tickFormatter={(val) => `₹${Math.round(val/1000)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }} formatter={(val: any) => formatCurrency(Number(val))} />
                      <Legend iconType="square" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar name="Recovered" dataKey="recovered_amount" fill="var(--color-ink)" />
                      <Bar name="Failed" dataKey="failed_amount" fill="var(--color-failure)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 7. Customer Segment Recovery */}
            <div className="border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                Customer Segment Recovery
              </h2>
              <div className="h-64 w-full">
                {segmentRecovery.length === 0 ? <EmptyState message="No data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={segmentRecovery}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-ink)', opacity: 0.7 }} tickFormatter={(val) => `₹${Math.round(val/1000)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }} formatter={(val: any) => formatCurrency(Number(val))} />
                      <Legend iconType="square" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar name="Recovered" dataKey="recovered_amount" fill="var(--color-ink)" />
                      <Bar name="Failed" dataKey="failed_amount" fill="var(--color-failure)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 8. Failed vs Successful Recovery Overall */}
            <div className="border border-[var(--color-border-subtle)] p-6 bg-[var(--color-paper)] flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 text-[var(--color-ink)]">
                Failed vs Successful Recovery
              </h2>
              <div className="h-64 w-full">
                {totalRecovered === 0 && totalFailed === 0 ? <EmptyState message="No data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overallRecoveryPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        stroke="var(--color-paper)"
                        strokeWidth={2}
                      >
                        {overallRecoveryPie.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border-subtle)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }}
                        formatter={(val: any) => formatCurrency(Number(val))}
                      />
                      <Legend iconType="square" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </AppShell>
  );
}
