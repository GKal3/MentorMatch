import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import EmailService from './emailService.js';

const EMAIL_CHANGE_EXPIRY = '1h';

export const requestEmailChange = async (userId, newEmail) => {
  const trimmedEmail = (newEmail || '').trim();

  if (!trimmedEmail) {
    return { requested: false };
  }

  const user = await User.getById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (trimmedEmail.toLowerCase() === (user.Mail || '').toLowerCase()) {
    return { requested: false };
  }

  const existing = await User.getByEmail(trimmedEmail);
  if (existing && existing.Id !== userId) {
    const error = new Error('Email already registered');
    error.status = 400;
    throw error;
  }

  const token = jwt.sign(
    { userId, newEmail: trimmedEmail },
    process.env.JWT_SECRET,
    { expiresIn: EMAIL_CHANGE_EXPIRY }
  );

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const confirmUrl = `${baseUrl}/api/users/email-change/confirm?token=${encodeURIComponent(token)}`;

  const emailResult = await EmailService.inviaEmailCambioMail(
    user.Mail,
    user.Nome || 'User',
    trimmedEmail,
    confirmUrl
  );

  if (!emailResult?.success) {
    const error = new Error(emailResult?.error || 'Unable to send confirmation email');
    error.status = 500;
    throw error;
  }

  return { requested: true };
};

export const confirmEmailChange = async (token) => {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const { userId, newEmail } = payload || {};

  if (!userId || !newEmail) {
    const error = new Error('Invalid token');
    error.status = 400;
    throw error;
  }

  const existing = await User.getByEmail(newEmail);
  if (existing && existing.Id !== userId) {
    const error = new Error('Email already registered');
    error.status = 409;
    throw error;
  }

  const updated = await User.updateEmail(userId, newEmail);
  if (!updated) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return updated;
};
