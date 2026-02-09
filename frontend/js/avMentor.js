// Script per la gestione della disponibilità settimanale del mentor
let selectedWeekdays = []; // Array di giorni selezionati
let currentEditingDay = null; // Giorno attualmente in modifica
let weeklyAvailability = {}; // {Lunedì: [...slots dal DB], Martedì: [...], etc}
let pendingSlots = {}; // {Lunedì: [...nuovi slots], Martedì: [...], etc} - slots selezionati ma non ancora salvati

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    if (!requireRole('mentor')) return;
    
    // Inizializza calendario settimanale
    initWeeklyCalendar();
    
    // Carica disponibilità dal server
    loadWeeklyAvailability();
    
    // Gestisci il save button
    const saveBtn = document.querySelector('.save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveWeeklyAvailability);
    }
});

async function loadWeeklyAvailability() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    
    try {
        const response = await fetch(`http://localhost:3000/api/mentor/availability/${user.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Errore nel caricamento della disponibilità');
        }
        
        const availabilityData = await response.json();
        console.log('Disponibilità caricata:', availabilityData);
        
        // Gestisci sia un array che un singolo oggetto (per retrocompatibilità)
        const dataArray = Array.isArray(availabilityData) ? availabilityData : (availabilityData ? [availabilityData] : []);
        
        // Organizza per giorno della settimana
        weeklyAvailability = {
            'Lunedì': [],
            'Martedì': [],
            'Mercoledì': [],
            'Giovedì': [],
            'Venerdì': [],
            'Sabato': [],
            'Domenica': []
        };
        
        // Mappa numero giorno (1-7) a nome giorno
        const numberToDayName = {
            1: 'Lunedì',
            2: 'Martedì',
            3: 'Mercoledì',
            4: 'Giovedì',
            5: 'Venerdì',
            6: 'Sabato',
            7: 'Domenica'
        };
        
        dataArray.forEach(slot => {
            const dayNumber = slot.Giorno;
            const dayName = numberToDayName[dayNumber];
            
            if (dayName && weeklyAvailability[dayName]) {
                weeklyAvailability[dayName].push(slot);
            }
        });
        
        console.log('Disponibilità organizzate:', weeklyAvailability);
        updateWeekdayIndicators();
        
    } catch (error) {
        console.error('Errore nel caricamento della disponibilità:', error);
    }
}

function initWeeklyCalendar() {
    const weekdayCards = document.querySelectorAll('.weekday-card');
    
    // Inizializza pendingSlots per tutti i giorni
    ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].forEach(day => {
        pendingSlots[day] = [];
    });
    
    weekdayCards.forEach(card => {
        card.addEventListener('click', () => {
            const dayName = card.dataset.day;
            toggleWeekdaySelection(dayName, card);
        });
    });
    
    generateTimeSlots();
}

function toggleWeekdaySelection(dayName, cardElement) {
    // Se il giorno è già selezionato/editing, deselezionarlo
    if (selectedWeekdays.includes(dayName)) {
        selectedWeekdays = selectedWeekdays.filter(day => day !== dayName);
        pendingSlots[dayName] = []; // Cancella i pending slots
        cardElement.classList.remove('selected', 'editing');
        
        // Se questo era il giorno in modifica, cambia a un altro giorno selezionato o resetta
        if (currentEditingDay === dayName) {
            if (selectedWeekdays.length > 0) {
                // Carica il primo giorno rimanente
                const nextDay = selectedWeekdays[0];
                const nextCard = document.querySelector(`[data-day="${nextDay}"]`);
                currentEditingDay = nextDay;
                nextCard.classList.add('editing');
                loadTimeSlotsForWeekday(nextDay);
                const selectedCount = selectedWeekdays.length;
                document.getElementById('selected-date-title').textContent = 
                    `Disponibilità per ${nextDay} (${selectedCount} ${selectedCount === 1 ? 'giorno selezionato' : 'giorni selezionati'})`;
            } else {
                currentEditingDay = null;
                document.getElementById('selected-date-title').textContent = 'Seleziona un giorno della settimana';
                document.getElementById('time-slots-grid').querySelectorAll('.time-slot').forEach(slot => {
                    slot.classList.remove('available', 'booked');
                });
            }
        }
        return;
    }
    
    // Se il giorno non è selezionato, aggiungilo
    // Salva gli slot del giorno attualmente in modifica prima di cambiare
    if (currentEditingDay) {
        savePendingSlotsForDay(currentEditingDay);
    }
    
    selectedWeekdays.push(dayName);
    cardElement.classList.add('selected');
    
    // Rimuovi classe editing da tutti
    document.querySelectorAll('.weekday-card.editing').forEach(el => {
        el.classList.remove('editing');
    });
    
    // Imposta come giorno in modifica corrente
    currentEditingDay = dayName;
    cardElement.classList.add('editing');
    
    // Aggiorna titolo time slots
    const selectedCount = selectedWeekdays.length;
    document.getElementById('selected-date-title').textContent = 
        `Disponibilità per ${dayName} (${selectedCount} ${selectedCount === 1 ? 'giorno selezionato' : 'giorni selezionati'})`;
    
    // Carica time slots per questo giorno della settimana
    loadTimeSlotsForWeekday(dayName);
}

function updateWeekdayIndicators() {
    const weekdayCards = document.querySelectorAll('.weekday-card');
    
    weekdayCards.forEach(card => {
        const dayName = card.dataset.day;
        const indicator = card.querySelector('.weekday-indicator');
        const slots = weeklyAvailability[dayName] || [];
        
        if (slots.length > 0) {
            card.classList.add('has-availability');
            indicator.textContent = `${slots.length} slot`;
        } else {
            card.classList.remove('has-availability');
            indicator.textContent = '';
        }
    });
}

function generateTimeSlots() {
    const timeSlotsGrid = document.getElementById('time-slots-grid');
    timeSlotsGrid.innerHTML = `
        <div class="time-range-container">
            <div class="time-input-group">
                <label for="time-start">Orario Inizio</label>
                <input type="time" id="time-start" value="09:00" min="09:00" max="20:00" />
            </div>
            <div class="time-input-group">
                <label for="time-end">Orario Fine</label>
                <input type="time" id="time-end" value="10:00" min="09:00" max="20:00" />
            </div>
            <button id="add-time-range-btn" class="add-range-btn">+ Aggiungi fascia oraria</button>
        </div>
        <div id="time-ranges-list" class="time-ranges-list"></div>
    `;
    
    document.getElementById('add-time-range-btn').addEventListener('click', addTimeRange);
}

function addTimeRange() {
    const startInput = document.getElementById('time-start');
    const endInput = document.getElementById('time-end');
    const startTime = startInput.value;
    const endTime = endInput.value;
    
    if (!startTime || !endTime) {
        alert('Seleziona orario di inizio e fine');
        return;
    }
    
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    
    if (startHour >= endHour) {
        alert('L\'orario di fine deve essere successivo all\'orario di inizio');
        return;
    }
    
    // Crea lista di slot singoli dal range
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    
    // Aggiungi alla lista visiva
    const rangesList = document.getElementById('time-ranges-list');
    const rangeId = `range-${Date.now()}`;
    const rangeElement = document.createElement('div');
    rangeElement.className = 'time-range-item';
    rangeElement.id = rangeId;
    rangeElement.innerHTML = `
        <span>${startTime} - ${endTime}</span>
        <button class="remove-range-btn" onclick="removeTimeRange('${rangeId}', '${currentEditingDay}')">✕</button>
    `;
    rangesList.appendChild(rangeElement);
    
    // Aggiungi ai pending slots
    if (!pendingSlots[currentEditingDay]) {
        pendingSlots[currentEditingDay] = [];
    }
    pendingSlots[currentEditingDay].push(...slots);
    
    // Reset input
    startInput.value = endTime;
    endInput.value = String(endHour + 1).padStart(2, '0') + ':00';
}

function removeTimeRange(rangeId, dayName) {
    const rangeElement = document.getElementById(rangeId);
    const rangeText = rangeElement.querySelector('span').textContent;
    const [startTime, endTime] = rangeText.split(' - ');
    
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    
    // Rimuovi gli slot dal pending
    const slotsToRemove = [];
    for (let h = startHour; h < endHour; h++) {
        slotsToRemove.push(`${String(h).padStart(2, '0')}:00`);
    }
    
    if (pendingSlots[dayName]) {
        pendingSlots[dayName] = pendingSlots[dayName].filter(slot => !slotsToRemove.includes(slot));
    }
    
    rangeElement.remove();
}

function savePendingSlotsForDay(dayName) {
    // I pending slots sono già salvati quando si aggiungono i range
    // Non c'è bisogno di fare nulla qui, ma manteniamo la funzione per compatibilità
}

function loadTimeSlotsForWeekday(dayName) {
    generateTimeSlots(); // Ricrea i time inputs
    
    // Carica i range salvati dal DB
    const daySlots = weeklyAvailability[dayName] || [];
    const rangesList = document.getElementById('time-ranges-list');
    rangesList.innerHTML = '';
    
    // Raggruppa gli slot del DB in range consecutivi
    if (daySlots.length > 0) {
        const sortedSlots = daySlots
            .filter(av => av.Stato === 'Disponibile')
            .sort((a, b) => a.Ora_Inizio.localeCompare(b.Ora_Inizio));
        
        let rangeStart = null;
        let rangeEnd = null;
        
        sortedSlots.forEach((slot, index) => {
            const startHour = parseInt(slot.Ora_Inizio.substring(0, 2));
            
            if (rangeStart === null) {
                rangeStart = startHour;
                rangeEnd = startHour + 1;
            } else if (startHour === rangeEnd) {
                rangeEnd = startHour + 1;
            } else {
                // Range terminato, crea elemento
                addRangeToUI(
                    `${String(rangeStart).padStart(2, '0')}:00`,
                    `${String(rangeEnd).padStart(2, '0')}:00`,
                    dayName,
                    true // fromDB
                );
                rangeStart = startHour;
                rangeEnd = startHour + 1;
            }
            
            if (index === sortedSlots.length - 1) {
                addRangeToUI(
                    `${String(rangeStart).padStart(2, '0')}:00`,
                    `${String(rangeEnd).padStart(2, '0')}:00`,
                    dayName,
                    true // fromDB
                );
            }
        });
    }
    
    // Carica anche i pending range (selezionati ma non ancora salvati)
    const pendingTimes = pendingSlots[dayName] || [];
    if (pendingTimes.length > 0) {
        const sortedPending = [...new Set(pendingTimes)].sort();
        let rangeStart = null;
        let rangeEnd = null;
        
        sortedPending.forEach((time, index) => {
            const hour = parseInt(time.substring(0, 2));
            
            if (rangeStart === null) {
                rangeStart = hour;
                rangeEnd = hour + 1;
            } else if (hour === rangeEnd) {
                rangeEnd = hour + 1;
            } else {
                addRangeToUI(
                    `${String(rangeStart).padStart(2, '0')}:00`,
                    `${String(rangeEnd).padStart(2, '0')}:00`,
                    dayName,
                    false // fromDB
                );
                rangeStart = hour;
                rangeEnd = hour + 1;
            }
            
            if (index === sortedPending.length - 1) {
                addRangeToUI(
                    `${String(rangeStart).padStart(2, '0')}:00`,
                    `${String(rangeEnd).padStart(2, '0')}:00`,
                    dayName,
                    false // fromDB
                );
            }
        });
    }
}

function addRangeToUI(startTime, endTime, dayName, fromDB) {
    const rangesList = document.getElementById('time-ranges-list');
    const rangeId = `range-${Date.now()}-${Math.random()}`;
    const rangeElement = document.createElement('div');
    rangeElement.className = `time-range-item ${fromDB ? 'from-db' : ''}`;
    rangeElement.id = rangeId;
    
    if (fromDB) {
        rangeElement.innerHTML = `
            <span>${startTime} - ${endTime}</span>
            <span class="db-badge">Salvato</span>
        `;
    } else {
        rangeElement.innerHTML = `
            <span>${startTime} - ${endTime}</span>
            <button class="remove-range-btn" onclick="removeTimeRange('${rangeId}', '${dayName}')">✕</button>
        `;
    }
    rangesList.appendChild(rangeElement);
}

function toggleTimeSlot(slot) {
    // Funzione mantenuta per compatibilità ma non più usata
}

async function saveWeeklyAvailability() {
    console.log('=== saveWeeklyAvailability START ===');
    console.log('selectedWeekdays:', selectedWeekdays);
    console.log('pendingSlots:', pendingSlots);
    
    if (selectedWeekdays.length === 0) {
        alert('Seleziona almeno un giorno della settimana');
        return;
    }
    
    // Salva gli slot del giorno attualmente in modifica
    if (currentEditingDay) {
        savePendingSlotsForDay(currentEditingDay);
    }
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    
    // Mappa i nomi dei giorni al numero (1-7)
    const dayNameToNumber = {
        'Lunedì': 1,
        'Martedì': 2,
        'Mercoledì': 3,
        'Giovedì': 4,
        'Venerdì': 5,
        'Sabato': 6,
        'Domenica': 7
    };
    
    // Raccogli tutti gli slot di tutti i giorni selezionati
    const allAvailableSlots = [];
    
    selectedWeekdays.forEach(dayName => {
        const daySlots = pendingSlots[dayName] || [];
        console.log(`Elaborando ${dayName}: ${daySlots.length} slot pendenti`);
        
        if (daySlots.length > 0) {
            const giornumber = dayNameToNumber[dayName];
            console.log(`${dayName} -> numero giorno: ${giornumber}`);
            
            daySlots.forEach(time => {
                const hour = parseInt(time.split(':')[0]);
                const slot = {
                    giorno: giornumber,
                    ora_inizio: time + ':00',
                    ora_fine: `${String(hour + 1).padStart(2, '0')}:00:00`
                };
                console.log('  Aggiungendo slot:', slot);
                allAvailableSlots.push(slot);
            });
        }
    });
    
    if (allAvailableSlots.length === 0) {
        alert('Seleziona almeno uno slot orario per i giorni selezionati');
        return;
    }
    
    console.log('Payload da inviare:', { disponibilita: allAvailableSlots });
    console.log('=== Invio POST ===');
    
    try {
        const response = await fetch(`http://localhost:3000/api/mentor/availability/${user.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ disponibilita: allAvailableSlots })
        });
        
        console.log('POST Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Errore risposta:', response.status, errorText);
            throw new Error(`Errore nel salvataggio: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log('=== saveWeeklyAvailability SUCCESS ===');
        console.log('Risposta dal server:', responseData);
        
        const totalSlotsBeforeSave = Object.values(weeklyAvailability).reduce((sum, slots) => sum + slots.length, 0);
        
        alert(`Disponibilità salvata con successo! ${allAvailableSlots.length} slot aggiunti per ${selectedWeekdays.length} ${selectedWeekdays.length === 1 ? 'giorno' : 'giorni'}.`);
        
        // Reset selezione e pending slots
        selectedWeekdays = [];
        currentEditingDay = null;
        ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].forEach(day => {
            pendingSlots[day] = [];
        });
        
        // Ricarica i dati dal DB
        await loadWeeklyAvailability();
        
        // Reset UI
        document.querySelectorAll('.weekday-card.selected, .weekday-card.editing').forEach(el => {
            el.classList.remove('selected', 'editing');
        });
        document.getElementById('selected-date-title').textContent = 'Seleziona un giorno della settimana';
        
        const timeSlotsGrid = document.getElementById('time-slots-grid');
        timeSlotsGrid.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('available', 'booked');
        });
        
        // Se questa è la prima disponibilità salvata, offri di andare alla dashboard
        if (totalSlotsBeforeSave === 0) {
            const goToDashboard = confirm('Disponibilità impostata! Vuoi andare alla tua dashboard?');
            if (goToDashboard) {
                window.location.href = '/pages/dashboardMentor.html';
            }
        }
        
    } catch (error) {
        console.error('Errore nel salvataggio:', error);
        alert('Errore nel salvataggio della disponibilità');
    }
}
