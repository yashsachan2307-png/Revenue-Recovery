import { db } from '../database';
import { RecoveryAgent } from './RecoveryAgent';
import { PolicyEngine } from './PolicyEngine';
import { ActionExecutor } from './ActionExecutor';

export class WorkflowEngine {
  
  static async processOpportunity(opportunityId: string) {
    // 1. Fetch opportunity and payment context
    const opp = db.prepare('SELECT * FROM recovery_opportunities WHERE id = ?').get(opportunityId) as any;
    if (!opp) return;

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(opp.payment_id) as any;
    if (!payment) return;

    // 2. Find matching active workflow
    const workflows = db.prepare('SELECT * FROM workflows WHERE is_active = 1').all() as any[];
    let matchedWorkflow = null;

    for (const wf of workflows) {
      if (wf.trigger !== 'PAYMENT_FAILED') continue;
      
      const conditions = JSON.parse(wf.conditions_json);
      let match = true;
      
      for (const cond of conditions) {
        const value = payment[cond.field];
        if (cond.operator === '>') {
          if (!(value > cond.value)) match = false;
        } else if (cond.operator === '<') {
          if (!(value < cond.value)) match = false;
        } else if (cond.operator === '==') {
          if (value !== cond.value) match = false;
        }
      }

      if (match) {
        matchedWorkflow = wf;
        break; // take first match
      }
    }

    if (!matchedWorkflow) return; // No workflow applies

    // 3. Safeguards / Stop Conditions
    // Check if payment is already recovered
    if (payment.status === 'RECOVERED') return;
    
    // Check retry limits (we can check payment attempt number or just count audits for this workflow)
    const auditCount = db.prepare(`SELECT count(*) as count FROM audit_logs WHERE payment_id = ? AND workflow_id = ?`).get(payment.id, matchedWorkflow.id) as { count: number };
    if (auditCount.count >= matchedWorkflow.retry_limit) {
      console.log(`[WorkflowEngine] Retry limit reached for WF ${matchedWorkflow.id} on Payment ${payment.id}`);
      return;
    }

    // Check cooldown
    const lastAudit = db.prepare(`
      SELECT created_at FROM audit_logs 
      WHERE payment_id = ? AND workflow_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `).get(payment.id, matchedWorkflow.id) as any;

    if (lastAudit) {
      const hoursSinceLast = (Date.now() - new Date(lastAudit.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < matchedWorkflow.cooldown_hours) {
        console.log(`[WorkflowEngine] Cooldown active for WF ${matchedWorkflow.id} on Payment ${payment.id}`);
        return;
      }
    }

    // 4. AI & Policy Evaluation
    // The workflow provides a bounded context, but we still run the AI to log its analysis and reasoning.
    const agentDecision = await RecoveryAgent.analyzeOpportunity(opportunityId);
    let policyResult = PolicyEngine.evaluate(opportunityId, agentDecision);

    // 5. Action Overrides
    // If the workflow defines a specific action (e.g., "Wait & Retry"), we override the AI's action.
    if (matchedWorkflow.action !== 'AI_AUTO') {
       policyResult.finalAction = matchedWorkflow.action;
       policyResult.reason = `Enforced by Workflow: ${matchedWorkflow.name}`;
    }

    // 6. Execution & Audit
    ActionExecutor.executeAction(opportunityId, agentDecision, policyResult, 'workflow', matchedWorkflow.id);
  }

  static scheduleJob(caseId: string, action: string, delayMs: number = 0) {
    const scheduledFor = new Date(Date.now() + delayMs).toISOString();
    const id = 'JOB-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    db.prepare(`
      INSERT INTO scheduled_jobs (id, case_id, action, attempt_number, scheduled_for, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, caseId, action, 1, scheduledFor, 'PENDING', new Date().toISOString());

    return id;
  }
}

