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
    const oggetto = 'Benvenuto su MentorMatch!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .button { background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Benvenuto su MentorMatch!</h1>
          </div>
          <div class="content">
            <h2>Ciao ${nome},</h2>
            <p>Siamo felici di averti con noi come <strong>${ruolo}</strong>!</p>
            <p>MentorMatch è la piattaforma che connette professionisti esperti con giovani talenti in cerca di orientamento.</p>
            ${ruolo === 'Mentor' ? `
              <p><strong>Come Mentor puoi:</strong></p>
              <ul>
                <li>Gestire la tua disponibilità</li>
                <li>Ricevere prenotazioni dai mentee</li>
                <li>Condividere la tua esperienza</li>
              </ul>
            ` : `
              <p><strong>Come Mentee puoi:</strong></p>
              <ul>
                <li>Cercare mentor nel tuo settore</li>
                <li>Prenotare sessioni di mentoring</li>
                <li>Crescere professionalmente</li>
              </ul>
            `}
            <a href="#" class="button">Vai alla Dashboard</a>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }

  // Email notifica nuova prenotazione
  static async inviaEmailNuovaPrenotazione(destinatario, nomeMentor, nomeMentee, data, ora) {
    const oggetto = 'Nuova Prenotazione Ricevuta';
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>📅 Nuova Prenotazione</h2>
          <p>Ciao ${nomeMentor},</p>
          <p>Hai ricevuto una nuova richiesta di prenotazione da <strong>${nomeMentee}</strong>.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Data:</strong> ${data}</p>
            <p><strong>Ora:</strong> ${ora}</p>
          </div>
          <p>Accedi alla tua dashboard per confermare o gestire l'appuntamento.</p>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }

  // Email conferma prenotazione
  static async inviaEmailConfermaPrenotazione(destinatario, nomeMentee, nomeMentor, data, ora, link) {
    const oggetto = 'Prenotazione Confermata';
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>✅ Prenotazione Confermata</h2>
          <p>Ciao ${nomeMentee},</p>
          <p>La tua prenotazione con <strong>${nomeMentor}</strong> è stata confermata!</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Data:</strong> ${data}</p>
            <p><strong>Ora:</strong> ${ora}</p>
            ${link ? `<p><strong>Link Meeting:</strong> <a href="${link}">${link}</a></p>` : ''}
          </div>
          <p>Ti aspettiamo!</p>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }

  // Email annullamento prenotazione
  static async inviaEmailAnnullamento(destinatario, nome, motivazione = '') {
    const oggetto = 'Prenotazione Annullata';
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>❌ Prenotazione Annullata</h2>
          <p>Ciao ${nome},</p>
          <p>La tua prenotazione è stata annullata.</p>
          ${motivazione ? `<p><strong>Motivazione:</strong> ${motivazione}</p>` : ''}
          <p>Puoi effettuare una nuova prenotazione quando preferisci.</p>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }

  // Email nuova recensione
  static async inviaEmailNuovaRecensione(destinatario, nomeMentor, nomeMentee, voto) {
    const oggetto = 'Nuova Recensione Ricevuta';
    const stelle = '⭐'.repeat(voto);
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>⭐ Nuova Recensione</h2>
          <p>Ciao ${nomeMentor},</p>
          <p>Hai ricevuto una nuova recensione da <strong>${nomeMentee}</strong>!</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="font-size: 24px;">${stelle}</p>
            <p><strong>Voto:</strong> ${voto}/5</p>
          </div>
          <p>Accedi alla dashboard per visualizzare il commento completo.</p>
        </div>
      </body>
      </html>
    `;

    return await this.SpedMail(destinatario, oggetto, html);
  }
}

export default EmailService;