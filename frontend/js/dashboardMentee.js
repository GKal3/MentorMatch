// Script per la dashboard del mentee
document.addEventListener('DOMContentLoaded', () => {
    // Verifica autenticazione
    if (!requireAuth()) return;
    
    // Verifica che sia un mentee
    if (!requireRole('mentee')) return;
    
    // Aggiorna i link della chat con l'userId
    updateChatLinks();
    
    // Carica i dati della dashboard
    loadDashboardData();
});

function updateChatLinks() {
    const user = getCurrentUser();
    if (!user || !user.id) return;
    
    // Trova tutti i link a chat.html e aggiungi l'userId
    const chatLinks = document.querySelectorAll('a[href="chat.html"]');
    chatLinks.forEach(link => {
        link.href = `chat.html?userId=${user.id}`;
    });
}

async function loadDashboardData() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    
    console.log('User ID:', user.id);
    console.log('Token:', token);
    
    try {
        // Carica dati personali del mentee
        const response = await fetch(`http://localhost:3000/api/mentee/area`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Errore dalla API:', errorData);
            throw new Error('Errore nel caricamento dei dati personali');
        }
        
        const result = await response.json();
        console.log('Dati mentee ricevuti:', result);
        
        if (result.success && result.data) {
            updatePersonalInfo(result.data);
        }
        
    } catch (error) {
        console.error('Errore nel caricamento della dashboard:', error);
        alert('Impossibile caricare i dati della dashboard. Controlla la console per dettagli.');
    }
}

function updatePersonalInfo(data) {
    const profilo = data.profilo;
    const stats = data.statistiche;
    
    // Aggiorna nome nel saluto
    const greetingElement = document.getElementById('greeting');
    if (greetingElement && profilo) {
        greetingElement.textContent = `Welcome, ${profilo.Nome || 'Mentee'}!`;
    }
    
    // Aggiorna statistiche se disponibili
    if (stats) {
        const activeMentorsEl = document.getElementById('active-mentors');
        if (activeMentorsEl && stats.active_mentors !== undefined) {
            activeMentorsEl.textContent = stats.active_mentors;
        }
        
        const sessionsCompletedEl = document.getElementById('sessions-completed');
        if (sessionsCompletedEl && stats.sessions_completed !== undefined) {
            sessionsCompletedEl.textContent = stats.sessions_completed;
        }
        
        const upcomingSessionsEl = document.getElementById('upcoming-sessions');
        if (upcomingSessionsEl && stats.upcoming_sessions !== undefined) {
            upcomingSessionsEl.textContent = stats.upcoming_sessions;
        }
        
        const learningTimeEl = document.getElementById('learning-time');
        if (learningTimeEl && stats.total_hours !== undefined) {
            learningTimeEl.textContent = `${stats.total_hours}h`;
        }
    }
}
