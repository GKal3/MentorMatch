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
    console.error('Errore caricamento appuntamenti:', err);
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
    const dateStr = item.Giorno ? `${item.Giorno}T${item.Ora || '00:00'}` : null;
    const start = dateStr ? new Date(dateStr) : null;

    const isCancelled = statusRaw.includes('annullato') || statusRaw.includes('rifiutato');
    if (isCancelled) {
      categorized.cancelled.push(item);
      return;
    }

    if (start && start < now) {
      categorized.past.push(item);
    } else {
      categorized.upcoming.push(item);
    }
  });

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
    const timeLabel = app.Ora ? app.Ora : '';

    const statusInfo = mapStatus(app.Stato);

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
        <span class="session-status ${statusInfo.className}">${statusInfo.label}</span>
      </div>
      <div class="session-details">
        <div class="detail-item"><span class="detail-icon">⏱️</span><span>Duration: ${duration} min</span></div>
        <div class="detail-item"><span class="detail-icon">💻</span><span>Video Call</span></div>
        <div class="detail-item"><span class="detail-icon">💰</span><span>€${price.toFixed(2)}</span></div>
      </div>
      <div class="session-actions">
        ${actionButtons(app)}
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

function mapStatus(stato) {
  const s = (stato || '').toLowerCase();
  if (s.includes('accettato') || s.includes('conferm')) return { label: 'Confirmed', className: 'status-confirmed' };
  if (s.includes('attesa') || s.includes('upcoming')) return { label: 'Upcoming', className: 'status-upcoming' };
  if (s.includes('annullato') || s.includes('rifiutato') || s.includes('cancel')) return { label: 'Cancelled', className: 'status-cancelled' };
  if (s.includes('completato')) return { label: 'Completed', className: 'status-completed' };
  return { label: 'Scheduled', className: 'status-upcoming' };
}

function actionButtons(app) {
  const idMentor = app.Id_Mentor || app.id_mentor;
  const mentorUserId = idMentor;
  const mentorName = app.mentor_nome || '';
  const mentorCognome = app.mentor_cognome || '';
  
  // Costruisci URL chat con parametri
  const chatParams = new URLSearchParams({
    userId: mentorUserId || '',
    userName: mentorName,
    userCognome: mentorCognome
  });
  const chatLink = `/pages/chat.html?${chatParams.toString()}`;

  const dateStr = app.Giorno ? `${app.Giorno}T${app.Ora || '00:00'}` : null;
  const start = dateStr ? new Date(dateStr) : null;
  const isPast = start ? start < new Date() : false;
  const isCancelled = ((app.Stato || '').toLowerCase().includes('annullato') || (app.Stato || '').toLowerCase().includes('rifiutato'));

  const reviewBtn = (!isCancelled && isPast && mentorUserId) ? `<button class="action-btn btn-primary" onclick="window.location.href='${buildReviewUrl(app)}'">Add Review</button>` : '';
  
  const cancelBtn = (!isCancelled && !isPast) ? `<button class="action-btn btn-danger" onclick="cancelSession(${app.Id})">Cancel</button>` : '';

  return `
    <button class="action-btn btn-primary">Join Session</button>
    <button class="action-btn btn-secondary" onclick="window.location.href='${chatLink}'">Message</button>
    ${reviewBtn}
    <button class="action-btn btn-secondary" disabled>Reschedule</button>
    ${cancelBtn}
  `;
}

function buildReviewUrl(app) {
  const mentorName = `${app.mentor_nome || ''} ${app.mentor_cognome || ''}`.trim();
  const params = new URLSearchParams({
    mentorId: app.Id_Mentor || app.id_mentor || '',
    mentorName,
    settore: app.Settore || '',
    date: app.Giorno || '',
    time: app.Ora || '',
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
