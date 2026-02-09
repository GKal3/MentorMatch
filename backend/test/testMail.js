import '../config/env.js';
import transporter from '../config/email.js';

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: 'giuliakalemi@gmail.com',  // sostituisci con un’email di prova
  subject: 'Test invio email con Nodemailer',
  text: 'Ciao! Questa è una mail di test inviata con Nodemailer.',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ Errore invio email:', error);
  } else {
    console.log('✅ Email inviata:', info.response);
  }
});