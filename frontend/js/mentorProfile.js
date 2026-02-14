// Script per visualizzare il profilo di un mentor
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    if (!requireRole('mentee')) return;

    const container = document.querySelector('.profile-container');
    
    // Leggi l'ID del mentor dall'URL (es: mentorProfile.html?id=5)
    const urlParams = new URLSearchParams(window.location.search);
    const mentorId = urlParams.get('id');

    if (!mentorId) {
        container.innerHTML = '<p style="text-align: center; color: red;">Missing mentor ID</p>';
        return;
    }

    try {
        // Chiama l'endpoint ApriProfiloMentor
        const response = await fetch(`/api/mentee/mentor/${mentorId}`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Error loading profile');
        }

        const mentor = result.data;
        console.log('Dati mentor:', mentor); // Debug

        // Renderizza il profilo
        container.innerHTML = renderMentorProfile(mentor);
        setupBookingControls(mentor);

    } catch (error) {
        console.error('Error loading profile:', error);
        container.innerHTML = `<p style="text-align: center; color: red;">Error: ${error.message}</p>`;
    }
});

function renderMentorProfile(mentor) {
    // Iniziali per l'avatar
    const initials = (mentor.Nome?.[0] || '') + (mentor.Cognome?.[0] || '');
    
    // Rating
    const rating = parseFloat(mentor.media_recensioni) || 0;
    const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    const reviewCount = mentor.numero_recensioni || 0;
    const reviewUrl = buildReviewUrlForMentor(mentor);
    
    // Prezzo
    const price = mentor.Prezzo ? `€${mentor.Prezzo}` : 'Price on request';
    
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
                <a href="${reviewUrl}" class="profile-rating review-link" title="Add a review">${stars} ${rating.toFixed(1)} (${reviewCount} reviews)</a>
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
                        View CV
                    </a>
                </div>
            </div>
        ` : ''}

        <div class="section">
            <div class="section-title">Book a Session</div>
            ${mentor.disponibilita && mentor.disponibilita.length > 0 ? `
                <div class="mentor-calendar">
                    <div class="calendar-header">
                        <button type="button" class="calendar-nav" id="calendar-prev" aria-label="Previous month">←</button>
                        <div class="calendar-month" id="calendar-month-label"></div>
                        <button type="button" class="calendar-nav" id="calendar-next" aria-label="Next month">→</button>
                    </div>
                    <div class="calendar-weekdays">
                        ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
                            <div class="calendar-weekday">${day}</div>
                        `).join('')}
                    </div>
                    <div class="calendar-grid" id="calendar-grid"></div>
                </div>
            ` : `
                <div class="section-text">No availability yet.</div>
            `}
        </div>

        <div class="section">
            <div class="section-title">Select Time</div>
            <div class="availability-grid booking-selects">
                <div class="stat-card booking-time-card is-hidden" id="booking-time-card">
                    <div class="time-selects">
                        <div>
                            <div class="select-label">Start time</div>
                            <select id="booking-start-time" class="booking-select" disabled>
                                <option value="">Select start</option>
                            </select>
                        </div>
                        <div>
                            <div class="select-label">End time</div>
                            <select id="booking-end-time" class="booking-select" disabled>
                                <option value="">Select end</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <button type="button" class="book-btn is-disabled" id="book-session-btn" disabled>Book a Session</button>
        </div>
    `;
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

function renderAvailabilityByDay(slots) {
    // Mappa numeri giorni a nomi italiani
    const dayNames = {
        '0': 'Sunday',
        '1': 'Monday',
        '2': 'Tuesday',
        '3': 'Wednesday',
        '4': 'Thursday',
        '5': 'Friday',
        '6': 'Saturday'
    };

    // Raggruppa gli slot per giorno
    const slotsByDay = {};
    slots.forEach(slot => {
        const dayNum = String(slot.Giorno);
        const dayName = dayNames[dayNum] || `Day ${dayNum}`;
        
        if (!slotsByDay[dayName]) {
            slotsByDay[dayName] = [];
        }
        slotsByDay[dayName].push({
            inizio: slot.Ora_Inizio,
            fine: slot.Ora_Fine
        });
    });

    // Ordina i giorni secondo l'ordine della settimana
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedDays = Object.keys(slotsByDay).sort((a, b) => {
        return dayOrder.indexOf(a) - dayOrder.indexOf(b);
    });

    return sortedDays.map(dayName => {
        const times = slotsByDay[dayName];
        return `
            <div class="stat-card" style="text-align: center;">
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

function setupBookingControls(mentor) {
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarLabel = document.getElementById('calendar-month-label');
    const calendarPrev = document.getElementById('calendar-prev');
    const calendarNext = document.getElementById('calendar-next');
    const startSelect = document.getElementById('booking-start-time');
    const endSelect = document.getElementById('booking-end-time');
    const timeCard = document.getElementById('booking-time-card');
    const bookBtn = document.getElementById('book-session-btn');

    if (!calendarGrid || !calendarLabel || !calendarPrev || !calendarNext || !startSelect || !endSelect || !timeCard || !bookBtn) return;

    const availabilityByDay = buildAvailabilityByDay(mentor.disponibilita);
    const availableDays = Object.keys(availabilityByDay);

    if (availableDays.length === 0) {
        calendarGrid.innerHTML = '<div class="calendar-empty">No availability</div>';
        calendarPrev.disabled = true;
        calendarPrev.classList.add('is-disabled');
        calendarNext.disabled = true;
        calendarNext.classList.add('is-disabled');
        startSelect.disabled = true;
        endSelect.disabled = true;
        timeCard.classList.add('is-hidden');
        setBookButtonState(bookBtn, false);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    let selectedDateIso = '';

    const resetTimeSelection = () => {
        startSelect.innerHTML = '<option value="">Select start</option>';
        startSelect.disabled = true;
        endSelect.innerHTML = '<option value="">Select end</option>';
        endSelect.disabled = true;
        timeCard.classList.add('is-hidden');
        setBookButtonState(bookBtn, false);
    };

    const updateTimesForDate = (isoDate) => {
        const date = parseIsoDate(isoDate);
        const dayOfWeek = date.getDay();
        const slots = availabilityByDay[dayOfWeek] || [];
        const startTimes = extractStartTimesWithDuration(slots, 60);

        startSelect.innerHTML = '<option value="">Select start</option>' + startTimes.map(time => {
            return `<option value="${time}">${time}</option>`;
        }).join('');
        startSelect.disabled = startTimes.length === 0;
        endSelect.innerHTML = '<option value="">Select end</option>';
        endSelect.disabled = true;
        timeCard.classList.remove('is-hidden');
        setBookButtonState(bookBtn, false);
    };

    const renderCalendar = () => {
        const monthLabel = currentMonth.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric'
        });
        calendarLabel.textContent = monthLabel;
        calendarGrid.innerHTML = '';
        calendarPrev.disabled = currentMonth.getTime() <= minMonth.getTime();
        calendarPrev.classList.toggle('is-disabled', calendarPrev.disabled);

        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const offset = (firstDay.getDay() + 6) % 7;

        for (let i = 0; i < offset; i += 1) {
            calendarGrid.insertAdjacentHTML('beforeend', '<div class="calendar-day is-empty"></div>');
        }

        for (let day = 1; day <= lastDay.getDate(); day += 1) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isoDate = formatIsoDate(date);
            const isPast = date < tomorrow;
            const hasAvailability = !isPast && (availabilityByDay[date.getDay()] || []).length > 0;
            const classes = ['calendar-day'];

            if (hasAvailability) {
                classes.push('has-availability');
            } else {
                classes.push('is-disabled');
            }

            if (isoDate === selectedDateIso) {
                classes.push('is-selected');
            }

            calendarGrid.insertAdjacentHTML(
                'beforeend',
                `<button type="button" class="${classes.join(' ')}" data-iso="${isoDate}" ${hasAvailability ? '' : 'disabled'}>${day}</button>`
            );
        }
    };

    calendarGrid.addEventListener('click', (event) => {
        const target = event.target.closest('.calendar-day');
        if (!target || !target.dataset.iso || target.disabled) return;

        selectedDateIso = target.dataset.iso;
        updateTimesForDate(selectedDateIso);
        renderCalendar();
    });

    calendarNext.addEventListener('click', () => {
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        selectedDateIso = '';
        resetTimeSelection();
        renderCalendar();
    });

    calendarPrev.addEventListener('click', () => {
        if (currentMonth.getTime() <= minMonth.getTime()) return;
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        selectedDateIso = '';
        resetTimeSelection();
        renderCalendar();
    });

    startSelect.addEventListener('change', () => {
        const startValue = startSelect.value;
        if (!startValue) {
            endSelect.innerHTML = '<option value="">Select end</option>';
            endSelect.disabled = true;
            setBookButtonState(bookBtn, false);
            return;
        }

        const dayOfWeek = parseIsoDate(selectedDateIso).getDay();
        const slots = availabilityByDay[dayOfWeek] || [];
        const endTimes = extractEndTimesForStart(slots, startValue, 60);

        endSelect.innerHTML = '<option value="">Select end</option>' + endTimes.map(time => {
            return `<option value="${time}">${time}</option>`;
        }).join('');
        endSelect.disabled = endTimes.length === 0;
        setBookButtonState(bookBtn, false);
    });

    endSelect.addEventListener('change', () => {
        setBookButtonState(bookBtn, Boolean(selectedDateIso && startSelect.value && endSelect.value));
    });

    bookBtn.addEventListener('click', async () => {
        if (bookBtn.disabled) return;
        await submitBooking(mentor, selectedDateIso, startSelect.value, endSelect.value);
    });

    resetTimeSelection();
    renderCalendar();
}

function buildAvailabilityByDay(slots) {
    const map = {};
    if (!Array.isArray(slots)) return map;

    slots.forEach(slot => {
        const day = normalizeSlotDay(slot.Giorno);
        if (day === null) return;
        if (!map[day]) {
            map[day] = [];
        }
        map[day].push(slot);
    });

    return map;
}

function normalizeSlotDay(dayValue) {
    const dayNum = Number(dayValue);
    if (Number.isNaN(dayNum)) return null;
    if (dayNum === 7) return 0;
    return dayNum;
}

function generateAvailableDays(count) {
    const days = [];
    const today = new Date();

    for (let i = 0; i < count; i += 1) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        days.push({
            iso: date.toISOString().split('T')[0],
            full: date,
            dayOfWeek: date.getDay()
        });
    }

    return days;
}

function formatDateLabel(date) {
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    });
}

function getDayOfWeekFromIso(isoDate) {
    const date = new Date(isoDate);
    return date.getDay();
}

function formatIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseIsoDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function parseTimeToMinutes(timeValue) {
    const [hours, minutes] = timeValue.split(':').map(Number);
    return (hours * 60) + minutes;
}

function formatMinutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getDurationMinutes(startTime, endTime) {
    const start = parseTimeToMinutes(startTime);
    const end = parseTimeToMinutes(endTime);
    return Math.max(end - start, 0);
}

function calculateSessionPrice(hourlyRate, durationMinutes) {
    const safeRate = Number(hourlyRate || 0);
    const safeDuration = Number(durationMinutes || 0);
    if (!Number.isFinite(safeRate) || safeRate <= 0) return 0;
    if (!Number.isFinite(safeDuration) || safeDuration <= 0) return 0;
    return Number(((safeRate * safeDuration) / 60).toFixed(2));
}

function calculatePlatformFee(grossAmount, feePercent = 15) {
    const gross = Number(grossAmount || 0);
    const percent = Number(feePercent || 0);
    if (!Number.isFinite(gross) || gross <= 0) return 0;
    if (!Number.isFinite(percent) || percent < 0) return 0;
    return Number(((gross * percent) / 100).toFixed(2));
}

function extractStartTimesWithDuration(slots, minMinutes) {
    const times = new Set();

    slots.forEach(slot => {
        if (!slot.Ora_Inizio || !slot.Ora_Fine) return;
        const startMin = parseTimeToMinutes(slot.Ora_Inizio);
        const endMin = parseTimeToMinutes(slot.Ora_Fine);
        const latestStart = endMin - minMinutes;

        for (let t = startMin; t <= latestStart; t += 30) {
            times.add(formatMinutesToTime(t));
        }
    });

    return Array.from(times).sort();
}

function extractEndTimesForStart(slots, startTime, minMinutes) {
    const endTimes = new Set();
    const startMin = parseTimeToMinutes(startTime);

    slots.forEach(slot => {
        if (!slot.Ora_Inizio || !slot.Ora_Fine) return;
        const slotStart = parseTimeToMinutes(slot.Ora_Inizio);
        const slotEnd = parseTimeToMinutes(slot.Ora_Fine);

        if (startMin < slotStart || startMin + minMinutes > slotEnd) return;

        for (let t = startMin + minMinutes; t <= slotEnd; t += 30) {
            endTimes.add(formatMinutesToTime(t));
        }
    });

    return Array.from(endTimes).sort();
}

function setBookButtonState(button, enabled) {
    button.disabled = !enabled;
    button.classList.toggle('is-disabled', !enabled);
}

async function submitBooking(mentor, date, startTime, endTime) {
    if (!date || !startTime || !endTime) {
        alert('Select a date and time range');
        return;
    }

    const hourlyRate = parseFloat(mentor.Prezzo) || 0;
    const durationMinutes = getDurationMinutes(startTime, endTime);
    const sessionPrice = calculateSessionPrice(hourlyRate, durationMinutes);
    const platformFeePercent = 15;
    const platformFeeAmount = calculatePlatformFee(sessionPrice, platformFeePercent);

    if (sessionPrice > 0) {
        const proceedToPayment = window.confirm(
            `This session requires payment.\n\n` +
            `Session amount: €${sessionPrice.toFixed(2)}\n` +
            `Platform fee (${platformFeePercent}%): €${platformFeeAmount.toFixed(2)} (included)\n\n` +
            `By confirming, the booking will be created and you will continue to payment. ` +
            `If the mentor cancels, you will receive a refund.`
        );

        if (!proceedToPayment) {
            return;
        }
    }

    const bookingData = {
        id_mentor: mentor.Id_Utente,
        giorno: date,
        ora_inizio: startTime,
        ora_fine: endTime
    };

    try {
        const response = await fetch('/api/mentee/booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken() || ''}`
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (result.success) {
            const booking = result.data;

            if (sessionPrice > 0) {
                const pendingPayment = {
                    prenotazioneId: booking.Id,
                    mentorId: mentor.Id_Utente,
                    mentorNome: mentor.Nome,
                    mentorCognome: mentor.Cognome,
                    data: date,
                    oraInizio: startTime,
                    oraFine: endTime,
                    durataMinuti: durationMinutes,
                    tariffaOraria: Number(hourlyRate.toFixed(2)),
                    prezzo: sessionPrice,
                    feePercent: platformFeePercent,
                    feeAmount: platformFeeAmount
                };
                sessionStorage.setItem('pendingPayment', JSON.stringify(pendingPayment));
                window.location.href = '/pages/payment.html';
            } else {
                alert('Booking confirmed! No payment required for this session.');
                window.location.href = '/pages/dashboardMentee.html';
            }
        } else {
            alert('Error: ' + (result.message || 'Unable to book session'));
        }
    } catch (error) {
        console.error('Booking error:', error);
        alert('Booking error: ' + error.message);
    }
}
