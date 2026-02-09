import Stripe from 'stripe';
import paypal from '@paypal/paypal-server-sdk';

// Configurazione Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configurazione PayPal
function paypalEnvironment() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    
    if (process.env.PAYPAL_MODE === 'live') {
        return new paypal.core.LiveEnvironment(clientId, clientSecret);
    } else {
        return new paypal.core.SandboxEnvironment(clientId, clientSecret);
    }
}

export const paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment());