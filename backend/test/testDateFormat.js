import pool from '../config/database.js';

async function testDateFormat() {
    try {
        // Test the TO_CHAR function directly
        const result = await pool.query(
            `SELECT 
                u."Id",
                u."Data_Nascita",
                TO_CHAR(u."Data_Nascita", 'YYYY-MM-DD') AS "Data_Nascita_Formatted"
            FROM "Utenti" u 
            WHERE u."Data_Nascita" IS NOT NULL
            LIMIT 3`
        );
        
        console.log('Raw database query results:');
        console.log(JSON.stringify(result.rows, null, 2));
        
        // Now test the exact mentor query
        const mentorResult = await pool.query(
            `SELECT 
                m."Id",
                m."Id_Utente", 
                u."Nome", 
                u."Cognome", 
                u."Mail", 
                TO_CHAR(u."Data_Nascita", 'YYYY-MM-DD') AS "Data_Nascita",
                u."Genere"
            FROM "Mentor" m 
            JOIN "Utenti" u ON m."Id_Utente" = u."Id" 
            LIMIT 1`
        );
        
        console.log('\nMentor query with TO_CHAR:');
        console.log(JSON.stringify(mentorResult.rows, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testDateFormat();
