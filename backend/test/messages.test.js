import { jest } from '@jest/globals';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

jest.unstable_mockModule('../models/Message.js', () => ({
  default: {
    create: jest.fn(),
    getConversation: jest.fn(),
    getAllChats: jest.fn(),
    markAsRead: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    getById: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Notification.js', () => ({
  default: {
    create: jest.fn(),
  },
}));

const { default: app } = await import('../app.js');
const { default: Message } = await import('../models/Message.js');
const { default: User } = await import('../models/User.js');
const { default: Notification } = await import('../models/Notification.js');
const { GeneraJWT } = await import('../middleware/auth.js');

describe('Message routes', () => {
  let userToken;

  beforeAll(() => {
    userToken = GeneraJWT({ id: 1, mail: 'user@test.com', ruolo: 'Mentor' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/messages/send', () => {
    test('should send message successfully', async () => {
      User.getById.mockResolvedValue({
        Id: 1,
        Nome: 'Test',
        Cognome: 'User',
      });
      
      Notification.create.mockResolvedValue({ Id: 1 });
      
      Message.create.mockResolvedValue({
        Id: 1,
        Id_Mittente: 1,
        Id_Destinatario: 2,
        Testo: 'Hello!',
        Data_Invio: new Date(),
      });

      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          receiverId: 2,
          content: 'Hello!',
        });

      expect(res.status).toBe(201);
      expect(res.body.Id).toBe(1);
      expect(res.body.Testo).toBe('Hello!');
    });

    test('should fail without recipient', async () => {
      User.getById.mockResolvedValue({ Id: 1, Nome: 'Test', Cognome: 'User' });
      Notification.create.mockResolvedValue({ Id: 1 });
      Message.create.mockRejectedValue(new Error('Missing receiverId'));
      
      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Hello!',
        });

      expect(res.status).toBe(500);
    });

    test('should fail without message text', async () => {
      User.getById.mockResolvedValue({ Id: 1, Nome: 'Test', Cognome: 'User' });
      Notification.create.mockResolvedValue({ Id: 1 });
      Message.create.mockRejectedValue(new Error('Missing content'));
      
      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          receiverId: 2,
        });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/messages/conversation/:userId1/:userId2', () => {
    test('should return conversation between two users', async () => {
      Message.getConversation.mockResolvedValue([
        {
          Id: 1,
          Id_Mittente: 1,
          Id_Destinatario: 2,
          Testo: 'Hi!',
          Data_Invio: '2026-02-10T10:00:00',
          Letto: true,
        },
        {
          Id: 2,
          Id_Mittente: 2,
          Id_Destinatario: 1,
          Testo: 'Hello!',
          Data_Invio: '2026-02-10T10:05:00',
          Letto: false,
        },
      ]);

      const res = await request(app)
        .get('/api/messages/conversation/1/2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    test('should return empty array if no messages', async () => {
      Message.getConversation.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/messages/conversation/1/999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('GET /api/messages/chats/:userId', () => {
    test('should return all chats for user', async () => {
      Message.getAllChats.mockResolvedValue([
        {
          other_user_id: 2,
          other_user_name: 'Anna Verdi',
          last_message: 'Hi there!',
          last_message_time: '2026-02-10T10:00:00',
          unread_count: 3,
        },
        {
          other_user_id: 3,
          other_user_name: 'Marco Rossi',
          last_message: 'Thanks!',
          last_message_time: '2026-02-09T15:30:00',
          unread_count: 0,
        },
      ]);

      const res = await request(app)
        .get('/api/messages/chats/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].unread_count).toBe(3);
    });

    test('should return empty array if no chats', async () => {
      Message.getAllChats.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/messages/chats/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('Authentication', () => {
    test('should require authentication for all routes', async () => {
      const res = await request(app).post('/api/messages/send').send({
        id_destinatario: 2,
        testo: 'Test',
      });

      expect(res.status).toBe(401);
    });
  });
});
