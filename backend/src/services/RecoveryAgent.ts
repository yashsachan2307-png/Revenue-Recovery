import { db } from "../database";
import { LLMProvider, AgentDecision } from "./LLMProvider";
import { FailureAnalysisService } from "./FailureAnalysisService";
import { PolicyEngine } from "./PolicyEngine";
import { ActionExecutor } from "./ActionExecutor";

export class RecoveryAgent {
  static async analyzeOpportunity(opportunityId: string): Promise<AgentDecision> {
    // Build context
    const stmt = db.prepare(`
      SELECT 
        ro.id as recovery_id,
        ro.amount_at_risk,
        ro.category as failure_category,
        p.failure_reason,
        p.payment_method,
        p.attempt_number,
        p.created_at as payment_date,
        c.lifetime_value,
        c.successful_payments,
        c.failed_payments,
        (SELECT COUNT(*) FROM recovery_events re WHERE re.recovery_opportunity_id = ro.id) as previous_recovery_attempts
      FROM recovery_opportunities ro
      JOIN payments p ON ro.payment_id = p.id
      JOIN customers c ON ro.customer_id = c.id
      WHERE ro.id = ?
    `);

    const context = stmt.get(opportunityId);

    if (!context) {
      throw new Error(`Opportunity ${opportunityId} not found`);
    }

    // Call LLM
    const decision = await LLMProvider.analyze(context);
    return decision;
  }

  static async executePipeline(opportunityId: string, actor: string = 'system') {
    // 1. Context / Risk Detection is done inside analyzeOpportunity
    // 2. Classify (already partially in opportunity generation, but we could re-eval here, let's just proceed to analysis)
    // 3. AI Analysis
    const decision = await this.analyzeOpportunity(opportunityId);

    // 4. Policy Evaluation
    const policyResult = PolicyEngine.evaluate(opportunityId, decision);

    // 5. Bounded Action / Execution / Outcome / Audit
    const result = ActionExecutor.executeAction(opportunityId, decision, policyResult, actor);

    return result;
  }
}
