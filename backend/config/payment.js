import Stripe from 'stripe';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Client, Environment, OrdersController } = require('@paypal/paypal-server-sdk');

// Configurazione Stripe
export const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

console.log('📋 Payment Config - Stripe:', stripe ? '✅ Configured' : '❌ Not configured');

// Configurazione PayPal
const paypalClientInstance = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
    ? new Client({
        clientCredentialsAuthCredentials: {
            oAuthClientId: process.env.PAYPAL_CLIENT_ID,
            oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
        },
        environment: process.env.PAYPAL_MODE === 'live' ? Environment.Production : Environment.Sandbox,
        timeout: 10000,
    })
    : null;

console.log('📋 Payment Config - PayPal:', {
    status: paypalClientInstance ? '✅ Configured' : '❌ Not configured',
    mode: process.env.PAYPAL_MODE || 'not set',
    environment: process.env.PAYPAL_MODE === 'live' ? 'Production' : 'Sandbox',
    clientId: process.env.PAYPAL_CLIENT_ID ? `${process.env.PAYPAL_CLIENT_ID.substring(0, 10)}...` : 'missing'
});

export const paypalClient = paypalClientInstance;
export const ordersController = paypalClientInstance ? new OrdersController(paypalClientInstance) : null;