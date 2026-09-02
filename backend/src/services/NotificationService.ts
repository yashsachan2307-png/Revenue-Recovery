import { db } from '../database';

export class NotificationService {
  static create(type: string, title: string, message: string, caseId?: string) {
    const id = 'NOTIF-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    
    db.prepare(`
      INSERT INTO notifications (id, type, title, message, is_read, case_id, created_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(id, type, title, message, caseId || null, new Date().toISOString());

    return id;
  }

  static getUnread() {
    return db.prepare(`SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC`).all();
  }

  static markAsRead(id: string) {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(id);
  }
}
