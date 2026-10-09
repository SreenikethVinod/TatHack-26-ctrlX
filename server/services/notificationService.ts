import Database from 'better-sqlite3';
import { db as databaseConnection } from '../db/connection.ts';

export interface NotificationItem {
  id: string;
  userId: string;
  complaintId: string;
  complaintReference: string;
  complaintTitle: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  constructor(private db: Database.Database = databaseConnection) {}

  public getNotificationsForUser(userId: string): { notifications: NotificationItem[]; unreadCount: number } {
    try {
      const rows = this.db
        .prepare(
          `SELECT * FROM notifications
           WHERE user_id = ?
           ORDER BY datetime(created_at) DESC
           LIMIT 50`
        )
        .all(userId) as any[];

      const unreadRow = this.db
        .prepare('SELECT count(*) as c FROM notifications WHERE user_id = ? AND read = 0')
        .get(userId) as any;

      return {
        notifications: rows.map((r) => ({
          id: r.id,
          userId: r.user_id,
          complaintId: r.complaint_id,
          complaintReference: r.complaint_reference,
          complaintTitle: r.complaint_title,
          type: r.type,
          title: r.title,
          message: r.message,
          read: Boolean(r.read),
          createdAt: r.created_at,
        })),
        unreadCount: unreadRow?.c || 0,
      };
    } catch {
      return { notifications: [], unreadCount: 0 };
    }
  }

  public markAsRead(notificationId: string, userId: string): boolean {
    try {
      this.db
        .prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
        .run(notificationId, userId);
      return true;
    } catch {
      return false;
    }
  }

  public markAllAsRead(userId: string): boolean {
    try {
      this.db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
      return true;
    } catch {
      return false;
    }
  }

  public toggleFollow(
    complaintId: string,
    user: { id: string; name: string; email?: string }
  ): { isFollowing: boolean; followersCount: number; message: string } {
    const existing = this.db
      .prepare('SELECT id FROM complaint_followers WHERE complaint_id = ? AND user_id = ?')
      .get(complaintId, user.id);

    const now = new Date().toISOString();

    if (existing) {
      // Unfollow
      this.db
        .prepare('DELETE FROM complaint_followers WHERE complaint_id = ? AND user_id = ?')
        .run(complaintId, user.id);

      const countRow = this.db
        .prepare('SELECT count(*) as c FROM complaint_followers WHERE complaint_id = ?')
        .get(complaintId) as any;

      return {
        isFollowing: false,
        followersCount: Math.max(1, countRow?.c || 1),
        message: 'You have unfollowed this report.',
      };
    } else {
      // Follow
      const folId = `fol-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      this.db
        .prepare(
          `INSERT INTO complaint_followers (id, complaint_id, user_id, user_name, user_email, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(folId, complaintId, user.id, user.name, user.email || null, now);

      const countRow = this.db
        .prepare('SELECT count(*) as c FROM complaint_followers WHERE complaint_id = ?')
        .get(complaintId) as any;

      return {
        isFollowing: true,
        followersCount: Math.max(1, countRow?.c || 1),
        message: 'You are now following this report! You will receive live updates when progress occurs.',
      };
    }
  }

  public ensureFollow(
    complaintId: string,
    user: { id: string; name: string; email?: string }
  ): void {
    const now = new Date().toISOString();
    const folId = `fol-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    try {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO complaint_followers (id, complaint_id, user_id, user_name, user_email, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(folId, complaintId, user.id, user.name, user.email || null, now);
    } catch {}
  }

  public isUserFollowing(complaintId: string, userId: string): boolean {
    try {
      const row = this.db
        .prepare('SELECT id FROM complaint_followers WHERE complaint_id = ? AND user_id = ?')
        .get(complaintId, userId);
      return Boolean(row);
    } catch {
      return false;
    }
  }

  public getFollowersCount(complaintId: string): number {
    try {
      const row = this.db
        .prepare('SELECT count(*) as c FROM complaint_followers WHERE complaint_id = ?')
        .get(complaintId) as any;
      return Math.max(1, row?.c || 1);
    } catch {
      return 1;
    }
  }

  public notifyFollowers(params: {
    complaintId: string;
    type: string;
    title: string;
    message: string;
    excludeUserId?: string;
  }): number {
    try {
      const complaint = this.db
        .prepare('SELECT id, reference, title, reporter_id FROM complaints WHERE id = ?')
        .get(params.complaintId) as any;

      if (!complaint) return 0;

      const followers = this.db
        .prepare('SELECT user_id FROM complaint_followers WHERE complaint_id = ?')
        .all(params.complaintId) as any[];

      const userIds = new Set<string>();
      followers.forEach((f) => userIds.add(f.user_id));
      if (complaint.reporter_id) {
        userIds.add(complaint.reporter_id);
      }

      // Also gather followers and reporters across auto-merged clusters
      try {
        const children = this.db
          .prepare('SELECT complaint_id FROM complaint_duplicate_links WHERE canonical_complaint_id = ?')
          .all(complaint.id) as any[];
        for (const child of children) {
          const childFollowers = this.db
            .prepare('SELECT user_id FROM complaint_followers WHERE complaint_id = ?')
            .all(child.complaint_id) as any[];
          childFollowers.forEach((f) => userIds.add(f.user_id));
          const childRow = this.db.prepare('SELECT reporter_id FROM complaints WHERE id = ?').get(child.complaint_id) as any;
          if (childRow?.reporter_id) userIds.add(childRow.reporter_id);
        }

        const parentLink = this.db
          .prepare('SELECT canonical_complaint_id FROM complaint_duplicate_links WHERE complaint_id = ?')
          .get(complaint.id) as any;
        if (parentLink?.canonical_complaint_id) {
          const canonFollowers = this.db
            .prepare('SELECT user_id FROM complaint_followers WHERE complaint_id = ?')
            .all(parentLink.canonical_complaint_id) as any[];
          canonFollowers.forEach((f) => userIds.add(f.user_id));
          const canonRow = this.db.prepare('SELECT reporter_id FROM complaints WHERE id = ?').get(parentLink.canonical_complaint_id) as any;
          if (canonRow?.reporter_id) userIds.add(canonRow.reporter_id);
        }
      } catch {}

      if (params.excludeUserId) {
        userIds.delete(params.excludeUserId);
      }

      const now = new Date().toISOString();
      const insert = this.db.prepare(
        `INSERT INTO notifications (id, user_id, complaint_id, complaint_reference, complaint_title, type, title, message, read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      );

      let sent = 0;
      for (const uId of userIds) {
        const notifId = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        insert.run(
          notifId,
          uId,
          complaint.id,
          complaint.reference,
          complaint.title,
          params.type,
          params.title,
          params.message,
          now
        );
        sent++;
      }

      return sent;
    } catch (err) {
      console.error('[NotificationService] notifyFollowers error:', err);
      return 0;
    }
  }
}

export const notificationService = new NotificationService();
