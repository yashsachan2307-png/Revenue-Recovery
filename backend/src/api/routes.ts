import { Router, Request, Response } from 'express';
import { db } from '../database';
import { LLMProvider } from '../services/LLMProvider';
import { PolicyEngine } from '../services/PolicyEngine';
import { EvaluationEngine } from '../services/EvaluationEngine';
import { AnalyticsEngine } from '../services/AnalyticsEngine';
import { NotificationService } from '../services/NotificationService';
import { RecoveryAgent } from '../services/RecoveryAgent';
import { ActionExecutor } from '../services/ActionExecutor';
import { RecoveryOpportunityService } from "../services/RecoveryOpportunityService";
import { RevenueIntelligenceService } from "../services/RevenueIntelligenceService";
import { authRouter } from './authRoutes';
import { seedDatabase } from '../database/seed';
import crypto from 'crypto';

const router = Router();

// Mount Auth Sub-router
router.use('/auth', authRouter);

import { authMiddleware } from './middleware/authMiddleware';

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Apply authMiddleware to all subsequent routes except webhooks
router.use((req, res, next) => {
  if (req.path.startsWith('/webhooks')) {
    return next();
  }
  return authMiddleware(req as any, res, next);
});

// GET /api/dashboard/summary
router.get("/dashboard/summary", (req, res) => {
  try {
    const timeFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const activeCasesResult = db.prepare(`SELECT count(*) as count FROM payments WHERE status = 'FAILED' AND created_at >= ?`).get(timeFilter) as { count: number };
    const recoveredResult = db.prepare(`SELECT sum(amount) as total FROM payments WHERE status = 'RECOVERED' AND created_at >= ?`).get(timeFilter) as { total: number };
    const atRiskResult = db.prepare(`SELECT sum(amount) as total FROM payments WHERE status = 'FAILED' AND created_at >= ?`).get(timeFilter) as { total: number };
    const totalFailed = db.prepare(`SELECT count(*) as count FROM payments WHERE (status = 'FAILED' OR status = 'RECOVERED') AND created_at >= ?`).get(timeFilter) as { count: number };
    const recoveredCount = db.prepare(`SELECT count(*) as count FROM payments WHERE status = 'RECOVERED' AND created_at >= ?`).get(timeFilter) as { count: number };
    
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
      ORDER BY created_at DESC 
      LIMIT 10
    `).all();

    const failureDistribution = db.prepare(`
      SELECT failure_reason as category, sum(amount) as total_amount
      FROM payments
      WHERE status = 'FAILED' AND created_at >= ?
      GROUP BY failure_reason
      ORDER BY total_amount DESC
    `).all(timeFilter);

    const topCustomers = db.prepare(`
      SELECT c.name as name, count(*) as opportunity_count, sum(p.amount) as revenue_at_risk
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.status = 'FAILED' AND p.created_at >= ?
      GROUP BY c.id
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
    const decision = await RecoveryAgent.analyzeOpportunity(req.params.id);
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
    const result = ActionExecutor.executeAction(req.params.id, agentDecision, policyResult, 'admin');
    res.json({ success: true, result });
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
  res.json({ ...(run as any), cases });
});

// Phase 7: Analytics, Workflows, Templates, Notifications

router.get('/analytics', (req: Request, res: Response) => {
  const days = parseInt((req.query.days as string) || '30', 10);
  try {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const data = AnalyticsEngine.getAdvancedMetrics(startDate, endDate);
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
    const { name, description, trigger, conditions_json, action, retry_limit, cooldown_hours, stop_conditions_json } = req.body;
    const id = 'WF-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    db.prepare(`
      INSERT INTO workflows (id, name, description, trigger, conditions_json, action, retry_limit, cooldown_hours, stop_conditions_json, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id, 
      name, 
      description || null, 
      trigger, 
      conditions_json, 
      action, 
      retry_limit || 3, 
      cooldown_hours || 24, 
      stop_conditions_json || JSON.stringify([]), 
      new Date().toISOString()
    );
    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/workflows/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM workflows WHERE id = ?').run(id);
    res.json({ success: true });
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
    NotificationService.markAsRead(req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/overview
router.get("/overview", (req, res) => {
  try {
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
    
    // Dynamic database-driven trend and payment method distribution (no hardcoded frontend data!)
    const trendData = RevenueIntelligenceService.getTrendMetrics(7);
    const methodData = RevenueIntelligenceService.getMethodDistribution();

    // NeedsAttention
    const unreadNotifications = NotificationService.getUnread();
    const pendingJobs = db.prepare(`SELECT count(*) as count FROM scheduled_jobs WHERE status = 'PENDING'`).get() as { count: number };

    res.json({ 
      metrics, 
      recentIncidents, 
      failureDistribution, 
      riskDistribution, 
      topCustomers,
      trendData,
      methodData,
      needsAttention: {
        notifications: unreadNotifications,
        pendingJobsCount: pendingJobs.count
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/recovery/stats
router.get("/recovery/stats", (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        SUM(amount_at_risk) as totalOpportunity,
        SUM(CASE WHEN status = 'recovered' THEN amount_at_risk ELSE 0 END) as recovered,
        SUM(CASE WHEN status NOT IN ('recovered', 'failed') THEN amount_at_risk ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'failed' THEN amount_at_risk ELSE 0 END) as failed,
        COUNT(*) as totalCases,
        SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) as recoveredCount,
        SUM(CASE WHEN status NOT IN ('recovered', 'failed') THEN 1 ELSE 0 END) as inProgressCount,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCount
      FROM recovery_opportunities
    `).get() as any;

    const totalOpp = stats?.totalOpportunity || 0;
    const recoveredAmt = stats?.recovered || 0;
    const recoveryRate = totalOpp > 0 ? Math.round((recoveredAmt / totalOpp) * 100 * 10) / 10 : 0;

    res.json({
      totalOpportunity: Math.round(totalOpp),
      recovered: Math.round(recoveredAmt),
      inProgress: Math.round(stats?.inProgress || 0),
      failed: Math.round(stats?.failed || 0),
      recoveryRate,
      totalCases: stats?.totalCases || 0,
      recoveredCount: stats?.recoveredCount || 0,
      inProgressCount: stats?.inProgressCount || 0,
      failedCount: stats?.failedCount || 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/decisions
router.get("/agent/decisions", (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const decisions = db.prepare(`
      SELECT 
        a.*, 
        p.amount, 
        p.currency, 
        p.failure_reason,
        p.payment_method,
        p.bank,
        c.name as customer_name,
        c.email as customer_email,
        r.category,
        r.severity,
        r.status as recovery_status,
        r.recommended_action
      FROM audit_logs a
      JOIN payments p ON a.payment_id = p.id
      LEFT JOIN recovery_opportunities r ON a.recovery_opportunity_id = r.id
      LEFT JOIN customers c ON p.customer_id = c.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(limit);
    res.json(decisions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics
router.get("/analytics", (req, res) => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);
    let startDate = req.query.startDate as string | undefined;
    let endDate = req.query.endDate as string | undefined;
    
    if (!startDate || !endDate) {
      endDate = new Date().toISOString();
      startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    }
    
    const analytics = AnalyticsEngine.getAdvancedMetrics(startDate, endDate);
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/merchant/profile
router.get("/merchant/profile", (req, res) => {
  try {
    const merchant = db.prepare(`SELECT * FROM merchants LIMIT 1`).get();
    const users = db.prepare(`SELECT id, merchant_id, name, email, role, created_at FROM users`).all();
    res.json({ merchant, users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/merchant/profile
router.put("/merchant/profile", (req, res) => {
  try {
    const { name, currency } = req.body;
    const merchant = db.prepare(`SELECT id FROM merchants LIMIT 1`).get() as any;
    if (merchant) {
      db.prepare(`UPDATE merchants SET name = COALESCE(?, name), currency = COALESCE(?, currency) WHERE id = ?`)
        .run(name || null, currency || null, merchant.id);
    }
    const updated = db.prepare(`SELECT * FROM merchants WHERE id = ?`).get(merchant.id);
    res.json({ success: true, merchant: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Phase 8: Webhook Simulation & Demo Reset
router.post("/webhooks/payment", (req: Request, res: Response) => {
  try {
    const { event, payload } = req.body;
    
    if (event === 'payment.failed') {
      const paymentId = `PAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      
      const customerId = payload.customer_id || `CUS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      db.prepare(`
        INSERT INTO customers (id, merchant_id, name, email, risk_level, created_at) 
        VALUES (?, 'M-IND-001', 'Demo Webhook User', 'webhook.customer@example.test', 'MEDIUM', ?)
        ON CONFLICT(id) DO NOTHING
      `).run(customerId, new Date().toISOString());

      db.prepare(`
        INSERT INTO payments (id, merchant_id, customer_id, amount, currency, status, payment_method, failure_reason, attempt_number, created_at, updated_at)
        VALUES (?, 'M-IND-001', ?, ?, ?, 'failed', 'upi', ?, 1, ?, ?)
      `).run(paymentId, customerId, payload.amount || 25000, payload.currency || 'INR', payload.failure_reason || 'INSUFFICIENT_FUNDS', new Date().toISOString(), new Date().toISOString());

      RecoveryOpportunityService.generateOpportunities();

      NotificationService.create(
        'SYSTEM',
        'New Failed Payment Detected',
        `Simulated webhook for ${payload.amount || 25000} ${payload.currency || 'INR'} received.`
      );
    }

    res.json({ success: true, received: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/system/reset-demo", (req: Request, res: Response) => {
  try {
    // Perform a complete fresh seed of synthetic Indian merchant data
    seedDatabase();

    NotificationService.create(
      'SYSTEM',
      'Demo Environment Reset',
      'Demo merchant environment has been refreshed with synthetic Indian merchant data.'
    );

    res.json({ success: true, message: "Demo environment has been reset and reseeded successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as apiRouter };
