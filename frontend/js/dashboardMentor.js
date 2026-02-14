// Script per la dashboard del mentor

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    if (!requireRole('mentor')) return;
    
    // Aggiorna i link della chat con l'userId
    updateChatLinks();
    
    // Carica i dati della dashboard
    loadDashboardData();
    
    // Event listener per il pulsante Edit Profile
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            showEditProfileModal();
        });
    }
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
            console.error('API error:', errorData);
            throw new Error('Error loading personal data');
        }
        
        const mentorData = await response.json();
        console.log('Dati mentor ricevuti:', mentorData);
        console.log('Nome:', mentorData.nome);
        console.log('Prezzo:', mentorData.prezzo);
        updatePersonalInfo(mentorData);
        await loadPendingSessionsForMentor(token);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Unable to load dashboard data. Check the console for details.');
    }
}

async function loadPendingSessionsForMentor(token) {
    const titleEl = document.querySelector('.section .section-title');
    if (titleEl) titleEl.textContent = 'Pending Requests';

    const noAppointmentsEl = document.getElementById('no-appointments');
    const sectionEl = document.querySelector('.section');
    if (!sectionEl || !noAppointmentsEl) return;

    let listEl = document.getElementById('dashboard-upcoming-list');
    if (!listEl) {
        listEl = document.createElement('div');
        listEl.id = 'dashboard-upcoming-list';
        sectionEl.appendChild(listEl);
    }

    try {
        const res = await fetch('http://localhost:3000/api/mentor/appointments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Unable to load mentor appointments');

        const data = await res.json();
        const appointments = (data.data || [])
            .filter(app => isPendingStatus(app?.Stato || app?.stato))
            .filter(app => isCurrentOrFutureSession(app))
            .sort(compareByStartAsc)
            .slice(0, 3);

        renderDashboardAppointments(listEl, appointments);
        noAppointmentsEl.style.display = appointments.length ? 'none' : 'block';
    } catch (error) {
        console.error('Error loading mentor pending sessions:', error);
        listEl.innerHTML = '';
        noAppointmentsEl.style.display = 'block';
    }
}

function renderDashboardAppointments(container, appointments) {
    container.innerHTML = '';

    appointments.forEach(app => {
        const menteeName = `${app.mentee_nome || ''} ${app.mentee_cognome || ''}`.trim() || 'Mentee';
        const dateLabel = formatDateLabel(app?.Giorno || app?.giorno);
        const timeStart = app?.Ora_Inizio || app?.Ora || app?.ora || '';
        const timeEnd = app?.Ora_Fine || '';
        const timeLabel = timeStart && timeEnd ? `${timeStart} - ${timeEnd}` : timeStart;

        const item = document.createElement('div');
        item.className = 'appointment-item';
        item.style.cursor = 'pointer';
        item.innerHTML = `
            <div class="appointment-info">
                <div class="appointment-title">${menteeName}</div>
                <div class="appointment-time">${dateLabel} • ${timeLabel}</div>
            </div>
            <span class="appointment-status status-pending">Pending</span>
        `;
        item.addEventListener('click', () => {
            const appointmentId = app?.Id || app?.id || '';
            const target = appointmentId
                ? `/pages/appointmentsMentor.html?appointmentId=${encodeURIComponent(appointmentId)}`
                : '/pages/appointmentsMentor.html';
            window.location.href = target;
        });
        container.appendChild(item);
    });
}

function getStartTimestamp(appointment) {
    const rawDay = appointment?.Giorno || appointment?.giorno;
    const rawTime = appointment?.Ora_Inizio || appointment?.Ora || appointment?.ora || '00:00';
    if (!rawDay) return Number.MAX_SAFE_INTEGER;

    const dateIso = normalizeDayToISO(rawDay);
    if (!dateIso) return Number.MAX_SAFE_INTEGER;
    const timeMatch = String(rawTime).match(/^(\d{1,2}):(\d{2})/);
    const hh = timeMatch ? String(Math.min(23, Number(timeMatch[1]))).padStart(2, '0') : '00';
    const mm = timeMatch ? String(Math.min(59, Number(timeMatch[2]))).padStart(2, '0') : '00';
    const parsed = new Date(`${dateIso}T${hh}:${mm}:00`);

    return Number.isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
}

function compareByStartAsc(a, b) {
    return getStartTimestamp(a) - getStartTimestamp(b);
}

function isCurrentOrFutureSession(appointment) {
    const endTimestamp = getEndTimestamp(appointment);
    if (!Number.isFinite(endTimestamp)) return false;
    return endTimestamp >= Date.now();
}

function getEndTimestamp(appointment) {
    const rawDay = appointment?.Giorno || appointment?.giorno;
    if (!rawDay) return Number.MAX_SAFE_INTEGER;

    const dateIso = normalizeDayToISO(rawDay);
    if (!dateIso) return Number.MAX_SAFE_INTEGER;
    const rawEnd = appointment?.Ora_Fine || appointment?.ora_fine;
    const rawStart = appointment?.Ora_Inizio || appointment?.Ora || appointment?.ora || '00:00';
    const durationMinutes = Number(appointment?.Durata || appointment?.durata || 60);

    const endMatch = String(rawEnd || '').match(/^(\d{1,2}):(\d{2})/);
    const startMatch = String(rawStart).match(/^(\d{1,2}):(\d{2})/);

    let endHour;
    let endMinute;

    if (endMatch) {
        endHour = Math.min(23, Number(endMatch[1]));
        endMinute = Math.min(59, Number(endMatch[2]));
    } else if (startMatch) {
        const startTotal = (Math.min(23, Number(startMatch[1])) * 60) + Math.min(59, Number(startMatch[2]));
        const estimatedEnd = startTotal + (Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 60);
        endHour = Math.floor(Math.min(23 * 60 + 59, estimatedEnd) / 60);
        endMinute = Math.min(59, estimatedEnd % 60);
    } else {
        endHour = 0;
        endMinute = 0;
    }

    const hh = String(endHour).padStart(2, '0');
    const mm = String(endMinute).padStart(2, '0');
    const parsed = new Date(`${dateIso}T${hh}:${mm}:00`);

    return Number.isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
}

function normalizeDayToISO(rawDay) {
    if (!rawDay) return null;

    if (rawDay instanceof Date) {
        if (Number.isNaN(rawDay.getTime())) return null;
        return `${rawDay.getFullYear()}-${String(rawDay.getMonth() + 1).padStart(2, '0')}-${String(rawDay.getDate()).padStart(2, '0')}`;
    }

    const value = String(rawDay).trim();
    if (!value) return null;

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }

    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

function isPendingStatus(status) {
    const s = String(status || '').toLowerCase();
    return s.includes('pending') || s.includes('attesa');
}

function formatDateLabel(value) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function updatePersonalInfo(data) {
    // Aggiorna nome nel saluto
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.textContent = `Welcome, ${data.Nome || 'Mentor'}!`;
    }
    
    updateAvatar(data);

    // Aggiorna prezzo orario
    const priceElement = document.getElementById('price');
    if (priceElement && data.Prezzo) {
        priceElement.textContent = `€${parseFloat(data.Prezzo).toFixed(2)}/h`;
    }
    
    // Popola le informazioni personali
    const nameEl = document.getElementById('profile-name');
    if (nameEl) nameEl.textContent = `${data.Nome || ''} ${data.Cognome || ''}`.trim() || '-';
    
    const emailEl = document.getElementById('profile-email');
    if (emailEl) emailEl.textContent = data.Mail || '-';

    const dobEl = document.getElementById('profile-dob');
    if (dobEl) {
        dobEl.textContent = formatDateForDisplay(data.Data_Nascita);
    }
    
    const sectorEl = document.getElementById('profile-sector');
    if (sectorEl) sectorEl.textContent = data.Settore || '-';
    
    const languageEl = document.getElementById('profile-language');
    if (languageEl) languageEl.textContent = data.Lingua || '-';
    
    const titleEl = document.getElementById('profile-title');
    if (titleEl) titleEl.textContent = data.Titolo || '-';
    
    const experienceEl = document.getElementById('profile-experience');
    if (experienceEl) experienceEl.textContent = data.Esperienza || '-';
    
    const organizationEl = document.getElementById('profile-organization');
    if (organizationEl) organizationEl.textContent = data.Organizzazione || '-';
    
    const bioEl = document.getElementById('profile-bio');
    if (bioEl) bioEl.textContent = data.Bio || '-';
}

// **NUOVA FUNZIONE: Genera e mostra l'avatar**
function updateAvatar(data) {
    // Trova il container dell'avatar nel DOM
    const avatarContainer = document.querySelector('.profile-avatar');
    
    // Se non esiste il container, esci dalla funzione
    if (!avatarContainer) {
        console.warn('Avatar container not found');
        return;
    }
    
    // Estrae la prima lettera del Nome (oppure stringa vuota se Nome non esiste)
    const firstName = data.Nome?.[0] || '';
    
    // Estrae la prima lettera del Cognome (oppure stringa vuota se Cognome non esiste)
    const lastName = data.Cognome?.[0] || '';
    
    // Combina le due iniziali
    const initials = firstName + lastName;
    
    // Inserisce le iniziali dentro il container
    avatarContainer.textContent = initials;
}

function showEditProfileModal() {
    window.location.href = '/pages/editProfileMentor.html';
}

function formatDateForDisplay(dateValue) {
    if (!dateValue) return '-';
    const dateString = typeof dateValue === 'string' ? dateValue : new Date(dateValue).toISOString();
    const parts = dateString.slice(0, 10).split('-');
    if (parts.length !== 3) return '-';
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
