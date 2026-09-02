import { db } from '../database';

export class WorkflowEngine {
  
  static evaluateCase(paymentCase: any) {
    const workflows = db.prepare(`SELECT * FROM workflows WHERE is_active = 1`).all();
    
    for (const wf of workflows) {
      if (wf.trigger !== 'PAYMENT_FAILED') continue;
      
      const conditions = JSON.parse(wf.conditions_json);
      let match = true;
      
      for (const cond of conditions) {
        const value = paymentCase[cond.field];
        if (cond.operator === '>') {
          if (!(value > cond.value)) match = false;
        } else if (cond.operator === '<') {
          if (!(value < cond.value)) match = false;
        } else if (cond.operator === '==') {
          if (value !== cond.value) match = false;
        }
      }

      if (match) {
        return wf.action;
      }
    }

    return null; // No matching workflow
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
