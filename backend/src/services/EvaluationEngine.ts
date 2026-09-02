import { db } from "../database";
import crypto from "crypto";
import { LLMProvider, AgentDecision } from "./LLMProvider";
import { PolicyEngine } from "./PolicyEngine";

export class EvaluationEngine {
  static async runEvaluation() {
    // 1. Generate 100 cases
    const categories = [
      { reason: 'insufficient_funds', expected: 'WAIT_AND_RETRY' },
      { reason: 'network_error', expected: 'WAIT_AND_RETRY' },
      { reason: 'bank_timeout', expected: 'WAIT_AND_RETRY' },
      { reason: 'authentication_failed', expected: 'NOTIFY_CUSTOMER' },
      { reason: 'card_declined', expected: 'RETRY_ALTERNATIVE_METHOD' },
      { reason: 'unknown_fraud', expected: 'ESCALATE' }
    ];

    const cases = [];
    for (let i = 0; i < 100; i++) {
      const cat = categories[i % categories.length];
      const attempt = (i % 5 === 0) ? 3 : 1; // 20% of cases are max retries
      const amount = (i % 7 === 0) ? 60000 : 1500; // Some high value cases
      
      let expected = cat.expected;
      if (attempt >= 3 || amount >= 50000 || cat.reason === 'unknown_fraud') {
        expected = 'ESCALATE';
      }

      cases.push({
        id: `EVAL-${crypto.randomUUID().slice(0, 8)}`,
        failure_reason: cat.reason,
        attempt_number: attempt,
        amount_at_risk: amount,
        notification_count: 0,
        status: 'failed',
        created_at: new Date().toISOString(),
        expected_action: expected
      });
    }

    const runId = `RUN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    
    let correct = 0;
    let falsePositives = 0; // AI took action, but expected was ESCALATE
    let falseNegatives = 0; // AI ESCALATED, but expected was action
    let truePositives = 0;
    let trueNegatives = 0;
    let policyViolations = 0;

    const evaluatedCases = [];

    // Run AI and Policy Engine on each
    for (const c of cases) {
      const decision = await LLMProvider.analyze(c);
      
      const isCorrect = decision.recoveryType === c.expected_action;
      if (isCorrect) correct++;

      // Confusion matrix logic (Positive = Action, Negative = ESCALATE)
      const expectedPositive = c.expected_action !== 'ESCALATE';
      const actualPositive = decision.recoveryType !== 'ESCALATE';

      if (expectedPositive && actualPositive) truePositives++;
      if (!expectedPositive && !actualPositive) trueNegatives++;
      if (!expectedPositive && actualPositive) falsePositives++;
      if (expectedPositive && !actualPositive) falseNegatives++;

      // Policy Evaluation
      const policyResult = PolicyEngine.evaluateContext(c, decision);
      if (!policyResult.approved) {
        policyViolations++;
      }

      evaluatedCases.push({
        id: c.id,
        run_id: runId,
        failure_category: c.failure_reason,
        expected_action: c.expected_action,
        recommended_action: decision.recoveryType,
        policy_approved: policyResult.approved ? 1 : 0,
        policy_reason: policyResult.reason,
        is_correct: isCorrect ? 1 : 0,
        created_at: new Date().toISOString()
      });
    }

    const accuracy = correct / cases.length;
    const precision = truePositives / (truePositives + falsePositives || 1);
    const recall = truePositives / (truePositives + falseNegatives || 1);
    const f1 = 2 * (precision * recall) / (precision + recall || 1);
    const fpr = falsePositives / (falsePositives + trueNegatives || 1);
    const fnr = falseNegatives / (falseNegatives + truePositives || 1);
    
    const successfulRecoveryRate = truePositives / cases.length; 

    db.prepare(`
      INSERT INTO evaluation_runs 
      (id, total_cases, accuracy, precision, recall, f1, false_positive_rate, false_negative_rate, policy_violations, successful_recovery_rate, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId, cases.length, accuracy, precision, recall, f1, fpr, fnr, policyViolations, successfulRecoveryRate, new Date().toISOString()
    );

    const evalCasesInsert = db.prepare(`
      INSERT INTO evaluation_cases 
      (id, run_id, failure_category, expected_action, recommended_action, policy_approved, policy_reason, is_correct, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        evalCasesInsert.run(
          item.id, item.run_id, item.failure_category, item.expected_action, 
          item.recommended_action, item.policy_approved, item.policy_reason, 
          item.is_correct, item.created_at
        );
      }
    });
    
    insertMany(evaluatedCases);

    return {
      runId,
      accuracy,
      precision,
      recall,
      f1,
      policyViolations
    };
  }
}
