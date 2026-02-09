import pool from "../config/database.js";

class Mentor {
    static async getAll() {
        const result = await pool.query(
            'SELECT u."Nome", u."Cognome", u."Mail", u."Data_Nascita", m."Prezzo", m."Settore", m."Lingua", m."Bio", m."Cv_Url", m."Titolo", m."Organizzazione", m."Esperienza" FROM "Mentor" m JOIN "Utenti" u ON m."Id_Utente" = u."Id"'
        );
        return result.rows;
    }

    static async getById(id) {
        console.log('Mentor.getById chiamato con ID:', id);
        const result = await pool.query(
            `SELECT 
                m."Id",
                m."Id_Utente", 
                m."Cv_Url",
                m."Titolo",
                m."Organizzazione",
                m."Esperienza",
                m."Prezzo", 
                m."Settore", 
                m."Lingua", 
                m."Bio",
                u."Nome", 
                u."Cognome", 
                u."Mail", 
                u."Data_Nascita",
                COALESCE(AVG(r."Voto"), 0) as media_recensioni,
                COUNT(DISTINCT r."Id") as numero_recensioni
            FROM "Mentor" m 
            JOIN "Utenti" u ON m."Id_Utente" = u."Id" 
            LEFT JOIN "Recensioni" r ON m."Id_Utente" = r."Id_Mentor"
            WHERE m."Id_Utente" = $1
            GROUP BY m."Id", m."Id_Utente", m."Cv_Url", m."Titolo", m."Organizzazione", m."Esperienza", m."Prezzo", m."Settore", m."Lingua", m."Bio", u."Nome", u."Cognome", u."Mail", u."Data_Nascita"`,
            [id]
        );
        console.log('Query result rows:', result.rows.length);
        console.log('Dati mentor:', result.rows[0]);
        return result.rows[0];
    }

    static async create(idUtente, titolo, organizzazione, esperienza, cvUrl, prezzo, settore, lingua, bio) {
        const result = await pool.query(
            'INSERT INTO "Mentor" ("Id_Utente", "Titolo", "Organizzazione", "Esperienza", "Cv_Url", "Prezzo", "Settore", "Lingua", "Bio") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [idUtente, titolo, organizzazione, esperienza, cvUrl, prezzo, settore, lingua, bio]
        );
        return result.rows[0];
    }

    static async update(idUtente, titolo, organizzazione, esperienza, prezzo, settore, lingua, bio) {
        const result = await pool.query(
            'UPDATE "Mentor" SET "Titolo" = COALESCE($1, "Titolo"), "Organizzazione" = COALESCE($2, "Organizzazione"), "Esperienza" = COALESCE($3, "Esperienza"), "Prezzo" = COALESCE($4, "Prezzo"), "Settore" = COALESCE($5, "Settore"), "Lingua" = COALESCE($6, "Lingua"), "Bio" = COALESCE($7, "Bio") WHERE "Id_Utente" = $8 RETURNING *',
            [titolo, organizzazione, esperienza, prezzo, settore, lingua, bio, idUtente]
        );
        return result.rows[0];
    }

    static async delete(idUtente) {
        await pool.query('DELETE FROM "Mentor" WHERE "Id_Utente" = $1', [idUtente]);
    }

    // Cerca mentor con filtri
    static async searchMentors(filters = {}) {
        let query = `
            SELECT 
                m."Id", 
                m."Id_Utente", 
                m."Cv_Url",
                m."Titolo",
                m."Organizzazione",
                m."Esperienza",
                m."Prezzo", 
                m."Settore", 
                m."Lingua", 
                m."Bio",
                u."Nome",
                u."Cognome",
                COALESCE(AVG(r."Voto"), 0) as media_recensioni,
                COUNT(DISTINCT r."Id") as numero_recensioni
            FROM "Mentor" m
            JOIN "Utenti" u ON m."Id_Utente" = u."Id"
            LEFT JOIN "Recensioni" r ON m."Id_Utente" = r."Id_Mentor"
            WHERE 1=1
        `;

        const values = [];
        let paramCount = 1;

        if (filters.search) {
            query += ` AND (u."Nome" ILIKE $${paramCount} OR u."Cognome" ILIKE $${paramCount} OR m."Titolo" ILIKE $${paramCount} OR m."Bio" ILIKE $${paramCount})`;
            values.push(`%${filters.search}%`);
            paramCount++;
        }

        if (filters.settore) {
            query += ` AND m."Settore" ILIKE $${paramCount}`;
            values.push(`%${filters.settore}%`);
            paramCount++;
        }

        if (filters.lingua) {
            query += ` AND m."Lingua" ILIKE $${paramCount}`;
            values.push(`%${filters.lingua}%`);
            paramCount++;
        }

        if (filters.prezzo_max) {
            query += ` AND m."Prezzo" <= $${paramCount}`;
            values.push(filters.prezzo_max);
            paramCount++;
        }

        query += `
            GROUP BY m."Id", m."Id_Utente", m."Cv_Url", m."Titolo", m."Organizzazione", m."Esperienza", m."Prezzo", m."Settore", m."Lingua", m."Bio", u."Nome", u."Cognome"
            ORDER BY media_recensioni DESC, numero_recensioni DESC
        `;

        const result = await pool.query(query, values);
        return result.rows;
    }

    static async getOptions() {
        const settoriQuery = `SELECT "Campo" AS value FROM "Settore" WHERE "Campo" IS NOT NULL AND "Campo" <> '' ORDER BY "Campo"`;
        const lingueQuery = `SELECT "Lingua" AS value FROM "Lingue" WHERE "Lingua" IS NOT NULL AND "Lingua" <> '' ORDER BY "Lingua"`;

        const [settoriRes, lingueRes] = await Promise.all([
            pool.query(settoriQuery),
            pool.query(lingueQuery),
        ]);

        return {
            settori: settoriRes.rows.map((r) => r.value),
            lingue: lingueRes.rows.map((r) => r.value),
        };
    }

}

export default Mentor;