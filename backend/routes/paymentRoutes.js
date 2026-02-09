import express from 'express';
import {
    payWithCard,
    payWithPayPal,
    confirmPayPalPayment,
    getTotalEarnings,
    getHistoryMentee
} from '../controllers/paymentController.js';
import { ValidaJWT } from '../middleware/auth.js';

const router = express.Router();

// Tutte le route richiedono autenticazione
router.use(ValidaJWT);

// Pagamenti
router.post('/card', payWithCard);                    // POST /api/payments/card
router.post('/paypal', payWithPayPal);               // POST /api/payments/paypal
router.post('/paypal/confirm', confirmPayPalPayment); // POST /api/payments/paypal/confirm

// Storico
router.get('/history/mentee/:id', getHistoryMentee); // GET /api/payments/history/mentee/:id

// Entrate totali mentor
router.get('/earnings/mentor/:id', getTotalEarnings); // GET /api/payments/earnings/mentor/:id

// Rimborsi
//router.post('/refund', requestRefund);                // POST /api/payments/refund

export default router;