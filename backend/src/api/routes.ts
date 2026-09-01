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

router.get("/overview", (req, res) => {
  // Generate opportunities before getting metrics to keep data fresh for demo
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
  
  const failureDistribution = RevenueIntelligenceService.getFailureDistribution();
  const riskDistribution = RevenueIntelligenceService.getRiskDistribution();
  const topCustomers = RevenueIntelligenceService.getTopCustomersByRisk(6);
  
  res.json({ metrics, recentIncidents, failureDistribution, riskDistribution, topCustomers });
});

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

router.get("/customers/:id", (req, res) => {
  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  
  const payments = db.prepare(`SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC`).all(req.params.id);
  const opportunities = db.prepare(`SELECT * FROM recovery_opportunities WHERE customer_id = ?`).all(req.params.id);
  
  res.json({ customer, payments, opportunities });
});

router.get("/recovery-opportunities", (req, res) => {
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

router.get("/recovery-events", (req, res) => {
  const limit = req.query.limit || 50;
  const events = db.prepare(`SELECT * FROM recovery_events ORDER BY created_at DESC LIMIT ?`).all(limit);
  res.json(events);
});

router.get("/analytics/failures", (req, res) => {
  const distribution = RevenueIntelligenceService.getFailureDistribution();
  res.json(distribution);
});

router.get("/analytics/recovery", (req, res) => {
  const riskDistribution = RevenueIntelligenceService.getRiskDistribution();
  const topCustomers = RevenueIntelligenceService.getTopCustomersByRisk(5);
  res.json({ riskDistribution, topCustomers });
});

// Phase 3 AI Agents Endpoints
router.post("/recovery/:id/analyze", async (req, res) => {
  try {
    const decision = await RecoveryAgent.analyzeOpportunity(req.params.id);
    const policyResult = PolicyEngine.evaluate(req.params.id, decision);
    res.json({ agentDecision: decision, policyResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/recovery/:id/execute", async (req, res) => {
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

export { router };

