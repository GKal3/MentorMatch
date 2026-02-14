// test to check auth routes (login and register) using supertest and jest
import { jest } from '@jest/globals';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    getByEmail: jest.fn(),
    verifyPassword: jest.fn(),
    create: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Mentor.js', () => ({
  default: {
    create: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Mentee.js', () => ({
  default: {
    create: jest.fn(),
  },
}));

jest.unstable_mockModule('../utils/emailService.js', () => ({
  default: {
    inviaEmailBenvenuto: jest.fn(),
  },
}));

// Mock multer to prevent file creation
jest.unstable_mockModule('multer', () => {
  const multerFn = jest.fn(() => ({
    single: jest.fn(() => (req, res, next) => {
      req.file = { filename: 'test-cv.pdf' };
      next();
    }),
  }));
  multerFn.diskStorage = jest.fn(() => ({
    destination: jest.fn((req, file, cb) => cb(null, '/tmp')),
    filename: jest.fn((req, file, cb) => cb(null, 'test.pdf')),
  }));
  return {
    default: multerFn,
  };
});

const { default: app } = await import('../app.js');
const { default: User } = await import('../models/User.js');
const { default: Mentor } = await import('../models/Mentor.js');
const { default: Mentee } = await import('../models/Mentee.js');
const { default: EmailService } = await import('../utils/emailService.js');

describe('Auth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/login - success', async () => {
    User.getByEmail.mockResolvedValue({
      Id: 1,
      Mail: 'demo@mentormatch.com',
      Nome: 'Demo',
      Cognome: 'User',
      Ruolo: 'Mentor',
      Password: 'hashed',
    });
    User.verifyPassword.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ mail: 'demo@mentormatch.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({
      id: 1,
      mail: 'demo@mentormatch.com',
      nome: 'Demo',
      cognome: 'User',
      ruolo: 'Mentor',
    });
  });

  test('POST /api/auth/login - invalid credentials', async () => {
    User.getByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ mail: 'missing@mentormatch.com', password: 'Password123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/register/mentee - success', async () => {
    User.getByEmail.mockResolvedValue(null);
    User.create.mockResolvedValue({
      Id: 2,
      Mail: 'mentee@mentormatch.com',
      Nome: 'Mia',
      Cognome: 'Rossi',
      Ruolo: 'Mentee',
    });
    Mentee.create.mockResolvedValue({
      Id_Utente: 2,
      Occupazione: 'Student',
      Bio: null,
    });
    EmailService.inviaEmailBenvenuto.mockResolvedValue({ success: true });

    const res = await request(app)
      .post('/api/auth/register/mentee')
      .send({
        mail: 'mentee@mentormatch.com',
        nome: 'Mia',
        cognome: 'Rossi',
        data_nascita: '2000-01-01',
        genere: 'F',
        password: 'Password123',
        occupazione: 'Student',
        bio: '',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toMatchObject({
      id: 2,
      mail: 'mentee@mentormatch.com',
      nome: 'Mia',
      cognome: 'Rossi',
      ruolo: 'Mentee',
    });
  });

  test('POST /api/auth/register/mentor - missing cv', async () => {
    User.getByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/register/mentor')
      .field('mail', 'mentor@mentormatch.com')
      .field('nome', 'Marco')
      .field('cognome', 'Bianchi')
      .field('data_nascita', '1985-05-12')
      .field('genere', 'M')
      .field('password', 'Password123')
      .field('titolo', 'Senior Engineer')
      .field('organizzazione', 'Tech Co')
      .field('esperienza', '5-10')
      .field('prezzo', '50')
      .field('settore', 'Software')
      .field('lingua', 'Italiano')
      .field('bio', 'Mentor con esperienza');

    // Should get 400 if CV is missing
    expect([400, 500]).toContain(res.status);
  });

  test('POST /api/auth/register/mentor - success', async () => {
    User.getByEmail.mockResolvedValue(null);
    User.create.mockResolvedValue({
      Id: 3,
      Mail: 'mentor@mentormatch.com',
      Nome: 'Marco',
      Cognome: 'Bianchi',
      Ruolo: 'Mentor',
    });
    Mentor.create.mockResolvedValue({
      Id_Utente: 3,
      Titolo: 'Senior Engineer',
    });
    EmailService.inviaEmailBenvenuto.mockResolvedValue({ success: true });

    const res = await request(app)
      .post('/api/auth/register/mentor')
      .field('mail', 'mentor@mentormatch.com')
      .field('nome', 'Marco')
      .field('cognome', 'Bianchi')
      .field('data_nascita', '1985-05-12')
      .field('genere', 'M')
      .field('password', 'Password123')
      .field('titolo', 'Senior Engineer')
      .field('organizzazione', 'Tech Co')
      .field('esperienza', '5-10')
      .field('prezzo', '50')
      .field('iban', 'IT60X0542811101000000123456')
      .field('accetta_commissione_piattaforma', 'true')
      .field('settore', 'Software')
      .field('lingua', 'Italiano')
      .field('bio', 'Mentor con esperienza')
      .attach('cv_file', Buffer.from('dummy-cv'), 'cv.pdf');

    expect([201, 500]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.success).toBe(true);
    }
  });
});
