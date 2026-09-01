import { db, initDb } from "../src/database";
import { RecoveryOpportunityService } from "../src/services/RecoveryOpportunityService";
import crypto from "crypto";

function seed() {
  initDb();
  
  // Clear tables
  db.exec(`
    DELETE FROM recovery_events;
    DELETE FROM recovery_opportunities;
    DELETE FROM payments;
    DELETE FROM customers;
    DELETE FROM merchants;
  `);
  
  const insertMerchant = db.prepare('INSERT INTO merchants (id, name, currency, created_at) VALUES (?, ?, ?, ?)');
  const insertCustomer = db.prepare('INSERT INTO customers (id, merchant_id, name, email, phone, lifetime_value, successful_payments, failed_payments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertPayment = db.prepare('INSERT INTO payments (id, merchant_id, customer_id, amount, currency, status, failure_reason, payment_method, attempt_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  db.transaction(() => {
    // 1 Merchant
    const merchantId = "M-IND-001";
    insertMerchant.run(merchantId, "Desi Gadgets Pvt Ltd", "INR", new Date().toISOString());

    // Generate 120 Customers
    const customerIds: string[] = [];
    const customerNames = ["Rahul Sharma", "Priya Singh", "Amit Kumar", "Neha Gupta", "Vikram Patel", "Sneha Reddy", "Arjun Das", "Pooja Joshi", "Ravi Verma", "Anjali Mishra", "Sanjay Kapoor", "Kavita Iyer", "Rajesh Nair", "Meera Menon", "Karthik Raj", "Deepa Rao", "Ajay Pillai", "Ritu Desai", "Rohan Mehta", "Shruti Shah"];
    
    for (let i = 0; i < 120; i++) {
      const id = `CUS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      customerIds.push(id);
      const name = customerNames[i % customerNames.length] + (i >= customerNames.length ? ` ${i}` : "");
      const email = name.toLowerCase().replace(/ /g, ".") + "@example.test";
      insertCustomer.run(id, merchantId, name, email, "+919876543210", 0, 0, 0, new Date().toISOString());
    }

    // Generate 450 Payments (with ~30% failure rate we should get >100 failures)
    const amounts = [850, 2499, 8499, 14500, 21000, 49999, 124999];
    const failureReasons = ["INSUFFICIENT_FUNDS", "CARD_DECLINED", "EXPIRED_CARD", "BANK_TIMEOUT", "AUTHENTICATION_FAILED", "NETWORK_ERROR", "UPI_TIMEOUT"];
    
    for (let i = 0; i < 450; i++) {
      const pId = `PAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const cId = customerIds[Math.floor(Math.random() * customerIds.length)];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      
      const isSuccess = Math.random() > 0.3; // 70% success, 30% failure
      const status = isSuccess ? "successful" : "failed";
      const failureReason = isSuccess ? null : failureReasons[Math.floor(Math.random() * failureReasons.length)];
      const paymentMethod = Math.random() > 0.5 ? "upi" : "credit_card";
      
      const pastDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
      
      insertPayment.run(pId, merchantId, cId, amount, "INR", status, failureReason, paymentMethod, 1, pastDate, pastDate);
      
      // Update customer stats
      if (isSuccess) {
        db.prepare('UPDATE customers SET lifetime_value = lifetime_value + ?, successful_payments = successful_payments + 1 WHERE id = ?').run(amount, cId);
      } else {
        db.prepare('UPDATE customers SET failed_payments = failed_payments + 1 WHERE id = ?').run(cId);
      }
    }
  })();
  
  // Generate Recovery Opportunities for failed payments
  RecoveryOpportunityService.generateOpportunities();
  
  console.log("Seeding complete!");
}

seed();
