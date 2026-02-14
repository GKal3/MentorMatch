import pool from '../config/database.js';

async function testMentorPersonalQuery() {
    try {
        // Test the exact mentor getPersonalById query
        const mentorId = 1; // Test with first mentor
        
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
                TO_CHAR(u."Data_Nascita", 'YYYY-MM-DD') AS "Data_Nascita",
                u."Genere"
            FROM "Mentor" m 
            JOIN "Utenti" u ON m."Id_Utente" = u."Id" 
            WHERE m."Id_Utente" = $1`,
            [mentorId]
        );
        
        console.log('Mentor getPersonalById result:');
        console.log(JSON.stringify(result.rows[0], null, 2));
        
        // Also check if there's an issue with the data in PostgreSQL driver
        console.log('\nField type checks:');
        const row = result.rows[0];
        if (row) {
            console.log(`Data_Nascita value: "${row.Data_Nascita}"`);
            console.log(`Data_Nascita type: ${typeof row.Data_Nascita}`);
            console.log(`Data_Nascita is string: ${typeof row.Data_Nascita === 'string'}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testMentorPersonalQuery();
