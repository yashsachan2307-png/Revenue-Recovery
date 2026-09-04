import { db } from '../database';

export class SchedulerService {
  private static intervalId: NodeJS.Timeout | null = null;

  static start(intervalMs: number = 10000) {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.processJobs();
    }, intervalMs);
    
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private static processJobs() {
    const now = new Date().toISOString();

    const pendingJobs = db.prepare(`
      SELECT * FROM scheduled_jobs 
      WHERE status = 'PENDING' AND scheduled_for <= ?
    `).all(now) as any[];

    if (pendingJobs.length === 0) return;

    const updateStatus = db.prepare(`UPDATE scheduled_jobs SET status = ?, result = ? WHERE id = ?`);

    db.transaction(() => {
      for (const job of pendingJobs) {
        // Simulate execution
        // In a real system, we would dispatch the action. 
        // For now, mark as COMPLETED.
        updateStatus.run('COMPLETED', 'Executed successfully by scheduler', job.id);
      }
    })();
  }
}
