import pool from "../config/database.js";

class Appointment {
    // 1. Visualizza tutti gli appuntamenti di un mentor in un giorno specifico o tutti
    static async getAllMentor(mentorUserId, giorno) {
        let query, params;
        
        console.log('=== getAllMentor DEBUG ===');
        console.log('mentorUserId:', mentorUserId);
        console.log('giorno:', giorno);
        
        if (giorno) {
            query = `
            SELECT 
                p.*,
                u."Nome" as mentee_nome,
                u."Cognome" as mentee_cognome,
                u."Mail" as mentee_email,
                mentee."Occupazione"
            FROM "Prenotazioni" p
            JOIN "Mentee" mentee ON p."Id_Mentee" = mentee."Id_Utente"
            JOIN "Utenti" u ON mentee."Id_Utente" = u."Id"
            WHERE p."Id_Mentor" = $1 AND p."Giorno" = $2
            ORDER BY p."Giorno" DESC, p."Ora" DESC
            `;
            params = [mentorUserId, giorno];
        } else {
            query = `
            SELECT 
                p.*,
                u."Nome" as mentee_nome,
                u."Cognome" as mentee_cognome,
                u."Mail" as mentee_email,
                mentee."Occupazione"
            FROM "Prenotazioni" p
            JOIN "Mentee" mentee ON p."Id_Mentee" = mentee."Id_Utente"
            JOIN "Utenti" u ON mentee."Id_Utente" = u."Id"
            WHERE p."Id_Mentor" = $1
            ORDER BY p."Giorno" DESC, p."Ora" DESC
            `;
            params = [mentorUserId];
        }
        
        console.log('Query:', query.replace(/\s+/g, ' ').trim());
        console.log('Params:', params);
        
        const result = await pool.query(query, params);
        
        console.log('Result rows count:', result.rows.length);
        if (result.rows.length > 0) {
            console.log('First row:', result.rows[0]);
        }
        console.log('=== END DEBUG ===');
        
        return result.rows;
    }

    // 2. Visualizza i dettagli di un singolo appuntamento tramite ID prenotazione
    static async getByIdMentor(prenotazioneId) {
        const query = `
        SELECT 
            p.*,
            u_mentee."Nome" as mentee_nome,
            u_mentee."Cognome" as mentee_cognome,
            u_mentee."Mail" as mentee_email,
            mentee."Occupazione",
            u_mentor."Nome" as mentor_nome,
            u_mentor."Cognome" as mentor_cognome,
            u_mentor."Mail" as mentor_email,
            mentor."Settore",
            mentor."Prezzo"
        FROM "Prenotazioni" p
        JOIN "Mentee" mentee ON p."Id_Mentee" = mentee."Id_Utente"
        JOIN "Utenti" u_mentee ON mentee."Id_Utente" = u_mentee."Id"
        JOIN "Mentor" mentor ON p."Id_Mentor" = mentor."Id"
        JOIN "Utenti" u_mentor ON mentor."Id_Utente" = u_mentor."Id"
        WHERE p."Id" = $1
        `;
        const result = await pool.query(query, [prenotazioneId]);
        return result.rows[0]; // Ritorna solo il primo risultato (singolo appuntamento)
    }

    static async answerMentor(bookingId, status) {
        const result = await pool.query(
            'UPDATE "Prenotazioni" SET "Stato" = $1 WHERE "Id" = $2 RETURNING *',
            [status, bookingId]
        );
        return result.rows[0];
    }
    
    // Metodi Mentee
    static async create(idMentor, idMentee, giorno, ora, stato) {
        const result = await pool.query(
            'INSERT INTO "Prenotazioni" ("Id_Mentor", "Id_Mentee", "Giorno", "Ora", "Stato") VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [idMentor, idMentee, giorno, ora, stato]
        );
        return result.rows[0];
    }

    // Verifica disponibilità slot
    static async checkAvailability(idMentor, giorno, ora) {
        const result = await pool.query(
            'SELECT 1 FROM "Prenotazioni" WHERE "Id_Mentor" = $1 AND "Giorno" = $2 AND "Ora" = $3 AND "Stato" != \'Annullato\'',
            [idMentor, giorno, ora]
        );
        return result.rows.length === 0;
    }

    // Verifica se mentee ha completato una sessione con mentor
    static async hasCompletedSession(idMentee, idMentor) {
        const result = await pool.query(
            'SELECT 1 FROM "Prenotazioni" WHERE "Id_Mentee" = $1 AND "Id_Mentor" = $2 AND "Stato" = \'Accettato\'',
            [idMentee, idMentor]
        );
        return result.rows.length > 0;
    }

    // Ottieni appuntamenti mentee - AGGIORNATO
    static async getAllMentee(menteeId) {
        const query = `
        SELECT 
            p.*,
            m."Prezzo",
            m."Settore",
            u."Nome" as mentor_nome,
            u."Cognome" as mentor_cognome,
            u."Mail" as mentor_mail
        FROM "Prenotazioni" p
        JOIN "Utenti" u ON p."Id_Mentor" = u."Id"
        JOIN "Mentor" m ON u."Id" = m."Id_Utente"
        WHERE p."Id_Mentee" = $1
        ORDER BY p."Giorno" DESC, p."Ora" DESC
        `;

        const result = await pool.query(query, [menteeId]);
        return result.rows;
    }

    // Cancel appointment
    static async cancelAppointment(appointmentId, userId) {
        const query = `
        UPDATE "Prenotazioni" 
        SET "Stato" = 'Annullato' 
        WHERE "Id" = $1 AND "Id_Mentee" = $2 AND "Stato" != 'Annullato'
        RETURNING *
        `;
        const result = await pool.query(query, [appointmentId, userId]);
        return result.rows[0];
    }

    // Update appointment status
    static async updateStatus(appointmentId, status) {
        const query = `
        UPDATE "Prenotazioni" 
        SET "Stato" = $1 
        WHERE "Id" = $2
        RETURNING *
        `;
        const result = await pool.query(query, [status, appointmentId]);
        return result.rows[0];
    }

}

export default Appointment;