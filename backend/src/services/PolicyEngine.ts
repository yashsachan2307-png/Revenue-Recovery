import { db } from "../database";
import { AgentDecision } from "./LLMProvider";

export interface PolicyResult {
  approved: boolean;
  reason: string;
  finalAction: string;
}

export class PolicyEngine {
  static evaluate(opportunityId: string, decision: AgentDecision): PolicyResult {
    const stmt = db.prepare(`
      SELECT 
        ro.status,
        ro.amount_at_risk,
        p.attempt_number,
        p.created_at,
        (SELECT COUNT(*) FROM recovery_events re WHERE re.recovery_opportunity_id = ro.id AND re.event_type = 'NOTIFICATION_SENT') as notification_count
      FROM recovery_opportunities ro
      JOIN payments p ON ro.payment_id = p.id
      WHERE ro.id = ?
    `);

    const context: any = stmt.get(opportunityId);
    if (!context) {
      return { approved: false, reason: "Opportunity not found", finalAction: "STOP" };
    }

    // Rule: Already successful (recovered)
    if (context.status === 'recovered') {
      return { approved: false, reason: "Already recovered", finalAction: "STOP" };
    }

    // Rule: Too old (older than 30 days)
    const paymentDate = new Date(context.created_at);
    const daysOld = (new Date().getTime() - paymentDate.getTime()) / (1000 * 3600 * 24);
    if (daysOld > 30) {
      return { approved: false, reason: "Payment too old (>30 days)", finalAction: "STOP" };
    }

    // Rule: Retry limit reached (e.g. 3 attempts)
    if (decision.recoveryType === 'WAIT_AND_RETRY' && context.attempt_number >= 3) {
      return { approved: false, reason: "Max retry limit reached", finalAction: "ESCALATE" };
    }

    // Rule: High-value payment needs human approval
    if (context.amount_at_risk > 50000 && decision.recoveryType !== 'ESCALATE') {
      return { approved: false, reason: "High-value payment requires manual escalation", finalAction: "ESCALATE" };
    }

    // Rule: Recent notification (assume block if > 2 notifications sent already)
    if (decision.recoveryType === 'NOTIFY_CUSTOMER' && context.notification_count >= 2) {
      return { approved: false, reason: "Duplicate notification blocked", finalAction: "ESCALATE" };
    }

    // All rules passed, approve agent's decision
    return {
      approved: true,
      reason: "All policies passed",
      finalAction: decision.recoveryType
    };
  }
}
