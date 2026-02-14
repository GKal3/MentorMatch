import transporter from '../config/email.js';

class EmailService {
  
  // Invia email generica
  static async SpedMail(destinatario, oggetto, contenutoHtml, contenutoTesto = '') {
    try {
      const mailOptions = {
        from: `"MentorMatch" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: oggetto,
        text: contenutoTesto,
        html: contenutoHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email inviata:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Errore invio email:', error);
      return { success: false, error: error.message };
    }
  }

  // Email di benvenuto
  static async inviaEmailBenvenuto(destinatario, nome, ruolo) {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const dashboardUrl = `${baseUrl}/pages/login.html`;
    const oggetto = 'Welcome to MentorMatch!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #84a59d; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .button { background-color: #84a59d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to MentorMatch!</h1>
          </div>
          <div class="content">
            <h2>Hi ${nome},</h2>
            <p>We're happy to have you with us as a <strong>${ruolo}</strong>!</p>
            <p>MentorMatch connects experienced professionals with emerging talent looking for guidance.</p>
            ${ruolo === 'Mentor' ? `
              <p><strong>As a Mentor you can:</strong></p>
              <ul>
                <li>Manage your availability</li>
                <li>Receive bookings from mentees</li>
                <li>Share your experience</li>
              </ul>
            ` : `
              <p><strong>As a Mentee you can:</strong></p>
              <ul>
                <li>Find mentors in your field</li>
                <li>Book mentoring sessions</li>
                <li>Grow professionally</li>
              </ul>
            `}
            <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }

  // Email notifica nuova prenotazione
  static async inviaEmailNuovaPrenotazione(destinatario, nomeMentor, nomeMentee, data, ora) {
    const oggetto = 'New Booking Request';
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>📅 New Booking</h2>
          <p>Hi ${nomeMentor},</p>
          <p>You received a new booking request from <strong>${nomeMentee}</strong>.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Date:</strong> ${data}</p>
            <p><strong>Time:</strong> ${ora}</p>
          </div>
          <p>Go to your dashboard to confirm or manage the appointment.</p>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }

  // Email conferma prenotazione
  static async inviaEmailConfermaPrenotazione(destinatario, nomeMentee, nomeMentor, data, ora, link) {
    const oggetto = 'Booking Confirmed';
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>✅ Booking Confirmed</h2>
          <p>Hi ${nomeMentee},</p>
          <p>Your booking with <strong>${nomeMentor}</strong> has been confirmed!</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Date:</strong> ${data}</p>
            <p><strong>Time:</strong> ${ora}</p>
            ${link ? `<p><strong>Meeting Link:</strong> <a href="${link}">${link}</a></p>` : ''}
          </div>
          <p>See you there!</p>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }

  // Email annullamento prenotazione
  static async inviaEmailAnnullamento(destinatario, nome, motivazione = '') {
    const oggetto = 'Booking Canceled';
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>❌ Booking Canceled</h2>
          <p>Hi ${nome},</p>
          <p>Your booking was canceled.</p>
          ${motivazione ? `<p><strong>Reason:</strong> ${motivazione}</p>` : ''}
          <p>You can book a new session whenever you like.</p>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }

  // Email nuova recensione
  static async inviaEmailNuovaRecensione(destinatario, nomeMentor, nomeMentee, voto) {
    const oggetto = 'New Review Received';
    const stelle = '⭐'.repeat(voto);
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>⭐ New Review</h2>
          <p>Hi ${nomeMentor},</p>
          <p>You received a new review from <strong>${nomeMentee}</strong>!</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="font-size: 24px;">${stelle}</p>
            <p><strong>Rating:</strong> ${voto}/5</p>
          </div>
          <p>Go to your dashboard to view the full comment.</p>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }

  // Email conferma cambio email
  static async inviaEmailCambioMail(destinatario, nome, newEmail, confirmUrl) {
    const oggetto = 'Confirm your new email address';
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>✅ Confirm your email</h2>
          <p>Hi ${nome},</p>
          <p>We received a request to update your email address on MentorMatch.</p>
          <p><strong>New email:</strong> ${newEmail}</p>
          <p>Please confirm the change by clicking the button below:</p>
          <p style="margin-top: 20px;">
            <a href="${confirmUrl}" style="background-color: #4F46E5; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Confirm Email</a>
          </p>
          <p>If you did not request this change, you can ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }
}

export default EmailService;