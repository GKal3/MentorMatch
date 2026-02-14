import pool from "../config/database.js";

const normalizeIban = (iban) => {
    if (typeof iban !== 'string') return null;
    const cleaned = iban.replace(/\s+/g, '').toUpperCase();
    return cleaned || null;
};

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
                m."IBAN",
                m."Settore", 
                m."Lingua", 
                m."Bio",
                u."Nome", 
                u."Cognome", 
                u."Mail", 
                TO_CHAR(u."Data_Nascita", 'YYYY-MM-DD') AS "Data_Nascita",
                COALESCE(AVG(r."Voto"), 0) as media_recensioni,
                COUNT(DISTINCT r."Id") as numero_recensioni
            FROM "Mentor" m 
            JOIN "Utenti" u ON m."Id_Utente" = u."Id" 
            LEFT JOIN "Recensioni" r ON m."Id_Utente" = r."Id_Mentor"
            WHERE m."Id_Utente" = $1
            GROUP BY m."Id", m."Id_Utente", m."Cv_Url", m."Titolo", m."Organizzazione", m."Esperienza", m."Prezzo", m."IBAN", m."Settore", m."Lingua", m."Bio", u."Nome", u."Cognome", u."Mail", u."Data_Nascita"`,
            [id]
        );
        console.log('Query result rows:', result.rows.length);
        console.log('Dati mentor:', result.rows[0]);
        return result.rows[0];
    }

    static async getPersonalById(id) {
        const result = await pool.query(
            `SELECT 
                m."Id",
                m."Id_Utente", 
                m."Cv_Url",
                m."Titolo",
                m."Organizzazione",
                m."Esperienza",
                m."Prezzo", 
                m."IBAN",
                m."Settore", 
                m."Lingua", 
                m."Bio",
                u."Nome", 
                u."Cognome", 
                u."Mail", 
                TO_CHAR(u."Data_Nascita", 'YYYY-MM-DD') AS "Data_Nascita",
                u."Genere"
            FROM "Mentor" m 
            JOIN "Utenti" u ON m."Id_Utente" = u."Id" 
            WHERE m."Id_Utente" = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async create(idUtente, titolo, organizzazione, esperienza, cvUrl, prezzo, settore, lingua, bio, iban = null) {
        const normalizedIban = normalizeIban(iban);
        const result = await pool.query(
            'INSERT INTO "Mentor" ("Id_Utente", "Titolo", "Organizzazione", "Esperienza", "Cv_Url", "Prezzo", "Settore", "Lingua", "Bio", "IBAN") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [idUtente, titolo, organizzazione, esperienza, cvUrl, prezzo, settore, lingua, bio, normalizedIban]
        );
        return result.rows[0];
    }

    static async update(idUtente, titolo, organizzazione, esperienza, prezzo, settore, lingua, bio, iban = null) {
        const normalizedIban = normalizeIban(iban);
        const result = await pool.query(
            'UPDATE "Mentor" SET "Titolo" = COALESCE($1, "Titolo"), "Organizzazione" = COALESCE($2, "Organizzazione"), "Esperienza" = COALESCE($3, "Esperienza"), "Prezzo" = COALESCE($4, "Prezzo"), "Settore" = COALESCE($5, "Settore"), "Lingua" = COALESCE($6, "Lingua"), "Bio" = COALESCE($7, "Bio"), "IBAN" = COALESCE($8, "IBAN") WHERE "Id_Utente" = $9 RETURNING *',
            [titolo, organizzazione, esperienza, prezzo, settore, lingua, bio, normalizedIban, idUtente]
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
                m."IBAN",
                m."Settore", 
                m."Lingua", 
                m."Bio",
                u."Nome",
                u."Cognome",
                COALESCE(rv.media_recensioni, 0) as media_recensioni,
                COALESCE(rv.numero_recensioni, 0) as numero_recensioni,
                COALESCE(av.giorni_disponibili, ARRAY[]::smallint[]) as giorni_disponibili
            FROM "Mentor" m
            JOIN "Utenti" u ON m."Id_Utente" = u."Id"
            LEFT JOIN (
                SELECT 
                    "Id_Mentor",
                    AVG("Voto") AS media_recensioni,
                    COUNT("Id") AS numero_recensioni
                FROM "Recensioni"
                GROUP BY "Id_Mentor"
            ) rv ON m."Id_Utente" = rv."Id_Mentor"
            LEFT JOIN (
                SELECT 
                    "Id_Utente",
                    ARRAY_AGG(DISTINCT "Giorno") AS giorni_disponibili
                FROM "Disponibilita"
                GROUP BY "Id_Utente"
            ) av ON m."Id_Utente" = av."Id_Utente"
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

        if (filters.rating_min) {
            query += ` AND COALESCE(rv.media_recensioni, 0) >= $${paramCount}`;
            values.push(Number(filters.rating_min));
            paramCount++;
        }

        if (filters.disponibilita) {
            const selectedDays = String(filters.disponibilita)
                .split(',')
                .map((day) => Number(day.trim()))
                .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);

            if (selectedDays.length > 0) {
                query += `
                    AND EXISTS (
                        SELECT 1
                        FROM "Disponibilita" d
                        WHERE d."Id_Utente" = m."Id_Utente"
                          AND d."Giorno" = ANY($${paramCount}::smallint[])
                    )
                `;
                values.push(selectedDays);
                paramCount++;
            }
        }

        query += `
            ORDER BY COALESCE(rv.media_recensioni, 0) DESC, COALESCE(rv.numero_recensioni, 0) DESC
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