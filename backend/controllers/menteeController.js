import Mentee from '../models/Mentee.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Payment.js';
import Mentor from '../models/Mentor.js';
import Availability from '../models/Availability.js';
import Notification from '../models/Notification.js';

// AREA RISERVATA MENTEE
export const AreaPerMentee = async (req, res) => {
  try {
    const userId = req.user.id;

    const mentee = await Mentee.findByUserId(userId);
    if (!mentee) {
      return res.status(404).json({
        success: false,
        message: 'Profilo mentee non trovato',
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
    res.status(500).json({ success: false, message: 'Errore area mentee' });
  }
};

// MODIFICA DATI
export const ModDati = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, cognome, data_nascita, genere } = req.body;

    const result = await User.updateProfile(userId, nome, cognome, data_nascita, genere);

    res.json({
      success: true,
      message: 'Dati aggiornati con successo',
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Errore modifica dati' });
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
    };

    const mentors = await Mentor.searchMentors(filters);

    res.json({
      success: true,
      count: mentors.length,
      data: mentors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Errore ricerca mentor' });
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
        message: 'Mentor non trovato',
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
    res.status(500).json({ success: false, message: 'Errore profilo mentor', error: error.message });
  }
};

// PRENOTAZIONE
export const ApriPrenot = async (req, res) => {
  try {
    const menteeUserId = req.user.id;
    const { id_mentor, giorno, ora } = req.body;

    const mentor = await Mentor.getById(id_mentor);
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor non trovato' });
    }

    const isSlotAvailable = await Appointment.checkAvailability(id_mentor, giorno, ora);
    if (!isSlotAvailable) {
      return res.status(400).json({ success: false, message: 'Slot già prenotato' });
    }

    const booking = await Appointment.create(id_mentor, menteeUserId, giorno, ora, 'In attesa');

    await Notification.create(
      id_mentor,
      'Nuova Prenotazione',
      'Nuova Prenotazione',
      `Nuova prenotazione per il ${giorno} alle ${ora}`
    );

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Errore prenotazione' });
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
    res.status(500).json({ success: false, message: 'Errore recupero recensioni' });
  }
};

// CREA RECENSIONE
export const CreaRec = async (req, res) => {
  try {
    const menteeUserId = req.user.id;
    const { id_mentor, voto, commento } = req.body;

    const mentor = await Mentor.getById(id_mentor);
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor non trovato' });
    }

    const hasCompletedSession = await Appointment.hasCompletedSession(menteeUserId, id_mentor);
    if (!hasCompletedSession) {
      return res.status(403).json({
        success: false,
        message: 'Puoi recensire solo dopo una sessione accettata',
      });
    }

    const existingReview = await Review.findByMenteeAndMentor(menteeUserId, id_mentor);
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Recensione già presente' });
    }

    const review = await Review.create({
      id_mentee: menteeUserId,
      id_mentor,
      voto,
      commento,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Errore creazione recensione' });
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
        message: 'Recensione non trovata',
      });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Errore modifica recensione' });
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
        message: 'Recensione non trovata',
      });
    }

    res.json({ success: true, message: 'Recensione eliminata' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Errore cancellazione recensione' });
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
    res.status(500).json({ success: false, message: 'Errore stato appuntamenti' });
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
    res.status(500).json({ success: false, message: 'Errore storico pagamenti' });
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
        message: 'Appuntamento non trovato o già annullato',
      });
    }

    res.json({
      success: true,
      message: 'Appuntamento annullato con successo',
      data: appointment,
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ success: false, message: 'Errore cancellazione appuntamento' });
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
    res.status(500).json({ success: false, message: 'Errore recupero notifiche' });
  }
};

// VISUALIZZA SINGOLA NOTIFICA
export const getNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.getNotificationById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifica non trovata',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Errore recupero notifica' });
  }
};