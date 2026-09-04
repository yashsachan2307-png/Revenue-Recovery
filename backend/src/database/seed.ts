import { db, initDb } from "./index";
import { AuthService } from "../services/AuthService";
import { RecoveryOpportunityService } from "../services/RecoveryOpportunityService";
import crypto from "crypto";

export function seedDatabase() {
  initDb();

  // Clear tables in reverse dependency order
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM scheduled_jobs;
    DELETE FROM audit_logs;
    DELETE FROM recovery_events;
    DELETE FROM recovery_opportunities;
    DELETE FROM payments;
    DELETE FROM customers;
    DELETE FROM password_reset_tokens;
    DELETE FROM users;
    DELETE FROM merchants;
  `);

  const insertMerchant = db.prepare('INSERT INTO merchants (id, name, currency, created_at) VALUES (?, ?, ?, ?)');
  const insertUser = db.prepare('INSERT INTO users (id, merchant_id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertCustomer = db.prepare('INSERT INTO customers (id, merchant_id, name, email, phone, lifetime_value, successful_payments, failed_payments, risk_level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertPayment = db.prepare('INSERT INTO payments (id, merchant_id, customer_id, amount, currency, status, failure_reason, payment_method, bank, attempt_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertAudit = db.prepare('INSERT INTO audit_logs (id, recovery_opportunity_id, payment_id, agent_decision, policy_decision, action, result, reason, confidence, actor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertJob = db.prepare('INSERT INTO scheduled_jobs (id, case_id, action, attempt_number, scheduled_for, status, result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertNotification = db.prepare('INSERT INTO notifications (id, type, title, message, is_read, case_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');

  const merchantId = "M-IND-001";
  const now = new Date().toISOString();

  db.transaction(() => {
    // 1. Merchant: Desi Gadgets Pvt Ltd
    insertMerchant.run(merchantId, "Desi Gadgets Pvt Ltd", "INR", now);

    // 2. Demo User: Aarav Sharma (demo@desigadgets.in / Demo@123Password)
    const demoUserId = "USR-DEMO-001";
    const passwordHash = AuthService.hashPassword("Demo@123Password");
    insertUser.run(demoUserId, merchantId, "Aarav Sharma", "demo@desigadgets.in", passwordHash, "merchant_admin", now);

    // 3. Indian Customers (120 synthetic profiles)
    const customerIds: string[] = [];
    const customerNames = [
      "Rahul Sharma", "Priya Singh", "Amit Kumar", "Neha Gupta", "Vikram Patel",
      "Sneha Reddy", "Arjun Das", "Pooja Joshi", "Ravi Verma", "Anjali Mishra",
      "Sanjay Kapoor", "Kavita Iyer", "Rajesh Nair", "Meera Menon", "Karthik Raj",
      "Deepa Rao", "Ajay Pillai", "Ritu Desai", "Rohan Mehta", "Shruti Shah",
      "Manish Tiwari", "Sunita Agarwal", "Gaurav Malhotra", "Divya Nambiar", "Aditya Joshi"
    ];

    for (let i = 0; i < 120; i++) {
      const id = `CUS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      customerIds.push(id);
      const baseName = customerNames[i % customerNames.length];
      const name = i >= customerNames.length ? `${baseName} ${Math.floor(i / customerNames.length) + 1}` : baseName;
      const email = name.toLowerCase().replace(/[^a-z0-9]/g, ".") + "@example.test";
      const riskLevel = Math.random() > 0.8 ? "HIGH" : (Math.random() > 0.4 ? "MEDIUM" : "LOW");
      
      // Clearly synthetic Indian phone format
      const phone = `+9198765${String(10000 + i).slice(-5)}`;
      insertCustomer.run(id, merchantId, name, email, phone, 0, 0, 0, riskLevel, now);
    }

    // 4. Payments (450 Indian transactions)
    const amounts = [499, 1299, 2499, 4999, 8499, 14500, 21000, 34999, 49999, 89999, 124999];
    const failureReasons = [
      "INSUFFICIENT_FUNDS",
      "BANK_TIMEOUT",
      "UPI_PIN_INCORRECT",
      "CARD_DECLINED",
      "AUTHENTICATION_FAILED",
      "NETWORK_ERROR",
      "DAILY_LIMIT_EXCEEDED"
    ];
    const methods = ["upi", "upi", "credit_card", "debit_card", "net_banking"];
    const banks = ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank"];

    const paymentIds: { id: string; customerId: string; status: string; amount: number; failureReason: string | null; date: string }[] = [];

    for (let i = 0; i < 500; i++) {
      const pId = `PAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const cId = customerIds[Math.floor(Math.random() * customerIds.length)];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const bank = banks[Math.floor(Math.random() * banks.length)];

      // Status distribution: 65% successful, 20% failed, 15% recovered
      const roll = Math.random();
      let status: "successful" | "failed" | "recovered";
      let failureReason: string | null = null;
      let attemptNumber = 1;

      if (roll < 0.65) {
        status = "successful";
      } else if (roll < 0.85) {
        status = "failed";
        failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
      } else {
        status = "recovered";
        failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
        attemptNumber = Math.floor(Math.random() * 2) + 2; // attempt 2 or 3
      }

      // Distribute over past 30 days
      const daysAgo = Math.random() * 30;
      const pastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      insertPayment.run(pId, merchantId, cId, amount, "INR", status, failureReason, method, bank, attemptNumber, pastDate, pastDate);
      paymentIds.push({ id: pId, customerId: cId, status, amount, failureReason, date: pastDate });

      // Update customer stats
      if (status === "successful" || status === "recovered") {
        db.prepare('UPDATE customers SET lifetime_value = lifetime_value + ?, successful_payments = successful_payments + 1 WHERE id = ?').run(amount, cId);
      } else {
        db.prepare('UPDATE customers SET failed_payments = failed_payments + 1 WHERE id = ?').run(cId);
      }
    }

    // 5. Generate Recovery Opportunities for all failed and recovered payments
    const oppInsert = db.prepare(`
      INSERT INTO recovery_opportunities (id, payment_id, customer_id, amount_at_risk, category, severity, status, recommended_action, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const actions = [
      "SMART_RETRY_WINDOW",
      "SEND_UPI_COLLECT_REQUEST",
      "SWITCH_CARD_PAYMENT_METHOD",
      "EXPEDITE_CUSTOMER_WHATSAPP_LINK",
      "ESCALATE_TO_MERCHANT_REVIEW"
    ];

    const categoryMap: Record<string, string> = {
      INSUFFICIENT_FUNDS: "CUSTOMER_FUNDS",
      BANK_TIMEOUT: "BANK",
      UPI_PIN_INCORRECT: "AUTHENTICATION",
      CARD_DECLINED: "PAYMENT_METHOD",
      AUTHENTICATION_FAILED: "AUTHENTICATION",
      NETWORK_ERROR: "NETWORK",
      DAILY_LIMIT_EXCEEDED: "CUSTOMER_FUNDS"
    };

    paymentIds.forEach((p, idx) => {
      if (p.status === "failed" || p.status === "recovered") {
        const oppId = `OPP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const category = categoryMap[p.failureReason || ""] || "UNKNOWN";
        const severity = p.amount > 40000 ? "HIGH" : (p.amount > 10000 ? "MEDIUM" : "LOW");
        
        let oppStatus = "action_pending";
        if (p.status === "recovered") {
          oppStatus = "recovered";
        } else if (idx % 4 === 0) {
          oppStatus = "analyzing";
        } else if (idx % 3 === 0) {
          oppStatus = "recommended";
        } else if (idx % 5 === 0) {
          oppStatus = "detected";
        }

        const action = actions[Math.floor(Math.random() * actions.length)];
        oppInsert.run(oppId, p.id, p.customerId, p.amount, category, severity, oppStatus, action, p.date, p.date);

        // Add an Audit Log entry for decisions
        const auditId = `AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const isApproved = severity !== "HIGH" || Math.random() > 0.3;
        insertAudit.run(
          auditId,
          oppId,
          p.id,
          JSON.stringify({ recommended_action: action, urgency: severity, recovery_probability: 0.88 }),
          JSON.stringify({ policy: "POL-1", approved: isApproved }),
          action,
          p.status === "recovered" ? "RECOVERED" : (isApproved ? "SUCCESS" : "REQUIRES_APPROVAL"),
          `Evaluated ${category} for ${severity} risk payment via Indian banking gateway`,
          0.85 + Math.random() * 0.14,
          "AI_AGENT",
          p.date
        );

        // Schedule some pending jobs for active cases
        if (oppStatus === "action_pending" && idx % 3 === 0) {
          const jobId = `JOB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          const futureDate = new Date(Date.now() + Math.random() * 2 * 60 * 60 * 1000).toISOString();
          insertJob.run(jobId, p.id, action, 2, futureDate, "PENDING", null, p.date);
        }
      }
    });

    // 6. Notifications for merchant attention
    insertNotification.run(
      `NOTIF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      "ALERT",
      "High Value Payment at Risk",
      "Payment ₹1,24,999 failed due to Bank Timeout at HDFC Bank. Smart retry queued for optimal window.",
      0,
      paymentIds.find(p => p.amount > 100000 && p.status === "failed")?.id || null,
      new Date(Date.now() - 15 * 60 * 1000).toISOString()
    );

    insertNotification.run(
      `NOTIF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      "SUCCESS",
      "UPI Recovery Succeeded",
      "Recovered ₹21,000 for customer Priya Singh via dynamic UPI collect link.",
      0,
      null,
      new Date(Date.now() - 60 * 60 * 1000).toISOString()
    );

    insertNotification.run(
      `NOTIF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      "SYSTEM",
      "Indian Gateway Policy Active",
      "Guardrail POL-1 (Max 3 retries) and POL-2 (High value review over ₹50,000) active.",
      1,
      null,
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    );
  })();

  console.log("Database seeded successfully with synthetic Indian merchant data.");
}
