import { db } from '../database';

export class AnalyticsEngine {
  
  static getAdvancedMetrics(startDate: string, endDate: string) {
    // Trend Data: Daily aggregation of recovered vs failed
    const trendData = db.prepare(`
      SELECT 
        date(created_at) as day,
        SUM(CASE WHEN status = 'recovered' THEN amount ELSE 0 END) as recovered_amount,
        SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_amount,
        SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) as recovered_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        COUNT(*) as total_attempts
      FROM payments
      WHERE created_at >= ? AND created_at <= ? AND status IN ('recovered', 'failed')
      GROUP BY day
      ORDER BY day ASC
    `).all(startDate, endDate);

    // Method Breakdown
    const methodBreakdown = db.prepare(`
      SELECT 
        payment_method as category, 
        SUM(CASE WHEN status = 'recovered' THEN amount ELSE 0 END) as recovered_amount,
        SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_amount
      FROM payments
      WHERE created_at >= ? AND created_at <= ? AND status IN ('recovered', 'failed')
      GROUP BY payment_method
    `).all(startDate, endDate);

    // Bank Breakdown
    const bankBreakdown = db.prepare(`
      SELECT 
        COALESCE(bank, 'Unknown') as category, 
        SUM(CASE WHEN status = 'recovered' THEN amount ELSE 0 END) as recovered_amount,
        SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_amount
      FROM payments
      WHERE created_at >= ? AND created_at <= ? AND status IN ('recovered', 'failed')
      GROUP BY COALESCE(bank, 'Unknown')
      ORDER BY recovered_amount DESC, failed_amount DESC
    `).all(startDate, endDate);

    // Failure Breakdown
    const failureBreakdown = db.prepare(`
      SELECT 
        COALESCE(failure_reason, 'Unknown') as category, 
        SUM(CASE WHEN status = 'recovered' THEN amount ELSE 0 END) as recovered_amount,
        SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_amount
      FROM payments
      WHERE created_at >= ? AND created_at <= ? AND status IN ('recovered', 'failed')
      GROUP BY COALESCE(failure_reason, 'Unknown')
    `).all(startDate, endDate);

    // Strategy Performance
    const strategyPerformance = db.prepare(`
      SELECT 
        COALESCE(r.recommended_action, 'WAIT_AND_RETRY') as category,
        SUM(CASE WHEN p.status = 'recovered' THEN p.amount ELSE 0 END) as recovered_amount,
        SUM(CASE WHEN p.status = 'failed' THEN p.amount ELSE 0 END) as failed_amount
      FROM payments p
      LEFT JOIN recovery_opportunities r ON p.id = r.payment_id
      WHERE p.created_at >= ? AND p.created_at <= ? AND p.status IN ('recovered', 'failed')
      GROUP BY category
    `).all(startDate, endDate);

    // Customer Segment Recovery (Risk Level)
    const segmentRecovery = db.prepare(`
      SELECT 
        c.risk_level as category,
        SUM(CASE WHEN p.status = 'recovered' THEN p.amount ELSE 0 END) as recovered_amount,
        SUM(CASE WHEN p.status = 'failed' THEN p.amount ELSE 0 END) as failed_amount
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.created_at >= ? AND p.created_at <= ? AND p.status IN ('recovered', 'failed')
      GROUP BY c.risk_level
    `).all(startDate, endDate);

    return {
      trendData,
      methodBreakdown,
      bankBreakdown,
      failureBreakdown,
      strategyPerformance,
      segmentRecovery
    };
  }

}
