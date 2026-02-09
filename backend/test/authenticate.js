import '../config/env.js';
import GoogleAuthService from '../utils/googleAuthService.js';

const code = process.argv[2];

if (!code) {
  console.log('❌ Errore: Codice di autorizzazione non fornito.\n');
  GoogleAuthService.printAuthUrl();
  process.exit(1);
}

async function authenticate() {
  try {
    console.log('⏳ Sto scambiando il codice con un token...\n');
    const tokens = await GoogleAuthService.getAccessToken(code);
    console.log('✅ Autenticazione completata con successo!');
    console.log('📁 Token salvato in: backend/tokens.json\n');
    console.log('Ora puoi eseguire i test con: node test/testLinkService.js');
  } catch (error) {
    console.error('❌ Errore durante l\'autenticazione:', error.message);
    process.exit(1);
  }
}

authenticate();