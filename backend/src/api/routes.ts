import { Router, Request, Response } from 'express';
import { db } from '../database';
import { LLMProvider } from '../services/LLMProvider';
import { PolicyEngine } from '../services/PolicyEngine';
import { EvaluationEngine } from '../services/EvaluationEngine';
import { AnalyticsEngine } from '../services/AnalyticsEngine';
import { NotificationService } from '../services/NotificationService';
import { RecoveryOpportunityService } from "../services/RecoveryOpportunityService";
import { RevenueIntelligenceService } from "../services/RevenueIntelligenceService";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// GET /api/dashboard/summary
router.get("/dashboard/summary", (req, res) => {
  try {
    const timeFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const activeCasesResult = db.prepare(`SELECT count(*) as count FROM payments WHERE status = 'FAILED' AND timestamp >= ?`).get(timeFilter) as { count: number };
    const recoveredResult = db.prepare(`SELECT sum(amount) as total FROM payments WHERE status = 'RECOVERED' AND timestamp >= ?`).get(timeFilter) as { total: number };
    const atRiskResult = db.prepare(`SELECT sum(amount) as total FROM payments WHERE status = 'FAILED' AND timestamp >= ?`).get(timeFilter) as { total: number };
    const totalFailed = db.prepare(`SELECT count(*) as count FROM payments WHERE (status = 'FAILED' OR status = 'RECOVERED') AND timestamp >= ?`).get(timeFilter) as { count: number };
    const recoveredCount = db.prepare(`SELECT count(*) as count FROM payments WHERE status = 'RECOVERED' AND timestamp >= ?`).get(timeFilter) as { count: number };
    
    const recoveryRate = totalFailed.count > 0 ? ((recoveredCount.count / totalFailed.count) * 100).toFixed(1) : 0;

    const metrics = {
      activeCases: activeCasesResult.count,
      recoveredRevenue: recoveredResult.total || 0,
      revenueAtRisk: atRiskResult.total || 0,
      recoveryRate: Number(recoveryRate)
    };

    const recentIncidents = db.prepare(`
      SELECT * FROM payments 
      WHERE status = 'FAILED' 
      ORDER BY timestamp DESC 
      LIMIT 10
    `).all();

    const failureDistribution = db.prepare(`
      SELECT failure_reason as category, sum(amount) as total_amount
      FROM payments
      WHERE status = 'FAILED' AND timestamp >= ?
      GROUP BY failure_reason
      ORDER BY total_amount DESC
    `).all(timeFilter);

    const topCustomers = db.prepare(`
      SELECT customer as name, count(*) as opportunity_count, sum(amount) as revenue_at_risk
      FROM payments
      WHERE status = 'FAILED' AND timestamp >= ?
      GROUP BY customer
      ORDER BY revenue_at_risk DESC
      LIMIT 5
    `).all(timeFilter);

    // Phase 7: Needs Attention
    const unreadNotifications = NotificationService.getUnread();
    const pendingJobs = db.prepare(`SELECT count(*) as count FROM scheduled_jobs WHERE status = 'PENDING'`).get() as { count: number };

    res.json({
      metrics,
      recentIncidents,
      failureDistribution,
      topCustomers,
      needsAttention: {
        notifications: unreadNotifications,
        pendingJobsCount: pendingJobs.count
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/dashboard/trend", (req, res) => {
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

router.get("/dashboard/failures", (req, res) => {
  const distribution = db.prepare(`
    SELECT failure_reason, COUNT(*) as count 
    FROM payments 
    WHERE status = 'failed' 
    GROUP BY failure_reason
  `).all();
  res.json(distribution);
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

router.post("/recovery/cases/:id/analyse", async (req, res) => {
  try {
    const decision = await LLMProvider.analyzeOpportunity(req.params.id);
    const policyResult = PolicyEngine.evaluate(req.params.id, decision);
    res.json({ agentDecision: decision, policyResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/recovery/cases/:id/action", async (req, res) => {
  try {
    const { agentDecision, policyResult } = req.body;
    if (!agentDecision || !policyResult) {
      return res.status(400).json({ error: "Missing agentDecision or policyResult" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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

router.get("/policies", (req, res) => {
  const policies = db.prepare(`SELECT * FROM policies ORDER BY created_at DESC`).all();
  res.json(policies);
});

router.put("/policies", (req, res) => {
  try {
    const { id, is_active } = req.body;
    db.prepare(`UPDATE policies SET is_active = ? WHERE id = ?`).run(is_active ? 1 : 0, id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/evaluations", (req, res) => {
  const runs = db.prepare(`SELECT * FROM evaluation_runs ORDER BY created_at DESC`).all();
  res.json(runs);
});

router.post("/evaluations/run", async (req, res) => {
  try {
    const result = await EvaluationEngine.runEvaluation();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/evaluations/:id", (req, res) => {
  const run = db.prepare(`SELECT * FROM evaluation_runs WHERE id = ?`).get(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  
  const cases = db.prepare(`SELECT * FROM evaluation_cases WHERE run_id = ?`).all(req.params.id);
  res.json({ ...run, cases });
});

// Phase 7: Analytics, Workflows, Templates, Notifications

router.get('/analytics', (req: Request, res: Response) => {
  const days = parseInt((req.query.days as string) || '30', 10);
  try {
    const data = AnalyticsEngine.getAdvancedMetrics(days);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/workflows', (req: Request, res: Response) => {
  try {
    const workflows = db.prepare('SELECT * FROM workflows ORDER BY created_at DESC').all();
    res.json(workflows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows', (req: Request, res: Response) => {
  try {
    const { name, trigger, conditions_json, action } = req.body;
    const id = 'WF-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    db.prepare(`
      INSERT INTO workflows (id, name, trigger, conditions_json, action, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, name, trigger, conditions_json, action, new Date().toISOString());
    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/workflows/:id/toggle', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    db.prepare('UPDATE workflows SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/templates', (req: Request, res: Response) => {
  try {
    const templates = db.prepare('SELECT * FROM action_templates ORDER BY created_at DESC').all();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications', (req: Request, res: Response) => {
  try {
    res.json(NotificationService.getUnread());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/:id/read', (req: Request, res: Response) => {
  try {
    NotificationService.markAsRead(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Legacy backward-compat aliases for frontend while we migrate
router.get("/overview", (req, res) => {
  try {
    RecoveryOpportunityService.generateOpportunities();
    const metrics = RevenueIntelligenceService.getOverviewMetrics();
    const recentIncidents = db.prepare(`SELECT p.*, r.recommended_action, r.status as recovery_status, r.severity, c.name as customer_name FROM payments p LEFT JOIN recovery_opportunities r ON p.id = r.payment_id JOIN customers c ON p.customer_id = c.id WHERE p.status = 'failed' ORDER BY p.created_at DESC LIMIT 10`).all();
    const failureDistribution = RevenueIntelligenceService.getFailureDistribution();
    const riskDistribution = RevenueIntelligenceService.getRiskDistribution();
    const topCustomers = RevenueIntelligenceService.getTopCustomersByRisk(6);
    
    // Inject NeedsAttention for the Overview page via the legacy endpoint as well
    const unreadNotifications = NotificationService.getUnread();
    const pendingJobs = db.prepare(`SELECT count(*) as count FROM scheduled_jobs WHERE status = 'PENDING'`).get() as { count: number };

    res.json({ 
      metrics, 
      recentIncidents, 
      failureDistribution, 
      riskDistribution, 
      topCustomers,
      needsAttention: {
        notifications: unreadNotifications,
        pendingJobsCount: pendingJobs.count
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as apiRouter };
