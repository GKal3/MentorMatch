import Joi from 'joi';

// Schema validazione registrazione Mentor
export const validateMentorRegistration = (req, res, next) => {
  const schema = Joi.object({
    mail: Joi.string().email().max(300).required().messages({
      'string.email': 'Email non valida',
      'any.required': 'Email obbligatoria',
    }),
    nome: Joi.string().max(300).required().messages({
      'any.required': 'Nome obbligatorio',
    }),
    cognome: Joi.string().max(300).required().messages({
      'any.required': 'Cognome obbligatorio',
    }),
    data_nascita: Joi.date().max('now').required().messages({
      'date.max': 'Data di nascita non valida',
      'any.required': 'Data di nascita obbligatoria',
    }),
    genere: Joi.string().valid('M', 'F', 'Altro', 'Donna', 'Uomo', 'Preferisco non specificare').required(),
    password: Joi.string().min(8).required().messages({
      'string.min': 'La password deve contenere almeno 8 caratteri',
      'any.required': 'Password obbligatoria',
    }),
    titolo: Joi.string().max(300).required(),
    organizzazione: Joi.string().max(300).required(),
    esperienza: Joi.string().valid('1-3', '3-5', '5-10', '10+').required(),
    prezzo: Joi.number().min(0).max(9999.99).default(0),
    settore: Joi.string().max(300).required(),
    lingua: Joi.string().max(300).required(),
    bio: Joi.string().max(256).required(),
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
      'string.email': 'Email non valida',
      'any.required': 'Email obbligatoria',
    }),
    nome: Joi.string().max(300).required(),
    cognome: Joi.string().max(300).required(),
    data_nascita: Joi.date().max('now').required(),
    genere: Joi.string().valid('M', 'F', 'Altro', 'Donna', 'Uomo', 'Preferisco non specificare').required(),
    password: Joi.string().min(8).required().messages({
      'string.min': 'La password deve contenere almeno 8 caratteri',
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
      'string.email': 'Email non valida',
      'any.required': 'Email obbligatoria',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password obbligatoria',
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
      'any.required': 'ID Mentor obbligatorio',
      'number.base': 'ID Mentor deve essere un numero',
    }),
    giorno: Joi.date().min('now').required().messages({
      'date.min': 'La data deve essere futura',
      'any.required': 'Data obbligatoria',
    }),
    ora: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
      'string.pattern.base': 'Formato ora non valido (HH:MM)',
      'any.required': 'Ora obbligatoria',
    }),
    link: Joi.string().uri().max(300).allow('', null),
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

// Schema validazione recensione
export const validateReview = (req, res, next) => {
  const schema = Joi.object({
    id_mentor: Joi.number().integer().required(),
    voto: Joi.number().integer().min(1).max(5).required().messages({
      'number.min': 'Il voto deve essere tra 1 e 5',
      'number.max': 'Il voto deve essere tra 1 e 5',
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