let reviewsData = [];
let currentFilter = 'all';

window.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  if (!requireRole('mentor')) return;

  const user = getCurrentUser();

  setupFilters();
  loadStats(user.id, getToken());
  loadReviews(user.id, getToken());
});

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter || 'all';
      renderReviews();
    });
  });
}

async function loadStats(mentorId, token) {
  try {
    const res = await fetch(`http://localhost:3000/api/mentor/reviews-stats/${mentorId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = res.ok ? await res.json() : {};
    renderStats(stats || {});
  } catch (err) {
    console.error('Error loading review stats:', err);
    renderStats({});
  }
}

async function loadReviews(mentorId, token) {
  try {
    const res = await fetch(`http://localhost:3000/api/mentor/reviews/${mentorId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    reviewsData = res.ok ? (await res.json()) || [] : [];
  } catch (err) {
    console.error('Error loading reviews:', err);
    reviewsData = [];
  }
  renderReviews();
}

function renderStats(stats) {
  const total = Number(stats.totale_recensioni || 0);
  const avg = stats.media_voti ? Number(stats.media_voti) : 0;
  const counts = {
    5: Number(stats.voti_5 || 0),
    4: Number(stats.voti_4 || 0),
    3: Number(stats.voti_3 || 0),
    2: Number(stats.voti_2 || 0),
    1: Number(stats.voti_1 || 0)
  };

  setText('avgRating', avg.toFixed(1));
  setText('avgStars', renderStarString(Math.round(avg)));
  setText('reviewCountLabel', `Based on ${total} reviews`);
  setText('totalReviews', total);
  setText('fiveStarCount', counts[5]);
  setText('fourStarCount', counts[4]);
  setText('threeStarCount', counts[3] + counts[2] + counts[1]);

  for (let rating = 5; rating >= 1; rating--) {
    const percent = total ? Math.round((counts[rating] / total) * 100) : 0;
    setText(`val${rating}`, `${counts[rating]} (${percent}%)`);
    const bar = document.getElementById(`bar${rating}`);
    if (bar) bar.style.width = `${percent}%`;
  }
}

function renderReviews() {
  const container = document.getElementById('reviewsItems');
  const emptyState = document.getElementById('reviewsEmpty');
  if (!container || !emptyState) return;

  container.innerHTML = '';
  let filtered = [...reviewsData];
  if (currentFilter !== 'all') {
    const target = Number(currentFilter);
    filtered = reviewsData.filter(r => Number(r.Voto) === target);
  }

  if (!filtered.length) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  filtered.forEach(review => {
    const card = document.createElement('div');
    card.className = 'review-card';
    const menteeName = `${review.mentee_nome || ''} ${review.mentee_cognome || ''}`.trim() || 'Mentee';
    const initials = getInitials(menteeName);
    const rating = Number(review.Voto || 0);
    const comment = review.Commento || 'No comment provided.';

    card.innerHTML = `
      <div class="review-header">
        <div class="reviewer-info">
          <div class="reviewer-avatar">${initials}</div>
          <div>
            <div class="reviewer-name">${menteeName}</div>
            <div class="review-date">Review #${review.Id || ''}</div>
          </div>
        </div>
        <div class="review-rating">
          <div class="review-stars">${renderStarString(rating)}</div>
          <div class="review-score">${rating.toFixed(1)}</div>
        </div>
      </div>
      <div class="review-text">${escapeHtml(comment)}</div>
      <div class="rating-chip">Overall: <strong>${rating.toFixed(1)}/5</strong></div>
    `;

    container.appendChild(card);
  });
}

function renderStarString(score) {
  const full = Math.max(0, Math.min(5, score));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (!parts.length) return 'MM';
  return parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
