import pool from "../config/database.js";

class Review {

  // Crea una nuova recensione
  static async create(reviewData) {
    const { id_mentee, id_mentor, voto, commento } = reviewData;

    const query = `
      INSERT INTO "Recensioni" ("Id_Mentee", "Id_Mentor", "Voto", "Commento")
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [id_mentee, id_mentor, voto, commento || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Trova tutte le recensioni scritte da un mentee
  static async findByMenteeUserId(menteeUserId) {
    const query = `
      SELECT 
        r.*,
        u."Nome" AS mentor_nome,
        u."Cognome" AS mentor_cognome
      FROM "Recensioni" r
      JOIN "Utenti" u ON r."Id_Mentor" = u."Id"
      WHERE r."Id_Mentee" = $1
      ORDER BY r."Id" DESC
    `;

    const result = await pool.query(query, [menteeUserId]);
    return result.rows;
  }

  // Trova recensione per ID
  static async findById(id) {
    const query = `SELECT * FROM "Recensioni" WHERE "Id" = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Aggiorna recensione
  static async update(id, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updateData.voto !== undefined) {
      fields.push(`"Voto" = $${paramCount}`);
      values.push(updateData.voto);
      paramCount++;
    }

    if (updateData.commento !== undefined) {
      fields.push(`"Commento" = $${paramCount}`);
      values.push(updateData.commento);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error("Nessun campo da aggiornare");
    }

    values.push(id);

    const query = `
      UPDATE "Recensioni"
      SET ${fields.join(", ")}
      WHERE "Id" = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Elimina recensione
  static async delete(id) {
    const query = `
      DELETE FROM "Recensioni"
      WHERE "Id" = $1
      RETURNING "Id"
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Statistiche recensioni di un mentor
  static async getMentorStats(mentorUserId) {
    const query = `
      SELECT 
        COUNT(*) AS totale_recensioni,
        ROUND(AVG("Voto"), 2) AS media_voti,
        COUNT(CASE WHEN "Voto" = 5 THEN 1 END) AS voti_5,
        COUNT(CASE WHEN "Voto" = 4 THEN 1 END) AS voti_4,
        COUNT(CASE WHEN "Voto" = 3 THEN 1 END) AS voti_3,
        COUNT(CASE WHEN "Voto" = 2 THEN 1 END) AS voti_2,
        COUNT(CASE WHEN "Voto" = 1 THEN 1 END) AS voti_1
      FROM "Recensioni"
      WHERE "Id_Mentor" = $1
    `;

    const result = await pool.query(query, [mentorUserId]);
    return result.rows[0];
  }

  // Tutte le recensioni ricevute da un mentor
  static async getAllByMentorId(mentorUserId) {
    const query = `
      SELECT 
        r.*,
        u."Nome" AS mentee_nome,
        u."Cognome" AS mentee_cognome
      FROM "Recensioni" r
      JOIN "Utenti" u ON r."Id_Mentee" = u."Id"
      WHERE r."Id_Mentor" = $1
      ORDER BY r."Id" DESC
    `;

    const result = await pool.query(query, [mentorUserId]);
    return result.rows;
  }

  // Trova recensione per mentee e mentor
  static async findByMenteeAndMentor(menteeUserId, mentorUserId) {
    const query = `
      SELECT * FROM "Recensioni" 
      WHERE "Id_Mentee" = $1 AND "Id_Mentor" = $2
    `;
    const result = await pool.query(query, [menteeUserId, mentorUserId]);
    return result.rows[0];
  }
}

export default Review;
