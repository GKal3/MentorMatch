import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Genera JWT token
export const GeneraJWT = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Middleware per validare JWT
export const ValidaJWT = (req, res, next) => {
  try {
    console.log('ValidaJWT: Checking', req.method, req.path);
    // Ottieni token dall'header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('ValidaJWT: No token found');
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verifica token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Aggiungi dati utente alla request
    req.user = decoded;
    console.log('ValidaJWT: Token valid for user', decoded.id);

    next();
  } catch (error) {
    console.log('ValidaJWT: Error -', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error validating token',
    });
  }
};

// Middleware per verificare ruolo specifico
export const verificaRuolo = (...ruoliConsentiti) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!ruoliConsentiti.includes(req.user.ruolo)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
};

export default { GeneraJWT, ValidaJWT, verificaRuolo };