import { db } from '../database';

export class AnalyticsEngine {
  
  static getAdvancedMetrics(timeRangeDays: number = 30) {
    const timeFilter = new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000).toISOString();

    const failureBreakdown = db.prepare(`
      SELECT failure_reason, COUNT(*) as count, SUM(amount) as total_amount
      FROM payments
      WHERE timestamp >= ? AND status = 'FAILED'
      GROUP BY failure_reason
      ORDER BY total_amount DESC
    `).all(timeFilter);

    const methodBreakdown = db.prepare(`
      SELECT payment_method, COUNT(*) as count, SUM(amount) as total_amount
      FROM payments
      WHERE timestamp >= ? AND status = 'FAILED'
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `).all(timeFilter);

    const bankBreakdown = db.prepare(`
      SELECT bank, COUNT(*) as count, SUM(amount) as total_amount
      FROM payments
      WHERE timestamp >= ? AND status = 'FAILED' AND bank IS NOT NULL
      GROUP BY bank
      ORDER BY total_amount DESC
    `).all(timeFilter);

    // Cohorts by customer risk profile
    const riskCohorts = db.prepare(`
      SELECT risk_level, COUNT(*) as failed_payments, SUM(amount) as total_amount
      FROM payments
      WHERE timestamp >= ? AND status = 'FAILED'
      GROUP BY risk_level
      ORDER BY total_amount DESC
    `).all(timeFilter);

    // Get time series data for the trend
    const trendData = db.prepare(`
      SELECT 
        date(timestamp) as day,
        SUM(amount) as amount_at_risk,
        COUNT(*) as failures
      FROM payments
      WHERE timestamp >= ? AND status = 'FAILED'
      GROUP BY day
      ORDER BY day ASC
    `).all(timeFilter);

    return {
      failureBreakdown,
      methodBreakdown,
      bankBreakdown,
      riskCohorts,
      trendData
    };
  }

}
