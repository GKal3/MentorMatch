import pool from '../config/database.js';

async function checkDatabase() {
    try {
        // Check if there are any users
        const users = await pool.query('SELECT "Id", "Mail", "Ruolo" FROM "Utenti" LIMIT 5');
        console.log('Users in database:');
        console.log(JSON.stringify(users.rows, null, 2));
        
        // Check mentors
        const mentors = await pool.query('SELECT "Id", "Id_Utente", "Titolo" FROM "Mentor" LIMIT 5');
        console.log('\nMentors in database:');
        console.log(JSON.stringify(mentors.rows, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDatabase();
