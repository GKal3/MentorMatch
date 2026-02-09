import '../config/env.js';
import NotificationService from '../utils/notificationService.js';
import EmailService from '../utils/emailService.js';
import pool from '../config/database.js';

/**
 * TEST COMPLETO NOTIFICHE ED EMAIL
 * Testa tutte le funzionalità del sistema di notifiche
 */

async function testNotificationSystem() {
    console.log('🧪 Inizio test sistema notifiche...\n');

    try {
        // 1. TEST EMAIL GENERICA
        console.log('📧 Test 1: Invio email generica...');
        const emailTest = await EmailService.SpedMail(
            'mentormatch.studio@gmail.com',
            'Test Email MentorMatch',
            '<h1>Test Email</h1><p>Questa è una email di test.</p>',
            'Questa è una email di test in testo semplice.'
        );
        console.log(emailTest.success ? '✅ Email inviata' : '❌ Errore email');
        console.log('');

        // 2. TEST EMAIL BENVENUTO
        console.log('📧 Test 2: Email di benvenuto...');
        const benvenutoTest = await EmailService.inviaEmailBenvenuto(
            'mentormatch.studio@gmail.com',
            'Mario Rossi',
            'Mentee'
        );
        console.log(benvenutoTest.success ? '✅ Email benvenuto inviata' : '❌ Errore');
        console.log('');

        // 3. VERIFICA UTENTE TEST NEL DATABASE
        console.log('🔍 Test 3: Verifica utente test nel database...');
        const userCheck = await pool.query('SELECT "Id", "Mail", "Nome" FROM "Utenti" LIMIT 1');
        
        if (userCheck.rows.length === 0) {
            console.log('⚠️  Nessun utente trovato. Creo utente di test...');
            const insertUser = await pool.query(
                `INSERT INTO "Utenti" ("Nome", "Cognome", "Mail", "Password", "Ruolo") 
                 VALUES ($1, $2, $3, $4, $5) RETURNING "Id", "Nome", "Mail"`,
                ['Test', 'User', 'test@example.com', 'hashed_password', 'Mentee']
            );
            var testUser = insertUser.rows[0];
            console.log('✅ Utente test creato:', testUser);
        } else {
            var testUser = userCheck.rows[0];
            console.log('✅ Utente trovato:', testUser);
        }
        console.log('');

        // 4. TEST NOTIFICA NEL DATABASE (SENZA EMAIL)
        console.log('🔔 Test 4: Creazione notifica nel database...');
        const notifica = await NotificationService.create(
            testUser.Id,
            'Nuovo Messaggio',
            '🧪 Notifica di Test',
            'Questa è una notifica di test del sistema.',
            { testId: 123, timestamp: new Date().toISOString() },
            false  // Non inviare email
        );
        console.log('✅ Notifica creata:', notifica);
        console.log('');

        // 5. TEST NOTIFICA PRENOTAZIONE ACCETTATA
        console.log('🔔 Test 5: Notifica prenotazione accettata...');
        await NotificationService.notifyBookingAccepted(
            testUser.Id,
            'Dr. Giovanni Bianchi',
            '20/01/2026 alle 15:00',
            'https://meet.google.com/abc-defg-hij'
        );
        console.log('✅ Notifica prenotazione accettata inviata');
        console.log('');

        // 6. TEST NOTIFICA PRENOTAZIONE RIFIUTATA
        console.log('🔔 Test 6: Notifica prenotazione rifiutata...');
        await NotificationService.notifyBookingRejected(
            testUser.Id,
            'Dr. Anna Verdi',
            '22/01/2026 alle 10:00'
        );
        console.log('✅ Notifica prenotazione rifiutata inviata');
        console.log('');

        // 7. TEST NOTIFICA NUOVA PRENOTAZIONE (PER MENTOR)
        console.log('🔔 Test 7: Notifica nuova prenotazione...');
        await NotificationService.notifyNewBooking(
            testUser.Id,
            'Laura Ferrari',
            '25/01/2026 alle 14:30'
        );
        console.log('✅ Notifica nuova prenotazione inviata');
        console.log('');

        // 8. TEST NOTIFICA CANCELLAZIONE
        console.log('🔔 Test 8: Notifica cancellazione...');
        await NotificationService.notifyAppointmentCancelled(
            testUser.Id,
            'Il Mentor',
            'Imprevisto personale',
            '30/01/2026 alle 16:00'
        );
        console.log('✅ Notifica cancellazione inviata');
        console.log('');

        // 9. TEST NOTIFICA NUOVO MESSAGGIO
        console.log('🔔 Test 9: Notifica nuovo messaggio...');
        await NotificationService.notifyNewMessage(
            testUser.Id,
            'Paolo Esposito'
        );
        console.log('✅ Notifica messaggio inviata (nessuna email)');
        console.log('');

        // 10. TEST NOTIFICA NUOVA RECENSIONE
        console.log('🔔 Test 10: Notifica nuova recensione...');
        await NotificationService.notifyNewReview(
            testUser.Id,
            'Giulia Romano',
            5
        );
        console.log('✅ Notifica recensione inviata');
        console.log('');

        // 11. VERIFICA NOTIFICHE NEL DATABASE
        console.log('📊 Test 11: Verifica notifiche salvate...');
        const notifiche = await pool.query(
            'SELECT "Id", "Tipo", "Titolo", "Data" FROM "Notifiche" WHERE "Id_Utente" = $1 ORDER BY "Data" DESC',
            [testUser.Id]
        );
        console.log(`✅ Trovate ${notifiche.rows.length} notifiche per l'utente:`);
        notifiche.rows.forEach((n, i) => {
            console.log(`   ${i + 1}. [${n.Tipo}] ${n.Titolo}`);
        });
        console.log('');

        // 12. TEST EMAIL COMPLETA CON TEMPLATE
        console.log('📧 Test 12: Email conferma prenotazione...');
        const confermaEmail = await EmailService.inviaEmailConfermaPrenotazione(
            'mentormatch.studio@gmail.com',
            'Dr. Laura Bianchi',
            '15 Febbraio 2026',
            '15:00',
            'https://meet.google.com/xyz-test-123'
        );
        console.log(confermaEmail.success ? '✅ Email conferma inviata' : '❌ Errore');
        console.log('');

        console.log('✅ TUTTI I TEST COMPLETATI CON SUCCESSO! ✅');

    } catch (error) {
        console.error('❌ ERRORE NEL TEST:', error);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
        console.log('\n🔚 Test terminato. Database disconnesso.');
    }
}

// Esegui i test
testNotificationSystem();
