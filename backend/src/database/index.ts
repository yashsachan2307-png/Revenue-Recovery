import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(__dirname, "../../revenue_recovery.db");
export const db = new Database(dbPath, { verbose: console.log });

export function initDb() {
  db.pragma('journal_mode = WAL');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      lifetime_value REAL NOT NULL DEFAULT 0,
      successful_payments INTEGER NOT NULL DEFAULT 0,
      failed_payments INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    );
    
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      failure_reason TEXT,
      payment_method TEXT NOT NULL,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    
    CREATE TABLE IF NOT EXISTS recovery_opportunities (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount_at_risk REAL NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (payment_id) REFERENCES payments(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    
    CREATE TABLE IF NOT EXISTS recovery_events (
      id TEXT PRIMARY KEY,
      recovery_opportunity_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (recovery_opportunity_id) REFERENCES recovery_opportunities(id)
    );
    
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      recovery_opportunity_id TEXT NOT NULL,
      payment_id TEXT NOT NULL,
      agent_decision TEXT,
      policy_decision TEXT,
      action TEXT,
      result TEXT,
      reason TEXT,
      confidence REAL,
      actor TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (recovery_opportunity_id) REFERENCES recovery_opportunities(id),
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    );
    
    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      parameters TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS evaluation_runs (
      id TEXT PRIMARY KEY,
      total_cases INTEGER NOT NULL,
      accuracy REAL NOT NULL,
      precision REAL NOT NULL,
      recall REAL NOT NULL,
      f1 REAL NOT NULL,
      false_positive_rate REAL NOT NULL,
      false_negative_rate REAL NOT NULL,
      policy_violations INTEGER NOT NULL,
      successful_recovery_rate REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS evaluation_cases (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      failure_category TEXT NOT NULL,
      expected_action TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      policy_approved INTEGER NOT NULL,
      policy_reason TEXT,
      is_correct INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES evaluation_runs(id)
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger TEXT NOT NULL,
      conditions_json TEXT NOT NULL,
      action TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS action_templates (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      template_name TEXT NOT NULL,
      content_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      action TEXT NOT NULL,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      scheduled_for TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      result TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES payments(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      case_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Initial seeding for Workflows and Templates
  const countWorkflows = db.prepare(`SELECT count(*) as count FROM workflows`).get() as { count: number };
  if (countWorkflows.count === 0) {
    const insertWorkflow = db.prepare(`
      INSERT INTO workflows (id, name, trigger, conditions_json, action, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertWorkflow.run(
      'WF-1', 
      'High Value Escalate', 
      'PAYMENT_FAILED', 
      JSON.stringify([{ field: 'amount', operator: '>', value: 25000 }]), 
      'ESCALATE', 
      1, 
      new Date().toISOString()
    );
    
    insertWorkflow.run(
      'WF-2', 
      'Network Error Retry', 
      'PAYMENT_FAILED', 
      JSON.stringify([{ field: 'failureReason', operator: '==', value: 'NETWORK_ERROR' }]), 
      'WAIT_AND_RETRY', 
      1, 
      new Date().toISOString()
    );
  }

  const countTemplates = db.prepare(`SELECT count(*) as count FROM action_templates`).get() as { count: number };
  if (countTemplates.count === 0) {
    const insertTemplate = db.prepare(`
      INSERT INTO action_templates (id, action_type, template_name, content_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    insertTemplate.run(
      'TPL-1', 
      'NOTIFY_CUSTOMER', 
      'Standard Failure Email', 
      JSON.stringify({ subject: 'Action Required: Payment Failed', body: 'Your recent payment of {amount} has failed due to {reason}. Please update your payment method.' }), 
      new Date().toISOString()
    );
    
    insertTemplate.run(
      'TPL-2', 
      'ESCALATE', 
      'Merchant Dashboard Alert', 
      JSON.stringify({ priority: 'HIGH', message: 'High value failure for customer {customer} requires manual review.' }), 
      new Date().toISOString()
    );
  }

  // Insert default policies if they don't exist
  const existingPolicies = db.prepare('SELECT count(*) as count FROM policies').get() as any;
  if (existingPolicies.count === 0) {
    const insertPolicy = db.prepare('INSERT INTO policies (id, name, description, type, parameters, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    insertPolicy.run('POL-1', 'Max Retries', 'Maximum number of retries before escalation', 'MAX_RETRIES', JSON.stringify({ max: 3 }), new Date().toISOString());
    insertPolicy.run('POL-2', 'High Value Review', 'Amounts over threshold require manual review', 'MAX_AUTO_AMOUNT', JSON.stringify({ threshold: 50000 }), new Date().toISOString());
    insertPolicy.run('POL-3', 'Notification Limit', 'Do not spam customers', 'MAX_NOTIFICATIONS', JSON.stringify({ max: 2 }), new Date().toISOString());
  }
}
