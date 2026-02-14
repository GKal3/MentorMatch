import pool from '../config/database.js';

class Notification {
    static async getAllNotifications(userId) {
        const query = `
      SELECT *
      FROM "Notifiche"
      WHERE "Id_Utente" = $1
      ORDER BY "Data" DESC
    `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    static async getNotificationById(notificationId) {
        const query = `
      SELECT *
      FROM "Notifiche"
      WHERE "Id" = $1
    `;
        const result = await pool.query(query, [notificationId]);
        return result.rows[0];
    }

    static async getNotificationByIdForUser(notificationId, userId) {
        const query = `
      SELECT *
      FROM "Notifiche"
      WHERE "Id" = $1 AND "Id_Utente" = $2
    `;
        const result = await pool.query(query, [notificationId, userId]);
        return result.rows[0];
    }

    static async getUnreadCount(userId) {
        const query = `
      SELECT COUNT(*)::int AS unread_count
      FROM "Notifiche"
      WHERE "Id_Utente" = $1
      AND COALESCE("Stato", 'Unread') = 'Unread'
    `;
        const result = await pool.query(query, [userId]);
        return result.rows[0]?.unread_count || 0;
    }

    static async markAsRead(notificationId, userId) {
        const query = `
      UPDATE "Notifiche"
      SET "Stato" = 'Read'
      WHERE "Id" = $1 AND "Id_Utente" = $2
      RETURNING *
    `;
        const result = await pool.query(query, [notificationId, userId]);
        return result.rows[0];
    }

    static async markAllAsRead(userId) {
        const query = `
      UPDATE "Notifiche"
      SET "Stato" = 'Read'
      WHERE "Id_Utente" = $1 AND COALESCE("Stato", 'Unread') = 'Unread'
      RETURNING "Id"
    `;
        const result = await pool.query(query, [userId]);
        return result.rowCount || 0;
    }

    static async create(userId, type, title, message, metadata = {}) {
        const query = `
      INSERT INTO "Notifiche" ("Id_Utente", "Tipo", "Titolo", "Contenuto", "Data", "Stato")
      VALUES ($1, $2, $3, $4, NOW(), 'Unread')
      RETURNING *
    `;
        const result = await pool.query(query, [userId, type, title, message]);
        return result.rows[0];
    }
}

export default Notification;