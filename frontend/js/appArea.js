// My Sessions (Mentee) page
let currentUser = null;

window.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  if (!requireRole('mentee')) return;

  currentUser = getCurrentUser();
  setupTabs();
  loadAppointments();
});

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.target;
      ['upcomingSection', 'pastSection', 'cancelledSection'].forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = (id === target) ? 'block' : 'none';
      });
    });
  });
}

async function loadAppointments() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  try {
    const res = await fetch('http://localhost:3000/api/mentee/appointments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const appointments = data.data || [];
    renderAppointments(appointments);
  } catch (err) {
    console.error('Error loading appointments:', err);
    showEmpty('upcoming');
    showEmpty('past');
    showEmpty('cancelled');
  }
}

function renderAppointments(list) {
  const categorized = { upcoming: [], past: [], cancelled: [] };
  const now = new Date();

  list.forEach(item => {
    const statusRaw = (item.Stato || '').toLowerCase();
    const sessionDay = getAppointmentDayDate(item);

    const isCancelled = statusRaw.includes('cancel');
    if (isCancelled) {
      categorized.cancelled.push(item);
      return;
    }

    const sessionEnd = getAppointmentEndDate(item);
    const isPastByDateTime = sessionEnd
      ? sessionEnd < now
      : (sessionDay ? sessionDay < new Date(now.getFullYear(), now.getMonth(), now.getDate()) : false);

    if (isPastByDateTime) {
      categorized.past.push(item);
    } else {
      categorized.upcoming.push(item);
    }
  });

  categorized.upcoming.sort(compareByStartAsc);
  categorized.past.sort(compareByStartDesc);
  categorized.cancelled.sort(compareByStartAsc);

  updateSection('upcoming', categorized.upcoming);
  updateSection('past', categorized.past);
  updateSection('cancelled', categorized.cancelled);
}

function updateSection(key, items) {
  const listEl = document.getElementById(`list-${key}`);
  const emptyEl = document.getElementById(`empty-${key}`);
  const countEl = document.getElementById(`count-${key}`);

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
    const mentorName = `${app.mentor_nome || ''} ${app.mentor_cognome || ''}`.trim();
    const initials = getInitials(app.mentor_nome, app.mentor_cognome);
    const price = Number(app.Prezzo || 0);
    const duration = app.Durata || 60;
    const dateLabel = formatDate(app.Giorno);
    const startTime = app.Ora_Inizio || app.Ora || '';
    const endTime = app.Ora_Fine || '';
    const timeLabel = startTime && endTime ? `${startTime} - ${endTime}` : startTime;

    const statusInfo = mapStatusForSection(app.Stato, key);
    const showStatus = key !== 'past';
    const meetingLink = getMeetingLink(app);

    const card = document.createElement('div');
    card.className = 'session-card';
    card.innerHTML = `
      <div class="session-header">
        <div class="session-avatar">${initials}</div>
        <div class="session-info">
          <div class="session-mentor">${mentorName || 'Mentor'}</div>
          <div class="session-title">${app.Settore || 'Mentoring Session'}</div>
          <div class="session-datetime">
            <span>📅 ${dateLabel}</span>
            <span>🕐 ${timeLabel}</span>
          </div>
        </div>
        ${showStatus ? `<span class="session-status ${statusInfo.className}">${statusInfo.label}</span>` : ''}
      </div>
      <div class="session-details">
        <div class="detail-item"><span class="detail-icon">⏱️</span><span>Duration: ${duration} min</span></div>
        <div class="detail-item"><span class="detail-icon">💻</span><span>${meetingLink ? 'Google Meet ready' : 'Video Call (pending)'}</span></div>
        <div class="detail-item"><span class="detail-icon">💰</span><span>€${price.toFixed(2)}</span></div>
        <div class="detail-item"><span class="detail-icon">🔗</span><span>${meetingLink ? `<a href="${meetingLink}" target="_blank" rel="noopener noreferrer">Open link</a>` : 'Not available yet'}</span></div>
      </div>
      <div class="session-actions">
        ${actionButtons(app, key)}
      </div>
    `;

    listEl.appendChild(card);
  });
}

function getInitials(n, c) {
  return `${(n || '').charAt(0)}${(c || '').charAt(0)}`.toUpperCase() || 'MM';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function mapStatusForSection(stato, sectionKey) {
  const s = (stato || '').toLowerCase();
  if (sectionKey === 'upcoming') {
    if (s.includes('accepted') || s.includes('conferm')) {
      return { label: 'Confirmed', className: 'status-confirmed' };
    }
    return { label: 'Waiting list', className: 'status-upcoming' };
  }
  if (s.includes('cancel')) return { label: 'Cancelled', className: 'status-cancelled' };
  if (s.includes('completato')) return { label: 'Completed', className: 'status-completed' };
  return { label: 'Scheduled', className: 'status-upcoming' };
}

function actionButtons(app, sectionKey) {
  const idMentor = app.Id_Mentor || app.id_mentor;
  const mentorUserId = idMentor;
  const mentorName = app.mentor_nome || '';
  const mentorCognome = app.mentor_cognome || '';
  const isAccepted = isAcceptedStatus(app?.Stato);
  const meetingLink = getMeetingLink(app);
  
  // Costruisci URL chat con parametri
  const chatParams = new URLSearchParams({
    userId: mentorUserId || '',
    userName: mentorName,
    userCognome: mentorCognome
  });
  const chatLink = `/pages/chat.html?${chatParams.toString()}`;

  if (sectionKey === 'upcoming') {
    const joinDisabled = !isAccepted || !meetingLink;
    const joinAction = meetingLink ? `onclick="window.open('${encodeURI(meetingLink)}','_blank','noopener,noreferrer')"` : '';
    return `
      <button class="action-btn btn-secondary" ${joinAction} ${joinDisabled ? 'disabled title="Available when booking is accepted and link is generated"' : ''}>Join Session</button>
      <button class="action-btn btn-secondary" onclick="window.location.href='${chatLink}'">Message</button>
      <button class="action-btn btn-danger" onclick="cancelSession(${app.Id})">Cancel</button>
    `;
  }

  if (sectionKey === 'past') {
    return mentorUserId
      ? `<button class="action-btn btn-secondary" onclick="window.location.href='${buildReviewUrl(app)}'">Add Review</button>`
      : '';
  }

  return `<button class="action-btn btn-secondary" onclick="window.location.href='${chatLink}'">Message</button>`;
}

function buildReviewUrl(app) {
  const mentorName = `${app.mentor_nome || ''} ${app.mentor_cognome || ''}`.trim();
  const params = new URLSearchParams({
    mentorId: app.Id_Mentor || app.id_mentor || '',
    mentorName,
    settore: app.Settore || '',
    date: app.Giorno || '',
    time: app.Ora_Inizio || app.Ora || '',
    duration: String(app.Durata || ''),
    topic: app.Note || ''
  });
  return `/pages/reviewsMentee.html?${params.toString()}`;
}

function showEmpty(key) {
  const listEl = document.getElementById(`list-${key}`);
  const emptyEl = document.getElementById(`empty-${key}`);
  if (listEl) listEl.style.display = 'none';
  if (emptyEl) emptyEl.style.display = 'block';
}

async function cancelSession(appointmentId) {
  if (!confirm('Are you sure you want to cancel this session?')) {
    return;
  }

  const token = getToken();
  try {
    const res = await fetch(`http://localhost:3000/api/mentee/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to cancel session');
    }

    alert('Session cancelled successfully');
    loadAppointments(); // Reload to show updated status
  } catch (err) {
    console.error('Error cancelling session:', err);
    alert('Error cancelling session: ' + err.message);
  }
}

function getAppointmentStartDate(appointment) {
  const rawDay = appointment?.Giorno;
  const rawStartTime = appointment?.Ora_Inizio || appointment?.Ora || '00:00';

  if (!rawDay) return null;

  const day = normalizeDayToISO(rawDay);
  if (!day) return null;

  const time = normalizeTimeToHHMMSS(rawStartTime);
  const isoDateTime = `${day}T${time}`;
  const parsed = new Date(isoDateTime);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getAppointmentEndDate(appointment) {
  const rawDay = appointment?.Giorno;
  if (!rawDay) return null;

  const day = normalizeDayToISO(rawDay);
  if (!day) return null;

  const endTimeRaw = appointment?.Ora_Fine;
  const startTimeRaw = appointment?.Ora_Inizio || appointment?.Ora || '00:00';
  const durationMinutes = Number(appointment?.Durata || appointment?.durata || 60);

  const endTime = endTimeRaw
    ? normalizeTimeToHHMMSS(endTimeRaw)
    : addMinutesToTime(
      String(startTimeRaw).slice(0, 5),
      Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 60
    ) + ':00';

  const isoDateTime = `${day}T${endTime}`;
  const parsed = new Date(isoDateTime);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getAppointmentDayDate(appointment) {
  const rawDay = appointment?.Giorno;
  const day = normalizeDayToISO(rawDay);
  if (!day) return null;

  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function normalizeDayToISO(rawDay) {
  if (!rawDay) return null;

  if (rawDay instanceof Date) {
    if (Number.isNaN(rawDay.getTime())) return null;
    return `${rawDay.getFullYear()}-${String(rawDay.getMonth() + 1).padStart(2, '0')}-${String(rawDay.getDate()).padStart(2, '0')}`;
  }

  const str = String(rawDay).trim();
  if (!str) return null;

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }

  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function normalizeTimeToHHMMSS(rawTime) {
  const str = String(rawTime || '').trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return '00:00:00';

  const hh = String(Math.min(23, Number(match[1]))).padStart(2, '0');
  const mm = String(Math.min(59, Number(match[2]))).padStart(2, '0');
  const ss = String(Math.min(59, Number(match[3] || 0))).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function isAcceptedStatus(stato) {
  const s = String(stato || '').toLowerCase();
  return s.includes('accepted') || s.includes('conferm');
}

function getAppointmentStartTimestamp(appointment) {
  const rawDay = appointment?.Giorno || appointment?.giorno;
  const rawStart = appointment?.Ora_Inizio || appointment?.Ora || appointment?.ora || '00:00';
  if (!rawDay) return Number.MAX_SAFE_INTEGER;

  const dateIso = String(rawDay).slice(0, 10);
  const timeMatch = String(rawStart).match(/^(\d{1,2}):(\d{2})/);
  const hh = timeMatch ? String(Math.min(23, Number(timeMatch[1]))).padStart(2, '0') : '00';
  const mm = timeMatch ? String(Math.min(59, Number(timeMatch[2]))).padStart(2, '0') : '00';
  const parsed = new Date(`${dateIso}T${hh}:${mm}:00`);

  return Number.isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
}

function compareByStartAsc(a, b) {
  return getAppointmentStartTimestamp(a) - getAppointmentStartTimestamp(b);
}

function compareByStartDesc(a, b) {
  return getAppointmentStartTimestamp(b) - getAppointmentStartTimestamp(a);
}

function getMeetingLink(appointment) {
  return appointment?.Link || appointment?.link || appointment?.meeting_link || '';
}
