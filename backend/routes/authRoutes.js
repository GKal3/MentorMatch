import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';
import { Accesso, RegMentor, RegMentee, Discon, AvviaAuthGoogle, CallbackAuthGoogle } from '../controllers/authController.js';
import { 
  validateMentorRegistration, 
  validateMenteeRegistration, 
  validateLogin 
} from '../middleware/validation.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cvUploadPath = join(__dirname, '../uploads/cv');
fs.mkdirSync(cvUploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, cvUploadPath),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// POST /api/auth/login
router.post('/login', validateLogin, Accesso);

// POST /api/auth/register/mentor
router.post('/register/mentor', upload.single('cv_file'), validateMentorRegistration, RegMentor);

// POST /api/auth/register/mentee
router.post('/register/mentee', validateMenteeRegistration, RegMentee);

// POST /api/auth/logout
router.post('/logout', Discon);

// GET /api/auth/google
router.get('/google', AvviaAuthGoogle);

// GET /api/auth/google/callback
router.get('/google/callback', CallbackAuthGoogle);

export default router;