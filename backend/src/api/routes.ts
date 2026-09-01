import { Router } from "express";
import { db } from "../database";
import { RevenueIntelligenceService } from "../services/RevenueIntelligenceService";
import { RecoveryOpportunityService } from "../services/RecoveryOpportunityService";
import { RecoveryAgent } from "../services/RecoveryAgent";
import { PolicyEngine } from "../services/PolicyEngine";
import { ActionExecutor } from "../services/ActionExecutor";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Mapping Phase 4 Endpoints

// GET /api/dashboard/summary
router.get("/dashboard/summary", (req, res) => {
  RecoveryOpportunityService.generateOpportunities();
  
  const metrics = RevenueIntelligenceService.getOverviewMetrics();
  const recentIncidents = db.prepare(`
    SELECT p.*, r.recommended_action, r.status as recovery_status, r.severity, c.name as customer_name
    FROM payments p
    LEFT JOIN recovery_opportunities r ON p.id = r.payment_id
    JOIN customers c ON p.customer_id = c.id
    WHERE p.status = 'failed'
    ORDER BY p.created_at DESC
    LIMIT 10
  `).all();
  
  res.json({ metrics, recentIncidents });
});

// GET /api/dashboard/trend
router.get("/dashboard/trend", (req, res) => {
  // Simple trend: last 7 days of failures
  const trend = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count, SUM(amount) as value
    FROM payments
    WHERE status = 'failed'
    GROUP BY date(created_at)
    ORDER BY date(created_at) DESC
    LIMIT 7
  `).all();
  res.json(trend);
});

// GET /api/dashboard/failures
router.get("/dashboard/failures", (req, res) => {
  const distribution = RevenueIntelligenceService.getFailureDistribution();
  res.json(distribution);
});

// GET /api/payments
router.get("/payments", (req, res) => {
  const limit = req.query.limit || 100;
  let statusFilter = req.query.status ? `WHERE p.status = '${req.query.status}'` : '';
  const payments = db.prepare(`
    SELECT p.*, c.name as customer_name 
    FROM payments p 
    JOIN customers c ON p.customer_id = c.id
    ${statusFilter}
    ORDER BY p.created_at DESC 
    LIMIT ?
  `).all(limit);
  res.json(payments);
});

// GET /api/payments/:id
router.get("/payments/:id", (req, res) => {
  const payment = db.prepare(`
    SELECT p.*, c.name as customer_name 
    FROM payments p 
    JOIN customers c ON p.customer_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);
  
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  
  const opportunity = db.prepare(`SELECT * FROM recovery_opportunities WHERE payment_id = ?`).get(req.params.id);
  res.json({ payment, opportunity });
});

// GET /api/customers
router.get("/customers", (req, res) => {
  const limit = req.query.limit || 50;
  const customers = db.prepare(`
    SELECT c.*, 
           (SELECT SUM(amount_at_risk) FROM recovery_opportunities r WHERE r.customer_id = c.id AND r.status NOT IN ('recovered', 'failed')) as revenue_at_risk,
           (SELECT MAX(created_at) FROM payments p WHERE p.customer_id = c.id) as last_payment
    FROM customers c 
    ORDER BY c.created_at DESC 
    LIMIT ?
  `).all(limit);
  res.json(customers);
});

// GET /api/customers/:id
router.get("/customers/:id", (req, res) => {
  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  
  const payments = db.prepare(`SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC`).all(req.params.id);
  const opportunities = db.prepare(`SELECT * FROM recovery_opportunities WHERE customer_id = ?`).all(req.params.id);
  
  res.json({ customer, payments, opportunities });
});

// GET /api/recovery/cases
router.get("/recovery/cases", (req, res) => {
  const limit = req.query.limit || 50;
  const opps = db.prepare(`
    SELECT r.*, c.name as customer_name, p.failure_reason, p.created_at as payment_date, p.payment_method
    FROM recovery_opportunities r
    JOIN customers c ON r.customer_id = c.id
    JOIN payments p ON r.payment_id = p.id
    ORDER BY r.created_at DESC
    LIMIT ?
  `).all(limit);
  res.json(opps);
});

// GET /api/recovery/cases/:id
router.get("/recovery/cases/:id", (req, res) => {
  const opp = db.prepare(`
    SELECT r.*, c.name as customer_name, p.failure_reason, p.created_at as payment_date, p.payment_method
    FROM recovery_opportunities r
    JOIN customers c ON r.customer_id = c.id
    JOIN payments p ON r.payment_id = p.id
    WHERE r.id = ?
  `).get(req.params.id);
  if (!opp) return res.status(404).json({ error: "Case not found" });
  res.json(opp);
});

// POST /api/recovery/cases/:id/analyse
router.post("/recovery/cases/:id/analyse", async (req, res) => {
  try {
    const decision = await RecoveryAgent.analyzeOpportunity(req.params.id);
    const policyResult = PolicyEngine.evaluate(req.params.id, decision);
    res.json({ agentDecision: decision, policyResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/recovery/cases/:id/action
router.post("/recovery/cases/:id/action", async (req, res) => {
  try {
    const { agentDecision, policyResult } = req.body;
    if (!agentDecision || !policyResult) {
      return res.status(400).json({ error: "Missing agentDecision or policyResult" });
    }
    const result = ActionExecutor.executeAction(req.params.id, agentDecision, policyResult);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/audit
router.get("/audit", (req, res) => {
  const limit = req.query.limit || 100;
  const logs = db.prepare(`
    SELECT a.*, p.amount, p.currency
    FROM audit_logs a
    JOIN payments p ON a.payment_id = p.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(limit);
  res.json(logs);
});

// Legacy backward-compat aliases for frontend while we migrate
router.get("/overview", (req, res) => {
  RecoveryOpportunityService.generateOpportunities();
  const metrics = RevenueIntelligenceService.getOverviewMetrics();
  const recentIncidents = db.prepare(`SELECT p.*, r.recommended_action, r.status as recovery_status, r.severity, c.name as customer_name FROM payments p LEFT JOIN recovery_opportunities r ON p.id = r.payment_id JOIN customers c ON p.customer_id = c.id WHERE p.status = 'failed' ORDER BY p.created_at DESC LIMIT 10`).all();
  const failureDistribution = RevenueIntelligenceService.getFailureDistribution();
  const riskDistribution = RevenueIntelligenceService.getRiskDistribution();
  const topCustomers = RevenueIntelligenceService.getTopCustomersByRisk(6);
  res.json({ metrics, recentIncidents, failureDistribution, riskDistribution, topCustomers });
});
router.get("/recovery-opportunities", (req, res) => {
  res.redirect("/api/recovery/cases");
});
router.post("/recovery/:id/analyze", (req, res) => res.redirect(307, `/api/recovery/cases/${req.params.id}/analyse`));
router.post("/recovery/:id/execute", (req, res) => res.redirect(307, `/api/recovery/cases/${req.params.id}/action`));

export { router };

