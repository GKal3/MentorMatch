import express from 'express';
import { 
  AreaPerMentee,
  ModDati,
  RicercaMentor,
  ApriProfiloMentor,
  ApriPrenot,
  ApriRecMentee,
  CreaRec,
  ModRec,
  CancRec,
  StatoApp,
  Storico,
  CancellaApp,
  getAllNot,
  getNotification
} from '../controllers/menteeController.js';
import { ValidaJWT, verificaRuolo } from '../middleware/auth.js';
import { 
  validateBooking, 
  validateReview, 
  validateReviewUpdate 
} from '../middleware/validation.js';

const router = express.Router();

// Route pubbliche (senza autenticazione)
// GET /api/mentee/search - Ricerca mentor (pubblica)
router.get('/search', RicercaMentor);

// GET /api/mentee/mentor/:id - Profilo mentor (pubblica)
router.get('/mentor/:id', ApriProfiloMentor);

// Tutte le route successive richiedono autenticazione e ruolo Mentee
router.use(ValidaJWT);
router.use(verificaRuolo('Mentee'));

// GET /api/mentee/area - Area riservata
router.get('/area', AreaPerMentee);

// POST /api/mentee/booking - Crea prenotazione
router.post('/booking', validateBooking, ApriPrenot);

// GET /api/mentee/appointments - Stato appuntamenti
router.get('/appointments', StatoApp);

// PUT /api/mentee/appointments/:id/cancel - Cancella appuntamento
router.put('/appointments/:id/cancel', CancellaApp);

// GET /api/mentee/payments/history - Storico pagamenti
router.get('/payments/history', Storico);

// PUT /api/mentee/profile - Modifica dati
router.put('/profile', ModDati);

// GET /api/mentee/reviews - Proprie recensioni
router.get('/reviews', ApriRecMentee);

// POST /api/mentee/reviews - Crea recensione
router.post('/reviews', validateReview, CreaRec);

// PUT /api/mentee/reviews/:id - Modifica recensione
router.put('/reviews/:id', validateReviewUpdate, ModRec);

// DELETE /api/mentee/reviews/:id - Cancella recensione
router.delete('/reviews/:id', CancRec);

// GET /api/mentee/notifications - Tutte le notifiche
router.get('/notifications', getAllNot);

// GET /api/mentee/notifications/:id - Singola notifica
router.get('/notifications/:id', getNotification);

export default router;