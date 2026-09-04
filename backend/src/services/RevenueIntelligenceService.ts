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

  static getTrendMetrics(days = 7) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysList: { name: string; dateStr: string }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0] as string;
      const dayName = dayNames[d.getDay()] as string;
      daysList.push({ name: dayName, dateStr });
    }

    const rows = db.prepare(`
      SELECT 
        substr(created_at, 1, 10) as day,
        SUM(CASE WHEN status = 'recovered' THEN amount ELSE 0 END) as recovered,
        SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as at_risk
      FROM payments
      WHERE created_at >= date('now', '-${days} days')
      GROUP BY day
    `).all() as { day: string; recovered: number; at_risk: number }[];

    const rowMap = new Map(rows.map(r => [r.day, r]));

    return daysList.map(item => {
      const match = rowMap.get(item.dateStr);
      return {
        name: item.name,
        recovered: Math.round(match?.recovered || 0),
        atRisk: Math.round(match?.at_risk || 0)
      };
    });
  }

  static getMethodDistribution() {
    const rows = db.prepare(`
      SELECT 
        payment_method,
        SUM(CASE WHEN status = 'recovered' THEN amount ELSE 0 END) as recovered,
        SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as at_risk
      FROM payments
      GROUP BY payment_method
    `).all() as { payment_method: string; recovered: number; at_risk: number }[];

    const formatMethodName = (m: string) => {
      if (!m) return 'Other';
      const lower = m.toLowerCase();
      if (lower === 'upi') return 'UPI';
      if (lower === 'credit_card' || lower === 'card') return 'Card';
      if (lower === 'debit_card') return 'Debit Card';
      if (lower === 'net_banking' || lower === 'netbanking') return 'Netbanking';
      return m.charAt(0).toUpperCase() + m.slice(1);
    };

    return rows.map(r => ({
      name: formatMethodName(r.payment_method),
      recovered: Math.round(r.recovered || 0),
      atRisk: Math.round(r.at_risk || 0)
    }));
  }
}

