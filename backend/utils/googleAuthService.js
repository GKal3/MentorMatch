import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, '../tokens.json');
const TOKEN_PROVIDER = 'google_calendar';

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

      this.saveTokensToFile(tokens);
      await this.saveTokensToDatabase(tokens);
      
      return tokens;
    } catch (error) {
      console.error('Errore nell\'ottenimento del token:', error);
      throw error;
    }
  }

  /**
   * Carica i token dal file tokens.json
   */
  static loadTokensFromFile() {
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

  static saveTokensToFile(tokens) {
    try {
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log('✅ Token salvato in tokens.json');
    } catch (error) {
      console.warn('⚠️ Impossibile salvare tokens.json:', error.message);
    }
  }

  static async loadTokensFromDatabase() {
    try {
      const result = await pool.query(
        'SELECT "Tokens" FROM "OAuthTokens" WHERE "Provider" = $1 LIMIT 1',
        [TOKEN_PROVIDER]
      );

      if (!result.rows[0]?.Tokens) return null;

      const tokens = result.rows[0].Tokens;
      oauth2Client.setCredentials(tokens);
      console.log('✅ Token Google caricato da DB');
      return tokens;
    } catch (error) {
      if (error.code === '42P01') {
        console.warn('⚠️ Tabella OAuthTokens non trovata: uso env/file come fallback');
        return null;
      }
      console.warn('⚠️ Errore caricamento token da DB:', error.message);
      return null;
    }
  }

  static async saveTokensToDatabase(tokens) {
    try {
      await pool.query(
        `INSERT INTO "OAuthTokens" ("Provider", "Tokens", "Updated_At")
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT ("Provider")
         DO UPDATE SET "Tokens" = EXCLUDED."Tokens", "Updated_At" = NOW()`,
        [TOKEN_PROVIDER, JSON.stringify(tokens)]
      );
      console.log('✅ Token Google salvato su DB');
    } catch (error) {
      if (error.code === '42P01') {
        console.warn('⚠️ Tabella OAuthTokens non trovata: token non persistito su DB');
        return;
      }
      console.warn('⚠️ Errore salvataggio token su DB:', error.message);
    }
  }

  static async ensureCredentials() {
    const alreadyLoaded = oauth2Client.credentials?.access_token || oauth2Client.credentials?.refresh_token;
    if (alreadyLoaded) return true;

    if (process.env.GOOGLE_REFRESH_TOKEN) {
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        access_token: process.env.GOOGLE_ACCESS_TOKEN || undefined,
      });
      console.log('✅ Token Google caricato da variabili ambiente');
      return true;
    }

    const dbTokens = await this.loadTokensFromDatabase();
    if (dbTokens) return true;

    const fileTokens = this.loadTokensFromFile();
    if (fileTokens) return true;

    throw new Error('Google OAuth non configurato: manca refresh token (env/DB/file)');
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

export default GoogleAuthService;