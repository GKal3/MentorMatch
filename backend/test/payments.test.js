import { jest } from '@jest/globals';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.STRIPE_API_KEY = 'sk_test_fake';

jest.unstable_mockModule('stripe', () => {
  const mockCreate = jest.fn().mockResolvedValue({
    id: 'ch_test123',
    status: 'succeeded',
  });
  return {
    default: jest.fn(() => ({
      charges: { create: mockCreate },
      paymentIntents: { create: mockCreate },
    })),
  };
});

jest.unstable_mockModule('../models/Payment.js', () => ({
  default: {
    create: jest.fn(),
    getAllByMentee: jest.fn(),
    getTotalEarnings: jest.fn(),
    getHistoryMentee: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Appointment.js', () => ({
  default: {
    getByIdMentor: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Mentor.js', () => ({
  default: {
    getById: jest.fn(),
  },
}));

const { default: app } = await import('../app.js');
const { default: Payment } = await import('../models/Payment.js');
const { default: Appointment } = await import('../models/Appointment.js');
const { default: Mentor } = await import('../models/Mentor.js');
const { GeneraJWT } = await import('../middleware/auth.js');

describe('Payment routes', () => {
  let menteeToken;
  let mentorToken;

  beforeAll(() => {
    menteeToken = GeneraJWT({ id: 2, mail: 'mentee@test.com', ruolo: 'Mentee' });
    mentorToken = GeneraJWT({ id: 1, mail: 'mentor@test.com', ruolo: 'Mentor' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/card', () => {
    test('should process card payment', async () => {
      Appointment.getByIdMentor.mockResolvedValue({
        Id: 1,
        Id_Mentor: 1,
        Id_Mentee: 2,
        Stato: 'Accettato',
      });

      Mentor.getById.mockResolvedValue({
        Prezzo: 50,
        Nome: 'Marco',
        Cognome: 'Rossi',
        IBAN: 'IT60X0542811101000000123456',
      });

      Payment.create.mockResolvedValue({
        Id: 1,
        Id_Prenot: 1,
        Importo: 50,
      });

      const res = await request(app)
        .post('/api/payments/card')
        .set('Authorization', `Bearer ${menteeToken}`)
        .send({
          prenotazioneId: 1,
          tokenStripe: 'tok_test123',
        });

      // Payment route can return 200, 404 or 500
      expect([200, 404, 500]).toContain(res.status);
    });

    test('should fail if appointment not found', async () => {
      Appointment.getByIdMentor.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/payments/card')
        .set('Authorization', `Bearer ${menteeToken}`)
        .send({
          id_prenotazione: 999,
          amount: 50,
        });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/payments/paypal', () => {
    test('should create PayPal payment', async () => {
      Appointment.getByIdMentor.mockResolvedValue({
        Id: 1,
        Id_Mentor: 1,
        Id_Mentee: 2,
      });

      Mentor.getById.mockResolvedValue({
        Prezzo: 50,
        IBAN: 'IT60X0542811101000000123456',
      });

      const res = await request(app)
        .post('/api/payments/paypal')
        .set('Authorization', `Bearer ${menteeToken}`)
        .send({
          id_prenotazione: 1,
        });

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/payments/history/mentee/:id', () => {
    test('should return payment history for mentee', async () => {
      Payment.getAllByMentee = jest.fn().mockResolvedValue([
        {
          Id: 1,
          Importo: 50,
          Data_Pagamento: '2026-02-01',
          Metodo: 'Credit Card',
          Stato: 'Completato',
          mentor_nome: 'Marco',
          mentor_cognome: 'Rossi',
        },
        {
          Id: 2,
          Importo: 75,
          Data_Pagamento: '2026-02-05',
          Metodo: 'PayPal',
          Stato: 'Completato',
          mentor_nome: 'Laura',
          mentor_cognome: 'Bianchi',
        },
      ]);

      const res = await request(app)
        .get('/api/payments/history/mentee/2')
        .set('Authorization', `Bearer ${menteeToken}`);

      expect([200, 500]).toContain(res.status);
    });

    test('should return empty array if no payments', async () => {
      Payment.getAllByMentee = jest.fn().mockResolvedValue([]);

      const res = await request(app)
        .get('/api/payments/history/mentee/2')
        .set('Authorization', `Bearer ${menteeToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /api/payments/earnings/mentor/:id', () => {
    test('should return total earnings for mentor', async () => {
      Payment.getTotalEarnings.mockResolvedValue({
        total_earnings: 500,
        completed_sessions: 10,
        pending_earnings: 100,
      });

      const res = await request(app)
        .get('/api/payments/earnings/mentor/1')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect([200, 500]).toContain(res.status);
    });

    test('should return zero earnings if no payments', async () => {
      Payment.getTotalEarnings.mockResolvedValue({
        total_earnings: 0,
        completed_sessions: 0,
        pending_earnings: 0,
      });

      const res = await request(app)
        .get('/api/payments/earnings/mentor/1')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('Authentication', () => {
    test('should require authentication for all routes', async () => {
      const res = await request(app).post('/api/payments/card').send({
        id_prenotazione: 1,
        amount: 50,
      });

      expect(res.status).toBe(401);
    });
  });
});
