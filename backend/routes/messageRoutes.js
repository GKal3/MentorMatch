import express from 'express';
import * as messageController from '../controllers/messageController.js';
import { ValidaJWT } from '../middleware/auth.js';

// filepath: c:\Users\giuli\Desktop\WebDev\backend\routes\messageRoutes.js

const router = express.Router();

// Tutte le route richiedono autenticazione
router.use(ValidaJWT);

// Message routes
router.post('/send', messageController.sendMessage);
router.get('/conversation/:userId1/:userId2', messageController.getConversation);
router.get('/chats/:userId', messageController.getAllChats);

export default router;