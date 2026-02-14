// Script per la gestione della disponibilità settimanale del mentor
let selectedWeekdays = []; // Array of selected days
let currentEditingDay = null; // Day currently being edited
let weeklyAvailability = {}; // {Monday: [...slots from DB], Tuesday: [...], etc}
let pendingRanges = {}; // {Monday: [{start:'09:30', end:'12:45'}], ...}
let removedDbRanges = {}; // {Monday: [{start:'09:00', end:'10:00'}], ...}
let toastTimeoutId = null;
let saveAvailabilityBtn = null;

const dayNameToNumber = {
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 7
};

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    if (!requireRole('mentor')) return;
    
    // Inizializza calendario settimanale
    initWeeklyCalendar();
    
    // Carica disponibilità dal server
    loadWeeklyAvailability();
    
    // Gestisci il save button
    saveAvailabilityBtn = document.querySelector('.availability-container .submit-btn');
    if (saveAvailabilityBtn) {
        saveAvailabilityBtn.addEventListener('click', saveWeeklyAvailability);
    }

    updateSaveButtonState();
});

function hasUnsavedChanges() {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return dayNames.some(day => (pendingRanges[day] && pendingRanges[day].length > 0)
        || (removedDbRanges[day] && removedDbRanges[day].length > 0));
}

function updateSaveButtonState() {
    if (!saveAvailabilityBtn) {
        saveAvailabilityBtn = document.querySelector('.availability-container .submit-btn');
    }

    if (!saveAvailabilityBtn) return;

    const canSave = hasUnsavedChanges();
    saveAvailabilityBtn.disabled = !canSave;
    saveAvailabilityBtn.classList.toggle('is-disabled', !canSave);
    saveAvailabilityBtn.setAttribute('aria-disabled', String(!canSave));
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('availability-toast');
    if (!toastEl) {
        alert(message);
        return;
    }

    toastEl.textContent = message;
    toastEl.classList.remove('error', 'info', 'show');
    if (type === 'error') toastEl.classList.add('error');
    if (type === 'info') toastEl.classList.add('info');

    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    requestAnimationFrame(() => toastEl.classList.add('show'));

    toastTimeoutId = setTimeout(() => {
        toastEl.classList.remove('show');
    }, 2600);
}

async function loadWeeklyAvailability() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    
    try {
        const response = await fetch(`/api/mentor/availability/${user.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error loading availability');
        }
        
        const availabilityData = await response.json();
        console.log('Availability loaded:', availabilityData);
        
        // Gestisci sia un array che un singolo oggetto (per retrocompatibilità)
        const dataArray = Array.isArray(availabilityData) ? availabilityData : (availabilityData ? [availabilityData] : []);
        
        // Organizza per giorno della settimana
        weeklyAvailability = {
            'Monday': [],
            'Tuesday': [],
            'Wednesday': [],
            'Thursday': [],
            'Friday': [],
            'Saturday': [],
            'Sunday': []
        };
        
        // Mappa numero giorno (1-7) a nome giorno
        const numberToDayName = {
            1: 'Monday',
            2: 'Tuesday',
            3: 'Wednesday',
            4: 'Thursday',
            5: 'Friday',
            6: 'Saturday',
            7: 'Sunday'
        };
        
        dataArray.forEach(slot => {
            const dayNumber = slot.Giorno;
            const dayName = numberToDayName[dayNumber];
            
            if (dayName && weeklyAvailability[dayName]) {
                weeklyAvailability[dayName].push(slot);
            }
        });
        
        console.log('Availability organized:', weeklyAvailability);
        updateWeekdayIndicators();
        updateSaveButtonState();
        
    } catch (error) {
        console.error('Error loading availability:', error);
    }
}

function initWeeklyCalendar() {
    const weekdayCards = document.querySelectorAll('.weekday-card');
    const multiDayCheckbox = document.getElementById('multi-day-checkbox');
    
    // Initialize pendingRanges for all days
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
        pendingRanges[day] = [];
        removedDbRanges[day] = [];
    });
    
    weekdayCards.forEach(card => {
        card.addEventListener('click', () => {
            const dayName = card.dataset.day;
            toggleWeekdaySelection(dayName, card);
        });
    });

    if (multiDayCheckbox) {
        multiDayCheckbox.addEventListener('change', () => {
            if (!multiDayCheckbox.checked && selectedWeekdays.length > 1) {
                const keepDay = currentEditingDay || selectedWeekdays[0];
                selectedWeekdays = keepDay ? [keepDay] : [];

                document.querySelectorAll('.weekday-card').forEach(card => {
                    const isSelected = keepDay && card.dataset.day === keepDay;
                    card.classList.toggle('selected', Boolean(isSelected));
                    card.classList.toggle('editing', Boolean(isSelected));
                });

                currentEditingDay = keepDay || null;
                updateSelectedTitle();
                if (currentEditingDay) loadTimeSlotsForWeekday(currentEditingDay);
            }
        });
    }
    
    generateTimeSlots();
}

function toggleWeekdaySelection(dayName, cardElement) {
    const multiDayEnabled = isMultiDaySelectionEnabled();

    // If the day is already selected/editing, deselect it
    if (selectedWeekdays.includes(dayName)) {
        selectedWeekdays = selectedWeekdays.filter(day => day !== dayName);
        cardElement.classList.remove('selected', 'editing');
        
        // If this was the editing day, switch to another selected day or reset
        if (currentEditingDay === dayName) {
            if (selectedWeekdays.length > 0) {
                // Load the first remaining day
                const nextDay = selectedWeekdays[0];
                const nextCard = document.querySelector(`[data-day="${nextDay}"]`);
                currentEditingDay = nextDay;
                nextCard.classList.add('editing');
                loadTimeSlotsForWeekday(nextDay);
            } else {
                currentEditingDay = null;
                generateTimeSlots();
            }
        }

        updateSelectedTitle();
        return;
    }
    
    // If the day is not selected, add it
    if (!multiDayEnabled) {
        selectedWeekdays = [];
        document.querySelectorAll('.weekday-card.selected, .weekday-card.editing').forEach(el => {
            el.classList.remove('selected', 'editing');
        });
    }
    
    selectedWeekdays.push(dayName);
    cardElement.classList.add('selected');
    
    // Remove editing class from all cards
    document.querySelectorAll('.weekday-card.editing').forEach(el => {
        el.classList.remove('editing');
    });
    
    // Set as current editing day
    currentEditingDay = dayName;
    cardElement.classList.add('editing');
    updateSelectedTitle();
    
    // Carica time slots per questo giorno della settimana
    loadTimeSlotsForWeekday(dayName);
}

function isMultiDaySelectionEnabled() {
    return Boolean(document.getElementById('multi-day-checkbox')?.checked);
}

function updateSelectedTitle() {
    const titleEl = document.getElementById('selected-date-title');
    if (!titleEl) return;

    if (!currentEditingDay) {
        titleEl.textContent = 'Select a day of the week';
        return;
    }

    const selectedCount = selectedWeekdays.length;
    titleEl.textContent = `Availability for ${currentEditingDay} (${selectedCount} ${selectedCount === 1 ? 'day selected' : 'days selected'})`;
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
                <label for="time-start">Start Time</label>
                <input type="time" id="time-start" value="09:00" min="09:00" max="20:00" />
            </div>
            <div class="time-input-group">
                <label for="time-end">End Time</label>
                <input type="time" id="time-end" value="10:00" min="09:00" max="20:00" />
            </div>
            <button id="add-time-range-btn" class="action-btn btn-secondary">+ Add time range</button>
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
        showToast('Select a start and end time', 'info');
        return;
    }
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startMinutes = (startHour * 60) + startMinute;
    const endMinutes = (endHour * 60) + endMinute;
    
    if (startMinutes >= endMinutes) {
        showToast('End time must be after start time', 'info');
        return;
    }

    const targetDays = isMultiDaySelectionEnabled()
        ? [...selectedWeekdays]
        : (currentEditingDay ? [currentEditingDay] : []);

    if (targetDays.length === 0) {
        showToast('Select at least one day of the week', 'info');
        return;
    }

    targetDays.forEach(dayName => {
        if (!pendingRanges[dayName]) pendingRanges[dayName] = [];

        const exists = pendingRanges[dayName].some(range => range.start === startTime && range.end === endTime);
        if (!exists) {
            pendingRanges[dayName].push({ start: startTime, end: endTime });
        }
    });

    updateSaveButtonState();

    if (currentEditingDay) {
        loadTimeSlotsForWeekday(currentEditingDay);
    }
    
    // Reset input
    startInput.value = endTime;
    const nextHour = Math.min(20, endHour + 1);
    endInput.value = `${String(nextHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}

function removeTimeRange(dayName, startTime, endTime) {
    if (!pendingRanges[dayName]) return;
    pendingRanges[dayName] = pendingRanges[dayName].filter(range => !(range.start === startTime && range.end === endTime));
    updateSaveButtonState();

    if (currentEditingDay === dayName) {
        loadTimeSlotsForWeekday(dayName);
    }
}

function removeSavedRange(dayName, startTime, endTime, shouldRefresh = true, queueDelete = true, markDirty = true) {
    const daySlots = weeklyAvailability[dayName] || [];
    weeklyAvailability[dayName] = daySlots.filter(slot => {
        const s = String(slot.Ora_Inizio || '').slice(0, 5);
        const e = String(slot.Ora_Fine || '').slice(0, 5);
        return !(s === startTime && e === endTime);
    });

    if (queueDelete) {
        if (!removedDbRanges[dayName]) removedDbRanges[dayName] = [];
        const alreadyQueued = removedDbRanges[dayName].some(range => range.start === startTime && range.end === endTime);
        if (!alreadyQueued) {
            removedDbRanges[dayName].push({ start: startTime, end: endTime });
        }
    }

    if (markDirty) updateSaveButtonState();
    updateWeekdayIndicators();

    if (shouldRefresh && currentEditingDay === dayName) {
        loadTimeSlotsForWeekday(dayName);
    }
}

function editSavedRange(dayName, startTime, endTime) {
    removeSavedRange(dayName, startTime, endTime, false, true, true);

    if (currentEditingDay === dayName) {
        loadTimeSlotsForWeekday(dayName);
    }

    const startInput = document.getElementById('time-start');
    const endInput = document.getElementById('time-end');
    if (startInput && endInput) {
        startInput.value = startTime;
        endInput.value = endTime;
    }
}

async function deleteSavedRange(dayName, startTime, endTime) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const dayNumber = dayNameToNumber[dayName];

    if (!user?.id || !dayNumber) {
        showToast('Unable to delete this range right now', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/mentor/availability/${user.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                giorno: dayNumber,
                ora_inizio: `${startTime}:00`,
                ora_fine: `${endTime}:00`
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Immediate delete failed:', {
                status: response.status,
                dayName,
                startTime,
                endTime,
                errorBody,
            });
            showToast('Delete failed: range not removed from DB', 'error');
            return;
        }

        if (removedDbRanges[dayName]) {
            removedDbRanges[dayName] = removedDbRanges[dayName].filter(range => !(range.start === startTime && range.end === endTime));
        }

        removeSavedRange(dayName, startTime, endTime, true, false, false);
        showToast('Availability range deleted', 'success');
    } catch (error) {
        console.error('Immediate delete error:', error);
        showToast('Delete failed: connection error', 'error');
    }
}

function loadTimeSlotsForWeekday(dayName) {
    generateTimeSlots(); // Ricrea i time inputs
    
    // Carica i range salvati dal DB
    const daySlots = weeklyAvailability[dayName] || [];
    const rangesList = document.getElementById('time-ranges-list');
    rangesList.innerHTML = '';

    daySlots
        .filter(av => {
            const start = av?.Ora_Inizio || av?.ora_inizio || av?.oraInizio;
            const end = av?.Ora_Fine || av?.ora_fine || av?.oraFine;
            return Boolean(start && end);
        })
        .sort((a, b) => {
            const aStart = String(a?.Ora_Inizio || a?.ora_inizio || '').slice(0, 5);
            const bStart = String(b?.Ora_Inizio || b?.ora_inizio || '').slice(0, 5);
            return aStart.localeCompare(bStart);
        })
        .forEach(slot => {
            const start = String(slot?.Ora_Inizio || slot?.ora_inizio || '').slice(0, 5);
            const end = String(slot?.Ora_Fine || slot?.ora_fine || '').slice(0, 5);
            addRangeToUI(start, end, dayName, true);
        });

    (pendingRanges[dayName] || [])
        .sort((a, b) => a.start.localeCompare(b.start))
        .forEach(range => {
            addRangeToUI(range.start, range.end, dayName, false);
        });
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
            <button class="remove-range-btn" onclick="deleteSavedRange('${dayName}', '${startTime}', '${endTime}')">✕</button>
        `;
    } else {
        rangeElement.innerHTML = `
            <span>${startTime} - ${endTime}</span>
            <button class="remove-range-btn" onclick="removeTimeRange('${dayName}', '${startTime}', '${endTime}')">✕</button>
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
    console.log('pendingRanges:', pendingRanges);
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

    const daysToProcess = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        .filter(day => (pendingRanges[day] && pendingRanges[day].length > 0)
            || (removedDbRanges[day] && removedDbRanges[day].length > 0));

    if (daysToProcess.length === 0) {
        showToast('No changes to save', 'info');
        return;
    }
    
    // Raccogli tutti i range da inserire
    const allAvailableSlots = [];
    
    daysToProcess.forEach(dayName => {
        const dayRanges = pendingRanges[dayName] || [];
        console.log(`Processing ${dayName}: ${dayRanges.length} pending ranges`);
        
        if (dayRanges.length > 0) {
            const giornumber = dayNameToNumber[dayName];
            console.log(`${dayName} -> day number: ${giornumber}`);
            
            dayRanges.forEach(range => {
                const slot = {
                    giorno: giornumber,
                    ora_inizio: `${range.start}:00`,
                    ora_fine: `${range.end}:00`
                };
                console.log('  Adding slot:', slot);
                allAvailableSlots.push(slot);
            });
        }
    });

    const rangesToDelete = [];
    daysToProcess.forEach(dayName => {
        (removedDbRanges[dayName] || []).forEach(range => {
            rangesToDelete.push({ dayName, ...range });
        });
    });
    
    console.log('Payload to send:', { disponibilita: allAvailableSlots });
    console.log('=== POST request ===');
    
    try {
        for (const item of rangesToDelete) {
            const dayNumber = dayNameToNumber[item.dayName];
            const deleteResponse = await fetch(`/api/mentor/availability/${user.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    giorno: dayNumber,
                    ora_inizio: `${item.start}:00`,
                    ora_fine: `${item.end}:00`
                })
            });

            if (!deleteResponse.ok) {
                const errorText = await deleteResponse.text();
                console.error('Delete error:', {
                    status: deleteResponse.status,
                    body: errorText,
                    day: item.dayName,
                    start: item.start,
                    end: item.end,
                });
                throw new Error(`Error deleting range: ${deleteResponse.status}`);
            }
        }

        if (allAvailableSlots.length > 0) {
            const response = await fetch(`/api/mentor/availability/${user.id}`, {
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
                console.error('Response error:', response.status, errorText);
                throw new Error(`Error saving: ${response.status}`);
            }

            const responseData = await response.json();
            console.log('=== saveWeeklyAvailability SUCCESS ===');
            console.log('Server response:', responseData);
        } else {
            console.log('=== saveWeeklyAvailability SUCCESS (delete only) ===');
        }
        
        const totalSlotsBeforeSave = Object.values(weeklyAvailability).reduce((sum, slots) => sum + slots.length, 0);
        
        showToast(`Availability saved! ${allAvailableSlots.length} added, ${rangesToDelete.length} removed.`, 'success');
        
        // Reset selezione e pending slots
        selectedWeekdays = [];
        currentEditingDay = null;
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
            pendingRanges[day] = [];
            removedDbRanges[day] = [];
        });
        updateSaveButtonState();
        
        // Ricarica i dati dal DB
        await loadWeeklyAvailability();
        
        // Reset UI
        document.querySelectorAll('.weekday-card.selected, .weekday-card.editing').forEach(el => {
            el.classList.remove('selected', 'editing');
        });
        updateSelectedTitle();
        generateTimeSlots();
        
        // Se questa è la prima disponibilità salvata, offri di andare alla dashboard
        if (totalSlotsBeforeSave === 0) {
            const goToDashboard = confirm('Availability set! Do you want to go to your dashboard?');
            if (goToDashboard) {
                window.location.href = '/pages/dashboardMentor.html';
            }
        }
        
    } catch (error) {
        console.error('Error saving availability:', error);
        showToast('Error saving availability', 'error');
    }
}
