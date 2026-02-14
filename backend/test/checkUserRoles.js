import pool from '../config/database.js';

async function checkData() {
    try {
        const result = await pool.query(
            'SELECT u."Id", u."Mail", u."Ruolo", m."Id" as mentor_id, men."Id" as mentee_id FROM "Utenti" u LEFT JOIN "Mentor" m ON u."Id" = m."Id_Utente" LEFT JOIN "Mentee" men ON u."Id" = men."Id_Utente"'
        );
        
        console.log('User information:');
        console.log(JSON.stringify(result.rows, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
