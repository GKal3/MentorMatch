let overallRatingValue = 0;
const ratingTexts = ['Select a rating', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
let existingReviewsData = [];
let existingReviewFilter = 'all';

window.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user?.id) {
    alert('You need to log in');
    window.location.href = '/pages/login.html';
    return;
  }

  const query = new URLSearchParams(window.location.search);
  const mentorId = query.get('mentorId');

  if (!mentorId) {
    alert('Mentor not specified.');
    window.location.href = '/pages/appArea.html';
    return;
  }

  const mentorContext = {
    mentorId,
    mentorName: query.get('mentorName') || 'Mentor',
    settore: query.get('settore') || 'Mentoring Session',
  };

  setupRatings();
  setupForm({ mentorId, token });
  setupCommentCounter();
  setupExistingReviewFilters();

  await loadMentorRecap(mentorContext);
  await loadExistingReviews(mentorId, token);
});

async function loadMentorRecap(context) {
  try {
    const response = await fetch(`/api/mentee/mentor/${context.mentorId}`);
    if (!response.ok) throw new Error('Unable to load mentor profile');

    const payload = await response.json();
    const mentor = payload?.data || {};

    const mentorName = `${mentor.Nome || ''} ${mentor.Cognome || ''}`.trim() || context.mentorName;
    const settore = mentor.Settore || context.settore;
    const rating = parseFloat(mentor.media_recensioni || 0);
    const reviewCount = Number(mentor.numero_recensioni || 0);

    setText('mentorAvatar', getInitials(mentorName));
    setText('mentorName', mentorName);
    setText('mentorTitle', settore);
    setText('mentorRating', `${renderStars(rating)} ${rating.toFixed(1)} (${reviewCount} reviews)`);
  } catch (_error) {
    setText('mentorAvatar', getInitials(context.mentorName));
    setText('mentorName', context.mentorName);
    setText('mentorTitle', context.settore);
    setText('mentorRating', '☆☆☆☆☆ 0.0 (0 reviews)');
  }
}

async function loadExistingReviews(mentorId, token) {
  const listEl = document.getElementById('mentorReviewsList');
  const emptyEl = document.getElementById('mentorReviewsEmpty');
  if (!listEl || !emptyEl) return;

  try {
    const response = await fetch(`/api/mentor/reviews/${mentorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Unable to load reviews');
    }

    const reviews = await response.json();
    existingReviewsData = Array.isArray(reviews) ? reviews : [];
    updateMentorRatingBreakdown(existingReviewsData);
    renderExistingReviews();
  } catch (error) {
    console.error('Error loading existing reviews:', error);
    existingReviewsData = [];
    updateMentorRatingBreakdown(existingReviewsData);
    renderExistingReviews();
  }
}

function setupExistingReviewFilters() {
  const filterWrap = document.getElementById('mentorReviewFilters');
  if (!filterWrap) return;

  const buttons = filterWrap.querySelectorAll('.filter-btn');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      existingReviewFilter = button.dataset.filter || 'all';
      renderExistingReviews();
    });
  });
}

function renderExistingReviews() {
  const listEl = document.getElementById('mentorReviewsList');
  const emptyEl = document.getElementById('mentorReviewsEmpty');
  if (!listEl || !emptyEl) return;

  const filtered = existingReviewFilter === 'all'
    ? [...existingReviewsData]
    : existingReviewsData.filter((review) => Number(review.Voto || 0) === Number(existingReviewFilter));

  if (!filtered.length) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.innerHTML = filtered.map(renderReviewCard).join('');
}

function updateMentorRatingBreakdown(reviews) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  reviews.forEach((review) => {
    const rating = Number(review.Voto || 0);
    if (counts[rating] !== undefined) counts[rating] += 1;
  });

  const total = reviews.length;
  for (let rating = 5; rating >= 1; rating--) {
    const count = counts[rating] || 0;
    const percent = total ? Math.round((count / total) * 100) : 0;
    setText(`mentorVal${rating}`, `${count} (${percent}%)`);
    const bar = document.getElementById(`mentorBar${rating}`);
    if (bar) bar.style.width = `${percent}%`;
  }
}

function renderReviewCard(review) {
  const reviewerName = `${review.mentee_nome || ''} ${review.mentee_cognome || ''}`.trim() || 'User';
  const initials = getInitials(reviewerName);
  const rating = Number(review.Voto || 0);
  const comment = review.Commento || 'No comment';
  const date = formatDate(review.Data || review.created_at || null);

  return `
    <div class="review-card" style="margin-bottom: 16px;">
      <div class="review-header">
        <div class="reviewer-info">
          <div class="reviewer-avatar">${escapeHtml(initials)}</div>
          <div>
            <div class="reviewer-name">${escapeHtml(reviewerName)}</div>
            <div class="review-date">${escapeHtml(date)}</div>
          </div>
        </div>
        <div class="review-rating">
          <div class="review-stars">${renderStars(rating)}</div>
          <div class="review-score">${rating.toFixed(1)}</div>
        </div>
      </div>
      <div class="review-text">${escapeHtml(comment)}</div>
    </div>
  `;
}

function setupRatings() {
  const stars = document.querySelectorAll('#overallRating .star');
  const ratingText = document.getElementById('ratingText');
  const submitBtn = document.getElementById('submitReview');

  updateStars(stars, overallRatingValue);
  if (ratingText) ratingText.textContent = ratingTexts[overallRatingValue] || 'Select a rating';
  if (submitBtn) submitBtn.disabled = overallRatingValue <= 0;

  stars.forEach((star) => {
    star.addEventListener('click', function () {
      overallRatingValue = parseInt(this.dataset.rating, 10);
      updateStars(stars, overallRatingValue);
      if (ratingText) ratingText.textContent = ratingTexts[overallRatingValue] || 'Select a rating';
      if (submitBtn) submitBtn.disabled = overallRatingValue <= 0;
    });

    star.addEventListener('mouseenter', function () {
      const rating = parseInt(this.dataset.rating, 10);
      updateStars(stars, rating);
    });
  });

  const overallContainer = document.getElementById('overallRating');
  if (overallContainer) {
    overallContainer.addEventListener('mouseleave', () => updateStars(stars, overallRatingValue));
  }
}

function setupCommentCounter() {
  const reviewText = document.getElementById('reviewText');
  const charCount = document.getElementById('charCount');
  if (!reviewText || !charCount) return;

  reviewText.addEventListener('input', () => {
    charCount.textContent = String(reviewText.value.length);
  });
}

function setupForm({ mentorId, token }) {
  const reviewText = document.getElementById('reviewText');
  const submitBtn = document.getElementById('submitReview');
  const successMessage = document.getElementById('successMessage');

  if (!submitBtn) return;
  submitBtn.disabled = overallRatingValue <= 0;

  submitBtn.addEventListener('click', async () => {
    if (overallRatingValue <= 0) return;
    submitBtn.disabled = true;

    try {
      const payload = {
        id_mentor: mentorId,
        voto: overallRatingValue,
        commento: reviewText?.value?.trim() || null,
      };

      const response = await fetch('/api/mentee/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || 'Error submitting review');
      }

      if (reviewText) reviewText.value = '';
      const countEl = document.getElementById('charCount');
      if (countEl) countEl.textContent = '0';

      if (successMessage) {
        successMessage.classList.add('show');
      }

      await loadExistingReviews(mentorId, token);
    } catch (error) {
      console.error('Review submission error:', error);
      alert(error.message || 'Error submitting review');
    } finally {
      submitBtn.disabled = overallRatingValue <= 0;
    }
  });
}

function updateStars(starElements, rating) {
  starElements.forEach((star, index) => {
    if (index < rating) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
}

function renderStars(score) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(score) || 0)));
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (!parts.length) return 'MM';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function formatDate(rawDate) {
  if (!rawDate) return '';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
