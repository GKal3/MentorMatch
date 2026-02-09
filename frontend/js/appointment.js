// Script per la prenotazione di una sessione con un mentor
let mentorData = null;
let selectedDate = null;
let selectedTime = null;
let availabilityByDayOfWeek = {}; // Map day numbers (1-7) to availability slots

// Mapping from day-of-week number (1-7) to ISO day number (0=Sunday, 1=Monday, etc.)
const dayOfWeekToISODay = {
    1: 1, // Lunedì = Monday
    2: 2, // Martedì = Tuesday
    3: 3, // Mercoledì = Wednesday
    4: 4, // Giovedì = Thursday
    5: 5, // Venerdì = Friday
    6: 6, // Sabato = Saturday
    7: 0  // Domenica = Sunday
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.booking-container');
    
    // VERIFICA LOGIN PRIMA DI TUTTO
    if (!requireAuth(window.location.href)) {
        return; // requireAuth reindirizza al login
    }
    
    // Leggi l'ID del mentor dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    const mentorId = urlParams.get('mentorId');

    if (!mentorId) {
        container.innerHTML = '<p style="text-align: center; color: red;">ID mentor mancante</p>';
        return;
    }

    try {
        // Carica i dati del mentor
        const response = await fetch(`/api/mentee/mentor/${mentorId}`);
        
        if (!response.ok) {
            throw new Error(`Errore ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel caricamento del mentor');
        }

        mentorData = result.data;
        console.log('Dati mentor:', mentorData); // Debug

        // Organizza la disponibilità per giorno della settimana
        if (mentorData.disponibilita && Array.isArray(mentorData.disponibilita)) {
            mentorData.disponibilita.forEach(slot => {
                const dayOfWeek = slot.Giorno; // 1-7
                if (!availabilityByDayOfWeek[dayOfWeek]) {
                    availabilityByDayOfWeek[dayOfWeek] = [];
                }
                availabilityByDayOfWeek[dayOfWeek].push(slot);
            });
            console.log('Disponibilità per giorno della settimana:', availabilityByDayOfWeek);
        }

        // Renderizza il form di prenotazione
        container.innerHTML = renderBookingForm(mentorData);
        
        // Aggiungi event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Errore:', error);
        container.innerHTML = `<p style="text-align: center; color: red;">Errore: ${error.message}</p>`;
    }
});

function renderBookingForm(mentor) {
    const initials = (mentor.Nome?.[0] || '') + (mentor.Cognome?.[0] || '');
    const price = parseFloat(mentor.Prezzo) || 0;
    
    // Genera giorni disponibili (prossimi 14 giorni)
    const days = generateAvailableDays(14);
    
    return `
        <h1 style="text-align: center; margin-bottom: 30px;">Book Your Session</h1>

        <div class="mentor-summary">
            <div class="mini-avatar">${initials}</div>
            <div>
                <div style="font-size: 20px; font-weight: 600;">${mentor.Nome} ${mentor.Cognome}</div>
                <div style="color: #666;">${mentor.Bio || 'Mentor'}</div>
                <div style="color: var(--green); font-weight: 600; margin-top: 5px;">€${price} per session</div>
            </div>
        </div>

        <div class="form-section">
            <div class="form-title">Select Date</div>
            <div class="calendar-grid">
                <div style="font-weight: 600; text-align: center;">Mon</div>
                <div style="font-weight: 600; text-align: center;">Tue</div>
                <div style="font-weight: 600; text-align: center;">Wed</div>
                <div style="font-weight: 600; text-align: center;">Thu</div>
                <div style="font-weight: 600; text-align: center;">Fri</div>
                <div style="font-weight: 600; text-align: center;">Sat</div>
                <div style="font-weight: 600; text-align: center;">Sun</div>
                ${days.map(day => {
                    // Verifica se il giorno è disponibile
                    const isAvailable = availabilityByDayOfWeek[day.dayOfWeek] && availabilityByDayOfWeek[day.dayOfWeek].length > 0;
                    const disabledClass = isAvailable ? '' : 'unavailable';
                    const style = isAvailable ? '' : 'style="opacity: 0.5; cursor: not-allowed; background-color: #f0f0f0; color: #ccc;"';
                    
                    return `
                        <div class="calendar-day ${disabledClass}" data-date="${day.iso}" data-available="${isAvailable}" ${style}>
                            ${day.day}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div class="form-section">
            <div class="form-title">Select Time</div>
            <div id="timeSlots" class="time-slots">
                <p style="color: #666; text-align: center;">Seleziona prima una data</p>
            </div>
        </div>

        <div class="price-summary">
            <div class="price-row">
                <span>Session (60 min)</span>
                <span>€${price.toFixed(2)}</span>
            </div>
            <div class="price-row">
                <span>Platform Fee</span>
                <span>€5.00</span>
            </div>
            <div class="price-row price-total">
                <span>Total</span>
                <span>€${(parseFloat(price) + 5).toFixed(2)}</span>
            </div>
        </div>

        <button id="submitBooking" class="submit-btn" disabled>Confirm Booking</button>
    `;
}

function generateAvailableDays(count) {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Calcola il giorno della settimana in formato DB (1-7)
        // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        let isoDay = date.getDay(); // 0-6
        let dayOfWeek = isoDay === 0 ? 7 : isoDay; // Converte: 0->7, 1->1, ..., 6->6
        
        days.push({
            day: date.getDate(),
            iso: date.toISOString().split('T')[0],
            full: date,
            dayOfWeek: dayOfWeek
        });
    }
    
    return days;
}

function setupEventListeners() {
    // Event listener per i giorni del calendario
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.addEventListener('click', function() {
            // Controlla se il giorno è disponibile
            const isAvailable = this.dataset.available === 'true';
            if (!isAvailable) {
                alert('Il mentor non ha disponibilità per questo giorno');
                return;
            }
            
            // Rimuovi selezione precedente
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            this.classList.add('selected');
            
            selectedDate = this.dataset.date;
            console.log('Data selezionata:', selectedDate);
            
            // Carica gli slot orari disponibili
            loadTimeSlots(selectedDate);
            
            // Resetta la selezione dell'orario
            selectedTime = null;
            updateSubmitButton();
        });
    });
    
    // Event listener per il pulsante di conferma
    document.getElementById('submitBooking').addEventListener('click', submitBooking);
}

function loadTimeSlots(date) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    
    // Estrai il giorno della settimana dalla data selezionata
    const selectedDateObj = new Date(date);
    let isoDay = selectedDateObj.getDay(); // 0-6
    let dayOfWeek = isoDay === 0 ? 7 : isoDay; // Converte: 0->7, 1->1, ..., 6->6
    
    console.log(`Data: ${date}, giorno della settimana: ${dayOfWeek}`);
    
    // Estrai gli slot orari disponibili per il giorno selezionato
    let slots = [];
    
    if (availabilityByDayOfWeek[dayOfWeek] && availabilityByDayOfWeek[dayOfWeek].length > 0) {
        // Organizza gli slot per ora di inizio
        availabilityByDayOfWeek[dayOfWeek].forEach(slot => {
            // Estrai l'ora (HH:00:00 -> HH:00)
            const hourStart = slot.Ora_Inizio.substring(0, 5);
            if (!slots.includes(hourStart)) {
                slots.push(hourStart);
            }
        });
        slots.sort(); // Ordina gli slot per ora
        
        console.log('Slot disponibili per il giorno:', slots);
    } else {
        // Nessuna disponibilità per questo giorno
        console.log('Nessuna disponibilità per il giorno:', dayOfWeek);
    }
    
    if (slots.length > 0) {
        timeSlotsContainer.innerHTML = slots.map(time => `
            <div class="time-slot" data-time="${time}">${time}</div>
        `).join('');
        
        // Aggiungi event listeners agli slot
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.addEventListener('click', function() {
                document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');
                
                selectedTime = this.dataset.time;
                console.log('Orario selezionato:', selectedTime);
                
                updateSubmitButton();
            });
        });
    } else {
        timeSlotsContainer.innerHTML = '<p style="color: #666; text-align: center;">Nessuno slot disponibile per il giorno selezionato</p>';
    }
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submitBooking');
    submitBtn.disabled = !(selectedDate && selectedTime);
}

async function submitBooking() {
    if (!selectedDate || !selectedTime) {
        alert('Seleziona data e orario');
        return;
    }
    
    const bookingData = {
        id_mentor: mentorData.Id_Utente,
        giorno: selectedDate,
        ora: selectedTime
    };
    
    console.log('Invio prenotazione:', bookingData);
    
    try {
        const response = await fetch('/api/mentee/booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Prenotazione confermata!');
            const booking = result.data;
            const price = parseFloat(mentorData.Prezzo) || 0;

            if (price > 0) {
                const pendingPayment = {
                    prenotazioneId: booking.Id,
                    mentorId: mentorData.Id_Utente,
                    mentorNome: mentorData.Nome,
                    mentorCognome: mentorData.Cognome,
                    data: selectedDate,
                    ora: selectedTime,
                    durataMinuti: 60,
                    prezzo: price,
                    platformFee: 5,
                    tax: Number((price * 0.22).toFixed(2))
                };
                sessionStorage.setItem('pendingPayment', JSON.stringify(pendingPayment));
                window.location.href = '/pages/payment.html';
            } else {
                // Nessun pagamento richiesto, torna alla dashboard
                alert('Nessun pagamento richiesto per questa sessione.');
                window.location.href = '/pages/dashboardMentee.html';
            }
        } else {
            alert('Errore: ' + result.message);
        }
        
    } catch (error) {
        console.error('Errore nella prenotazione:', error);
        alert('Errore nella prenotazione: ' + error.message);
    }
}
