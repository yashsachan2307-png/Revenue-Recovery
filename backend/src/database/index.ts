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
  `);
}
