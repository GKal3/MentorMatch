import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Invia un messaggio
export const sendMessage = async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user.id; // Dal JWT (ValidaJWT middleware)
        
        const newMessage = await Message.create(senderId, receiverId, content);
        
        // Recupera informazioni del mittente per la notifica
        const sender = await User.getById(senderId);
        const senderName = sender ? `${sender.Nome} ${sender.Cognome}` : 'Utente';
        
        // Crea notifica per il destinatario
        await Notification.create(
            receiverId,
            'Nuovo Messaggio',
            'Nuovo Messaggio',
            `${senderName} ti ha inviato un messaggio`
        );
        
        res.status(201).json(newMessage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Ottieni conversazione tra due utenti
export const getConversation = async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const conversation = await Message.getConversation(userId1, userId2);
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Visualizza tutte le chat per un utente
export const getAllChats = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('getAllChats called with userId:', userId);
        const chats = await Message.getAllChats(userId);
        console.log('Chats retrieved:', chats);
        res.json(chats);
    } catch (error) {
        console.error('Error in getAllChats:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: error.message,
            details: error.toString()
        });
    }
};