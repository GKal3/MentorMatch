import Payment from '../models/Payment.js';
import Appointment from '../models/Appointment.js';
import Mentor from '../models/Mentor.js';
import NotificationService from '../utils/notificationService.js';
import { ordersController, stripe } from '../config/payment.js';

const PLATFORM_FEE_PERCENT = Number.isFinite(Number(process.env.PLATFORM_FEE_PERCENT))
    ? Number(process.env.PLATFORM_FEE_PERCENT)
    : 15;

const toCurrency = (amount) => Number(Number(amount || 0).toFixed(2));

const parseTimeToMinutes = (timeValue = '') => {
    const match = String(timeValue).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return (hours * 60) + minutes;
};

const getDurationMinutesFromAppointment = (appointment = {}) => {
    const startMinutes = parseTimeToMinutes(appointment.Ora_Inizio || appointment.ora_inizio || appointment.oraInizio || '');
    const endMinutes = parseTimeToMinutes(appointment.Ora_Fine || appointment.ora_fine || appointment.oraFine || '');
    if (startMinutes === null || endMinutes === null) return 60;

    const duration = endMinutes - startMinutes;
    return duration > 0 ? duration : 60;
};

const computeAmountByDuration = (hourlyPrice, durationMinutes) => {
    const safePrice = Number(hourlyPrice || 0);
    const safeDuration = Number(durationMinutes || 0);
    if (!Number.isFinite(safePrice) || safePrice <= 0) return 0;
    if (!Number.isFinite(safeDuration) || safeDuration <= 0) return 0;
    return toCurrency((safePrice * safeDuration) / 60);
};

const computeBreakdown = (grossAmount) => {
    const gross = toCurrency(grossAmount);
    const feeAmount = toCurrency((gross * PLATFORM_FEE_PERCENT) / 100);
    const mentorNet = toCurrency(gross - feeAmount);
    return { gross, feeAmount, mentorNet };
};

const maskIban = (iban) => {
    if (!iban) return 'N/A';
    const normalized = iban.replace(/\s+/g, '').toUpperCase();
    if (normalized.length <= 8) return normalized;
    return `${normalized.slice(0, 4)}********${normalized.slice(-4)}`;
};

const buildGatewayMetadataRef = ({ gatewayProvider, gatewayReference, payoutReference }) => {
    const chunks = [];
    if (gatewayProvider && gatewayReference) {
        chunks.push(`GW:${gatewayProvider}:${gatewayReference}`);
    }
    if (payoutReference) {
        chunks.push(`PAYOUT:${payoutReference}`);
    }
    return chunks.join('|') || null;
};

const parseGatewayMetadataRef = (rawRef = '') => {
    const ref = String(rawRef || '');
    const match = ref.match(/GW:([^:|]+):([^|]+)/i);
    if (!match) return { provider: null, reference: null };
    return {
        provider: String(match[1] || '').toUpperCase(),
        reference: String(match[2] || '').trim(),
    };
};

const getPayPalBaseUrl = () => (
    process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'
);

const getPayPalAccessToken = async () => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials are missing');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
        throw new Error(payload.error_description || payload.error || 'Unable to obtain PayPal access token');
    }

    return payload.access_token;
};

const refundPayPalCapture = async (captureId, amount) => {
    if (!captureId) throw new Error('Missing PayPal capture id for refund');

    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${getPayPalBaseUrl()}/v2/payments/captures/${captureId}/refund`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount: {
                currency_code: 'EUR',
                value: toCurrency(amount).toFixed(2),
            },
            note_to_payer: 'Refund due to mentor cancellation',
        }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.message || payload.name || 'PayPal refund failed');
    }

    return payload;
};

const refundStripeCharge = async (chargeId, amount) => {
    if (!stripe) throw new Error('Stripe is not configured');
    if (!chargeId) throw new Error('Missing Stripe charge id for refund');

    const refund = await stripe.refunds.create({
        charge: chargeId,
        amount: Math.round(toCurrency(amount) * 100),
        reason: 'requested_by_customer',
        metadata: {
            reason: 'mentor_cancelled',
        },
    });

    return refund;
};

const getPayPalCaptureId = (captureResult = {}) => {
    const directId = captureResult?.id || captureResult?.result?.id;
    const nestedCaptureId = captureResult?.result?.purchaseUnits?.[0]?.payments?.captures?.[0]?.id
        || captureResult?.result?.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    return nestedCaptureId || directId || null;
};

export const executeGatewayRefundForPayment = async (payment = {}) => {
    const amount = toCurrency(payment.Importo || payment.importo || 0);
    if (amount <= 0) {
        throw new Error('Invalid payment amount for refund');
    }

    const metodo = String(payment.Metodo || payment.metodo || '').toLowerCase();
    const meta = parseGatewayMetadataRef(payment.Payout_Ref || payment.payout_ref || '');

    if (metodo.includes('credit')) {
        const chargeId = meta.provider === 'STRIPE' ? meta.reference : null;
        const refund = await refundStripeCharge(chargeId, amount);
        return {
            provider: 'STRIPE',
            refundReference: refund?.id || `STRIPE-REFUND-${Date.now()}`,
            refundedAmount: amount,
        };
    }

    if (metodo.includes('paypal')) {
        const captureId = meta.provider === 'PAYPAL' ? meta.reference : null;
        const refundPayload = await refundPayPalCapture(captureId, amount);
        return {
            provider: 'PAYPAL',
            refundReference: refundPayload?.id || `PAYPAL-REFUND-${Date.now()}`,
            refundedAmount: amount,
        };
    }

    throw new Error(`Unsupported payment method for gateway refund: ${payment.Metodo || payment.metodo || 'unknown'}`);
};

const processMentorPayout = async ({ paymentId, mentorUserId, mentorIban, grossAmount, gatewayProvider = null, gatewayReference = null }) => {
    if (!mentorIban) {
        throw new Error('Mentor payout IBAN missing');
    }

    const normalizedIban = mentorIban.replace(/\s+/g, '').toUpperCase();
    const { gross, feeAmount, mentorNet } = computeBreakdown(grossAmount);
    const payoutReference = `PAYOUT-${paymentId}-${Date.now()}`;
    const payoutMetaRef = buildGatewayMetadataRef({
        gatewayProvider,
        gatewayReference,
        payoutReference,
    });

    const updatedPayment = await Payment.markMentorPayout(paymentId, {
        ibanMentor: normalizedIban,
        platformFeePercent: PLATFORM_FEE_PERCENT,
        platformFeeAmount: feeAmount,
        mentorNetAmount: mentorNet,
        payoutProvider: 'BANK_TRANSFER',
        payoutReference: payoutMetaRef || payoutReference,
        payoutStatus: 'Completed',
    });

    try {
        await NotificationService.notifyMentorPayout(
            mentorUserId,
            mentorNet,
            gross,
            feeAmount,
            maskIban(normalizedIban)
        );
    } catch (notificationError) {
        console.warn('Payout notification failed, payment remains successful:', notificationError.message);
    }

    return { updatedPayment, feeAmount, mentorNet, gross };
};

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
        res.status(500).json({ success: false, message: 'Error fetching payment history' });
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
        res.status(500).json({ success: false, message: 'Error fetching total earnings' });
    }
};

// Effettua un pagamento con carta (Stripe)
export const payWithCard = async (req, res) => {
    let paymentRecord;
    try {
        const { prenotazioneId, tokenStripe } = req.body;
        const userId = req.user.id; // Dal JWT
        
        // 1. Ottieni dettagli prenotazione
        const appointment = await Appointment.getByIdMentor(prenotazioneId);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        // 2. Calcola importo (tariffa mentor × durata appuntamento)
        const mentor = await Mentor.getById(appointment.Id_Mentor);
        const durationMinutes = getDurationMinutesFromAppointment(appointment);
        const importo = computeAmountByDuration(mentor.Prezzo, durationMinutes);

        if (importo > 0 && !mentor.IBAN) {
            return res.status(400).json({ success: false, error: 'Mentor has no IBAN configured for payouts' });
        }
        
        // 3. Crea record pagamento nel DB
        paymentRecord = await Payment.create(prenotazioneId, importo, 'Credit Card', new Date());
        
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
        
        // 7. Payout mentor + notifica
        const payoutResult = await processMentorPayout({
            paymentId: paymentRecord.Id,
            mentorUserId: appointment.Id_Mentor,
            mentorIban: mentor.IBAN,
            grossAmount: importo,
            gatewayProvider: 'STRIPE',
            gatewayReference: charge.id,
        });

        try {
            await NotificationService.notifyMenteePaymentCompleted(
                appointment.Id_Mentee,
                `${mentor.Nome || ''} ${mentor.Cognome || ''}`.trim(),
                importo,
                String(appointment.Giorno || '').slice(0, 10),
                `${appointment.Ora_Inizio || ''}${appointment.Ora_Fine ? ` - ${appointment.Ora_Fine}` : ''}`.trim()
            );
        } catch (notificationError) {
            console.warn('Mentee payment notification failed, payment remains successful:', notificationError.message);
        }
        
        res.status(200).json({
            success: true,
            message: 'Payment completed',
            transactionId: charge.id,
            payout: {
                gross: payoutResult.gross,
                platformFee: payoutResult.feeAmount,
                mentorNet: payoutResult.mentorNet,
                feePercent: PLATFORM_FEE_PERCENT,
            }
        });
        
    } catch (error) {
        console.error('Errore pagamento carta:', error);
        
        // Segna pagamento come fallito se era stato creato
        /*
        if (paymentRecord?.Id) {
            await Payment.markMentorPayout(paymentRecord.Id, {
                payoutStatus: 'Failed',
                payoutProvider: 'BANK_TRANSFER',
                payoutReference: `FAILED-${Date.now()}`,
            });
        }
        */
        res.status(500).json({ 
            success: false,
            error: 'Error processing payment',
            details: error.message 
        });
    }
};

// Effettua un pagamento con PayPal
export const payWithPayPal = async (req, res) => {
    try {
        const { prenotazioneId } = req.body;
        const userId = req.user.id;
        const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

        console.log('🔵 PayPal Order Creation Request:', { prenotazioneId, userId });

        // Verifica PayPal client
        if (!ordersController) {
            console.error('❌ PayPal ordersController not configured');
            return res.status(500).json({ success: false, error: 'PayPal not configured' });
        }

        // 1. Ottieni dettagli prenotazione
        const appointment = await Appointment.getByIdMentor(prenotazioneId);
        if (!appointment) {
            console.error('❌ Appointment not found:', prenotazioneId);
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }

        const mentor = await Mentor.getById(appointment.Id_Mentor);
        const durationMinutes = getDurationMinutesFromAppointment(appointment);
        const importo = computeAmountByDuration(mentor.Prezzo, durationMinutes);

        if (importo > 0 && !mentor.IBAN) {
            return res.status(400).json({ success: false, error: 'Mentor has no IBAN configured for payouts' });
        }

        console.log('🟡 Creating PayPal order:', { mentor: mentor.Nome, importo, eurValue: importo.toFixed(2) });

        // 2. Crea ordine PayPal usando il nuovo SDK v2.2.0
        // (Save to DB only AFTER capture/confirmation)
        const order = await ordersController.createOrder({
            body: {
                intent: 'CAPTURE',
                purchaseUnits: [{
                    amount: {
                        currencyCode: 'EUR',
                        value: importo.toFixed(2)
                    }
                }],
                applicationContext: {
                    returnUrl: `${frontendBaseUrl}/pages/payment-success.html`,
                    cancelUrl: `${frontendBaseUrl}/pages/payment.html`
                }
            },
            prefer: 'return=representation'
        });

        console.log('🟢 PayPal Order Created:', { orderId: order.result.id, status: order.result.status });

        const approvalLink = order.result.links.find(link => link.rel === 'approve');
        const approvalUrl = approvalLink ? approvalLink.href : null;

        console.log('✅ Approval URL:', approvalUrl);

        // Return order data (payment saved only AFTER capture)
        res.status(200).json({
            success: true,
            orderId: order.result.id,
            approvalUrl,
            prenotazioneId,
            importo
        });

    } catch (error) {
        console.error('❌ Errore PayPal:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ success: false, error: 'Error creating PayPal order', details: error.message });
    }
};

// Conferma pagamento PayPal
export const confirmPayPalPayment = async (req, res) => {
    try {
        const { orderId, prenotazioneId } = req.body;

        console.log('🔵 PayPal Capture Request:', { orderId, prenotazioneId });

        // Verifica PayPal client
        if (!ordersController) {
            console.error('❌ PayPal ordersController not configured');
            return res.status(500).json({ success: false, error: 'PayPal not configured' });
        }

        console.log('🟡 Calling ordersController.captureOrder with orderId:', orderId);

        // Cattura l'ordine PayPal
        const capture = await ordersController.captureOrder({
            id: orderId,
            prefer: 'return=representation',
            body: {}
        });

        console.log('🟢 PayPal Capture Response:', JSON.stringify(capture, null, 2));

        if (capture.result && capture.result.status === 'COMPLETED') {
            console.log('✅ Payment COMPLETED - saving to DB');
            const appointment = await Appointment.getByIdMentor(prenotazioneId);
            if (!appointment) {
                return res.status(404).json({ success: false, error: 'Appointment not found' });
            }

            const mentor = await Mentor.getById(appointment.Id_Mentor);
            const durationMinutes = getDurationMinutesFromAppointment(appointment);
            const importo = computeAmountByDuration(mentor?.Prezzo, durationMinutes);

            if (importo > 0 && !mentor?.IBAN) {
                return res.status(400).json({ success: false, error: 'Mentor has no IBAN configured for payouts' });
            }

            // Salva il pagamento nel DB SOLO dopo la capture
            if (prenotazioneId) {
                const paymentRecord = await Payment.create(prenotazioneId, importo, 'PayPal', new Date());
                const captureId = getPayPalCaptureId(capture);
                await processMentorPayout({
                    paymentId: paymentRecord.Id,
                    mentorUserId: appointment.Id_Mentor,
                    mentorIban: mentor.IBAN,
                    grossAmount: importo,
                    gatewayProvider: 'PAYPAL',
                    gatewayReference: captureId,
                });

                try {
                    await NotificationService.notifyMenteePaymentCompleted(
                        appointment.Id_Mentee,
                        `${mentor?.Nome || ''} ${mentor?.Cognome || ''}`.trim(),
                        importo,
                        String(appointment.Giorno || '').slice(0, 10),
                        `${appointment.Ora_Inizio || ''}${appointment.Ora_Fine ? ` - ${appointment.Ora_Fine}` : ''}`.trim()
                    );
                } catch (notificationError) {
                    console.warn('Mentee payment notification failed, payment remains successful:', notificationError.message);
                }

                console.log('✅ Payment saved to DB:', { prenotazioneId, importo });
            }

            return res.status(200).json({
                success: true,
                message: 'Payment completed'
            });
        }

        console.error('❌ Payment not completed. Status:', capture.result?.status);
        res.status(400).json({
            success: false,
            message: `Payment not completed. Status: ${capture.result?.status}`
        });

    } catch (error) {
        console.error('Errore conferma PayPal:', error);
        res.status(500).json({ success: false, error: 'Error capturing PayPal order' });
    }
};
