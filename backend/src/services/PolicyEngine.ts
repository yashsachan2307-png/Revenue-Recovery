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

    return this.evaluateContext(context, decision);
  }

  static evaluateContext(context: any, decision: AgentDecision): PolicyResult {
    // 1. Hard constraints (Always on)
    if (context.status === 'recovered') {
      return { approved: false, reason: "Already recovered", finalAction: "STOP" };
    }

    const paymentDate = new Date(context.created_at || new Date());
    const daysOld = (new Date().getTime() - paymentDate.getTime()) / (1000 * 3600 * 24);
    if (daysOld > 30) {
      return { approved: false, reason: "Payment too old (>30 days)", finalAction: "STOP" };
    }

    // 2. Dynamic Policies
    const policies = db.prepare('SELECT * FROM policies WHERE is_active = 1').all() as any[];

    for (const policy of policies) {
      const params = JSON.parse(policy.parameters);
      
      if (policy.rule_type === 'MAX_RETRIES') {
        const maxRetries = params.max || 3;
        if (decision.recoveryType === 'WAIT_AND_RETRY' && context.attempt_number >= maxRetries) {
          return { approved: false, reason: "Max retry limit reached", finalAction: "ESCALATE" };
        }
      }

      if (policy.rule_type === 'MAX_AUTO_AMOUNT') {
        const threshold = params.threshold || 50000;
        if (context.amount_at_risk > threshold && decision.recoveryType !== 'ESCALATE') {
          return { approved: false, reason: "High-value payment requires manual escalation", finalAction: "ESCALATE" };
        }
      }

      if (policy.rule_type === 'MAX_NOTIFICATIONS') {
        const maxNotifications = params.max || 2;
        if (decision.recoveryType === 'NOTIFY_CUSTOMER' && context.notification_count >= maxNotifications) {
          return { approved: false, reason: "Notification limit reached", finalAction: "ESCALATE" };
        }
      }
    }

    // All rules passed, approve agent's decision
    return {
      approved: true,
      reason: "All policies passed",
      finalAction: decision.recoveryType
    };
  }
}
