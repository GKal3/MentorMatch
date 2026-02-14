import nodemailer from 'nodemailer';
import dns from 'node:dns';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Debug: controlla se legge le variabili
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'OK' : 'MISSING');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'OK' : 'MISSING');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  connectionTimeout: 5000,
  family: 4,
  tls: {
    servername: process.env.EMAIL_HOST,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Errore configurazione email:', error);
  } else {
    console.log('✅ Server email pronto per inviare messaggi');
  }
});

export default transporter;
