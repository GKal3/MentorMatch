// Script to display mentor earnings
document.addEventListener('DOMContentLoaded', async () => {
    await loadEarnings();
});

async function loadEarnings() {
    const loading = document.getElementById('loading');
    const noEarnings = document.getElementById('no-earnings');
    const earningsList = document.getElementById('earnings-list');
    const totalEarningsEl = document.getElementById('total-earnings');
    const token = getToken();

    if (!token) {
        alert('Please login to view earnings');
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        // Decodifica JWT per ottenere l'ID utente
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.id;

        // Ottieni lo storico pagamenti
        const response = await fetch(`/api/mentor/earnings/history/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', response.status, errorText);
            throw new Error(`Failed to load earnings: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        const earnings = result.data || result;

        loading.style.display = 'none';

        if (!earnings || earnings.length === 0) {
            noEarnings.style.display = 'block';
            totalEarningsEl.textContent = '€0.00';
            return;
        }

        // Calcola il totale
        const total = earnings.reduce((sum, payment) => {
            const amount = getNetMentorAmount(payment);
            return sum + amount;
        }, 0);
        totalEarningsEl.textContent = `€${total.toFixed(2)}`;

        // Renderizza i pagamenti
        earningsList.innerHTML = earnings.map(payment => renderEarningCard(payment)).join('');

    } catch (error) {
        console.error('Error loading earnings:', error);
        loading.style.display = 'none';
        earningsList.innerHTML = `<p style="text-align: center; color: red; padding: 40px;">Error loading earnings: ${error.message}</p>`;
    }
}

function renderEarningCard(payment) {
    const date = new Date(payment.Data || payment.data || payment.Data_Pagamento).toLocaleDateString('en-US');
    const grossAmount = parseFloat(payment.Importo || payment.importo || 0);
    const netAmount = getNetMentorAmount(payment);
    const feeAmount = parseFloat(payment.Commissione_Piattaforma || 0);
    const feePercent = Number(payment.Percentuale_Commissione || 0);
    const statusRaw = payment.Stato || payment.stato || 'Unknown';
    const method = payment.Metodo_Pagamento || payment.metodo_pagamento || 'N/A';
    const payoutStatus = payment.Stato_Payout || payment.stato_payout || 'Pending';
    const iban = payment.Iban_Mentor || payment.iban_mentor || null;
    const maskedIban = iban ? `${String(iban).slice(0, 4)}********${String(iban).slice(-4)}` : 'N/A';
    const menteeName = payment.mentee_nome && payment.mentee_cognome 
        ? `${payment.mentee_nome} ${payment.mentee_cognome}` 
        : 'N/A';
    const appointmentDay = payment.Giorno ? new Date(payment.Giorno).toLocaleDateString('en-US') : 'N/A';
    const startTime = payment.Ora_Inizio || payment.Ora || '';
    const endTime = payment.Ora_Fine || '';
    const appointmentTime = startTime ? (endTime ? `${startTime} - ${endTime}` : startTime) : 'N/A';

    const status = normalizePaymentStatus(statusRaw);
    const statusClass = paymentStatusClass(statusRaw);

    return `
        <div class="payment-card">
            <div class="payment-header">
                <div>
                    <div class="payment-mentor">${menteeName}</div>
                    <div class="payment-category">Appointment: ${appointmentDay} at ${appointmentTime}</div>
                </div>
                <div class="payment-amount">€${netAmount.toFixed(2)}</div>
            </div>
            <div class="payment-details">
                <div class="payment-detail-row">
                    <span class="detail-label">Net Payout:</span>
                    <span class="detail-value">€${netAmount.toFixed(2)}</span>
                </div>
                <div class="payment-detail-row">
                    <span class="detail-label">Gross Paid by Mentee:</span>
                    <span class="detail-value">€${grossAmount.toFixed(2)}</span>
                </div>
                <div class="payment-detail-row">
                    <span class="detail-label">Platform Fee:</span>
                    <span class="detail-value">${feePercent ? `${feePercent}% (€${feeAmount.toFixed(2)})` : '€0.00'}</span>
                </div>
                <div class="payment-detail-row">
                    <span class="detail-label">Payment Date:</span>
                    <span class="detail-value">${date}</span>
                </div>
                <div class="payment-detail-row">
                    <span class="detail-label">Method:</span>
                    <span class="detail-value">${method}</span>
                </div>
                <div class="payment-detail-row">
                    <span class="detail-label">Payout IBAN:</span>
                    <span class="detail-value">${maskedIban}</span>
                </div>
                <div class="payment-detail-row">
                    <span class="detail-label">Payout Status:</span>
                    <span class="detail-value">${payoutStatus}</span>
                </div>
                <div class="payment-detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value ${statusClass}">${status}</span>
                </div>
            </div>
        </div>
    `;
}

function normalizePaymentStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('complet') || s.includes('completed')) return 'Completed';
    if (s.includes('attesa') || s.includes('pending')) return 'Pending';
    if (s.includes('annull') || s.includes('cancel')) return 'Cancelled';
    if (s.includes('fallit') || s.includes('failed') || s.includes('errore') || s.includes('error')) return 'Failed';
    return status || 'Unknown';
}

function paymentStatusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('complet') || s.includes('completed')) return 'status-completed';
    if (s.includes('attesa') || s.includes('pending')) return 'status-pending';
    if (s.includes('annull') || s.includes('cancel')) return 'status-failed';
    if (s.includes('fallit') || s.includes('failed') || s.includes('errore') || s.includes('error')) return 'status-failed';
    return 'status-failed';
}

function getNetMentorAmount(payment) {
    const payoutStatus = String(payment.Stato_Payout || payment.stato_payout || '').toLowerCase();
    const bookingStatus = String(payment.Stato || payment.stato || '').toLowerCase();
    if (payoutStatus === 'refunded' || bookingStatus.includes('cancel')) {
        return 0;
    }

    const rawNet = payment.Importo_Netto_Mentor;
    if (rawNet !== undefined && rawNet !== null && rawNet !== '') {
        const net = Number(rawNet);
        if (Number.isFinite(net)) return net;
    }

    const fallbackNet = payment.Importo_Mentor;
    if (fallbackNet !== undefined && fallbackNet !== null && fallbackNet !== '') {
        const net = Number(fallbackNet);
        if (Number.isFinite(net)) return net;
    }

    const gross = Number(payment.Importo ?? payment.importo ?? 0);
    return Number.isFinite(gross) ? gross : 0;
}
