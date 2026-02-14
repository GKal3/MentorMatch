// Payment page logic: tab switching, summary rendering, and API calls
let currentUser = null;
let pendingPayment = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  
  currentUser = getCurrentUser();

  // Load pending payment details from storage
  pendingPayment = JSON.parse(sessionStorage.getItem('pendingPayment') || localStorage.getItem('pendingPayment') || 'null');
  if (!pendingPayment || !pendingPayment.prezzo || pendingPayment.prezzo <= 0) {
    alert('No payment required or missing data.');
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
  const sessionPriceEl = document.getElementById('summarySessionPrice');
  const platformFeeEl = document.getElementById('summaryPlatformFee');
  const totalEl = document.getElementById('summaryTotal');
  const dateEls = document.querySelectorAll('.summary-mentor-date');

  const initials = `${(pp.mentorNome || '').charAt(0)}${(pp.mentorCognome || '').charAt(0)}`.toUpperCase();
  const startTime = pp.oraInizio || pp.ora || '';
  const endTime = pp.oraFine || pp.ora_fine || '';
  const duration = Number(pp.durataMinuti || 0);
  if (avatar) avatar.textContent = initials || 'MM';
  if (nameEl) nameEl.textContent = `${pp.mentorNome || ''} ${pp.mentorCognome || ''}`.trim();
  if (dateEls.length > 0) {
    dateEls[0].textContent = `${pp.data || ''} ${startTime}${endTime ? ` - ${endTime}` : ''}`.trim();
  }
  if (dateEls.length > 1) {
    dateEls[1].textContent = duration ? `${duration} min session` : 'Session';
  }

  // Price composition
  const sessionPrice = Number(pp.prezzo || 0);
  const feePercent = Number(pp.feePercent || 15);
  const platformFee = Number(pp.feeAmount || ((sessionPrice * feePercent) / 100));
  const total = sessionPrice;

  if (sessionPriceEl) sessionPriceEl.textContent = `€${sessionPrice.toFixed(2)}`;
  if (platformFeeEl) platformFeeEl.textContent = `€${platformFee.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `€${total.toFixed(2)}`;
}

async function onSubmitPayment(e) {
  e.preventDefault();
  if (!pendingPayment) return;

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const isPaypalClick = e.currentTarget?.classList.contains('paypal-btn');
  const activeTabIsCard = !isPaypalClick && document.getElementById('cardTab')?.classList.contains('active');

  try {
    if (activeTabIsCard) {
      // Card payment: require a Stripe token (placeholder for demo)
      console.log('💳 Card payment initiated');
      const tokenStripe = 'tok_visa'; // Integrazione reale: raccogli token dalla UI
      const res = await fetch('/api/payments/card', {
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
      console.log('💳 Card payment response:', data);
      if (!res.ok || !data.success) throw new Error(data.error || 'Card payment error');
      
      // Per carta, salviamo un flag e reindirizzamo a payment-success
      sessionStorage.setItem('paymentMethod', 'card');
      sessionStorage.removeItem('pendingPayment');
      localStorage.removeItem('pendingPayment');
      window.location.href = '/pages/payment-success.html';
    } else {
      // PayPal flow: get approval URL
      const res = await fetch('/api/payments/paypal', {
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
      console.log('📤 PayPal Order Creation Response:', data);
      if (!res.ok || !data.success) throw new Error(data.error || 'Error creating PayPal order');

      // Salva dati ordine per la capture (quando torna da PayPal)
      const paypalOrderData = {
        orderId: data.orderId,
        prenotazioneId: data.prenotazioneId,
        importo: data.importo
      };
      console.log('💾 Saving to sessionStorage:', paypalOrderData);
      sessionStorage.setItem('paypalOrderData', JSON.stringify(paypalOrderData));

      // Redirect to PayPal approval
      if (data.approvalUrl) {
        console.log('🔗 Redirecting to PayPal:', data.approvalUrl.substring(0, 50) + '...');
        window.location.href = data.approvalUrl;
      } else {
        alert('PayPal approval URL is not available');
      }
    }
  } catch (error) {
    console.error('Payment error:', error);
    alert(error.message || 'Payment error');
  }
}

function cleanupAndRedirect() {
  sessionStorage.removeItem('pendingPayment');
  localStorage.removeItem('pendingPayment');
  window.location.href = '/pages/dashboardMentee.html';
}
