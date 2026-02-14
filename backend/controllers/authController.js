import User from '../models/User.js';
import Mentee from '../models/Mentee.js';
import Mentor from '../models/Mentor.js';
import { GeneraJWT } from '../middleware/auth.js';
import EmailService from '../utils/emailService.js';
import GoogleAuthService from '../utils/googleAuthService.js';

const normalizzaGenere = (val) => {
  if (!val) return val;
  if (val === 'M') return 'Male';
  if (val === 'F') return 'Female';
  if (val === 'Altro') return 'Prefer not to say';
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
          message: 'Invalid credentials',
        });
      }

      const isPasswordValid = await User.verifyPassword(password, user.Password);
      console.log('Password valid:', isPasswordValid); // Debug
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
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
        message: 'Login successful',
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
        message: 'Error during login',
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
        iban,
        accetta_commissione_piattaforma,
        settore,
        lingua,
        bio
      } = req.body;

      const cvPath = req.file ? `/uploads/cv/${req.file.filename}` : null;
      if (!cvPath) {
        return res.status(400).json({ success: false, message: 'Resume is required. Please upload a CV (PDF/DOC).' });
      }

      const parsedPrice = prezzo === undefined || prezzo === null || prezzo === '' ? 0 : Number(prezzo);
      const normalizedIban = typeof iban === 'string' ? iban.replace(/\s+/g, '').toUpperCase() : null;
      const genereDB = normalizzaGenere(genere);

      if (parsedPrice > 0 && !normalizedIban) {
        return res.status(400).json({ success: false, message: 'IBAN is required for paid sessions' });
      }

      if (parsedPrice > 0 && accetta_commissione_piattaforma !== true && accetta_commissione_piattaforma !== 'true') {
        return res.status(400).json({ success: false, message: 'You must accept platform fee to set a paid price' });
      }

      const existingUser = await User.getByEmail(mail);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
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
        bio,
        normalizedIban
      );

      const mentorWelcome = await EmailService.inviaEmailBenvenuto(mail, nome, 'Mentor');
      if (!mentorWelcome?.success) {
        console.warn('Welcome email failed:', mentorWelcome?.error);
      }

      const token = GeneraJWT({ id: user.Id, mail: user.Mail, ruolo: user.Ruolo });

      res.status(201).json({
        success: true,
        message: 'Mentor registration completed',
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
      res.status(500).json({ success: false, message: 'Error during mentor registration' });
    }
};

// REGISTRAZIONE MENTEE
export const RegMentee = async (req, res) => {
    try {
      const { mail, nome, cognome, data_nascita, genere, password, occupazione, bio } = req.body;

      const existingUser = await User.getByEmail(mail);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
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

      const menteeWelcome = await EmailService.inviaEmailBenvenuto(mail, nome, 'Mentee');
      if (!menteeWelcome?.success) {
        console.warn('Welcome email failed:', menteeWelcome?.error);
      }

      const token = GeneraJWT({ id: user.Id, mail: user.Mail, ruolo: user.Ruolo });

      res.status(201).json({
        success: true,
        message: 'Mentee registration completed',
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
      res.status(500).json({ success: false, message: 'Error during mentee registration' });
    }
};

// LOGOUT
export const Discon = async (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
};

export const AvviaAuthGoogle = async (_req, res) => {
  try {
    const authUrl = GoogleAuthService.getAuthUrl();
    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Errore avvio Google OAuth:', error);
    res.status(500).json({ success: false, message: 'Unable to start Google OAuth' });
  }
};

export const CallbackAuthGoogle = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Missing Google OAuth code.');
    }

    await GoogleAuthService.getAccessToken(code);

    res.send('Google Calendar collegato con successo. Puoi chiudere questa pagina.');
  } catch (error) {
    console.error('Errore callback Google OAuth:', error);
    res.status(500).send('Errore durante il collegamento Google Calendar.');
  }
};
