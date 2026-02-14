import { jest } from '@jest/globals';

// Mock nodemailer transporter
const mockSendMail = jest.fn();
jest.unstable_mockModule('../config/email.js', () => ({
  default: {
    sendMail: mockSendMail,
  },
}));

const { default: EmailService } = await import('../utils/emailService.js');

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SpedMail', () => {
    test('should send email successfully', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-123' });

      const result = await EmailService.SpedMail(
        'test@example.com',
        'Test Subject',
        '<p>Test HTML</p>',
        'Test text'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-123');
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    test('should handle email sending errors', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await EmailService.SpedMail(
        'test@example.com',
        'Test',
        '<p>Test</p>'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP error');
    });
  });

  describe('inviaEmailBenvenuto', () => {
    test('should send welcome email for Mentor', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'welcome-123' });

      const result = await EmailService.inviaEmailBenvenuto(
        'mentor@test.com',
        'Marco',
        'Mentor'
      );

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('mentor@test.com');
      expect(callArgs.subject).toBe('Welcome to MentorMatch!');
      expect(callArgs.html).toContain('Marco');
      expect(callArgs.html).toContain('Mentor');
    });

    test('should send welcome email for Mentee', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'welcome-456' });

      const result = await EmailService.inviaEmailBenvenuto(
        'mentee@test.com',
        'Anna',
        'Mentee'
      );

      expect(result.success).toBe(true);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Anna');
      expect(callArgs.html).toContain('Mentee');
    });
  });

  describe('inviaEmailNuovaPrenotazione', () => {
    test('should send booking notification email', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'booking-123' });

      const result = await EmailService.inviaEmailNuovaPrenotazione(
        'mentor@test.com',
        'Marco Rossi',
        'Anna Verdi',
        '15 Marzo 2026',
        '10:00'
      );

      expect(result.success).toBe(true);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.subject).toBe('New Booking Request');
      expect(callArgs.html).toContain('Marco Rossi');
      expect(callArgs.html).toContain('Anna Verdi');
      expect(callArgs.html).toContain('15 Marzo 2026');
      expect(callArgs.html).toContain('10:00');
    });
  });

  describe('inviaEmailConfermaPrenotazione', () => {
    test('should send confirmation email with meeting link', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'confirm-123' });

      const result = await EmailService.inviaEmailConfermaPrenotazione(
        'mentee@test.com',
        'Anna Verdi',
        'Marco Rossi',
        '15 Marzo 2026',
        '10:00',
        'https://meet.example.com/abc123'
      );

      expect(result.success).toBe(true);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.subject).toBe('Booking Confirmed');
      expect(callArgs.html).toContain('https://meet.example.com/abc123');
    });

    test('should send confirmation email without meeting link', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'confirm-456' });

      const result = await EmailService.inviaEmailConfermaPrenotazione(
        'mentee@test.com',
        'Anna',
        'Marco',
        '15 Marzo 2026',
        '10:00',
        null
      );

      expect(result.success).toBe(true);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).not.toContain('Meeting Link');
    });
  });

  describe('inviaEmailAnnullamento', () => {
    test('should send cancellation email with reason', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'cancel-123' });

      const result = await EmailService.inviaEmailAnnullamento(
        'user@test.com',
        'Anna',
        'Imprevisto personale'
      );

      expect(result.success).toBe(true);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.subject).toBe('Booking Canceled');
      expect(callArgs.html).toContain('Imprevisto personale');
    });

    test('should send cancellation email without reason', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'cancel-456' });

      const result = await EmailService.inviaEmailAnnullamento(
        'user@test.com',
        'Anna'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('inviaEmailNuovaRecensione', () => {
    test('should send review notification email', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'review-123' });

      const result = await EmailService.inviaEmailNuovaRecensione(
        'mentor@test.com',
        'Marco Rossi',
        'Anna Verdi',
        5
      );

      expect(result.success).toBe(true);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.subject).toBe('New Review Received');
      expect(callArgs.html).toContain('Anna Verdi');
      expect(callArgs.html).toContain('5/5');
      expect(callArgs.html).toContain('⭐⭐⭐⭐⭐');
    });

    test('should handle different star ratings', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'review-456' });

      await EmailService.inviaEmailNuovaRecensione(
        'mentor@test.com',
        'Marco',
        'Anna',
        3
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('⭐⭐⭐');
      expect(callArgs.html).toContain('3/5');
    });
  });
});
