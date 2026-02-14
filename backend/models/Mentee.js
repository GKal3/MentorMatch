import pool from '../config/database.js';

class Mentee {
  // Crea profilo mentee
  static async create(menteeData) {
    const { id_utente, occupazione, bio } = menteeData;

    const query = `
      INSERT INTO "Mentee" ("Id_Utente", "Occupazione", "Bio")
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [id_utente, occupazione, bio || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Trova mentee per ID utente
  static async findByUserId(userId) {
    const query = `
      SELECT
        u."Id" AS "Id_Utente",
        u."Mail",
        u."Nome",
        u."Cognome",
        u."Data_Nascita"::text AS "Data_Nascita",
        u."Genere",
        m."Id",
        m."Occupazione",
        m."Bio"
      FROM "Utenti" u
      LEFT JOIN "Mentee" m ON m."Id_Utente" = u."Id"
      WHERE u."Id" = $1
        AND u."Ruolo" = 'Mentee'
      LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  // Ottieni statistiche mentee
  static async getStats(userId) {
    const query = `
      SELECT 
        COUNT(DISTINCT p."Id") AS totale_prenotazioni,
        COUNT(DISTINCT CASE WHEN p."Stato" = 'Accepted' THEN p."Id" END) AS prenotazioni_confermate,
        COUNT(DISTINCT r."Id") AS recensioni_lasciate,
        COALESCE(SUM(pag."Importo"), 0) AS totale_speso
      FROM "Mentee" m
      LEFT JOIN "Prenotazioni" p ON m."Id_Utente" = p."Id_Mentee"
      LEFT JOIN "Recensioni" r ON m."Id_Utente" = r."Id_Mentee"
      LEFT JOIN "Pagamenti" pag ON p."Id" = pag."Id_Prenot"
      WHERE m."Id_Utente" = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  // Aggiorna profilo mentee
  static async updateProfile(userId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && key !== 'Id' && key !== 'Id_Utente') {
        fields.push(`"${key.charAt(0).toUpperCase() + key.slice(1)}" = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('Nessun campo da aggiornare');
    }

    values.push(userId);
    const query = `
      UPDATE "Mentee"
      SET ${fields.join(', ')}
      WHERE "Id_Utente" = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

export default Mentee;