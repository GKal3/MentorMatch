// Script per visualizzare gli earnings del mentor
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
            const amount = parseFloat(payment.Importo || payment.importo || 0);
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
    const date = new Date(payment.Data || payment.data || payment.Data_Pagamento).toLocaleDateString('it-IT');
    const amount = parseFloat(payment.Importo || payment.importo || 0);
    const status = payment.Stato || payment.stato || 'Unknown';
    const method = payment.Metodo_Pagamento || payment.metodo_pagamento || 'N/A';
    const menteeName = payment.mentee_nome && payment.mentee_cognome 
        ? `${payment.mentee_nome} ${payment.mentee_cognome}` 
        : 'N/A';
    const appointmentDay = payment.Giorno ? new Date(payment.Giorno).toLocaleDateString('it-IT') : 'N/A';
    const appointmentTime = payment.Ora || 'N/A';

    const statusClass = status === 'Completato' ? 'status-completed' : 
                       status === 'In attesa' ? 'status-pending' : 'status-failed';

    return `
        <div class="payment-card">
            <div class="payment-header">
                <div>
                    <div class="payment-mentor">${menteeName}</div>
                    <div class="payment-category">Appointment: ${appointmentDay} at ${appointmentTime}</div>
                </div>
                <div class="payment-amount">€${amount.toFixed(2)}</div>
            </div>
            <div class="payment-details">
                <div class="payment-detail-row">
                    <span class="detail-label">Payment Date:</span>
                    <span class="detail-value">${date}</span>
                </div>
                <div class="payment-detail-row">
                    <span class="detail-label">Method:</span>
                    <span class="detail-value">${method}</span>
                </div>
                <div class="payment-detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value ${statusClass}">${status}</span>
                </div>
            </div>
        </div>
    `;
}
