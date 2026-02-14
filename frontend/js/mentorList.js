// Script per visualizzare la lista dei mentor
document.addEventListener('DOMContentLoaded', async () => {
    const mentorsGrid = document.querySelector('.mentors-grid');
    const heroCount = document.querySelector('.hero p');

    try {
        // Prova a caricare i risultati della ricerca dal sessionStorage
        let mentors = [];
        const storedResults = sessionStorage.getItem('mentorResults');
        
        if (storedResults) {
            mentors = JSON.parse(storedResults);
            sessionStorage.removeItem('mentorResults'); // Pulisci dopo aver letto
        } else {
            // Se non ci sono risultati dalla ricerca, carica tutti i mentor
            const response = await fetch('/api/mentee/search');
            if (response.ok) {
                const result = await response.json();
                mentors = result.data;
            }
        }

        // Aggiorna il conteggio
        if (heroCount) {
            heroCount.textContent = `${mentors.length} mentor${mentors.length !== 1 ? 's' : ''} available`;
        }

        console.log('Mentor caricati:', mentors); // Debug

        // Renderizza i mentor
        if (mentors.length === 0) {
            mentorsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; font-size: 20px;">No mentors found</p>';
        } else {
            try {
                const cards = mentors.map(mentor => {
                    console.log('Rendering mentor:', mentor); // Debug
                    return createMentorCard(mentor);
                });
                mentorsGrid.innerHTML = cards.join('');
                setupReviewLinksAuthGate(mentorsGrid);
            } catch (renderError) {
                console.error('Card rendering error:', renderError);
                console.error('Mentor data:', mentors);
                mentorsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: red;">Rendering error: ' + renderError.message + '</p>';
            }
        }

    } catch (error) {
        console.error('Error loading mentors:', error);
        mentorsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: red;">Error loading mentors: ' + error.message + '</p>';
    }
});

function createMentorCard(mentor) {
    // Crea le iniziali per l'avatar
    const initials = (mentor.Nome?.[0] || '') + (mentor.Cognome?.[0] || '');
    
    // Formatta il prezzo
    const price = mentor.Prezzo ? `€${mentor.Prezzo}/session` : 'Price on request';
    
    // Crea le stelle per il rating
    const rating = parseFloat(mentor.media_recensioni) || 0;
    const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    const reviewUrl = buildReviewUrlForMentor(mentor);
    
    // Gestisci i tag (settore e altre categorie)
    const tags = [];
    if (mentor.Settore) tags.push(mentor.Settore);
    if (mentor.Lingua) tags.push(mentor.Lingua);
    
    return `
        <div class="mentor-card">
            <div class="mentor-avatar">${initials}</div>
            <div class="mentor-name">${mentor.Nome || ''} ${mentor.Cognome || ''}</div>
            <div class="mentor-title">${mentor.Bio || 'Mentor'}</div>
            ${tags.length > 0 ? `
                <div class="mentor-tags">
                    ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            <a href="${reviewUrl}" class="mentor-rating review-link js-review-link" data-review-url="${reviewUrl}" title="Add a review">${stars} (${rating.toFixed(1)})</a>
            <div class="mentor-price">${price}</div>
            <a href="mentorProfile.html?id=${mentor.Id_Utente}" class="view-profile-btn">View Profile</a>
        </div>
    `;
}

function setupReviewLinksAuthGate(container) {
    if (!container) return;

    container.addEventListener('click', (event) => {
        const reviewLink = event.target.closest('.js-review-link');
        if (!reviewLink) return;

        if (isAuthenticated()) return;

        event.preventDefault();
        const reviewUrl = reviewLink.getAttribute('data-review-url') || '/pages/reviewsMentee.html';
        sessionStorage.setItem('returnUrl', reviewUrl);
        window.location.href = '/pages/login.html';
    });
}

function isAuthenticated() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return Boolean(token);
}

function buildReviewUrlForMentor(mentor) {
    const mentorName = `${mentor.Nome || ''} ${mentor.Cognome || ''}`.trim();
    const params = new URLSearchParams({
        mentorId: mentor.Id_Utente || mentor.Id || '',
        mentorName,
        settore: mentor.Settore || 'Mentoring Session'
    });
    return `/pages/reviewsMentee.html?${params.toString()}`;
}
