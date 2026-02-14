import Notification from '../models/Notification.js';
import EmailService from './emailService.js';

class NotificationService {
    static emailAggregationWindowMs = Number.isFinite(Number(process.env.NOTIFICATION_EMAIL_WINDOW_MS))
        ? Number(process.env.NOTIFICATION_EMAIL_WINDOW_MS)
        : 45000;

    static pendingEmailBatches = new Map();

    /**
     * Crea notifica nel DB e invia email
     * @param {number} userId - ID utente destinatario
     * @param {string} tipo - Tipo notifica ('prenotazione', 'cancellazione', 'messaggio', 'recensione')
     * @param {string} titolo - Titolo notifica
     * @param {string} messaggio - Testo notifica
     * @param {object} data - Dati aggiuntivi (es. appointmentId, link)
     */
    static async create(userId, tipo, titolo, messaggio, data = {}) {
        try {
        // 1. Crea notifica nel database
        const notification = await Notification.create(
            userId,
            tipo,
            titolo,
            messaggio,
            data
        );
        
        // 2. Accoda email (aggregata per burst)
        await this.enqueueNotificationEmail(userId, titolo, messaggio);
        
        // 3. Invia push notification
        if (notification) {
            await this.sendPushNotification(userId, titolo, messaggio);
        }
        
        return notification;
        
        } catch (error) {
        console.error('Notification creation error:', error);
        throw error;
        }
    }

    static async enqueueNotificationEmail(userId, titolo, messaggio) {
        const existing = this.pendingEmailBatches.get(userId);

        if (existing) {
            existing.count += 1;
            existing.lastTitle = titolo;
            existing.lastMessage = messaggio;
            return;
        }

        const batch = {
            count: 1,
            firstTitle: titolo,
            firstMessage: messaggio,
            lastTitle: titolo,
            lastMessage: messaggio,
            timer: setTimeout(async () => {
                await this.flushNotificationEmail(userId);
            }, this.emailAggregationWindowMs),
        };

        this.pendingEmailBatches.set(userId, batch);
    }

    static async flushNotificationEmail(userId) {
        const batch = this.pendingEmailBatches.get(userId);
        if (!batch) return;

        this.pendingEmailBatches.delete(userId);

        try {
            const user = await this.getUserEmail(userId);
            if (!user?.email) return;

            if (batch.count <= 1) {
                await EmailService.SpedMail(user.email, batch.firstTitle, batch.firstMessage);
                return;
            }

            const subject = 'You have new notifications on MentorMatch';
            const content = `You have ${batch.count} new notifications to read on MentorMatch. Open the notifications page to see all updates.`;
            await EmailService.SpedMail(user.email, subject, content);
        } catch (error) {
            console.error('Notification email aggregation error:', error);
        }
    }

    /**
     * Notifica per prenotazione accettata
     */
    static async notifyBookingAccepted(menteeId, mentorName, appointmentDate, meetingLink) {
        const titolo = '✅ Booking Confirmed';
        const messaggio = `${mentorName} accepted your booking for ${appointmentDate}. Video call link: ${meetingLink}`;
        
        await this.create(
            menteeId,
            'New Booking',
            titolo,
            messaggio,
            { appointmentDate, meetingLink }
        );
    }

    /**
     * Notifica per prenotazione rifiutata
     */
    static async notifyBookingRejected(menteeId, mentorName, appointmentDate) {
        const titolo = '❌ Booking Declined';
        const messaggio = `${mentorName} cannot accept your booking for ${appointmentDate}. Your payment will be refunded.`;
        
        await this.create(
            menteeId,
            'Booking Cancellation',
            titolo,
            messaggio,
            { appointmentDate }
        );
    }

    /**
     * Notifica per nuova prenotazione (al mentor)
     */
    static async notifyNewBooking(mentorId, menteeName, appointmentDate) {
        const titolo = '📅 New Booking';
        const messaggio = `${menteeName} booked a session for ${appointmentDate}. Go to your dashboard to accept or decline.`;
        
        await this.create(
            mentorId,
            'New Booking',
            titolo,
            messaggio,
            { appointmentDate }
        );
    }

    /**
     * Notifica per cancellazione appuntamento
     */
    static async notifyAppointmentCancelled(userId, cancelledBy, reason, appointmentDate) {
        const titolo = '🚫 Appointment Canceled';
        const messaggio = `The appointment on ${appointmentDate} was canceled by ${cancelledBy}. Reason: ${reason}`;
        
        await this.create(
            userId,
            'Booking Cancellation',
            titolo,
            messaggio,
            { appointmentDate, reason }
        );
    }

    /**
     * Notifica per nuovo messaggio
     */
    static async notifyNewMessage(userId, senderName) {
        const titolo = '💬 New Message';
        const messaggio = `You received a new message from ${senderName}`;
        
        await this.create(
            userId,
            'New Message',
            titolo,
            messaggio,
            {}
        );
    }

    /**
     * Notifica per nuova recensione
     */
    static async notifyNewReview(mentorId, menteeName, rating) {
        const titolo = '⭐ New Review';
        const messaggio = `${menteeName} left a review (${rating}/5 stars)`;
        
        await this.create(
            mentorId,
            'New Message',
            titolo,
            messaggio,
            { rating }
        );
    }

    /**
     * Notifica per risposta a recensione
     */
    static async notifyReviewReply(menteeId, mentorName) {
        const titolo = '💭 Review Reply';
        const messaggio = `${mentorName} replied to your review`;
        
        await this.create(
            menteeId,
            'New Message',
            titolo,
            messaggio
        );
    }

    static async notifyMentorPayout(mentorId, amountNet, amountGross, feeAmount, ibanMasked) {
        const titolo = '💸 Payout Received';
        const messaggio = `A payout of €${Number(amountNet || 0).toFixed(2)} was sent to your IBAN ${ibanMasked}. Gross: €${Number(amountGross || 0).toFixed(2)}, platform fee: €${Number(feeAmount || 0).toFixed(2)}.`;

        await this.create(
            mentorId,
            'Payment',
            titolo,
            messaggio,
            { amountNet, amountGross, feeAmount, ibanMasked }
        );
    }

    static async notifyMenteePaymentCompleted(menteeId, mentorName, amountPaid, appointmentDate, appointmentTime) {
        const paid = Number(amountPaid || 0).toFixed(2);
        const mentor = mentorName || 'your mentor';
        const when = [appointmentDate, appointmentTime].filter(Boolean).join(' at ');
        const suffix = when ? ` for ${when}` : '';

        const titolo = '💳 Payment Completed';
        const messaggio = `Your payment of €${paid}${suffix} with ${mentor} has been completed successfully.`;

        await this.create(
            menteeId,
            'Payment',
            titolo,
            messaggio,
            { amountPaid, mentorName: mentorName || null, appointmentDate: appointmentDate || null, appointmentTime: appointmentTime || null }
        );
    }

    static async notifyMenteeRefundIssued(menteeId, mentorName, refundAmount, appointmentDate, appointmentTime) {
        const amount = Number(refundAmount || 0).toFixed(2);
        const mentor = mentorName || 'your mentor';
        const when = [appointmentDate, appointmentTime].filter(Boolean).join(' at ');
        const suffix = when ? ` for ${when}` : '';

        const titolo = '💸 Refund Issued';
        const messaggio = `Your payment of €${amount}${suffix} with ${mentor} has been refunded because the mentor cancelled the appointment.`;

        await this.create(
            menteeId,
            'Payment',
            titolo,
            messaggio,
            {
                refundAmount,
                mentorName: mentorName || null,
                appointmentDate: appointmentDate || null,
                appointmentTime: appointmentTime || null,
            }
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