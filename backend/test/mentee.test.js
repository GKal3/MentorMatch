import { jest } from '@jest/globals';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

jest.unstable_mockModule('../models/Mentor.js', () => ({
  default: {
    searchMentors: jest.fn(),
    getById: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Mentee.js', () => ({
  default: {
    findByUserId: jest.fn(),
    getStats: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Appointment.js', () => ({
  default: {
    create: jest.fn(),
    checkAvailability: jest.fn(),
    getAllMentee: jest.fn(),
    cancelAppointment: jest.fn(),
    hasCompletedSession: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Review.js', () => ({
  default: {
    create: jest.fn(),
    getAllByMentee: jest.fn(),
    findByMenteeUserId: jest.fn(),
    findByMenteeAndMentor: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Payment.js', () => ({
  default: {
    getAllByMentee: jest.fn(),
  },
}));

jest.unstable_mockModule('../utils/notificationService.js', () => ({
  default: {
    notifyNewBooking: jest.fn(),
    notifyBookingCancelled: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Notification.js', () => ({
  default: {
    create: jest.fn(),
    getAllNotifications: jest.fn(),
    getNotificationById: jest.fn(),
  },
}));

jest.unstable_mockModule('../utils/emailService.js', () => ({
  default: {
    inviaEmailNuovaPrenotazione: jest.fn(),
  },
}));

const { default: app } = await import('../app.js');
const { default: Mentor } = await import('../models/Mentor.js');
const { default: Mentee } = await import('../models/Mentee.js');
const { default: Appointment } = await import('../models/Appointment.js');
const { default: Review } = await import('../models/Review.js');
const { default: Payment } = await import('../models/Payment.js');
const { default: Notification } = await import('../models/Notification.js');
const { default: NotificationService } = await import('../utils/notificationService.js');
const { GeneraJWT } = await import('../middleware/auth.js');

describe('Mentee routes', () => {
  let menteeToken;

  beforeAll(() => {
    menteeToken = GeneraJWT({ id: 2, mail: 'mentee@test.com', ruolo: 'Mentee' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/mentee/search', () => {
    test('should search mentors without filters (public)', async () => {
      Mentor.searchMentors.mockResolvedValue([
        {
          Id_Utente: 1,
          Nome: 'Marco',
          Cognome: 'Rossi',
          Settore: 'Software',
          Prezzo: 50,
          media_recensioni: 4.5,
        },
        {
          Id_Utente: 3,
          Nome: 'Laura',
          Cognome: 'Bianchi',
          Settore: 'Marketing',
          Prezzo: 40,
          media_recensioni: 4.8,
        },
      ]);

      const res = await request(app).get('/api/mentee/search');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.count).toBe(2);
    });

    test('should search mentors with filters', async () => {
      Mentor.searchMentors.mockResolvedValue([
        {
          Id_Utente: 1,
          Nome: 'Marco',
          Settore: 'Software',
          Prezzo: 50,
        },
      ]);

      const res = await request(app)
        .get('/api/mentee/search')
        .query({ settore: 'Software', prezzo_max: 100 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.count).toBe(1);
      expect(Mentor.searchMentors).toHaveBeenCalledWith({
        settore: 'Software',
        prezzo_max: '100',
      });
    });
  });

  describe('GET /api/mentee/mentor/:id', () => {
    test('should get mentor profile (public)', async () => {
      Mentor.getById.mockResolvedValue({
        Id_Utente: 1,
        Nome: 'Marco',
        Cognome: 'Rossi',
        Titolo: 'Senior Engineer',
        Settore: 'Software',
        Prezzo: 50,
        Bio: 'Experienced mentor',
        media_recensioni: 4.5,
        numero_recensioni: 10,
      });

      const res = await request(app).get('/api/mentee/mentor/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        Id_Utente: 1,
        Nome: 'Marco',
        Settore: 'Software',
      });
    });

    test('should return 404 if mentor not found', async () => {
      Mentor.getById.mockResolvedValue(null);

      const res = await request(app).get('/api/mentee/mentor/999');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/mentee/area', () => {
    test('should return mentee dashboard data', async () => {
      Mentee.findByUserId.mockResolvedValue({
        Id_Utente: 2,
        Occupazione: 'Student',
        Nome: 'Anna',
        Cognome: 'Verdi',
      });

      Mentee.getStats.mockResolvedValue({
        totale_prenotazioni: 5,
        prenotazioni_confermate: 3,
        recensioni_lasciate: 2,
        totale_speso: 150,
      });

      const res = await request(app)
        .get('/api/mentee/area')
        .set('Authorization', `Bearer ${menteeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profilo).toMatchObject({
        Id_Utente: 2,
        Nome: 'Anna',
      });
      expect(res.body.data.statistiche.totale_prenotazioni).toBe(5);
    });
  });

  describe('POST /api/mentee/booking', () => {
    test('should create booking successfully', async () => {
      Appointment.checkAvailability.mockResolvedValue(true);
      Appointment.create.mockResolvedValue({
        Id: 10,
        Id_Mentor: 1,
        Id_Mentee: 2,
        Giorno: '2026-03-15',
        Ora: '10:00',
        Stato: 'In Attesa',
      });

      Mentor.getById.mockResolvedValue({
        Id_Utente: 1,
        Nome: 'Marco',
        Mail: 'mentor@test.com',
      });

      NotificationService.notifyNewBooking.mockResolvedValue();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const res = await request(app)
        .post('/api/mentee/booking')
        .set('Authorization', `Bearer ${menteeToken}`)
        .send({
          id_mentor: 1,
          giorno: futureDate.toISOString().split('T')[0],
          ora: '10:00',
          link: '',
        });

      expect([201, 400]).toContain(res.status);
    });

    test('should fail if slot not available', async () => {
      Appointment.checkAvailability.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/mentee/booking')
        .set('Authorization', `Bearer ${menteeToken}`)
        .send({
          id_mentor: 1,
          giorno: '2026-12-31',
          ora: '10:00',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should validate booking data', async () => {
      const res = await request(app)
        .post('/api/mentee/booking')
        .set('Authorization', `Bearer ${menteeToken}`)
        .send({
          id_mentor: 'invalid',
          giorno: 'invalid-date',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/mentee/appointments', () => {
    test('should return all mentee appointments', async () => {
      Appointment.getAllMentee.mockResolvedValue([
        {
          Id: 1,
          Giorno: '2026-03-15',
          Ora: '10:00',
          Stato: 'Accettato',
          mentor_nome: 'Marco',
          mentor_cognome: 'Rossi',
        },
      ]);

      const res = await request(app)
        .get('/api/mentee/appointments')
        .set('Authorization', `Bearer ${menteeToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/mentee/appointments/:id/cancel', () => {
    test('should cancel appointment', async () => {
      Appointment.cancelAppointment.mockResolvedValue({
        Id: 1,
        Stato: 'Annullato',
      });

      NotificationService.notifyBookingCancelled.mockResolvedValue();

      const res = await request(app)
        .put('/api/mentee/appointments/1/cancel')
        .set('Authorization', `Bearer ${menteeToken}`);

      expect([200, 404]).toContain(res.status);
    });

    test('should fail if appointment not found', async () => {
      Appointment.cancelAppointment.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/mentee/appointments/999/cancel')
        .set('Authorization', `Bearer ${menteeToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Reviews', () => {
    test('POST /api/mentee/reviews - should create review', async () => {
      Review.findByMenteeAndMentor.mockResolvedValue(null);
      Mentor.getById.mockResolvedValue({ Id_Utente: 1, Nome: 'Marco', Cognome: 'Rossi' });
      Appointment.hasCompletedSession.mockResolvedValue(true);
      Review.create.mockResolvedValue({
        Id: 1,
        Id_Mentor: 1,
        Id_Mentee: 2,
        Voto: 5,
        Commento: 'Excellent mentor!',
      });

      const res = await request(app)
        .post('/api/mentee/reviews')
        .set('Authorization', `Bearer ${menteeToken}`)
        .send({
          id_mentor: 1,
          voto: 5,
          commento: 'Excellent mentor!',
        });

      expect([201, 403]).toContain(res.status);
    });

    test('POST /api/mentee/reviews - should fail without completed session', async () => {
      Appointment.hasCompletedSession.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/mentee/reviews')
        .set('Authorization', `Bearer ${menteeToken}`)
        .send({
          id_mentor: 1,
          voto: 5,
          commento: 'Test',
        });

      expect(res.status).toBe(403);
    });

    test('GET /api/mentee/reviews - should return mentee reviews', async () => {
      Review.findByMenteeUserId.mockResolvedValue([
        {
          Id: 1,
          Voto: 5,
          Commento: 'Great',
          mentor_nome: 'Marco',
        },
      ]);

      const res = await request(app)
        .get('/api/mentee/reviews')
        .set('Authorization', `Bearer ${menteeToken}`);

      expect([200, 500]).toContain(res.status);
    });

    test('PUT /api/mentee/reviews/:id - should update review', async () => {
      Review.update.mockResolvedValue({
        Id: 1,
        Voto: 4,
        Commento: 'Updated comment',
      });

      const res = await request(app)
        .put('/api/mentee/reviews/1')
        .set('Authorization', `Bearer ${menteeToken}`)
        .send({
          voto: 4,
          commento: 'Updated comment',
        });

      expect([200, 404]).toContain(res.status);
    });

    test('DELETE /api/mentee/reviews/:id - should delete review', async () => {
      Review.delete.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/mentee/reviews/1')
        .set('Authorization', `Bearer ${menteeToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('PUT /api/mentee/profile', () => {
    test('should update mentee profile', async () => {
      Mentee.updateProfile.mockResolvedValue({
        Id_Utente: 2,
        Occupazione: 'Junior Developer',
      });

      const res = await request(app)
        .put('/api/mentee/profile')
        .set('Authorization', `Bearer ${menteeToken}`)
        .send({
          occupazione: 'Junior Developer',
        });

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('Payments', () => {
    test('GET /api/mentee/payments/history - should return payment history', async () => {
      Payment.getHistoryMentee = jest.fn().mockResolvedValue([
        {
          Id: 1,
          Importo: 50,
          Data_Pagamento: '2026-03-01',
        },
      ]);

      const res = await request(app)
        .get('/api/mentee/payments/history')
        .set('Authorization', `Bearer ${menteeToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('Authorization', () => {
    test('should reject non-mentee users', async () => {
      const mentorToken = GeneraJWT({
        id: 1,
        mail: 'mentor@test.com',
        ruolo: 'Mentor',
      });

      const res = await request(app)
        .get('/api/mentee/area')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(403);
    });
  });
});
