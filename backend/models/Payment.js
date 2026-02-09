import pool from '../config/database.js';

class Payment {

    static async create(AppId, price, method, date) {
        const result = await pool.query(
            'INSERT INTO "Pagamenti" ("Id_Prenot", "Importo", "Metodo", "Data") VALUES ($1, $2, $3, $4) RETURNING *',
            [AppId, price, method, date]
        );
        return result.rows[0];
    }

    // Storico pagamenti - Mentee
    static async getHistoryMentee(menteeUserId) {
        const query = `
        SELECT 
            pag.*,
            p."Giorno",
            p."Ora",
            p."Stato",
            m."Settore",
            u."Nome" as mentor_nome,
            u."Cognome" as mentor_cognome
        FROM "Pagamenti" pag
        JOIN "Prenotazioni" p ON pag."Id_Prenot" = p."Id"
        JOIN "Utenti" u ON p."Id_Mentor" = u."Id"
        JOIN "Mentor" m ON u."Id" = m."Id_Utente"
        WHERE p."Id_Mentee" = $1
        ORDER BY pag."Data" DESC
        `;

        const result = await pool.query(query, [menteeUserId]);
        return result.rows;
    }

    static async getById(id) {
        const query = `SELECT * FROM "Pagamenti" WHERE "Id" = $1`;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async delete(id) {
        await pool.query('DELETE FROM "Pagamenti" WHERE "Id" = $1', [id]);
    }

    // Totale entrate mentor
    static async getTotalEarnings(mentorUserId) {
        const query = `
        SELECT 
            SUM("Importo") AS totale_entrata
        FROM "Pagamenti" pag
        JOIN "Prenotazioni" p ON pag."Id_Prenot" = p."Id"
        WHERE p."Id_Mentor" = $1
        `;
        const result = await pool.query(query, [mentorUserId]);
        return result.rows[0];
    }
    
    // Storico pagamenti - Mentor
    static async getHistoryMentor(mentorUserId) {
        const query = `
        SELECT 
            pag.*,
            p."Giorno",
            p."Ora",
            p."Stato",
            u_mentee."Nome" as mentee_nome,
            u_mentee."Cognome" as mentee_cognome
        FROM "Pagamenti" pag
        JOIN "Prenotazioni" p ON pag."Id_Prenot" = p."Id"
        JOIN "Utenti" u_mentee ON p."Id_Mentee" = u_mentee."Id"
        WHERE p."Id_Mentor" = $1
        ORDER BY pag."Data" DESC
        `;

        const result = await pool.query(query, [mentorUserId]);
        return result.rows;
    }
}

export default Payment;