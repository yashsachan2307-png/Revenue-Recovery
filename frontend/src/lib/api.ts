const BASE_URL = "http://localhost:3001/api";

export interface Transaction {
  id: string
  customer: string
  amount: number
  failureReason: string
  riskLevel: "low" | "medium" | "high"
  recommendedAction: string
  status: "detected" | "analyzing" | "recommended" | "action_pending" | "recovered" | "failed" | "escalated"
  timestamp: string
}

export const api = {
  getOverview: async () => {
    const res = await fetch(`${BASE_URL}/overview`);
    if (!res.ok) throw new Error("Failed to fetch overview");
    const data = await res.json();
    return {
      metrics: data.metrics,
      recentIncidents: data.recentIncidents.map((inc: any) => ({
        id: inc.id,
        customer: inc.customer_name || inc.customer_id,
        amount: inc.amount,
        failureReason: inc.failure_reason,
        riskLevel: inc.severity?.toLowerCase() || "low",
        recommendedAction: inc.recommended_action || "Wait & Retry",
        status: inc.recovery_status || "detected",
        timestamp: inc.created_at
      })),
      failureDistribution: data.failureDistribution,
      riskDistribution: data.riskDistribution,
      topCustomers: data.topCustomers
    };
  },
  getPayments: async (status?: string) => {
    const url = status ? `${BASE_URL}/payments?status=${status}` : `${BASE_URL}/payments`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch payments");
    return res.json();
  },
  getRecoveryOpportunities: async () => {
    const res = await fetch(`${BASE_URL}/recovery-opportunities`);
    if (!res.ok) throw new Error("Failed to fetch opportunities");
    return res.json();
  },
  getRecoveryEvents: async () => {
    const res = await fetch(`${BASE_URL}/recovery-events`);
    if (!res.ok) throw new Error("Failed to fetch recovery events");
    return res.json();
  },
  getCustomers: async () => {
    const res = await fetch(`${BASE_URL}/customers`);
    if (!res.ok) throw new Error("Failed to fetch customers");
    return res.json();
  },
  getFailureAnalytics: async () => {
    const res = await fetch(`${BASE_URL}/analytics/failures`);
    if (!res.ok) throw new Error("Failed to fetch failure analytics");
    return res.json();
  },
  getRecoveryAnalytics: async () => {
    const res = await fetch(`${BASE_URL}/analytics/recovery`);
    if (!res.ok) throw new Error("Failed to fetch recovery analytics");
    return res.json();
  }
}
