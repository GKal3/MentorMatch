import { jest } from '@jest/globals';

const {
  validateMentorRegistration,
  validateMenteeRegistration,
  validateLogin,
  validateBooking,
  validateReview,
  validateReviewUpdate,
} = await import('../middleware/validation.js');

describe('Validation middleware', () => {
  describe('validateLogin', () => {
    test('should pass with valid credentials', () => {
      const req = {
        body: {
          mail: 'test@example.com',
          password: 'Password123',
        },
      };
      const res = {};
      const next = jest.fn();

      validateLogin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should fail with invalid email', () => {
      const req = {
        body: {
          mail: 'invalid-email',
          password: 'Password123',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/email/i),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with missing password', () => {
      const req = {
        body: {
          mail: 'test@example.com',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateMenteeRegistration', () => {
    const validMenteeData = {
      mail: 'mentee@test.com',
      nome: 'Anna',
      cognome: 'Rossi',
      data_nascita: '2000-01-01',
      genere: 'F',
      password: 'Password123',
      occupazione: 'Student',
      bio: '',
    };

    test('should pass with valid mentee data', () => {
      const req = { body: validMenteeData };
      const res = {};
      const next = jest.fn();

      validateMenteeRegistration(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should fail with short password', () => {
      const req = {
        body: { ...validMenteeData, password: 'short' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateMenteeRegistration(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/8\s+characters/i),
        })
      );
    });

    test('should fail with future birth date', () => {
      const req = {
        body: { ...validMenteeData, data_nascita: '2030-01-01' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateMenteeRegistration(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should allow empty bio', () => {
      const req = {
        body: { ...validMenteeData, bio: '' },
      };
      const res = {};
      const next = jest.fn();

      validateMenteeRegistration(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateMentorRegistration', () => {
    const validMentorData = {
      mail: 'mentor@test.com',
      nome: 'Marco',
      cognome: 'Bianchi',
      data_nascita: '1985-05-12',
      genere: 'M',
      password: 'Password123',
      titolo: 'Senior Engineer',
      organizzazione: 'Tech Co',
      esperienza: '5-10',
      prezzo: 50,
      iban: 'IT60X0542811101000000123456',
      accetta_commissione_piattaforma: true,
      settore: 'Software',
      lingua: 'Italiano',
      bio: 'Experienced mentor',
    };

    test('should pass with valid mentor data', () => {
      const req = { body: validMentorData };
      const res = {};
      const next = jest.fn();

      validateMentorRegistration(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should fail with invalid experience range', () => {
      const req = {
        body: { ...validMentorData, esperienza: 'invalid' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateMentorRegistration(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should allow zero price', () => {
      const req = {
        body: { ...validMentorData, prezzo: 0 },
      };
      const res = {};
      const next = jest.fn();

      validateMentorRegistration(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should fail with negative price', () => {
      const req = {
        body: { ...validMentorData, prezzo: -10 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateMentorRegistration(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateBooking', () => {
    test('should pass with valid booking data', () => {
      const req = {
        body: {
          id_mentor: 1,
          giorno: '2026-03-15',
          ora_inizio: '10:00',
          ora_fine: '11:00',
          link: '',
        },
      };
      const res = {};
      const next = jest.fn();

      validateBooking(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should fail when end time is before start time', () => {
      const req = {
        body: {
          id_mentor: 1,
          giorno: '2026-03-15',
          ora_inizio: '10:00',
          ora_fine: '09:30',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should fail with invalid time format', () => {
      const req = {
        body: {
          id_mentor: 1,
          giorno: '2026-03-15',
          ora_inizio: '25:99',
          ora_fine: '26:10',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should accept valid time formats', () => {
      const timePairs = [
        { ora_inizio: '09:00', ora_fine: '10:00' },
        { ora_inizio: '10:30', ora_fine: '11:15' },
        { ora_inizio: '00:00', ora_fine: '00:30' },
        { ora_inizio: '22:30', ora_fine: '23:59' },
      ];

      timePairs.forEach(({ ora_inizio, ora_fine }) => {
        const req = {
          body: {
            id_mentor: 1,
            giorno: '2026-03-15',
            ora_inizio,
            ora_fine,
          },
        };
        const res = {};
        const next = jest.fn();

        validateBooking(req, res, next);

        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe('validateReview', () => {
    test('should pass with valid review data', () => {
      const req = {
        body: {
          id_mentor: 1,
          voto: 5,
          commento: 'Excellent mentor!',
        },
      };
      const res = {};
      const next = jest.fn();

      validateReview(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should fail with rating below 1', () => {
      const req = {
        body: {
          id_mentor: 1,
          voto: 0,
          commento: 'Test',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('between 1 and 5'),
        })
      );
    });

    test('should fail with rating above 5', () => {
      const req = {
        body: {
          id_mentor: 1,
          voto: 6,
          commento: 'Test',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should allow empty comment', () => {
      const req = {
        body: {
          id_mentor: 1,
          voto: 4,
          commento: '',
        },
      };
      const res = {};
      const next = jest.fn();

      validateReview(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateReviewUpdate', () => {
    test('should pass with partial update', () => {
      const req = {
        body: {
          voto: 4,
        },
      };
      const res = {};
      const next = jest.fn();

      validateReviewUpdate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should pass with comment update only', () => {
      const req = {
        body: {
          commento: 'Updated comment',
        },
      };
      const res = {};
      const next = jest.fn();

      validateReviewUpdate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should pass with both fields', () => {
      const req = {
        body: {
          voto: 5,
          commento: 'Perfect!',
        },
      };
      const res = {};
      const next = jest.fn();

      validateReviewUpdate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should fail with empty body', () => {
      const req = {
        body: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateReviewUpdate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
