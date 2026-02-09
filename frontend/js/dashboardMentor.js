// Script per la dashboard del mentor

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    if (!requireRole('mentor')) return;
    
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
        // Carica dati personali del mentor
        const response = await fetch(`http://localhost:3000/api/mentor/personal/${user.id}`, {
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
        
        const mentorData = await response.json();
        console.log('Dati mentor ricevuti:', mentorData);
        console.log('Nome:', mentorData.nome);
        console.log('Prezzo:', mentorData.prezzo);
        updatePersonalInfo(mentorData);
        
    } catch (error) {
        console.error('Errore nel caricamento della dashboard:', error);
        alert('Impossibile caricare i dati della dashboard. Controlla la console per dettagli.');
    }
}

function updatePersonalInfo(data) {
    // Aggiorna nome nel saluto
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.textContent = `Welcome, ${data.Nome || 'Mentor'}!`;
    }
    
    // Aggiorna prezzo orario
    const priceElement = document.getElementById('price');
    if (priceElement && data.Prezzo) {
        priceElement.textContent = `€${parseFloat(data.Prezzo).toFixed(2)}/h`;
    }
    
    // Aggiorna valutazione media
    const ratingElement = document.getElementById('rating');
    if (ratingElement) {
        const rating = data.media_recensioni !== null ? parseFloat(data.media_recensioni).toFixed(1) : '0';
        ratingElement.textContent = `${rating} ⭐`;
    }
    
    // Aggiorna numero recensioni
    const reviewsElement = document.getElementById('reviews');
    if (reviewsElement) {
        reviewsElement.textContent = data.numero_recensioni || 0;
    }
}
