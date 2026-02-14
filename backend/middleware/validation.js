import Joi from 'joi';

const ibanPattern = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

// Schema validazione registrazione Mentor
export const validateMentorRegistration = (req, res, next) => {
  const schema = Joi.object({
    mail: Joi.string().email().max(300).required().messages({
      'string.email': 'Invalid email',
      'any.required': 'Email is required',
    }),
    nome: Joi.string().max(300).required().messages({
      'any.required': 'First name is required',
    }),
    cognome: Joi.string().max(300).required().messages({
      'any.required': 'Last name is required',
    }),
    data_nascita: Joi.date().max('now').required().messages({
      'date.max': 'Invalid date of birth',
      'any.required': 'Date of birth is required',
    }),
    genere: Joi.string().valid('M', 'F', 'Altro', 'Female', 'Male', 'Prefer not to say').required(),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    titolo: Joi.string().max(300).required(),
    organizzazione: Joi.string().max(300).required(),
    esperienza: Joi.string().valid('1-3', '3-5', '5-10', '10+').required(),
    prezzo: Joi.number().min(0).max(9999.99).default(0),
    iban: Joi.string().trim().allow('', null).custom((value, helpers) => {
      if (!value) return null;
      const normalized = value.replace(/\s+/g, '').toUpperCase();
      if (!ibanPattern.test(normalized)) {
        return helpers.error('any.invalid');
      }
      return normalized;
    }).messages({
      'any.invalid': 'Invalid IBAN format',
    }),
    accetta_commissione_piattaforma: Joi.boolean().default(false),
    settore: Joi.string().max(300).required(),
    lingua: Joi.string().max(300).required(),
    bio: Joi.string().max(256).required(),
  }).custom((value, helpers) => {
    const prezzo = Number(value.prezzo || 0);
    if (prezzo > 0 && !value.iban) {
      return helpers.error('any.custom', { message: 'IBAN is required when session price is greater than 0' });
    }
    if (prezzo > 0 && value.accetta_commissione_piattaforma !== true) {
      return helpers.error('any.custom', { message: 'You must accept platform fee when session price is greater than 0' });
    }
    return value;
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  next();
};

// Schema validazione registrazione Mentee
export const validateMenteeRegistration = (req, res, next) => {
  const schema = Joi.object({
    mail: Joi.string().email().max(300).required().messages({
      'string.email': 'Invalid email',
      'any.required': 'Email is required',
    }),
    nome: Joi.string().max(300).required(),
    cognome: Joi.string().max(300).required(),
    data_nascita: Joi.date().max('now').required(),
    genere: Joi.string().valid('M', 'F', 'Altro', 'Female', 'Male', 'Prefer not to say').required(),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
    }),
    occupazione: Joi.string().max(300).required(),
    bio: Joi.string().max(256).allow('', null),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  next();
};

// Schema validazione login
export const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    mail: Joi.string().email().required().messages({
      'string.email': 'Invalid email',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  next();
};

// Schema validazione prenotazione 
export const validateBooking = (req, res, next) => {
  const schema = Joi.object({
    id_mentor: Joi.number().integer().required().messages({
      'any.required': 'Mentor ID is required',
      'number.base': 'Mentor ID must be a number',
    }),
    giorno: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
      'string.pattern.base': 'Date must be in format YYYY-MM-DD',
      'any.required': 'Date is required',
    }),
    ora_inizio: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
      'string.pattern.base': 'Invalid start time format (HH:MM)',
      'any.required': 'Start time is required',
    }),
    ora_fine: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
      'string.pattern.base': 'Invalid end time format (HH:MM)',
      'any.required': 'End time is required',
    }),
    link: Joi.string().uri().max(300).allow('', null),
  }).custom((value, helpers) => {
    const [startH, startM] = value.ora_inizio.split(':').map(Number);
    const [endH, endM] = value.ora_fine.split(':').map(Number);
    const startMinutes = (startH * 60) + startM;
    const endMinutes = (endH * 60) + endM;

    if (endMinutes <= startMinutes) {
      return helpers.error('any.custom', { message: 'End time must be after start time' });
    }

    return value;
  });

  const { error } = schema.validate(req.body);

  if (error) {
    console.log('Validation error:', error.details[0].message);
    return res.status(400).json({
      success: false,
      message: error.details[0].context?.message || error.details[0].message,
    });
  }

  next();
};

// Schema validazione recensione
export const validateReview = (req, res, next) => {
  const schema = Joi.object({
    id_mentor: Joi.number().integer().required(),
    voto: Joi.number().integer().min(1).max(5).required().messages({
      'number.min': 'Rating must be between 1 and 5',
      'number.max': 'Rating must be between 1 and 5',
    }),
    commento: Joi.string().max(256).allow('', null),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  next();
};

// Schema validazione aggiornamento recensione
export const validateReviewUpdate = (req, res, next) => {
  const schema = Joi.object({
    voto: Joi.number().integer().min(1).max(5),
    commento: Joi.string().max(256).allow('', null),
  }).min(1);

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  next();
};

export default {
  validateMentorRegistration,
  validateMenteeRegistration,
  validateLogin,
  validateBooking,
  validateReview,
  validateReviewUpdate,
}; 