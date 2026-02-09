// Payment page logic: tab switching, summary rendering, and API calls
let currentUser = null;
let pendingPayment = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  
  currentUser = getCurrentUser();

  // Load pending payment details from storage
  pendingPayment = JSON.parse(sessionStorage.getItem('pendingPayment') || localStorage.getItem('pendingPayment') || 'null');
  if (!pendingPayment || !pendingPayment.prezzo || pendingPayment.prezzo <= 0) {
    alert('Nessun pagamento necessario o dati mancanti.');
    window.location.href = '/pages/dashboardMentee.html';
    return;
  }

  // Initialize tabs
  initTabs();

  // Render order summary
  renderSummary(pendingPayment);

  // Hook submit button
  const submitBtn = document.getElementById('submitPayment');
  if (submitBtn) submitBtn.addEventListener('click', onSubmitPayment);

  // Hook PayPal button
  const paypalBtn = document.querySelector('.paypal-btn');
  if (paypalBtn) paypalBtn.addEventListener('click', onSubmitPayment);
});

function initTabs() {
  const cardTab = document.getElementById('cardTab');
  const paypalTab = document.getElementById('paypalTab');
  const cardSection = document.getElementById('cardSection');
  const paypalSection = document.getElementById('paypalSection');

  if (!cardTab || !paypalTab) return;

  cardTab.addEventListener('click', () => {
    cardTab.classList.add('active');
    paypalTab.classList.remove('active');
    if (cardSection) cardSection.style.display = 'block';
    if (paypalSection) paypalSection.classList.remove('active');
  });

  paypalTab.addEventListener('click', () => {
    paypalTab.classList.add('active');
    cardTab.classList.remove('active');
    if (cardSection) cardSection.style.display = 'none';
    if (paypalSection) paypalSection.classList.add('active');
  });
}

function renderSummary(pp) {
  // Update summary fields based on pendingPayment
  const avatar = document.querySelector('.summary-avatar');
  const nameEl = document.querySelector('.summary-mentor-name');
  const dateEl = document.querySelector('.summary-mentor-date');
  const items = document.querySelectorAll('.summary-item');
  const totalEl = document.querySelector('.summary-total span:last-child');

  const initials = `${(pp.mentorNome || '').charAt(0)}${(pp.mentorCognome || '').charAt(0)}`.toUpperCase();
  if (avatar) avatar.textContent = initials || 'MM';
  if (nameEl) nameEl.textContent = `${pp.mentorNome || ''} ${pp.mentorCognome || ''}`.trim();
  if (dateEl) dateEl.textContent = `${pp.data || ''} ${pp.ora || ''}`.trim();

  // Price composition
  const sessionPrice = Number(pp.prezzo || 0);
  const platformFee = Number(pp.platformFee || 5);
  const tax = Number(pp.tax || (sessionPrice * 0.22));
  const total = sessionPrice + platformFee + tax;

  if (items && items.length >= 3) {
    items[0].querySelector('span:last-child').textContent = `€${sessionPrice.toFixed(2)}`;
    items[1].querySelector('span:last-child').textContent = `€${platformFee.toFixed(2)}`;
    items[2].querySelector('span:last-child').textContent = `€${tax.toFixed(2)}`;
  }
  if (totalEl) totalEl.textContent = `€${total.toFixed(2)}`;
}

async function onSubmitPayment(e) {
  e.preventDefault();
  if (!pendingPayment) return;

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const activeTabIsCard = document.getElementById('cardTab')?.classList.contains('active');

  try {
    if (activeTabIsCard) {
      // Card payment: require a Stripe token (placeholder for demo)
      const tokenStripe = 'tok_visa'; // Integrazione reale: raccogli token dalla UI
      const res = await fetch('http://localhost:3000/api/payments/card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prenotazioneId: pendingPayment.prenotazioneId,
          tokenStripe
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Errore pagamento carta');
      alert('Pagamento con carta completato!');
      cleanupAndRedirect();
    } else {
      // PayPal flow: get approval URL
      const res = await fetch('http://localhost:3000/api/payments/paypal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prenotazioneId: pendingPayment.prenotazioneId
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Errore creazione ordine PayPal');

      // Redirect to PayPal approval
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        alert('URL di approvazione PayPal non disponibile');
      }
    }
  } catch (error) {
    console.error('Errore pagamento:', error);
    alert(error.message || 'Errore nel pagamento');
  }
}

function cleanupAndRedirect() {
  sessionStorage.removeItem('pendingPayment');
  localStorage.removeItem('pendingPayment');
  window.location.href = '/pages/dashboardMentee.html';
}
