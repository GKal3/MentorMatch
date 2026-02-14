import Mentee from '../models/Mentee.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Payment.js';
import Mentor from '../models/Mentor.js';
import Availability from '../models/Availability.js';
import Notification from '../models/Notification.js';
import NotificationService from '../utils/notificationService.js';
import { requestEmailChange } from '../utils/emailChangeService.js';

// DATI PERSONALI MENTEE
export const getPersonalInfo = async (req, res) => {
  try {
    console.log('getPersonalInfo chiamato con ID:', req.params.id);
    const mentee = await Mentee.findByUserId(req.params.id);
    console.log('Dati mentee trovati:', mentee);
    if (!mentee) {
      return res.status(404).json({ error: 'Mentee not found' });
    }
    res.json(mentee);
  } catch (error) {
    console.error('Errore in getPersonalInfo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// AREA RISERVATA MENTEE
export const AreaPerMentee = async (req, res) => {
  try {
    const userId = req.user.id;

    const mentee = await Mentee.findByUserId(userId);
    if (!mentee) {
      return res.status(404).json({
        success: false,
        message: 'Mentee profile not found',
      });
    }

    const stats = await Mentee.getStats(userId);

    res.json({
      success: true,
      data: {
        profilo: mentee,
        statistiche: stats,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error loading mentee area' });
  }
};

// MODIFICA DATI
export const ModDati = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    const { nome, cognome, data_nascita, genere, mail, occupazione, bio } = req.body;

    const { requested: emailChangeRequested } = await requestEmailChange(userId, mail);
    const updatedUser = await User.updateProfile(userId, nome, cognome, data_nascita, genere);

    let updatedMentee = null;
    if (occupazione !== undefined || bio !== undefined) {
      updatedMentee = await Mentee.updateProfile(userId, { occupazione, bio });
    }

    res.json({
      success: true,
      user: updatedUser,
      mentee: updatedMentee,
      emailChangeRequested,
    });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error',
    });
  }
};

// RICERCA MENTOR
export const RicercaMentor = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      settore: req.query.settore,
      lingua: req.query.lingua,
      prezzo_max: req.query.prezzo_max,
      disponibilita: req.query.disponibilita,
      rating_min: req.query.rating_min,
    };

    const mentors = await Mentor.searchMentors(filters);

    res.json({
      success: true,
      count: mentors.length,
      data: mentors,
    });
  } catch (error) {
    console.error('RicercaMentor error:', error);
    res.status(500).json({ success: false, message: 'Error searching mentors' });
  }
};

// PROFILO MENTOR
export const ApriProfiloMentor = async (req, res) => {
  try {
    const mentorUserId = req.params.id;

    console.log('Richiesta profilo mentor per ID:', mentorUserId); // Debug

    const mentor = await Mentor.getById(mentorUserId);
    
    console.log('Dati mentor trovati:', mentor); // Debug
    
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found',
      });
    }

    const availability = await Availability.getAvailability(mentorUserId);

    res.json({
      success: true,
      data: {
        ...mentor,
        disponibilita: availability,
      },
    });
  } catch (error) {
    console.error('Errore in ApriProfiloMentor:', error); // Debug
    res.status(500).json({ success: false, message: 'Error loading mentor profile', error: error.message });
  }
};

// PRENOTAZIONE
export const ApriPrenot = async (req, res) => {
  try {
    const menteeUserId = req.user.id;
    const { id_mentor, giorno, ora_inizio, ora_fine } = req.body;

    console.log('Booking request:', { id_mentor, giorno, ora_inizio, ora_fine, menteeUserId });

    const mentor = await Mentor.getById(id_mentor);
    if (!mentor) {
      console.log('Mentor not found:', id_mentor);
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }

    console.log('Checking availability...');
    const isSlotAvailable = await Appointment.checkAvailability(id_mentor, giorno, ora_inizio, ora_fine);
    console.log('Slot available:', isSlotAvailable);
    
    if (!isSlotAvailable) {
      console.log('Slot already booked');
      return res.status(400).json({ success: false, message: 'Slot already booked' });
    }

    console.log('Creating booking...');
    const booking = await Appointment.create(id_mentor, menteeUserId, giorno, ora_inizio, ora_fine, 'Pending');
    console.log('Booking created:', booking);

    console.log('Creating notification...');
    const menteeUser = await User.getById(menteeUserId);
    const menteeName = menteeUser ? `${menteeUser.Nome} ${menteeUser.Cognome}` : 'A mentee';
    const appointmentDate = `${giorno} ${ora_inizio}-${ora_fine}`;
    await NotificationService.notifyNewBooking(id_mentor, menteeName, appointmentDate);

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error('Booking error full:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Booking error', details: error.message });
  }
};

// VISUALIZZA RECENSIONI DEL MENTEE
export const ApriRecMentee = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviews = await Review.findByMenteeUserId(userId);

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching reviews' });
  }
};

// CREA RECENSIONE
export const CreaRec = async (req, res) => {
  try {
    const menteeUserId = req.user.id;
    const { id_mentor, voto, commento } = req.body;

    const mentor = await Mentor.getById(id_mentor);
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }

    const hasCompletedSession = await Appointment.hasCompletedSession(menteeUserId, id_mentor);
    if (!hasCompletedSession) {
      return res.status(403).json({
        success: false,
        message: 'You can review only after an accepted session',
      });
    }

    const existingReview = await Review.findByMenteeAndMentor(menteeUserId, id_mentor);
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Review already exists' });
    }

    const review = await Review.create({
      id_mentee: menteeUserId,
      id_mentor,
      voto,
      commento,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating review' });
  }
};

// MODIFICA RECENSIONE
export const ModRec = async (req, res) => {
  try {
    const menteeUserId = req.user.id;
    const { id, voto, commento } = req.body;

    const review = await Review.update(id, { voto, commento });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating review' });
  }
};

// CANCELLA RECENSIONE
export const CancRec = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Review.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting review' });
  }
};

// STATO APPUNTAMENTI
export const StatoApp = async (req, res) => {
  try {
    const menteeUserId = req.user.id;

    const appointments = await Appointment.getAllMentee(menteeUserId);

    res.json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching appointments' });
  }
};

// STORICO PAGAMENTI
export const Storico = async (req, res) => {
  try {
    const menteeUserId = req.user.id;

    const payments = await Payment.getHistoryMentee(menteeUserId);

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching payment history' });
  }
};

// CANCELLA APPUNTAMENTO
export const CancellaApp = async (req, res) => {
  try {
    const menteeUserId = req.user.id;
    const { id } = req.params;

    const appointment = await Appointment.cancelAppointment(id, menteeUserId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or already canceled',
      });
    }

    res.json({
      success: true,
      message: 'Appointment canceled successfully',
      data: appointment,
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ success: false, message: 'Error canceling appointment' });
  }
};

// VISUALIZZA TUTTE LE NOTIFICHE
export const getAllNot = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.getAllNotifications(userId);

    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
};

// VISUALIZZA SINGOLA NOTIFICA
export const getNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await Notification.markAsRead(id, userId);
    const notification = await Notification.getNotificationByIdForUser(id, userId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notification' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching unread notifications count' });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const updatedCount = await Notification.markAllAsRead(userId);

    res.json({
      success: true,
      updatedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error marking all notifications as read' });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await Notification.markAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error marking notification as read' });
  }
};