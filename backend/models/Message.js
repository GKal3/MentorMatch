import pool from "../config/database.js";

class Message {
    
    static async create(senderId, receiverId, content) {
        const result = await pool.query(
            'INSERT INTO "Messaggi" ("Id_M", "Id_D", "Contenuto", "Data_Invio", "Ora_Invio") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
            [senderId, receiverId, content]
        );
        return result.rows[0];
    }

    static async getConversation(userId1, userId2) {
        const query = `
        SELECT 
            m."Id",
            m."Id_M" as "Id_Mittente",
            m."Id_D" as "Id_Destinatario",
            m."Contenuto" as "Testo",
            COALESCE(
                (m."Data_Invio"::date + m."Ora_Invio"::time),
                m."Data_Invio"::timestamp
            ) as "Data_Ora",
            m."Lettura",
            u_sender."Nome" as sender_nome,
            u_sender."Cognome" as sender_cognome,
            u_receiver."Nome" as receiver_nome,
            u_receiver."Cognome" as receiver_cognome
        FROM "Messaggi" m
        JOIN "Utenti" u_sender ON m."Id_M" = u_sender."Id"
        JOIN "Utenti" u_receiver ON m."Id_D" = u_receiver."Id"
        WHERE (m."Id_M" = $1 AND m."Id_D" = $2) OR (m."Id_M" = $2 AND m."Id_D" = $1)
        ORDER BY m."Data_Invio" ASC, m."Ora_Invio" ASC
        `;
        const result = await pool.query(query, [userId1, userId2]);
        return result.rows;
    }

    static async updateStatus(messageId, status) {
        const result = await pool.query(
            'UPDATE "Messaggi" SET "Lettura" = $1 WHERE "Id" = $2 RETURNING *',
            [status, messageId]
        );
        return result.rows[0];
    }

    // Ottieni tutte le chat per un utente
    static async getAllChats(userId) {
        try {
            console.log('getAllChats: Starting for userId:', userId);
            
            // Step 1: Recupera tutti gli ID univoci dei partner di conversazione
            const partnersQuery = `
            SELECT DISTINCT
                CASE WHEN m."Id_M" = $1 THEN m."Id_D" ELSE m."Id_M" END as partner_id
            FROM "Messaggi" m
            WHERE m."Id_M" = $1 OR m."Id_D" = $1
            `;
            
            console.log('getAllChats: Executing partners query');
            const partnersResult = await pool.query(partnersQuery, [userId]);
            console.log('getAllChats: Partners found:', partnersResult.rows.length);
            
            if (partnersResult.rows.length === 0) {
                console.log('getAllChats: No partners found, returning empty array');
                return [];
            }
            
            // Step 2: Per ogni partner, recupera le info utente e l'ultimo messaggio
            const chats = [];
            for (const partnerRow of partnersResult.rows) {
                const partnerId = partnerRow.partner_id;
                console.log('getAllChats: Processing partner:', partnerId);
                
                const userQuery = `SELECT "Id", "Nome", "Cognome" FROM "Utenti" WHERE "Id" = $1`;
                const userResult = await pool.query(userQuery, [partnerId]);
                
                if (userResult.rows.length === 0) {
                    console.log('getAllChats: Partner user not found:', partnerId);
                    continue;
                }
                
                const user = userResult.rows[0];
                console.log('getAllChats: Found user:', user);
                
                const lastMsgQuery = `
                SELECT "Contenuto"
                FROM "Messaggi"
                WHERE (("Id_M" = $1 AND "Id_D" = $2) OR ("Id_M" = $2 AND "Id_D" = $1))
                ORDER BY "Data_Invio" DESC, "Ora_Invio" DESC
                LIMIT 1
                `;
                
                const lastMsgResult = await pool.query(lastMsgQuery, [userId, partnerId]);
                const lastMsg = lastMsgResult.rows.length > 0 ? lastMsgResult.rows[0].Contenuto : null;
                console.log('getAllChats: Last message:', lastMsg);
                
                chats.push({
                    Id_Utente: user.Id,
                    Nome: user.Nome,
                    Cognome: user.Cognome,
                    ultimo_messaggio: lastMsg
                });
            }
            
            console.log('getAllChats: Returning', chats.length, 'chats');
            return chats;
        } catch (error) {
            console.error('getAllChats: Error:', error.message);
            console.error('getAllChats: Full error:', error);
            throw error;
        }
    }
}

export default Message;