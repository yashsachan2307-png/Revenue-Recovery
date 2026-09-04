import { db } from "../database";
import { FailureAnalysisService } from "./FailureAnalysisService";
import { WorkflowEngine } from "./WorkflowEngine";
import crypto from "crypto";

export class RecoveryOpportunityService {
  /**
   * Scans for eligible failed payments that don't already have an opportunity and generates one.
   * This is a simulated background job / rules engine.
   */
  static generateOpportunities() {
    const failedPayments = db.prepare(`
      SELECT p.* FROM payments p
      LEFT JOIN recovery_opportunities r ON p.id = r.payment_id
      WHERE p.status = 'failed' AND r.id IS NULL
    `).all() as any[];

    const insertOpp = db.prepare(`
      INSERT INTO recovery_opportunities 
      (id, payment_id, customer_id, amount_at_risk, category, severity, status, recommended_action, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const p of failedPayments) {
        const category = FailureAnalysisService.classify(p.failure_reason);
        
        // Simple heuristic for severity based on INR amounts
        let severity = "LOW";
        if (p.amount > 5000) severity = "MEDIUM";
        if (p.amount > 15000) severity = "HIGH";

        let recommendedAction = "Wait & Retry";
        if (category === "CUSTOMER_FUNDS") recommendedAction = "Notify Customer";
        if (category === "PAYMENT_METHOD") recommendedAction = "Alternative Payment Method";

        const oppId = `REC-${crypto.randomUUID().slice(0,8).toUpperCase()}`;

        insertOpp.run(
          oppId,
          p.id,
          p.customer_id,
          p.amount,
          category,
          severity,
          "detected",
          recommendedAction,
          new Date().toISOString(),
          new Date().toISOString()
        );

        // Process immediately through the workflow automation layer
        // In a real system, this could be dispatched to a background queue
        WorkflowEngine.processOpportunity(oppId).catch(() => {
          // In a real system, log to a central APM/Monitoring service
        });
      }
    })();
  }
}
