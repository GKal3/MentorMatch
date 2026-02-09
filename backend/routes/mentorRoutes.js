import express from 'express';
import * as mentorController from '../controllers/mentorController.js';
import { ValidaJWT } from '../middleware/auth.js';

const router = express.Router();

// Opzioni pubbliche per registrazione mentor
router.get('/options', mentorController.getOptions);

// Tutte le route richiedono autenticazione
router.use(ValidaJWT);

// Personal info routes
router.get('/personal/:id', mentorController.getPersonalInfo);
router.put('/personal/:id', mentorController.updatePersonalInfo);

// Appointment routes
router.get('/appointments', mentorController.getMyAppointments);
router.get('/appointments/:id', mentorController.getAppointments);
router.get('/appointment/:id', mentorController.getAppointmentById);
router.put('/appointment/:id', mentorController.answerAppointment);
router.put('/appointments/:id/status', mentorController.updateAppointmentStatus);
router.delete('/appointment/:id', mentorController.cancelAppointment);

// Notification routes
router.get('/notifications', mentorController.getAllNot);
router.get('/notification/:id', mentorController.getNotification);

// Availability routes
router.get('/availability/:id', mentorController.getAv);
router.post('/availability/:id', mentorController.addAv);
router.put('/availability/:id', mentorController.updateAv);
router.delete('/availability/:id', mentorController.deleteAv);

// Review routes
router.get('/reviews/:id', mentorController.getAllReviews);
router.get('/reviews-stats/:id', mentorController.getReviewStats);

// Earnings history
router.get('/earnings/history/:id', mentorController.getEarningsHistory);

export default router;