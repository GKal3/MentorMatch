import './config/env.js';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import menteeRoutes from './routes/menteeRoutes.js';
import mentorRoutes from './routes/mentorRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Serve i file statici del frontend
app.use(express.static(join(__dirname, '../frontend')));

// Route API
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/mentee', menteeRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/messages', messageRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// Serve index.html per la root
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../frontend/pages/index.html'));
});

// Serve search.html
app.get('/search.html', (req, res) => {
  res.sendFile(join(__dirname, '../frontend/pages/search.html'));
});

export default app;
