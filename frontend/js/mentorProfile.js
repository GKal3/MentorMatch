// Script per visualizzare il profilo di un mentor
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.profile-container');
    
    // Leggi l'ID del mentor dall'URL (es: mentorProfile.html?id=5)
    const urlParams = new URLSearchParams(window.location.search);
    const mentorId = urlParams.get('id');

    if (!mentorId) {
        container.innerHTML = '<p style="text-align: center; color: red;">ID mentor mancante</p>';
        return;
    }

    try {
        // Chiama l'endpoint ApriProfiloMentor
        const response = await fetch(`/api/mentee/mentor/${mentorId}`);
        
        if (!response.ok) {
            throw new Error(`Errore ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel caricamento del profilo');
        }

        const mentor = result.data;
        console.log('Dati mentor:', mentor); // Debug

        // Renderizza il profilo
        container.innerHTML = renderMentorProfile(mentor);

    } catch (error) {
        console.error('Errore nel caricamento del profilo:', error);
        container.innerHTML = `<p style="text-align: center; color: red;">Errore: ${error.message}</p>`;
    }
});

function renderMentorProfile(mentor) {
    // Iniziali per l'avatar
    const initials = (mentor.Nome?.[0] || '') + (mentor.Cognome?.[0] || '');
    
    // Rating
    const rating = parseFloat(mentor.media_recensioni) || 0;
    const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    const reviewCount = mentor.numero_recensioni || 0;
    
    // Prezzo
    const price = mentor.Prezzo ? `€${mentor.Prezzo}` : 'Prezzo da concordare';
    
    // Tags
    const tags = [];
    if (mentor.Settore) tags.push(mentor.Settore);
    if (mentor.Lingua) tags.push(mentor.Lingua);

    return `
        <div class="profile-header">
            <div class="profile-avatar">${initials}</div>
            <div class="profile-info">
                <div class="profile-name">${mentor.Nome || ''} ${mentor.Cognome || ''}</div>
                <div class="profile-title">${mentor.Bio || 'Mentor'}</div>
                <div class="profile-rating">${stars} ${rating.toFixed(1)} (${reviewCount} reviews)</div>
                ${tags.length > 0 ? `
                    <div class="profile-tags">
                        ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="profile-price">${price} per session</div>
            </div>
        </div>

        ${mentor.Bio ? `
            <div class="section">
                <div class="section-title">About Me</div>
                <div class="section-text">${mentor.Bio}</div>
            </div>
        ` : ''}

        ${mentor.Cv_Url ? `
            <div class="section">
                <div class="section-title">CV</div>
                <div class="section-text">
                    <a href="${mentor.Cv_Url}" target="_blank" style="color: var(--green); text-decoration: underline;">
                        Visualizza CV
                    </a>
                </div>
            </div>
        ` : ''}

        ${mentor.disponibilita && mentor.disponibilita.length > 0 ? `
            <div class="section">
                <div class="section-title">Disponibilità</div>
                <div class="availability-grid">
                    ${renderAvailabilityByDay(mentor.disponibilita)}
                </div>
            </div>
        ` : ''}

        <a href="appointment.html?mentorId=${mentor.Id_Utente}" class="book-btn">Book a Session</a>
    `;
}

function renderAvailabilityByDay(slots) {
    // Mappa numeri giorni a nomi italiani
    const dayNames = {
        '0': 'Domenica',
        '1': 'Lunedì',
        '2': 'Martedì',
        '3': 'Mercoledì',
        '4': 'Giovedì',
        '5': 'Venerdì',
        '6': 'Sabato'
    };

    // Raggruppa gli slot per giorno
    const slotsByDay = {};
    slots.forEach(slot => {
        const dayNum = String(slot.Giorno);
        const dayName = dayNames[dayNum] || `Giorno ${dayNum}`;
        
        if (!slotsByDay[dayName]) {
            slotsByDay[dayName] = [];
        }
        slotsByDay[dayName].push({
            inizio: slot.Ora_Inizio,
            fine: slot.Ora_Fine
        });
    });

    // Ordina i giorni secondo l'ordine della settimana
    const dayOrder = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const sortedDays = Object.keys(slotsByDay).sort((a, b) => {
        return dayOrder.indexOf(a) - dayOrder.indexOf(b);
    });

    return sortedDays.map(dayName => {
        const times = slotsByDay[dayName];
        return `
            <div class="availability-day">
                <div class="day-name">${dayName}</div>
                <div class="day-times">
                    ${times.map(time => {
                        const inizio = time.inizio.substring(0, 5);
                        const fine = time.fine.substring(0, 5);
                        return `<div class="time-slot">${inizio} - ${fine}</div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}
