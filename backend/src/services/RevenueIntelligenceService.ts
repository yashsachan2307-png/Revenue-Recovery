import { db } from "../database";

export class RevenueIntelligenceService {
  static getOverviewMetrics() {
    const totalProcessed = (db.prepare(`SELECT SUM(amount) as total FROM payments WHERE status = 'successful'`).get() as any).total || 0;
    
    // Revenue at risk = sum of all recovery opportunities that are not 'recovered' or 'failed'
    const revenueAtRisk = (db.prepare(`
      SELECT SUM(amount_at_risk) as total 
      FROM recovery_opportunities 
      WHERE status NOT IN ('recovered', 'failed')
    `).get() as any).total || 0;

    const recoveredRevenue = (db.prepare(`
      SELECT SUM(amount_at_risk) as total 
      FROM recovery_opportunities 
      WHERE status = 'recovered'
    `).get() as any).total || 0;

    const totalFailed = (db.prepare(`SELECT COUNT(*) as cnt FROM payments WHERE status = 'failed'`).get() as any).cnt;
    
    const activeCases = (db.prepare(`
      SELECT COUNT(*) as cnt 
      FROM recovery_opportunities 
      WHERE status NOT IN ('recovered', 'failed')
    `).get() as any).cnt;

    const totalOpportunities = (db.prepare(`SELECT COUNT(*) as cnt FROM recovery_opportunities`).get() as any).cnt;
    const recoveredCases = (db.prepare(`SELECT COUNT(*) as cnt FROM recovery_opportunities WHERE status = 'recovered'`).get() as any).cnt;
    
    let recoveryRate = 0;
    if (totalOpportunities > 0) {
      recoveryRate = Math.round((recoveredCases / totalOpportunities) * 100 * 10) / 10;
    }

    const avgFailedValueResult = db.prepare(`SELECT AVG(amount) as avg FROM payments WHERE status = 'failed'`).get() as any;
    const averageFailedValue = Math.round(avgFailedValueResult.avg || 0);

    return {
      revenueAtRisk,
      recoveredRevenue,
      recoveryRate,
      activeCases,
      totalFailed,
      totalProcessed,
      averageFailedValue
    };
  }

  static getFailureDistribution() {
    return db.prepare(`
      SELECT category, COUNT(*) as count, SUM(amount_at_risk) as total_amount
      FROM recovery_opportunities
      WHERE status NOT IN ('recovered', 'failed')
      GROUP BY category
    `).all();
  }

  static getRiskDistribution() {
    return db.prepare(`
      SELECT severity, COUNT(*) as count, SUM(amount_at_risk) as total_amount
      FROM recovery_opportunities 
      WHERE status NOT IN ('recovered', 'failed')
      GROUP BY severity
    `).all();
  }

  static getTopCustomersByRisk(limit = 5) {
    return db.prepare(`
      SELECT c.id, c.name, c.email, SUM(r.amount_at_risk) as revenue_at_risk, COUNT(r.id) as opportunity_count
      FROM customers c
      JOIN recovery_opportunities r ON c.id = r.customer_id
      WHERE r.status NOT IN ('recovered', 'failed')
      GROUP BY c.id, c.name, c.email
      ORDER BY revenue_at_risk DESC
      LIMIT ?
    `).all(limit);
  }
}
