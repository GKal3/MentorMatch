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

    static async create(userId, type, title, message, metadata = {}) {
        const query = `
      INSERT INTO "Notifiche" ("Id_Utente", "Tipo", "Titolo", "Contenuto", "Data")
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
        const result = await pool.query(query, [userId, type, title, message]);
        return result.rows[0];
    }
}

export default Notification;