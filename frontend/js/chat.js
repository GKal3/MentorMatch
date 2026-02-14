// Script per la chat/messaggistica
let currentConversationUserId = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    
    currentUser = getCurrentUser();

    renderRoleSidebar();
    
    // Imposta il link della dashboard in base al ruolo
    updateDashboardLink();
    
    // Carica le conversazioni
    loadAllChats();
    
    // Controlla se viene aperta da un appuntamento
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');
    const userCognome = urlParams.get('userCognome');
    
    // Apri direttamente la conversazione solo se c'è userName e userCognome
    // (significa che arriva da un appuntamento, non dal dashboard)
    if (userId && userName && userCognome && userId !== String(currentUser.id)) {
        // Apri direttamente la conversazione con questo utente
        setTimeout(() => {
            const initials = `${userName.charAt(0)}${userCognome.charAt(0)}`.toUpperCase();
            selectConversation(userId, userName, userCognome, initials, null);
        }, 500);
    }
    
    // Event listener per invio messaggio
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});

function renderRoleSidebar() {
    const sidebar = document.getElementById('role-sidebar');
    if (!sidebar || !currentUser) return;

    const role = (currentUser.ruolo || currentUser.role || '').toLowerCase();

    if (role === 'mentor') {
        sidebar.innerHTML = `
            <a href="dashboardMentor.html">Dashboard</a>
            <a href="avMentor.html">Availability</a>
            <a href="#" class="active">Messages</a>
            <a href="appointmentsMentor.html">Appointments</a>
            <a href="reviewsMentor.html">Reviews</a>
            <a href="earnings.html">Earnings</a>
        `;
        return;
    }

    if (role === 'mentee') {
        sidebar.innerHTML = `
            <a href="dashboardMentee.html">Dashboard</a>
            <a href="appArea.html">My Sessions</a>
            <a href="#" class="active">Messages</a>
            <a href="search.html">Find Mentors</a>
            <a href="paymentHistory.html">Payment History</a>
        `;
        return;
    }

    sidebar.style.display = 'none';
}

function updateDashboardLink() {
    const dashboardLink = document.getElementById('dashboard-link');
    if (!dashboardLink || !currentUser) {
        console.log('updateDashboardLink: Missing element or user', { dashboardLink, currentUser });
        return;
    }
    
    const role = (currentUser.ruolo || currentUser.role || '').toLowerCase();
    console.log('updateDashboardLink: User role:', role);
    
    let targetUrl = '';
    if (role === 'mentee') {
        targetUrl = '/pages/dashboardMentee.html';
    } else if (role === 'mentor') {
        targetUrl = '/pages/dashboardMentor.html';
    } else {
        console.log('updateDashboardLink: Unknown role:', role);
        return;
    }
    
    // Rimuovi event listener precedenti e aggiungi nuovo
    dashboardLink.onclick = (e) => {
        e.preventDefault();
        window.location.href = targetUrl;
    };
    
    console.log('Dashboard link configured to:', targetUrl);
}

async function loadAllChats() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    try {
        const response = await fetch(`http://localhost:3000/api/messages/chats/${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error loading chats');
        }
        
        const chats = await response.json();
        console.log('Chat caricate:', chats);
        renderConversations(chats);
        
    } catch (error) {
        console.error('Error loading chats:', error);
        document.getElementById('conversations-container').innerHTML = 
            '<p style="padding: 20px; color: #666; text-align: center;">No conversations yet</p>';
    }
}

function renderConversations(chats) {
    const container = document.getElementById('conversations-container');
    container.innerHTML = '';
    
    if (chats.length === 0) {
        container.innerHTML = '<p style="padding: 20px; color: #666; text-align: center;">No conversations yet</p>';
        return;
    }
    
    let firstElement = null;
    
    chats.forEach((chat, index) => {
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        if (index === 0) {
            conversationItem.classList.add('active');
            firstElement = conversationItem;
        }
        
        const initials = getInitials(chat.Nome, chat.Cognome);
        
        conversationItem.innerHTML = `
            <div class="conversation-avatar">${initials}</div>
            <div class="conversation-info">
                <div class="conversation-name">${chat.Nome} ${chat.Cognome}</div>
                <div class="conversation-preview">${chat.ultimo_messaggio || 'No messages yet'}</div>
            </div>
        `;
        
        conversationItem.addEventListener('click', () => {
            selectConversation(chat.Id_Utente, chat.Nome, chat.Cognome, initials, conversationItem);
        });
        
        container.appendChild(conversationItem);
    });
    
    // Seleziona automaticamente la prima conversazione
    if (chats.length > 0) {
        const firstChat = chats[0];
        selectConversation(firstChat.Id_Utente, firstChat.Nome, firstChat.Cognome, getInitials(firstChat.Nome, firstChat.Cognome), firstElement);
    }
}

function getInitials(nome, cognome) {
    return `${nome?.charAt(0) || ''}${cognome?.charAt(0) || ''}`.toUpperCase();
}

async function selectConversation(userId, nome, cognome, initials, element) {
    currentConversationUserId = userId;
    
    // Aggiorna UI conversazioni
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    if (element) {
        element.classList.add('active');
    }
    
    // Mostra header e input
    document.getElementById('chat-header').style.display = 'flex';
    document.getElementById('chat-input-area').style.display = 'flex';
    
    // Aggiorna header
    document.getElementById('header-avatar').textContent = initials;
    document.getElementById('header-name').textContent = `${nome} ${cognome}`;
    
    // Carica conversazione
    await loadConversation(currentUser.id, userId);
}

async function loadConversation(userId1, userId2) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    try {
        const response = await fetch(`http://localhost:3000/api/messages/conversation/${userId1}/${userId2}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error loading conversation');
        }
        
        const messages = await response.json();
        console.log('Messaggi caricati:', messages);
        renderMessages(messages);
        
    } catch (error) {
        console.error('Error loading conversation:', error);
        document.getElementById('messages-area').innerHTML = 
            '<p style="text-align: center; color: #666; margin-top: 100px;">Error loading messages</p>';
    }
}

function renderMessages(messages) {
    const messagesArea = document.getElementById('messages-area');
    messagesArea.innerHTML = '';
    
    if (messages.length === 0) {
        messagesArea.innerHTML = '<p style="text-align: center; color: #666; margin-top: 100px;">No messages yet. Start the conversation!</p>';
        return;
    }
    
    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        const isSent = msg.Id_Mittente === currentUser.id;
        if (isSent) {
            messageDiv.classList.add('sent');
        }
        
        const initials = isSent ? 'ME' : getInitials(msg.sender_nome, msg.sender_cognome);
        const time = new Date(msg.Data_Ora).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${initials}</div>
            <div class="message-content">
                <div class="message-bubble">
                    ${msg.Testo}
                </div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        messagesArea.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content || !currentConversationUserId) {
        return;
    }
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    try {
        const response = await fetch('http://localhost:3000/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                receiverId: currentConversationUserId,
                content: content
            })
        });
        
        if (!response.ok) {
            throw new Error('Error sending message');
        }
        
        // Svuota input
        input.value = '';
        
        // Ricarica conversazione
        await loadConversation(currentUser.id, currentConversationUserId);
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message');
    }
}
