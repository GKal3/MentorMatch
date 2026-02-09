// Script per la pagina Appointments del mentor
let currentUser = null;
let currentDate = new Date();
let appointments = [];
let selectedAppointment = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    if (!requireRole('mentor')) return;

    currentUser = getCurrentUser();
    
    // Event listeners per navigazione calendario
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById('today-btn').addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    // Event listeners per modal
    const modal = document.getElementById('appointment-modal');
    const closeBtn = document.querySelector('.close');
    const closeModalBtn = document.getElementById('close-modal');
    const saveStatusBtn = document.getElementById('save-status');

    closeBtn.onclick = () => modal.style.display = 'none';
    closeModalBtn.onclick = () => modal.style.display = 'none';
    saveStatusBtn.onclick = saveAppointmentStatus;

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
            throw new Error('Errore nel caricamento degli appuntamenti');
        }

        const data = await response.json();
        appointments = data.data || [];
        console.log('Appointments loaded:', appointments);
        renderCalendar();
    } catch (error) {
        console.error('Errore nel caricamento degli appuntamenti:', error);
        alert('Impossibile caricare gli appuntamenti');
    }
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
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Headers giorni della settimana
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    // Giorni del mese precedente
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayDiv = createDayCell(daysInPrevMonth - i, true);
        grid.appendChild(dayDiv);
    }

    // Giorni del mese corrente
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
        const dayDiv = createDayCell(day, false, isToday);
        
        // Aggiungi appuntamenti per questo giorno
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        console.log('Checking appointments for date:', dateStr);
        
        const dayAppointments = appointments.filter(apt => {
            const aptDate = apt.Giorno || apt.giorno;
            console.log('Appointment date:', aptDate, 'comparing with:', dateStr);
            return aptDate && aptDate.startsWith(dateStr);
        });

        console.log('Found', dayAppointments.length, 'appointments for', dateStr);

        dayAppointments.forEach(apt => {
            const aptDiv = document.createElement('div');
            const status = (apt.Stato || apt.stato || '').toLowerCase();
            aptDiv.className = `appointment-item ${status.replace(' ', '-')}`;
            
            const time = apt.Ora || apt.ora || '';
            const menteeName = `${apt.mentee_nome || ''} ${apt.mentee_cognome || ''}`.trim() || 'Mentee';
            
            aptDiv.textContent = `${time} - ${menteeName}`;
            aptDiv.onclick = (e) => {
                e.stopPropagation();
                showAppointmentDetails(apt);
            };
            
            dayDiv.appendChild(aptDiv);
        });

        grid.appendChild(dayDiv);
    }

    // Giorni del mese successivo
    const totalCells = grid.children.length - 7; // Sottrai gli headers
    const remainingCells = 35 - totalCells; // 5 settimane * 7 giorni = 35
    for (let day = 1; day <= remainingCells; day++) {
        const dayDiv = createDayCell(day, true);
        grid.appendChild(dayDiv);
    }
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
    const time = appointment.Ora || appointment.ora || '';
    const duration = `${appointment.Durata || appointment.durata || 60} minutes`;
    const topic = appointment.Settore || appointment.settore || 'Not specified';
    const notes = appointment.Note || appointment.note || 'No notes';

    document.getElementById('modal-mentee').textContent = menteeName;
    document.getElementById('modal-date').textContent = date;
    document.getElementById('modal-time').textContent = time;
    document.getElementById('modal-duration').textContent = duration;
    document.getElementById('modal-topic').textContent = topic;
    document.getElementById('modal-notes').textContent = notes;

    // Imposta stato corrente
    const statusSelect = document.getElementById('status-select');
    const currentStatus = appointment.Stato || appointment.stato || 'In attesa';
    statusSelect.value = currentStatus;

    // Mostra modal
    document.getElementById('appointment-modal').style.display = 'block';
}

async function saveAppointmentStatus() {
    if (!selectedAppointment) return;

    const newStatus = document.getElementById('status-select').value;
    const token = getToken();
    const appointmentId = selectedAppointment.Id || selectedAppointment.id;

    try {
        const response = await fetch(`/api/mentor/appointments/${appointmentId}/status`, {
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
        
        // Chiudi modal e ricarica appuntamenti
        document.getElementById('appointment-modal').style.display = 'none';
        await loadAppointments();
        
    } catch (error) {
        console.error('Error updating appointment status:', error);
        alert('Error updating status: ' + error.message);
    }
}
