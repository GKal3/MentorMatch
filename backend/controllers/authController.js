import User from '../models/User.js';
import Mentee from '../models/Mentee.js';
import Mentor from '../models/Mentor.js';
import { GeneraJWT } from '../middleware/auth.js';
import EmailService from '../utils/emailService.js';

const normalizzaGenere = (val) => {
  if (!val) return val;
  if (val === 'M') return 'Uomo';
  if (val === 'F') return 'Donna';
  if (val === 'Altro') return 'Preferisco non specificare';
  return val;
};

// LOGIN
export const Accesso = async (req, res) => {
    try {
      const { mail, password } = req.body;
      console.log('Attempting login with mail:', mail); // Debug

      const user = await User.getByEmail(mail);
      console.log('User found:', user ? `${user.Mail}` : 'Not found'); // Debug
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenziali non valide',
        });
      }

      const isPasswordValid = await User.verifyPassword(password, user.Password);
      console.log('Password valid:', isPasswordValid); // Debug
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Credenziali non valide',
        });
      }

      const token = GeneraJWT({
        id: user.Id,
        mail: user.Mail,
        ruolo: user.Ruolo,
      });

      delete user.Password;

      res.json({
        success: true,
        message: 'Login effettuato con successo',
        token,
        user: {
          id: user.Id,
          mail: user.Mail,
          nome: user.Nome,
          cognome: user.Cognome,
          ruolo: user.Ruolo,
        },
      });

    } catch (error) {
      console.error('Errore login:', error);
      res.status(500).json({
        success: false,
        message: 'Errore durante il login',
      });
    }
};

// REGISTRAZIONE MENTOR
export const RegMentor = async (req, res) => {
    try {
      const {
        mail,
        nome,
        cognome,
        data_nascita,
        genere,
        password,
        titolo,
        organizzazione,
        esperienza,
        prezzo,
        settore,
        lingua,
        bio
      } = req.body;

      const cvPath = req.file ? `/uploads/cv/${req.file.filename}` : null;
      if (!cvPath) {
        return res.status(400).json({ success: false, message: 'CV obbligatorio. Carica un file CV (PDF/DOC).' });
      }

      const parsedPrice = prezzo === undefined || prezzo === null || prezzo === '' ? 0 : Number(prezzo);
      const genereDB = normalizzaGenere(genere);

      const existingUser = await User.getByEmail(mail);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email già registrata' });
      }

      const user = await User.create({
        mail,
        nome,
        cognome,
        data_nascita,
        genere: genereDB,
        password,
        ruolo: 'Mentor',
      });

      const mentor = await Mentor.create(
        user.Id,
        titolo,
        organizzazione,
        esperienza,
        cvPath,
        Number.isFinite(parsedPrice) ? parsedPrice : 0,
        settore,
        lingua,
        bio
      );

      await EmailService.inviaEmailBenvenuto(mail, nome, 'Mentor');

      const token = GeneraJWT({ id: user.Id, mail: user.Mail, ruolo: user.Ruolo });

      res.status(201).json({
        success: true,
        message: 'Registrazione mentor completata',
        token,
        user: {
          id: user.Id,
          mail: user.Mail,
          nome: user.Nome,
          cognome: user.Cognome,
          ruolo: user.Ruolo,
          mentor,
        },
      });

    } catch (error) {
      console.error('Errore registrazione mentor:', error);
      res.status(500).json({ success: false, message: 'Errore durante la registrazione mentor' });
    }
};

// REGISTRAZIONE MENTEE
export const RegMentee = async (req, res) => {
    try {
      const { mail, nome, cognome, data_nascita, genere, password, occupazione, bio } = req.body;

      const existingUser = await User.getByEmail(mail);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email già registrata' });
      }

      const genereDB = normalizzaGenere(genere);
      const user = await User.create({
        mail,
        nome,
        cognome,
        data_nascita,
        genere: genereDB,
        password,
        ruolo: 'Mentee',
      });

      const mentee = await Mentee.create({ id_utente: user.Id, occupazione, bio: bio || null });

      await EmailService.inviaEmailBenvenuto(mail, nome, 'Mentee');

      const token = GeneraJWT({ id: user.Id, mail: user.Mail, ruolo: user.Ruolo });

      res.status(201).json({
        success: true,
        message: 'Registrazione mentee completata',
        token,
        user: {
          id: user.Id,
          mail: user.Mail,
          nome: user.Nome,
          cognome: user.Cognome,
          ruolo: user.Ruolo,
          mentee,
        },
      });

    } catch (error) {
      console.error('Errore registrazione mentee:', error);
      res.status(500).json({ success: false, message: 'Errore durante la registrazione mentee' });
    }
};

// LOGOUT
export const Discon = async (req, res) => {
  res.json({
    success: true,
    message: 'Logout effettuato con successo',
  });
};
