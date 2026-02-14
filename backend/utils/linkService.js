import crypto from 'crypto';
import { google } from 'googleapis';
import GoogleAuthService from './googleAuthService.js';

class LinkService {
  /**
   * Genera un link unico per la videocall
   * @param {number} appointmentId - ID della prenotazione
   * @param {Date} appointmentDate - Data dell'appuntamento
   * @param {string} mentorName - Nome del mentor
   * @param {string} menteeName - Nome del mentee
   * @returns {Promise<string>} - URL della videocall
   */
  static async generateMeetingLink(appointmentId, appointmentDate, mentorName, menteeName) {
    try {
      const googleMeetLink = await this.createGoogleMeetLink(appointmentId, appointmentDate, mentorName, menteeName);
      return googleMeetLink;
    } catch (error) {
      console.error('Errore nella generazione del meeting link:', error);
      throw error;
    }
  }

  /**
   * Genera un link breve e memorizzabile
   * @param {number} appointmentId - ID prenotazione
   * @returns {string} - Link breve
   */
  static generateShortLink(appointmentId) {
    const hash = crypto.createHash('md5')
      .update(appointmentId.toString())
      .digest('hex')
      .substring(0, 8);
    
    return `https://yoursite.com/meet/${hash}`;
  }

  /**
   * Valida se un link è ancora valido
   * @param {string} link - URL da validare
   * @param {Date} appointmentDate - Data dell'appuntamento
   * @returns {boolean}
   */
  static isLinkValid(link, appointmentDate) {
    const now = new Date();
    const appointmentTime = new Date(appointmentDate);
    
    // Link valido da 30 minuti prima a 2 ore dopo l'appuntamento
    const startTime = new Date(appointmentTime.getTime() - 30 * 60000); // -30 min
    const endTime = new Date(appointmentTime.getTime() + 120 * 60000);  // +2 ore
    
    return now >= startTime && now <= endTime;
  }

  /**
   * Crea un meeting su Google Meet
   * @param {number} appointmentId - ID della prenotazione
   * @param {Date} appointmentDate - Data dell'appuntamento
   * @param {string} mentorName - Nome del mentor
   * @param {string} menteeName - Nome del mentee
   * @returns {Promise<string>} - Link di Google Meet
   */
  static async createGoogleMeetLink(appointmentId, appointmentDate, mentorName, menteeName) {
    try {
      await GoogleAuthService.ensureCredentials();
      const oauth2Client = GoogleAuthService.getOAuth2Client();
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const event = {
        summary: `Mentoring: ${mentorName} - ${menteeName}`,
        description: 'Videocall di mentoring',
        start: {
          dateTime: new Date(appointmentDate).toISOString(),
          timeZone: 'Europe/Rome',
        },
        end: {
          dateTime: new Date(new Date(appointmentDate).getTime() + 60 * 60000).toISOString(),
          timeZone: 'Europe/Rome',
        },
        conferenceData: {
          createRequest: {
            requestId: appointmentId.toString(),
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
      });

      return response.data.conferenceData.entryPoints[0].uri;
    } catch (error) {
      console.error('Errore nella creazione del meeting:', error);
      throw error;
    }
  }
}

export default LinkService;