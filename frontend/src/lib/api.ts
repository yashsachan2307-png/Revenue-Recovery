const BASE_URL = "/api";
const TOKEN_KEY = "recoverai_auth_token";

export interface Transaction {
  id: string;
  customer: string;
  amount: number;
  failureReason: string;
  riskLevel: "low" | "medium" | "high";
  recommendedAction: string;
  status: "detected" | "analyzing" | "recommended" | "action_pending" | "recovered" | "failed" | "escalated";
  timestamp: string;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  return res;
}

export const api = {
  getOverview: async () => {
    const res = await authFetch(`${BASE_URL}/overview`);
    if (!res.ok) {
      throw new Error(`Failed to fetch overview: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return {
      metrics: data.metrics,
      recentIncidents: (data.recentIncidents || []).map((inc: any) => ({
        id: inc.id,
        customer: inc.customer_name || inc.customer_id,
        amount: inc.amount,
        failureReason: inc.failure_reason,
        riskLevel: inc.severity?.toLowerCase() || "low",
        recommendedAction: inc.recommended_action || "Smart Retry Window",
        status: inc.recovery_status || "detected",
        timestamp: inc.created_at
      })),
      failureDistribution: data.failureDistribution,
      riskDistribution: data.riskDistribution,
      topCustomers: data.topCustomers,
      trendData: data.trendData || [],
      methodData: data.methodData || [],
      needsAttention: data.needsAttention
    };
  },

  getPayments: async (status?: string) => {
    const url = status ? `${BASE_URL}/payments?status=${status}` : `${BASE_URL}/payments`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error("Failed to fetch payments");
    return res.json();
  },

  getRecoveryOpportunities: async () => {
    const res = await authFetch(`${BASE_URL}/recovery/cases`);
    if (!res.ok) throw new Error("Failed to fetch recovery cases");
    return res.json();
  },

  getRecoveryStats: async () => {
    const res = await authFetch(`${BASE_URL}/recovery/stats`);
    if (!res.ok) throw new Error("Failed to fetch recovery metrics");
    return res.json();
  },

  getRecoveryEvents: async () => {
    const res = await authFetch(`${BASE_URL}/audit`);
    if (!res.ok) throw new Error("Failed to fetch audit events");
    return res.json();
  },

  getCustomers: async () => {
    const res = await authFetch(`${BASE_URL}/customers`);
    if (!res.ok) throw new Error("Failed to fetch customers");
    return res.json();
  },

  getCustomerDetails: async (id: string) => {
    const res = await authFetch(`${BASE_URL}/customers/${id}`);
    if (!res.ok) throw new Error("Failed to fetch customer details");
    return res.json();
  },

  getAgentDecisions: async (limit = 50) => {
    const res = await authFetch(`${BASE_URL}/agent/decisions?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch agent decisions");
    return res.json();
  },

  getMerchantProfile: async () => {
    const res = await authFetch(`${BASE_URL}/merchant/profile`);
    if (!res.ok) throw new Error("Failed to fetch merchant profile");
    return res.json();
  },

  updateMerchantProfile: async (payload: { name?: string; currency?: string }) => {
    const res = await authFetch(`${BASE_URL}/merchant/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to update merchant profile");
    return res.json();
  },

  analyzeCase: async (id: string) => {
    const res = await authFetch(`${BASE_URL}/recovery/cases/${id}/analyse`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to analyze case");
    return res.json();
  },

  executeAction: async (id: string, payload: any) => {
    const res = await authFetch(`${BASE_URL}/recovery/cases/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to execute action");
    return res.json();
  },

  resetDemo: async () => {
    const res = await authFetch(`${BASE_URL}/system/reset-demo`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to reset demo data");
    return res.json();
  }
};
