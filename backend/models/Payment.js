import pool from '../config/database.js';

class Payment {

    static async create(AppId, price, method, date) {
        const result = await pool.query(
            `INSERT INTO "Pagamenti" 
            ("Id_Prenot", "Importo", "Metodo", "Data", "Stato_Payout") 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *`,
            [AppId, price, method, date, 'Pending']
        );
        return result.rows[0];
    }

    static async markMentorPayout(paymentId, payoutData = {}) {
        const {
            ibanMentor,
            platformFeePercent,
            platformFeeAmount,
            mentorNetAmount,
            payoutProvider = 'BANK_TRANSFER',
            payoutReference,
            payoutStatus = 'Completed',
        } = payoutData;

        const query = `
        UPDATE "Pagamenti"
        SET
            "Iban_Mentor" = $1,
            "Percentuale_Commissione" = $2,
            "Commissione_Piattaforma" = $3,
            "Importo_Mentor" = $4,
            "Provider_Payout" = $5,
            "Payout_Ref" = $6,
            "Stato_Payout" = $7,
            "Data_Payout" = NOW()
        WHERE "Id" = $8
        RETURNING *
        `;

        const result = await pool.query(query, [
            ibanMentor,
            platformFeePercent,
            platformFeeAmount,
            mentorNetAmount,
            payoutProvider,
            payoutReference,
            payoutStatus,
            paymentId,
        ]);

        return result.rows[0];
    }

    // Storico pagamenti - Mentee
    static async getHistoryMentee(menteeUserId) {
        const query = `
        SELECT 
            pag.*,
            p."Giorno",
            p."Ora_Inizio",
            p."Ora_Fine",
            p."Stato",
            COALESCE(
                NULLIF(to_jsonb(pag)->>'Metodo', ''),
                NULLIF(to_jsonb(pag)->>'Metodo_Pagamento', ''),
                'N/A'
            ) AS "Metodo_Pagamento",
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

    static async getLatestByAppointmentId(appointmentId) {
        const query = `
        SELECT *
        FROM "Pagamenti"
        WHERE "Id_Prenot" = $1
        ORDER BY "Data" DESC, "Id" DESC
        LIMIT 1
        `;
        const result = await pool.query(query, [appointmentId]);
        return result.rows[0];
    }

    static async markRefundIssued(paymentId, refundData = {}) {
        const {
            refundReference = `REFUND-${paymentId}-${Date.now()}`,
            refundReason = 'Mentor cancelled appointment',
            payoutProvider = 'REFUND',
        } = refundData;

        const query = `
        UPDATE "Pagamenti"
        SET
            "Importo_Mentor" = 0,
            "Commissione_Piattaforma" = 0,
            "Provider_Payout" = $3,
            "Payout_Ref" = $1,
            "Stato_Payout" = 'Refunded',
            "Data_Payout" = NOW()
        WHERE "Id" = $2
        RETURNING *, $4::text AS "Refund_Reason"
        `;

        const result = await pool.query(query, [refundReference, paymentId, payoutProvider, refundReason]);
        return result.rows[0];
    }

    static async delete(id) {
        await pool.query('DELETE FROM "Pagamenti" WHERE "Id" = $1', [id]);
    }

    // Totale entrate mentor
    static async getTotalEarnings(mentorUserId) {
        const query = `
        SELECT 
            COALESCE(SUM(
                CASE
                    WHEN LOWER(COALESCE(pag."Stato_Payout", '')) = 'refunded' THEN 0
                    WHEN LOWER(COALESCE(p."Stato", '')) LIKE '%cancel%' THEN 0
                    ELSE COALESCE(pag."Importo_Mentor", pag."Importo")
                END
            ), 0) AS totale_entrata,
            COALESCE(SUM(pag."Importo"), 0) AS totale_lordo,
            COALESCE(SUM(COALESCE(pag."Commissione_Piattaforma", 0)), 0) AS totale_commissioni
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
            p."Ora_Inizio",
            p."Ora_Fine",
            p."Stato",
            COALESCE(
                NULLIF(to_jsonb(pag)->>'Metodo', ''),
                NULLIF(to_jsonb(pag)->>'Metodo_Pagamento', ''),
                'N/A'
            ) AS "Metodo_Pagamento",
            CASE
                WHEN LOWER(COALESCE(pag."Stato_Payout", '')) = 'refunded' THEN 0
                WHEN LOWER(COALESCE(p."Stato", '')) LIKE '%cancel%' THEN 0
                ELSE COALESCE(
                    NULLIF(to_jsonb(pag)->>'Importo_Mentor', '')::numeric,
                    pag."Importo"
                )
            END AS "Importo_Netto_Mentor",
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