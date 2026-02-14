import Mentor from '../models/Mentor.js';
import User from '../models/User.js';
import { requestEmailChange } from '../utils/emailChangeService.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import Availability from '../models/Availability.js';
import Review from '../models/Review.js';
import Payment from '../models/Payment.js';
import NotificationService from '../utils/notificationService.js';
import LinkService from '../utils/linkService.js';
import { executeGatewayRefundForPayment } from './paymentController.js';

const isAcceptedStatus = (status = '') => {
    const normalized = String(status).toLowerCase();
    return normalized.includes('accepted') || normalized.includes('conferm');
};

const isRejectedStatus = (status = '') => {
    const normalized = String(status).toLowerCase();
    return normalized.includes('rifiut') || normalized.includes('reject') || normalized.includes('cancel');
};

const normalizeAppointmentStatusForDb = (status = '') => {
    const normalized = String(status).toLowerCase().trim();

    if (normalized.includes('accepted') || normalized.includes('conferm') || normalized.includes('accett')) {
        return 'Accepted';
    }

    if (normalized.includes('pending') || normalized.includes('attesa')) {
        return 'Pending';
    }

    if (
        normalized.includes('rifiut')
        || normalized.includes('reject')
        || normalized.includes('declin')
        || normalized.includes('cancel')
        || normalized.includes('annull')
    ) {
        return 'Cancelled';
    }

    return status;
};

const getMenteeIdFromAppointment = (appointment = {}) => (
    appointment.Id_Mentee
    || appointment.id_mentee
    || appointment.menteeId
    || appointment.idMentee
);

const getMentorNameFromAppointment = (appointment = {}) => {
    const fullName = `${appointment.mentor_nome || ''} ${appointment.mentor_cognome || ''}`.trim();
    return fullName || appointment.mentorName || 'Your mentor';
};

const getMenteeNameFromAppointment = (appointment = {}) => {
    const fullName = `${appointment.mentee_nome || ''} ${appointment.mentee_cognome || ''}`.trim();
    return fullName || appointment.menteeName || 'Mentee';
};

const getAppointmentDateLabel = (appointment = {}) => {
    const rawDate = appointment.Giorno || appointment.giorno;
    if (!rawDate) return 'your session';

    const dateObj = new Date(rawDate);
    const datePart = Number.isNaN(dateObj.getTime())
        ? String(rawDate).slice(0, 10)
        : dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });

    const startTime = appointment.Ora_Inizio || appointment.Ora || appointment.ora || '';
    return startTime ? `${datePart} at ${startTime}` : datePart;
};

const getAppointmentDateTimeForMeet = (appointment = {}) => {
    const rawDate = appointment.Giorno || appointment.giorno;
    const rawTime = appointment.Ora_Inizio || appointment.Ora || appointment.ora || '00:00';
    if (!rawDate) return null;

    const dateIso = String(rawDate).slice(0, 10);
    const timeMatch = String(rawTime).match(/^(\d{1,2}):(\d{2})/);
    const hh = timeMatch ? String(Math.min(23, Number(timeMatch[1]))).padStart(2, '0') : '00';
    const mm = timeMatch ? String(Math.min(59, Number(timeMatch[2]))).padStart(2, '0') : '00';

    const parsed = new Date(`${dateIso}T${hh}:${mm}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const notifyMenteeStatusUpdate = async (appointment = {}, status = '') => {
    const menteeId = getMenteeIdFromAppointment(appointment);
    if (!menteeId) return;

    const mentorName = getMentorNameFromAppointment(appointment);
    const appointmentDateLabel = getAppointmentDateLabel(appointment);

    if (isAcceptedStatus(status)) {
        let meetingLink = appointment.Link || appointment.link || '';
        const appointmentId = appointment.Id || appointment.id;

        if (!meetingLink) {
            try {
                const appointmentDateTime = getAppointmentDateTimeForMeet(appointment);
                if (appointmentDateTime) {
                    meetingLink = await LinkService.generateMeetingLink(
                        appointmentId,
                        appointmentDateTime,
                        mentorName,
                        getMenteeNameFromAppointment(appointment)
                    );
                }
            } catch (error) {
                console.error('Error generating meeting link:', error);
            }
        }

        if (!meetingLink) {
            meetingLink = 'https://meet.google.com/new';
        }

        if (appointmentId && meetingLink) {
            try {
                await Appointment.updateMeetingLink(appointmentId, meetingLink);
                console.log('Meeting link saved for appointment', appointmentId);
            } catch (error) {
                console.error('Error saving meeting link:', error, { appointmentId, meetingLink });
            }
        }

        await NotificationService.notifyBookingAccepted(
            menteeId,
            mentorName,
            appointmentDateLabel,
            meetingLink
        );
        return;
    }

    if (isRejectedStatus(status)) {
        const appointmentId = appointment.Id || appointment.id;
        if (appointmentId) {
            try {
                await Appointment.clearMeetingLink(appointmentId);
            } catch (error) {
                console.error('Error clearing meeting link:', error);
            }
        }

        await NotificationService.notifyBookingRejected(
            menteeId,
            mentorName,
            appointmentDateLabel
        );
    }
};

const processRefundForMentorCancellation = async (appointment = {}, status = '') => {
    if (!isRejectedStatus(status)) return;

    const appointmentId = appointment.Id || appointment.id;
    if (!appointmentId) return;

    const payment = await Payment.getLatestByAppointmentId(appointmentId);
    if (!payment) return;

    const payoutStatus = String(payment.Stato_Payout || payment.stato_payout || '').toLowerCase();
    if (payoutStatus === 'refunded') return;

    const paidAmount = Number(payment.Importo || payment.importo || 0);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) return;

    const gatewayRefund = await executeGatewayRefundForPayment(payment);

    await Payment.markRefundIssued(payment.Id || payment.id, {
        refundReason: 'Mentor cancelled appointment',
        refundReference: gatewayRefund?.refundReference,
        payoutProvider: gatewayRefund?.provider || 'REFUND',
    });

    const menteeId = getMenteeIdFromAppointment(appointment);
    if (!menteeId) return;

    const mentorName = getMentorNameFromAppointment(appointment);
    const appointmentDate = String(appointment.Giorno || appointment.giorno || '').slice(0, 10);
    const appointmentTime = `${appointment.Ora_Inizio || appointment.ora_inizio || ''}${appointment.Ora_Fine || appointment.ora_fine ? ` - ${appointment.Ora_Fine || appointment.ora_fine}` : ''}`.trim();

    await NotificationService.notifyMenteeRefundIssued(
        menteeId,
        mentorName,
        paidAmount,
        appointmentDate,
        appointmentTime
    );
};

// Opzioni pubbliche per select (settore/lingua)
export const getOptions = async (_req, res) => {
    try {
        const { settori, lingue } = await Mentor.getOptions();
        res.json({ settori, lingue });
    } catch (error) {
        console.error('Errore in getOptions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Area personale
export const getPersonalInfo = async (req, res) => {
    try {
        console.log('getPersonalInfo chiamato con ID:', req.params.id);
        const mentor = await Mentor.getPersonalById(req.params.id);
        console.log('Dati mentor trovati:', mentor);
        if (!mentor) {
            return res.status(404).json({ error: 'Mentor not found' });
        }
        res.json(mentor);
    } catch (error) {
        console.error('Errore in getPersonalInfo:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Modifica dati personali
export const updatePersonalInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome,
            cognome,
            data_nascita,
            genere,
            mail,
            titolo,
            organizzazione,
            esperienza,
            prezzo,
            iban,
            settore,
            lingua,
            bio,
        } = req.body;

        const currentMentor = await Mentor.getPersonalById(id);
        if (!currentMentor) {
            return res.status(404).json({ error: 'Mentor not found' });
        }

        const normalizedIban = typeof iban === 'string' ? iban.replace(/\s+/g, '').toUpperCase() : null;
        const effectivePrice = prezzo === null || prezzo === undefined || prezzo === ''
            ? Number(currentMentor.Prezzo || 0)
            : Number(prezzo);
        const effectiveIban = normalizedIban || currentMentor.IBAN;

        if (Number.isFinite(effectivePrice) && effectivePrice > 0 && !effectiveIban) {
            return res.status(400).json({ error: 'IBAN is required when session price is greater than 0' });
        }

        const { requested: emailChangeRequested } = await requestEmailChange(id, mail);
        const updatedUser = await User.updateProfile(id, nome, cognome, data_nascita, genere);

        const updatedMentor = await Mentor.update(id, titolo, organizzazione, esperienza, prezzo, settore, lingua, bio, normalizedIban);
        if (!updatedMentor) {
            return res.status(404).json({ error: 'Mentor not found' });
        }
        res.json({
            success: true,
            user: updatedUser,
            mentor: updatedMentor,
            emailChangeRequested,
        });
    } catch (error) {
        console.error(error);
        res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
    }
};

// Risposta alle prenotazioni
export const answerAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const effectiveStatus = normalizeAppointmentStatusForDb(status);

        const appointmentBeforeUpdate = await Appointment.getByIdMentor(id);
        if (!appointmentBeforeUpdate) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        if (isRejectedStatus(effectiveStatus)) {
            await processRefundForMentorCancellation(appointmentBeforeUpdate, effectiveStatus);
        }

        const updatedAppointment = await Appointment.answerMentor(id, effectiveStatus);
        if (!updatedAppointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const appointment = await Appointment.getByIdMentor(id);
        if (appointment) {
            await notifyMenteeStatusUpdate(appointment, effectiveStatus);
        }

        res.json(updatedAppointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Visualizza appuntamenti dal JWT (per calendario)
export const getMyAppointments = async (req, res) => {
    try {
        const mentorUserId = req.user.id; // Dal JWT
        console.log('getMyAppointments: mentorUserId from JWT:', mentorUserId);
        
        const appointments = await Appointment.getAllMentor(mentorUserId);
        console.log('getMyAppointments: found', appointments.length, 'appointments');
        console.log('getMyAppointments: appointments:', JSON.stringify(appointments, null, 2));
        
        res.json({ success: true, data: appointments });
    } catch (error) {
        console.error('Error in getMyAppointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Visualizza appuntamenti
export const getAppointments = async (req, res) => {
    try {
        const { id } = req.params;
        const { giorno } = req.query;

        const appointments = await Appointment.getAllMentor(id, giorno);
        res.json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Aggiorna stato appuntamento
export const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const effectiveStatus = normalizeAppointmentStatusForDb(status);

        const appointmentBeforeUpdate = await Appointment.getByIdMentor(id);
        if (!appointmentBeforeUpdate) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        if (isRejectedStatus(effectiveStatus)) {
            await processRefundForMentorCancellation(appointmentBeforeUpdate, effectiveStatus);
        }

        const updatedAppointment = await Appointment.updateStatus(id, effectiveStatus);
        if (!updatedAppointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const appointment = await Appointment.getByIdMentor(id);
        if (appointment) {
            await notifyMenteeStatusUpdate(appointment, effectiveStatus);
        }

        res.json({ success: true, data: updatedAppointment });
    } catch (error) {
        console.error('Error in updateAppointmentStatus:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Visualizza singolo appuntamento
export const getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const appointment = await Appointment.getByIdMentor(id);
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        res.json(appointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Annulla appuntamento
export const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;

        const appointmentBeforeUpdate = await Appointment.getByIdMentor(id);
        if (!appointmentBeforeUpdate) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        await processRefundForMentorCancellation(appointmentBeforeUpdate, 'Cancelled');

        const updatedAppointment = await Appointment.answerMentor(id, 'Cancelled');
        if (!updatedAppointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const appointment = await Appointment.getByIdMentor(id);
        if (appointment) {
            await notifyMenteeStatusUpdate(appointment, 'Cancelled');
        }

        res.json(updatedAppointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Visualizza notifiche
export const getAllNot = async (req, res) => {
    try {
        // Usa l'ID dal JWT invece del parametro URL per sicurezza
        const userId = req.user.id;

        const notifications = await Notification.getAllNotifications(userId);
        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Visualizza singola notifica
export const getNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await Notification.markAsRead(id, userId);
        const notification = await Notification.getNotificationByIdForUser(id, userId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json(notification);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const unreadCount = await Notification.getUnreadCount(userId);
        res.json({ success: true, unreadCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error fetching unread notifications count' });
    }
};

export const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const updated = await Notification.markAllAsRead(userId);
        res.json({ success: true, updatedCount: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error marking notifications as read' });
    }
};

export const markNotificationAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await Notification.markAsRead(id, userId);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, data: notification });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error marking notification as read' });
    }
};

// Visualizza disponibilità
export const getAv = async (req, res) => {
    try {
        const { id } = req.params;

        const availability = await Availability.getAvailability(id);
        res.json(availability);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Aggiungi disponibilità
export const addAv = async (req, res) => {
    try {
        const { id } = req.params;
        const { disponibilita } = req.body;

        console.log('=== addAv START ===');
        console.log('addAv: ricevuto id:', id);
        console.log('addAv: ricevuto payload:', JSON.stringify(req.body, null, 2));
        console.log('addAv: disponibilita è array?:', Array.isArray(disponibilita));

        // Verifica che disponibilita sia un array
        if (!Array.isArray(disponibilita)) {
            console.error('❌ addAv: disponibilita non è un array, tipo:', typeof disponibilita);
            return res.status(400).json({ error: 'availability must be an array' });
        }

        console.log('✓ addAv: disponibilita è array con', disponibilita.length, 'slot');
        disponibilita.forEach((slot, i) => {
            console.log(`  Slot ${i}: giorno=${slot.giorno}, inizio=${slot.ora_inizio}, fine=${slot.ora_fine}`);
        });

        const newAvailabilities = await Availability.addMultipleAvailability(id, disponibilita);
        console.log('=== addAv SUCCESS - salvati', newAvailabilities.length, 'slot ===');
        res.json(newAvailabilities);
    } catch (error) {
        console.error('=== addAv ERROR ===');
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Modifica disponibilità
export const updateAv = async (req, res) => {
    try {
        const { id } = req.params;
        const disponibilita = req.body;

        const updatedAvailability = await Availability.updateAvailability(id, disponibilita);
        res.json(updatedAvailability);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Elimina disponibilità
export const deleteAv = async (req, res) => {
    try {
        const { id } = req.params;
        const { giorno, ora_inizio, ora_fine } = req.body;

        const deletedCount = await Availability.deleteAvailability(id, giorno, ora_inizio, ora_fine);

        if (!deletedCount) {
            return res.status(404).json({
                success: false,
                message: 'Availability range not found',
            });
        }

        res.json({
            success: true,
            deletedCount,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Visualizza recensioni
export const getAllReviews = async (req, res) => {
    try {
        const { id } = req.params;
        const reviews = await Review.getAllByMentorId(id);
        res.json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Statistiche recensioni
export const getReviewStats = async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await Review.getMentorStats(id);
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Storico earnings
export const getEarningsHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const earnings = await Payment.getHistoryMentor(id);
        res.json({
            success: true,
            data: earnings
        });
    } catch (error) {
        console.error('Error in getEarningsHistory:', error);
        res.status(500).json({ success: false, message: 'Error fetching earnings history' });
    }
};
