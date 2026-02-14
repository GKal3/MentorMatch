import nodemailer from 'nodemailer';
import dns from 'node:dns';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const hasSmtpConfig = Boolean(
  process.env.EMAIL_HOST &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASSWORD
);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 5000,
      family: 4,
      tls: {
        servername: process.env.EMAIL_HOST,
      },
    })
  : nodemailer.createTransport({ jsonTransport: true });

if (!hasSmtpConfig) {
  console.warn('⚠️ SMTP non configurato: email disabilitate (jsonTransport attivo)');
}

if (hasSmtpConfig && process.env.NODE_ENV !== 'production') {
  transporter.verify((error) => {
    if (error) {
      console.error('❌ Errore configurazione email:', error);
    } else {
      console.log('✅ Server email pronto per inviare messaggi');
    }
  });
}

export default transporter;
