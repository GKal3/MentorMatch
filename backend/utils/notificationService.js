import Notification from '../models/Notification.js';
import EmailService from './emailService.js';

class NotificationService {
    /**
     * Crea notifica nel DB e opzionalmente invia email
     * @param {number} userId - ID utente destinatario
     * @param {string} tipo - Tipo notifica ('prenotazione', 'cancellazione', 'messaggio', 'recensione')
     * @param {string} titolo - Titolo notifica
     * @param {string} messaggio - Testo notifica
     * @param {object} data - Dati aggiuntivi (es. appointmentId, link)
     * @param {boolean} sendEmailToo - Se inviare anche email
     */
    static async create(userId, tipo, titolo, messaggio, data = {}, sendEmailToo = true) {
        try {
        // 1. Crea notifica nel database
        const notification = await Notification.create(
            userId,
            tipo,
            titolo,
            messaggio,
            data
        );
        
        // 2. Invia email se richiesto
        if (sendEmailToo) {
            const user = await this.getUserEmail(userId);
            if (user?.email) {
            await EmailService.SpedMail(
                user.email,
                titolo,
                messaggio
            );
            }
        }
        
        // 3. Invia push notification
        if (notification) {
            await this.sendPushNotification(userId, titolo, messaggio);
        }
        
        return notification;
        
        } catch (error) {
        console.error('Errore creazione notifica:', error);
        throw error;
        }
    }

    /**
     * Notifica per prenotazione accettata
     */
    static async notifyBookingAccepted(menteeId, mentorName, appointmentDate, meetingLink) {
        const titolo = '✅ Prenotazione Confermata';
        const messaggio = `${mentorName} ha accettato la tua prenotazione per il ${appointmentDate}. Link videocall: ${meetingLink}`;
        
        await this.create(
            menteeId,
            'Nuova Prenotazione',
            titolo,
            messaggio,
            { appointmentDate, meetingLink }
        );
    }

    /**
     * Notifica per prenotazione rifiutata
     */
    static async notifyBookingRejected(menteeId, mentorName, appointmentDate) {
        const titolo = '❌ Prenotazione Rifiutata';
        const messaggio = `${mentorName} non può accettare la tua prenotazione per il ${appointmentDate}. Il pagamento sarà rimborsato.`;
        
        await this.create(
            menteeId,
            'Annullamento Prenotazione',
            titolo,
            messaggio,
            { appointmentDate }
        );
    }

    /**
     * Notifica per nuova prenotazione (al mentor)
     */
    static async notifyNewBooking(mentorId, menteeName, appointmentDate) {
        const titolo = '📅 Nuova Prenotazione';
        const messaggio = `${menteeName} ha prenotato una sessione per il ${appointmentDate}. Vai al pannello per accettare o rifiutare.`;
        
        await this.create(
            mentorId,
            'Nuova Prenotazione',
            titolo,
            messaggio,
            { appointmentDate }
        );
    }

    /**
     * Notifica per cancellazione appuntamento
     */
    static async notifyAppointmentCancelled(userId, cancelledBy, reason, appointmentDate) {
        const titolo = '🚫 Appuntamento Cancellato';
        const messaggio = `L'appuntamento del ${appointmentDate} è stato cancellato da ${cancelledBy}. Motivo: ${reason}`;
        
        await this.create(
            userId,
            'Annullamento Prenotazione',
            titolo,
            messaggio,
            { appointmentDate, reason }
        );
    }

    /**
     * Notifica per nuovo messaggio
     */
    static async notifyNewMessage(userId, senderName) {
        const titolo = '💬 Nuovo Messaggio';
        const messaggio = `Hai ricevuto un nuovo messaggio da ${senderName}`;
        
        await this.create(
            userId,
            'Nuovo Messaggio',
            titolo,
            messaggio,
            {},
            false // Non inviare email per messaggi
        );
    }

    /**
     * Notifica per nuova recensione
     */
    static async notifyNewReview(mentorId, menteeName, rating) {
        const titolo = '⭐ Nuova Recensione';
        const messaggio = `${menteeName} ha lasciato una recensione (${rating}/5 stelle)`;
        
        await this.create(
            mentorId,
            'Nuovo Messaggio',
            titolo,
            messaggio,
            { rating }
        );
    }

    /**
     * Notifica per risposta a recensione
     */
    static async notifyReviewReply(menteeId, mentorName) {
        const titolo = '💭 Risposta alla Recensione';
        const messaggio = `${mentorName} ha risposto alla tua recensione`;
        
        await this.create(
            menteeId,
            'Nuovo Messaggio',
            titolo,
            messaggio
        );
    }

    /**
     * Helper: Ottieni email utente
     */
    static async getUserEmail(userId) {
        const pool = (await import('../config/database.js')).default;
        const result = await pool.query('SELECT "Mail" as email FROM "Utenti" WHERE "Id" = $1', [userId]);
        return result.rows[0];
    }

    /**
     * Invia push notification
     */
    static async sendPushNotification(userId, title, message) {
        console.log(`[PUSH] User ${userId}: ${title} - ${message}`);
  }
}

export default NotificationService;