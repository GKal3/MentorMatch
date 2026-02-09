import Mentor from '../models/Mentor.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import Availability from '../models/Availability.js';
import Review from '../models/Review.js';
import Payment from '../models/Payment.js';
import NotificationService from '../utils/notificationService.js';
import LinkService from '../utils/linkService.js';

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
        const mentor = await Mentor.getById(req.params.id);
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
        const { titolo, organizzazione, esperienza, prezzo, settore, lingua, bio } = req.body;

        const updatedMentor = await Mentor.update(id, titolo, organizzazione, esperienza, prezzo, settore, lingua, bio);
        if (!updatedMentor) {
            return res.status(404).json({ error: 'Mentor not found' });
        }
        res.json(updatedMentor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Risposta alle prenotazioni
export const answerAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedAppointment = await Appointment.answerMentor(id, status);
        if (!updatedAppointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        if (status === 'Accettato') {
            const appointment = await Appointment.getByIdMentor(id);
            const meetingLink = await LinkService.generateMeetingLink(appointment);
            await NotificationService.notifyBookingAccepted(
                appointment.menteeId,
                appointment.mentorName,
                appointment.appointmentDate,
                meetingLink
            );
        } else if (status === 'Rifiutato') {
            const appointment = await Appointment.getByIdMentor(id);
            await NotificationService.notifyBookingRejected(
                appointment.menteeId,
                appointment.mentorName,
                appointment.appointmentDate
            );
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

        const updatedAppointment = await Appointment.updateStatus(id, status);
        if (!updatedAppointment) {
            return res.status(404).json({ error: 'Appointment not found' });
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

        const updatedAppointment = await Appointment.answerMentor(id, 'Annullato');
        if (!updatedAppointment) {
            return res.status(404).json({ error: 'Appointment not found' });
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

        const notification = await Notification.getNotificationById(id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json(notification);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
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
            return res.status(400).json({ error: 'disponibilita deve essere un array' });
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

        const deletedAvailability = await Availability.deleteAvailability(id, giorno, ora_inizio, ora_fine);
        res.json(deletedAvailability);
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
