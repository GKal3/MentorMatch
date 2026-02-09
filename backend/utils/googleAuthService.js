import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, '../tokens.json');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

class GoogleAuthService {
  /**
   * Genera l'URL di autorizzazione per OAuth2
   */
  static getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
    
    return authUrl;
  }

  /**
   * Scambia il codice di autorizzazione con un token di accesso
   * @param {string} code - Codice di autorizzazione ricevuto da Google
   * @returns {Object} - Token di accesso
   */
  static async getAccessToken(code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      // Salva i token in un file
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log('✅ Token salvato in tokens.json');
      
      return tokens;
    } catch (error) {
      console.error('Errore nell\'ottenimento del token:', error);
      throw error;
    }
  }

  /**
   * Carica i token dal file tokens.json
   */
  static loadTokens() {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        oauth2Client.setCredentials(tokens);
        console.log('✅ Token caricato da tokens.json');
        return tokens;
      }
      return null;
    } catch (error) {
      console.error('Errore nel caricamento del token:', error);
      return null;
    }
  }

  /**
   * Imposta le credenziali (token) per le richieste successive
   * @param {Object} tokens - Token di accesso e refresh token
   */
  static setCredentials(tokens) {
    oauth2Client.setCredentials(tokens);
  }

  /**
   * Restituisce il client OAuth2 configurato
   */
  static getOAuth2Client() {
    return oauth2Client;
  }

  /**
   * Stampa l'URL per l'autenticazione
   */
  static printAuthUrl() {
    console.log('\n🔐 Autenticazione Google OAuth2 richiesta!\n');
    console.log('Visita questo URL per autorizzare l\'accesso:');
    console.log(this.getAuthUrl());
    console.log('\nDopo l\'autorizzazione, riceverai un codice.');
    console.log('Usa il comando: node test/authenticate.js <codice>\n');
  }
}

// Carica i token al momento dell'import
GoogleAuthService.loadTokens();

export default GoogleAuthService;