import { db } from "../database";
import { randomUUID } from "crypto";
import { AgentDecision } from "./LLMProvider";
import { PolicyResult } from "./PolicyEngine";

export class ActionExecutor {
  static executeAction(
    opportunityId: string, 
    agentDecision: AgentDecision, 
    policyResult: PolicyResult, 
    actor: string = 'system'
  ) {
    const actionToExecute = policyResult.finalAction;
    let result = 'FAILED';
    let newStatus = 'in_progress';

    // Simulate deterministic results for the buildathon
    if (actionToExecute === 'Wait & Retry') {
      result = 'SUCCESS';
      newStatus = 'in_progress';
    } else if (actionToExecute === 'Notify Customer') {
      result = 'SUCCESS';
      newStatus = 'in_progress';
    } else if (actionToExecute === 'Alternative Payment Method') {
      result = 'SUCCESS';
      newStatus = 'in_progress';
    } else if (actionToExecute === 'Escalate') {
      result = 'SUCCESS';
      newStatus = 'escalated';
    } else if (actionToExecute === 'Stop Recovery') {
      result = 'SUCCESS';
      newStatus = 'failed'; // Or stopped
    }

    // Get payment_id for audit
    const opp = db.prepare('SELECT payment_id FROM recovery_opportunities WHERE id = ?').get(opportunityId) as any;
    const paymentId = opp?.payment_id || 'UNKNOWN';

    // Transaction
    const runTx = db.transaction(() => {
      // 1. Update opportunity status
      if (newStatus !== 'in_progress') {
        db.prepare('UPDATE recovery_opportunities SET status = ?, updated_at = ? WHERE id = ?')
          .run(newStatus, new Date().toISOString(), opportunityId);
      }

      // 2. Record Event
      db.prepare(`
        INSERT INTO recovery_events (id, recovery_opportunity_id, event_type, description, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        randomUUID(), 
        opportunityId, 
        `EXECUTED_${actionToExecute}`, 
        `Executed action: ${actionToExecute} with result: ${result}`,
        new Date().toISOString()
      );

      // 3. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, recovery_opportunity_id, payment_id, agent_decision, policy_decision, action, result, reason, confidence, actor, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        opportunityId,
        paymentId,
        JSON.stringify(agentDecision),
        JSON.stringify(policyResult),
        actionToExecute,
        result,
        policyResult.reason,
        agentDecision.confidence,
        actor,
        new Date().toISOString()
      );
    });

    runTx();

    return { action: actionToExecute, result };
  }
}
