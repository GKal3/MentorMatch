import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import Appointment from '../models/Appointment.js';
import Mentor from '../models/Mentor.js';

let stripe;
try {
    stripe = new Stripe(process.env.STRIPE_API_KEY || 'sk_test_placeholder');
} catch (e) {
    console.warn('Stripe initialization warning:', e.message);
    stripe = null;
}

// Storico pagamenti mentee
export const getHistoryMentee = async (req, res) => {
    try {
        const { id } = req.params;

        const payments = await Payment.getHistoryMentee(id);

        res.json({
            success: true,
            count: payments.length,
            data: payments,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore recupero storico pagamenti' });
    }
};

// Totale entrate mentor
export const getTotalEarnings = async (req, res) => {
    try {
        const { id } = req.params;

        const totalEarnings = await Payment.getTotalEarnings(id);

        res.json({
            success: true,
            data: totalEarnings,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore recupero entrate totali' });
    }
};

// Effettua un pagamento con carta (Stripe)
export const payWithCard = async (req, res) => {
    let payment;
    try {
        const { prenotazioneId, tokenStripe } = req.body;
        const userId = req.user.id; // Dal JWT
        
        // 1. Ottieni dettagli prenotazione
        const appointment = await Appointment.getByIdMentor(prenotazioneId);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Prenotazione non trovata' });
        }
        
        // 2. Calcola importo (tariffa mentor × durata appuntamento)
        const mentor = await Mentor.getById(appointment.Id_Mentor);
        const importo = mentor.Prezzo; // Assumiamo 1 ora, modificalo se serve
        
        // 3. Crea record pagamento nel DB
        const paymentRecord = await Payment.create(prenotazioneId, importo, 'Carta di credito', new Date());
        
        // 4. Processa pagamento con Stripe
        const charge = await stripe.charges.create({
            amount: Math.round(importo * 100), // Stripe vuole centesimi
            currency: 'eur',
            source: tokenStripe, // Token dalla carta del cliente
            description: `Sessione con ${mentor.Nome} ${mentor.Cognome}`,
            metadata: {
                payment_id: paymentRecord.Id,
                appointment_id: prenotazioneId
            }
        });
        
        // 5. Aggiorna pagamento come completato
        //await Payment.markAsCompleted(paymentRecord.Id, charge.id);
        
        // 6. Aggiorna prenotazione come pagata
        //await Appointment.markAsPaid(prenotazioneId);
        
        // 7. TODO: Invia notifica al mentor
        
        res.status(200).json({
            success: true,
            message: 'Pagamento completato',
            transactionId: charge.id
        });
        
    } catch (error) {
        console.error('Errore pagamento carta:', error);
        
        // Segna pagamento come fallito se era stato creato
        /*
        if (payment?.Id) {
            await Payment.markAsFailed(payment.Id);
        }
        */
        res.status(500).json({ 
            success: false,
            error: 'Errore nel processare il pagamento',
            details: error.message 
        });
    }
};

// Effettua un pagamento con PayPal
export const payWithPayPal = async (req, res) => {
    try {
        const { prenotazioneId } = req.body;
        const userId = req.user.id;
        
        // 1. Ottieni dettagli
        const appointment = await Appointment.getByIdMentor(prenotazioneId);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Prenotazione non trovata' });
        }
        
        const mentor = await Mentor.getById(appointment.Id_Mentor);
        const importo = mentor.Prezzo;
        
        // 2. Crea record pagamento
        const payment = await Payment.create(prenotazioneId, importo, 'Paypal', new Date());
        
        // 3. Per ora, restituisci URL di esempio per test
        // TODO: Implementare integrazione PayPal SDK completa
        const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/payment-success.html?paymentId=${payment.Id}`;
        
        res.status(200).json({
            success: true,
            paymentId: payment.Id,
            approvalUrl: approvalUrl,
            orderId: `ORDER-${payment.Id}`
        });
        
    } catch (error) {
        console.error('Errore pagamento PayPal:', error);
        res.status(500).json({ success: false, error: 'Errore nel processare il pagamento', details: error.message });
    }
};

// Conferma pagamento PayPal
export const confirmPayPalPayment = async (req, res) => {
    try {
        const { orderId, paymentId } = req.body;
        
        // 1. TODO: Cattura il pagamento PayPal
        // Implementare integrazione PayPal SDK
        
        // 2. Aggiorna pagamento
        //await Payment.markAsCompleted(paymentId, orderId);
        
        // 3. Aggiorna prenotazione
        const payment = await Payment.getById(paymentId);
        //await Appointment.markAsPaid(payment.Id_Prenotazione);
        
        res.status(200).json({
            success: true,
            message: 'Pagamento completato'
        });
        
    } catch (error) {
        console.error('Errore conferma PayPal:', error);
        res.status(500).json({ success: false, error: 'Errore nella conferma del pagamento', details: error.message });
    }
};