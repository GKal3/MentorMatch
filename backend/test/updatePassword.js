import '../config/env.js';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';

async function updatePassword() {
  try {
    const email = 'mentee@test.com';
    const password = 'password123';
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'UPDATE "Utenti" SET "Password" = $1 WHERE "Mail" = $2 RETURNING *',
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Password aggiornata per:', email);
    } else {
      console.log('❌ Utente non trovato');
    }
  } catch (error) {
    console.error('Errore:', error);
  }
}

updatePassword();