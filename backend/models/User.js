import pool from "../config/database.js";
import bcrypt from "bcrypt";

class User {

  static async getAll() {
    const result = await pool.query('SELECT * FROM "Utenti"');
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM "Utenti" WHERE "Id" = $1',
      [id]
    );
    return result.rows[0];
  }

  static async getByEmail(mail) {
    const result = await pool.query(
      'SELECT * FROM "Utenti" WHERE "Mail" = $1',
      [mail]
    );
    return result.rows[0];
  }

  static async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  static async create({
    mail,
    nome,
    cognome,
    data_nascita,
    genere,
    password,
    ruolo
  }) {
    // Hash della password prima di salvarla nel database
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO "Utenti"
      ("Mail", "Nome", "Cognome", "Data_Nascita", "Genere", "Password", "Ruolo")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [mail, nome, cognome, data_nascita, genere, hashedPassword, ruolo]
    );
    return result.rows[0];
  }

  static async updateProfile(id, nome, cognome, data_nascita, genere) {
    const result = await pool.query(
      `UPDATE "Utenti"
       SET "Nome" = $1, "Cognome" = $2, "Data_Nascita" = $3, "Genere" = $4
       WHERE "Id" = $5
       RETURNING *`,
      [nome, cognome, data_nascita, genere, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query(
      'DELETE FROM "Utenti" WHERE "Id" = $1',
      [id]
    );
  }
}

export default User;