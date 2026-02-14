import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

const { GeneraJWT, ValidaJWT, verificaRuolo } = await import('../middleware/auth.js');

describe('Auth middleware', () => {
  describe('GeneraJWT', () => {
    test('should generate valid JWT token', () => {
      const payload = { id: 1, mail: 'test@test.com', ruolo: 'Mentor' };
      const token = GeneraJWT(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(1);
      expect(decoded.mail).toBe('test@test.com');
      expect(decoded.ruolo).toBe('Mentor');
    });

    test('should include expiration time', () => {
      const payload = { id: 1, mail: 'test@test.com', ruolo: 'Mentee' };
      const token = GeneraJWT(payload);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('ValidaJWT', () => {
    test('should validate correct token', () => {
      const token = GeneraJWT({ id: 1, mail: 'test@test.com', ruolo: 'Mentor' });

      const req = {
        headers: { authorization: `Bearer ${token}` },
        method: 'GET',
        path: '/test',
      };
      const res = {};
      const next = jest.fn();

      ValidaJWT(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(1);
      expect(req.user.ruolo).toBe('Mentor');
    });

    test('should reject missing token', () => {
      const req = { headers: {}, method: 'GET', path: '/test' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      ValidaJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication token missing',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid token format', () => {
      const req = {
        headers: { authorization: 'InvalidFormat' },
        method: 'GET',
        path: '/test',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      ValidaJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid token', () => {
      const req = {
        headers: { authorization: 'Bearer invalid-token' },
        method: 'GET',
        path: '/test',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      ValidaJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { id: 1, mail: 'test@test.com', ruolo: 'Mentor' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const req = {
        headers: { authorization: `Bearer ${expiredToken}` },
        method: 'GET',
        path: '/test',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      ValidaJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('verificaRuolo', () => {
    test('should allow correct role', () => {
      const req = {
        user: { id: 1, mail: 'test@test.com', ruolo: 'Mentor' },
      };
      const res = {};
      const next = jest.fn();

      const middleware = verificaRuolo('Mentor');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should allow multiple roles', () => {
      const req = {
        user: { id: 1, mail: 'test@test.com', ruolo: 'Mentee' },
      };
      const res = {};
      const next = jest.fn();

      const middleware = verificaRuolo('Mentor', 'Mentee');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject incorrect role', () => {
      const req = {
        user: { id: 1, mail: 'test@test.com', ruolo: 'Mentee' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = verificaRuolo('Mentor');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to access this resource',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject missing user', () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = verificaRuolo('Mentor');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
