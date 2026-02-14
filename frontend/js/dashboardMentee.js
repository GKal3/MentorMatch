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
        // Carica dati personali del mentee
        const response = await fetch(`http://localhost:3000/api/mentee/personal/${user.id}`, {
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
        
        const menteeData = await response.json();
        console.log('Dati mentee ricevuti:', menteeData);
        console.log('Nome:', menteeData.Nome);
        console.log('Occupazione:', menteeData.Occupazione);
        updatePersonalInfo(menteeData);
        await loadUpcomingSessionsForMentee(token);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Unable to load dashboard data. Check the console for details.');
    }
}

async function loadUpcomingSessionsForMentee(token) {
    const titleEl = document.querySelector('.section .section-title');
    if (titleEl) titleEl.textContent = 'Upcoming Confirmed Sessions';

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
        const res = await fetch('http://localhost:3000/api/mentee/appointments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Unable to load mentee appointments');

        const data = await res.json();
        const appointments = (data.data || [])
            .filter(app => isAcceptedStatus(app?.Stato || app?.stato))
            .filter(app => isCurrentOrFutureSession(app))
            .sort(compareByStartAsc)
            .slice(0, 3);

        renderDashboardAppointments(listEl, appointments, 'mentor');
        noAppointmentsEl.style.display = appointments.length ? 'none' : 'block';
    } catch (error) {
        console.error('Error loading mentee upcoming sessions:', error);
        listEl.innerHTML = '';
        noAppointmentsEl.style.display = 'block';
    }
}

function renderDashboardAppointments(container, appointments, nameType) {
    container.innerHTML = '';

    appointments.forEach(app => {
        const name = nameType === 'mentor'
            ? `${app.mentor_nome || ''} ${app.mentor_cognome || ''}`.trim() || 'Mentor'
            : `${app.mentee_nome || ''} ${app.mentee_cognome || ''}`.trim() || 'Mentee';

        const dateLabel = formatDateLabel(app?.Giorno || app?.giorno);
        const timeStart = app?.Ora_Inizio || app?.Ora || app?.ora || '';
        const timeEnd = app?.Ora_Fine || '';
        const timeLabel = timeStart && timeEnd ? `${timeStart} - ${timeEnd}` : timeStart;

        const item = document.createElement('div');
        item.className = 'appointment-item';
        item.style.cursor = 'pointer';
        item.innerHTML = `
            <div class="appointment-info">
                <div class="appointment-title">${name}</div>
                <div class="appointment-time">${dateLabel} • ${timeLabel}</div>
            </div>
            <span class="appointment-status status-confirmed">Accepted</span>
        `;
        item.addEventListener('click', () => {
            window.location.href = '/pages/appArea.html';
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

function isAcceptedStatus(status) {
    const s = String(status || '').toLowerCase();
    return s.includes('accepted') || s.includes('conferm');
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
        greetingElement.textContent = `Welcome, ${data.Nome || 'Mentee'}!`;
    }

    updateAvatar(data);
    
    // Popola le informazioni personali
    const nameEl = document.getElementById('profile-name');
    if (nameEl) nameEl.textContent = `${data.Nome || ''} ${data.Cognome || ''}`.trim() || '-';
    
    const emailEl = document.getElementById('profile-email');
    if (emailEl) emailEl.textContent = data.Mail || '-';
    
    const dobEl = document.getElementById('profile-dob');
    if (dobEl) dobEl.textContent = formatDateForDisplay(data.Data_Nascita);
    
    const occupationEl = document.getElementById('profile-occupation');
    if (occupationEl) occupationEl.textContent = data.Occupazione || '-';
    
    const genderEl = document.getElementById('profile-gender');
    if (genderEl) genderEl.textContent = data.Genere || '-';
    
    const bioEl = document.getElementById('profile-bio');
    if (bioEl) bioEl.textContent = data.Bio || '-';
}

function updateAvatar(data) {
    const avatarContainer = document.querySelector('.profile-avatar');
    if (!avatarContainer || !data) return;

    const firstName = data.Nome?.[0] || '';
    const lastName = data.Cognome?.[0] || '';
    const initials = firstName + lastName;
    avatarContainer.textContent = initials;
}

function showEditProfileModal() {
    window.location.href = '/pages/editProfileMentee.html';
}

function formatDateForDisplay(dateValue) {
    if (!dateValue) return '-';
    const dateString = typeof dateValue === 'string' ? dateValue : new Date(dateValue).toISOString();
    const parts = dateString.slice(0, 10).split('-');
    if (parts.length !== 3) return '-';
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
