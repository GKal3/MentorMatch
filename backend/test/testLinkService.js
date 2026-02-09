import '../config/env.js';
import LinkService from '../utils/linkService.js';
import GoogleAuthService from '../utils/googleAuthService.js';

// Simula l'autenticazione (dovrai avere le credenziali Google configurate)
async function testLinkService() {
  try {
    // Dati di test
    const appointmentId = 123;
    const appointmentDate = new Date('2026-01-20T14:00:00'); // Data futura per il test
    const mentorName = 'Mario Rossi';
    const menteeName = 'Luca Bianchi';

    console.log('🧪 Inizio test LinkService...\n');

    // Verifica se i token sono presenti
    const tokens = GoogleAuthService.loadTokens();
    if (!tokens) {
      console.log('❌ Token non trovato!\n');
      console.log('🔐 Devi fare l\'autenticazione OAuth2 prima.\n');
      GoogleAuthService.printAuthUrl();
      process.exit(1);
    }

    // Test 1: Genera un short link
    console.log('Test 1: generateShortLink');
    const shortLink = LinkService.generateShortLink(appointmentId);
    console.log(`✅ Short Link generato: ${shortLink}\n`);

    // Test 2: Genera un Google Meet link
    console.log('Test 2: generateMeetingLink (Google Meet)');
    try {
      const meetingLink = await LinkService.generateMeetingLink(
        appointmentId,
        appointmentDate,
        mentorName,
        menteeName
      );
      console.log(`✅ Google Meet Link generato: ${meetingLink}\n`);
    } catch (error) {
      console.log(`⚠️ Errore nel generare Google Meet link:`);
      console.log(`   ${error.message}\n`);
    }

    // Test 3: Valida il link
    console.log('Test 3: isLinkValid');
    const isValid = LinkService.isLinkValid('https://meet.google.com/test', appointmentDate);
    console.log(`✅ Link valido? ${isValid}\n`);

    // Test 4: Testa una data già passata
    const pastDate = new Date(new Date().getTime() - 60 * 60000); // 1 ora fa
    const isPastValid = LinkService.isLinkValid('https://meet.google.com/test', pastDate);
    console.log(`✅ Link per data passata è valido? ${isPastValid}\n`);

  } catch (error) {
    console.error('❌ Errore generale nel test:', error);
  }
}

testLinkService();