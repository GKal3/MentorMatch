// Script per la pagina Appointments del mentor
let currentUser = null;
let currentDate = new Date();
let appointments = [];
let selectedAppointment = null;
let pendingOpenAppointmentId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    if (!requireRole('mentor')) return;

    currentUser = getCurrentUser();
    pendingOpenAppointmentId = new URLSearchParams(window.location.search).get('appointmentId');
    
    // Event listeners per navigazione calendario
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Event listeners per modal
    const modal = document.getElementById('appointment-modal');
    const closeBtn = document.querySelector('.close');
    const acceptBtn = document.getElementById('accept-appointment');
    const rejectBtn = document.getElementById('reject-appointment');
    const messageBtn = document.getElementById('message-mentee');

    closeBtn.onclick = () => modal.style.display = 'none';
    acceptBtn.onclick = () => saveAppointmentStatus('Accepted');
    rejectBtn.onclick = () => saveAppointmentStatus('Cancelled');
    messageBtn.onclick = openMenteeChat;

    setupListTabs();

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Carica appuntamenti e renderizza calendario
    loadAppointments();
});

async function loadAppointments() {
    const token = getToken();
    
    try {
        const response = await fetch('http://localhost:3000/api/mentor/appointments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error loading appointments');
        }

        const data = await response.json();
        appointments = data.data || [];
        console.log('Appointments loaded:', appointments);
        renderCalendar();
        renderAppointmentsList();
        openAppointmentFromQueryIfNeeded();
    } catch (error) {
        console.error('Error loading appointments:', error);
        alert('Unable to load appointments');
    }
}

function openAppointmentFromQueryIfNeeded() {
    if (!pendingOpenAppointmentId) return;

    const target = appointments.find(app => String(app?.Id || app?.id) === String(pendingOpenAppointmentId));
    if (!target) return;

    showAppointmentDetails(target);
    pendingOpenAppointmentId = null;

    const cleanUrl = `${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanUrl);
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Aggiorna header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('current-month-year').textContent = `${monthNames[month]} ${year}`;

    // Calcola primo giorno del mese e numero di giorni
    const firstDay = new Date(year, month, 1).getDay();
    const firstDayMondayBased = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Headers giorni della settimana
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    // Giorni del mese precedente
    for (let i = firstDayMondayBased - 1; i >= 0; i--) {
        const dayDiv = createDayCell(daysInPrevMonth - i, true);
        grid.appendChild(dayDiv);
    }

    // Giorni del mese corrente
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
        const dayDiv = createDayCell(day, false, isToday);
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayAppointments = appointments.filter(apt => {
            const aptDate = apt.Giorno || apt.giorno;
            return normalizeDayToISO(aptDate) === dateStr;
        });
        dayAppointments.sort(compareByStartAsc);

        const appointmentsContainer = document.createElement('div');
        appointmentsContainer.className = 'day-appointments';

        dayAppointments.forEach(apt => {
            const aptDiv = document.createElement('div');
            aptDiv.className = `appointment-item ${getAppointmentStatusClass(apt.Stato || apt.stato)}`;
            
            const menteeName = `${apt.mentee_nome || ''} ${apt.mentee_cognome || ''}`.trim() || 'Mentee';
            
            aptDiv.textContent = menteeName;
            aptDiv.title = `${menteeName} • ${normalizeStatusLabel(apt.Stato || apt.stato)}`;
            aptDiv.onclick = (e) => {
                e.stopPropagation();
                showAppointmentDetails(apt);
            };
            
            appointmentsContainer.appendChild(aptDiv);
        });

        dayDiv.appendChild(appointmentsContainer);

        grid.appendChild(dayDiv);
    }

    // Giorni del mese successivo
    const totalCells = grid.children.length - 7; // Sottrai gli headers
    const remainingCells = 42 - totalCells; // 6 settimane * 7 giorni = 42
    for (let day = 1; day <= remainingCells; day++) {
        const dayDiv = createDayCell(day, true);
        grid.appendChild(dayDiv);
    }
}

function setupListTabs() {
    const tabs = document.querySelectorAll('.tab-btn[data-target]');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(tab => tab.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.dataset.target;
            ['mentorUpcomingSection', 'mentorPastSection', 'mentorCancelledSection'].forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.style.display = sectionId === target ? 'block' : 'none';
                }
            });
        });
    });
}

function renderAppointmentsList() {
    const categorized = {
        upcoming: [],
        past: [],
        cancelled: []
    };

    appointments.forEach(appointment => {
        if (isCancelledAppointment(appointment)) {
            categorized.cancelled.push(appointment);
            return;
        }

        if (isPastAppointment(appointment)) {
            categorized.past.push(appointment);
        } else {
            categorized.upcoming.push(appointment);
        }
    });

    categorized.upcoming.sort(compareByStartAsc);
    categorized.past.sort(compareByStartDesc);
    categorized.cancelled.sort(compareByStartAsc);

    updateListSection('upcoming', categorized.upcoming);
    updateListSection('past', categorized.past);
    updateListSection('cancelled', categorized.cancelled);
}

function updateListSection(sectionKey, items) {
    const listEl = document.getElementById(`list-${sectionKey}-mentor`);
    const emptyEl = document.getElementById(`empty-${sectionKey}-mentor`);
    const countEl = document.getElementById(`count-${sectionKey}-mentor`);
    if (!listEl || !emptyEl || !countEl) return;

    listEl.innerHTML = '';
    countEl.textContent = String(items.length);

    if (!items.length) {
        listEl.style.display = 'none';
        emptyEl.style.display = 'block';
        return;
    }

    listEl.style.display = 'flex';
    emptyEl.style.display = 'none';

    items.forEach(app => {
        const menteeName = `${app.mentee_nome || ''} ${app.mentee_cognome || ''}`.trim() || 'Mentee';
        const initials = getInitials(app.mentee_nome, app.mentee_cognome);
        const dateLabel = formatDate(app.Giorno || app.giorno);
        const startTime = app.Ora_Inizio || app.Ora || app.ora || '';
        const endTime = app.Ora_Fine || '';
        const timeLabel = startTime && endTime ? `${startTime} - ${endTime}` : startTime;
        const duration = app.Durata || app.durata || 60;
        const occupation = app.Occupazione || app.occupazione || 'Occupation not specified';
        const status = app.Stato || app.stato || 'Pending';

        const card = document.createElement('div');
        card.className = 'session-card';
        card.innerHTML = `
            <div class="session-header">
                <div class="session-avatar">${initials}</div>
                <div class="session-info">
                    <div class="session-mentor" style="color:#222;">${menteeName}</div>
                    <div class="session-title">${occupation}</div>
                    <div class="session-datetime">
                        <span>📅 ${dateLabel}</span>
                        <span>🕐 ${timeLabel}</span>
                    </div>
                </div>
                <span class="session-status ${getSessionStatusClass(status)}">${normalizeStatusLabel(status)}</span>
            </div>

            <div class="session-details">
                <div class="detail-item"><span class="detail-icon">⏱️</span><span>Duration: ${duration} min</span></div>
                <div class="detail-item"><span class="detail-icon">📧</span><span>${app.mentee_email || 'Email not available'}</span></div>
            </div>

            <div class="session-actions">
                <button class="action-btn btn-secondary" data-action="details">Details</button>
            </div>
        `;

        card.querySelector('[data-action="details"]').addEventListener('click', () => showAppointmentDetails(app));
        listEl.appendChild(card);
    });
}

function isPastAppointment(appointment) {
    const endTimestamp = getAppointmentEndTimestamp(appointment);
    if (!Number.isFinite(endTimestamp)) return false;
    return endTimestamp < Date.now();
}

function isCancelledAppointment(appointment) {
    const status = String(appointment?.Stato || appointment?.stato || '').toLowerCase();
    return status.includes('cancel') || status.includes('rifiut') || status.includes('reject');
}

function getAppointmentStartTimestamp(appointment) {
    const rawDay = appointment?.Giorno || appointment?.giorno;
    const rawStart = appointment?.Ora_Inizio || appointment?.Ora || appointment?.ora || '00:00';
    if (!rawDay) return Number.MAX_SAFE_INTEGER;

    const dateIso = normalizeDayToISO(rawDay);
    if (!dateIso) return Number.MAX_SAFE_INTEGER;
    const timeMatch = String(rawStart).match(/^(\d{1,2}):(\d{2})/);
    const hh = timeMatch ? String(Math.min(23, Number(timeMatch[1]))).padStart(2, '0') : '00';
    const mm = timeMatch ? String(Math.min(59, Number(timeMatch[2]))).padStart(2, '0') : '00';
    const parsed = new Date(`${dateIso}T${hh}:${mm}:00`);

    return Number.isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
}

function getAppointmentEndTimestamp(appointment) {
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

function compareByStartAsc(a, b) {
    return getAppointmentStartTimestamp(a) - getAppointmentStartTimestamp(b);
}

function compareByStartDesc(a, b) {
    return getAppointmentStartTimestamp(b) - getAppointmentStartTimestamp(a);
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

function formatDate(iso) {
    if (!iso) return '';
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) return String(iso).slice(0, 10);
    return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function createDayCell(day, isOtherMonth = false, isToday = false) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    if (isOtherMonth) dayDiv.classList.add('other-month');
    if (isToday) dayDiv.classList.add('today');

    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    
    dayDiv.appendChild(dayNumber);
    return dayDiv;
}

function showAppointmentDetails(appointment) {
    selectedAppointment = appointment;
    
    const menteeName = `${appointment.mentee_nome || ''} ${appointment.mentee_cognome || ''}`.trim() || 'Unknown';
    const date = new Date(appointment.Giorno || appointment.giorno).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const startTime = appointment.Ora_Inizio || appointment.Ora || appointment.ora || '';
    const endTime = appointment.Ora_Fine || '';
    const time = startTime && endTime ? `${startTime} - ${endTime}` : startTime;
    const duration = `${appointment.Durata || appointment.durata || 60} min`;
    const occupation = appointment.Occupazione || appointment.occupazione || 'Occupation not specified';
    const email = appointment.mentee_email || appointment.Mentee_Mail || 'Email not available';
    const status = appointment.Stato || appointment.stato || 'Pending';
    const meetingLink = appointment.Link || appointment.link || '';

    document.getElementById('modal-mentee').textContent = menteeName;
    document.getElementById('modal-avatar').textContent = getInitials(appointment.mentee_nome, appointment.mentee_cognome);
    document.getElementById('modal-occupation').textContent = occupation;
    document.getElementById('modal-date').textContent = date;
    document.getElementById('modal-time').textContent = time;
    document.getElementById('modal-duration').textContent = duration;
    document.getElementById('modal-email').textContent = email;

    const linkContainer = document.getElementById('modal-meet-link');
    if (meetingLink) {
        linkContainer.innerHTML = `<a href="${meetingLink}" target="_blank" rel="noopener noreferrer">Open Google Meet</a>`;
    } else {
        linkContainer.textContent = 'Not available yet';
    }

    const statusBadge = document.getElementById('modal-status-badge');
    statusBadge.textContent = normalizeStatusLabel(status);
    statusBadge.className = `session-status ${getSessionStatusClass(status)}`;

    const normalized = String(status || '').toLowerCase();
    const isAccepted = normalized.includes('accepted') || normalized.includes('conferm');
    const isRejected = normalized.includes('rifiut') || normalized.includes('reject') || normalized.includes('cancel');
    document.getElementById('accept-appointment').disabled = isAccepted;
    document.getElementById('reject-appointment').disabled = isRejected;

    document.getElementById('appointment-modal').style.display = 'block';
}

async function saveAppointmentStatus(newStatus) {
    if (!selectedAppointment) return;

    const token = getToken();
    const appointmentId = selectedAppointment.Id || selectedAppointment.id;

    try {
        const response = await fetch(`http://localhost:3000/api/mentor/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update status');
        }

        alert('Appointment status updated successfully!');
        
        document.getElementById('appointment-modal').style.display = 'none';
        await loadAppointments();
        
    } catch (error) {
        console.error('Error updating appointment status:', error);
        alert('Error updating status: ' + error.message);
    }
}

function getAppointmentStatusClass(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('accepted') || normalized.includes('conferm')) return 'status-accepted';
    if (normalized.includes('pending') || normalized.includes('attesa')) return 'status-pending';
    if (normalized.includes('cancel') || normalized.includes('rifiut') || normalized.includes('reject')) return 'status-cancelled';
    return 'status-other';
}

function getSessionStatusClass(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('accepted') || normalized.includes('conferm')) return 'status-confirmed';
    if (normalized.includes('pending') || normalized.includes('attesa')) return 'status-upcoming';
    if (normalized.includes('cancel') || normalized.includes('rifiut') || normalized.includes('reject')) return 'status-cancelled';
    return 'status-completed';
}

function normalizeStatusLabel(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('accepted') || normalized.includes('conferm')) return 'Accepted';
    if (normalized.includes('pending') || normalized.includes('attesa')) return 'Pending';
    if (normalized.includes('rifiut') || normalized.includes('reject')) return 'Rejected';
    if (normalized.includes('cancel')) return 'Cancelled';
    return status || 'Unknown';
}

function getInitials(nome, cognome) {
    return `${(nome || '').charAt(0)}${(cognome || '').charAt(0)}`.toUpperCase() || 'MM';
}

function openMenteeChat() {
    if (!selectedAppointment) return;

    const userId = selectedAppointment.Id_Mentee || selectedAppointment.id_mentee;
    const userName = selectedAppointment.mentee_nome || '';
    const userCognome = selectedAppointment.mentee_cognome || '';

    const params = new URLSearchParams({
        userId: userId || '',
        userName,
        userCognome
    });

    window.location.href = `chat.html?${params.toString()}`;
}
