let overallRatingValue = 0;
const ratingTexts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

  if (!token || !user?.id) {
    alert('Devi effettuare il login');
    window.location.href = '/pages/login.html';
    return;
  }

  const query = new URLSearchParams(window.location.search);
  const mentorId = query.get('mentorId');
  const mentorName = query.get('mentorName') || 'Mentor';
  const settore = query.get('settore') || 'Mentoring Session';
  const date = query.get('date');
  const time = query.get('time');
  const duration = query.get('duration');
  const topic = query.get('topic');

  populateSessionSummary({ mentorName, settore, date, time, duration, topic });
  setupRatings();
  setupForm({ mentorId, token });
});

function populateSessionSummary({ mentorName, settore, date, time, duration, topic }) {
  const initialsEl = document.querySelector('.mentor-avatar');
  const nameEl = document.querySelector('.mentor-name');
  const titleEl = document.querySelector('.mentor-title');
  const dateEl = document.querySelector('.session-date');
  const topicEl = document.querySelector('#sessionTopic');

  if (initialsEl) initialsEl.textContent = getInitials(mentorName);
  if (nameEl) nameEl.textContent = mentorName;
  if (titleEl) titleEl.textContent = settore;
  if (dateEl) {
    const dateLabel = formatDate(date);
    dateEl.innerHTML = `
      <span>📅 ${dateLabel || 'Session date'}</span>
      <span>🕐 ${time || ''}</span>
      <span>⏱️ ${duration ? `${duration} minutes` : ''}</span>
      <span>💻 Video Call</span>
    `;
  }
  if (topicEl) topicEl.textContent = topic || 'Session topic not specified';
}

function setupRatings() {
  const stars = document.querySelectorAll('#overallRating .star');
  const ratingText = document.getElementById('ratingText');
  stars.forEach(star => {
    star.addEventListener('click', function () {
      overallRatingValue = parseInt(this.dataset.rating, 10);
      updateStars(stars, overallRatingValue);
      if (ratingText) ratingText.textContent = ratingTexts[overallRatingValue] || 'Click to rate';
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

  document.querySelectorAll('.mini-stars').forEach(container => {
    const miniStars = container.querySelectorAll('.mini-star');
    let criteriaRating = 0;
    miniStars.forEach(star => {
      star.addEventListener('click', function () {
        criteriaRating = parseInt(this.dataset.rating, 10);
        updateStars(miniStars, criteriaRating);
      });
    });
  });

  document.querySelectorAll('.tag-chip').forEach(tag => {
    tag.addEventListener('click', function () {
      this.classList.toggle('selected');
    });
  });
}

function setupForm({ mentorId, token }) {
  const reviewText = document.getElementById('reviewText');
  const charCount = document.getElementById('charCount');
  const submitBtn = document.getElementById('submitReview');
  const successMessage = document.getElementById('successMessage');

  if (reviewText && charCount) {
    reviewText.addEventListener('input', function () {
      charCount.textContent = this.value.length;
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (!mentorId) {
        alert('Mentor non specificato. Torna indietro e riprova.');
        return;
      }
      if (overallRatingValue === 0) {
        alert('Seleziona un punteggio per la sessione');
        return;
      }
      if (!reviewText || reviewText.value.trim().length < 20) {
        alert('Scrivi almeno 20 caratteri nella recensione');
        return;
      }

      submitBtn.disabled = true;
      try {
        const res = await fetch('http://localhost:3000/api/mentee/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id_mentor: mentorId,
            voto: overallRatingValue,
            commento: reviewText.value.trim()
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Errore nell\'invio della recensione');
        }

        if (successMessage) {
          successMessage.classList.add('show');
          successMessage.scrollIntoView({ behavior: 'smooth' });
        }
        setTimeout(() => {
          window.location.href = '/pages/appArea.html';
        }, 1500);
      } catch (error) {
        console.error('Errore invio recensione:', error);
        alert(error.message || 'Errore durante l\'invio della recensione');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
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

function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (!parts.length) return 'MM';
  const initials = parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
  return initials || 'MM';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
