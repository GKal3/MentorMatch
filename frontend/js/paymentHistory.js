// Script per visualizzare lo storico pagamenti
document.addEventListener('DOMContentLoaded', async () => {
    await loadPaymentHistory();
});

async function loadPaymentHistory() {
    const loading = document.getElementById('loading');
    const noPayments = document.getElementById('no-payments');
    const paymentsList = document.getElementById('payments-list');
    const token = getToken();

    if (!token) {
        alert('Please login to view payment history');
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        const response = await fetch('/api/mentee/payments/history', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load payment history');
        }

        const result = await response.json();
        const payments = result.data || result;

        loading.style.display = 'none';

        if (!payments || payments.length === 0) {
            noPayments.style.display = 'block';
            return;
        }

        // Renderizza i pagamenti
        paymentsList.innerHTML = payments.map(payment => renderPaymentCard(payment)).join('');

    } catch (error) {
        console.error('Error loading payment history:', error);
        loading.style.display = 'none';
        paymentsList.innerHTML = `<p style="text-align: center; color: red; padding: 40px;">Error loading payment history: ${error.message}</p>`;
    }
}

function renderPaymentCard(payment) {
    const date = new Date(payment.Data_Pagamento || payment.data_pagamento).toLocaleDateString('it-IT');
    const amount = parseFloat(payment.Importo || payment.importo || 0);
    const status = payment.Stato || payment.stato || 'Unknown';
    const method = payment.Metodo_Pagamento || payment.metodo_pagamento || 'N/A';
    const mentorName = payment.mentor_nome && payment.mentor_cognome 
        ? `${payment.mentor_nome} ${payment.mentor_cognome}` 
        : 'N/A';
    const settore = payment.Settore || payment.settore || 'N/A';

    const statusClass = status === 'Completato' ? 'status-completed' : 
                       status === 'In attesa' ? 'status-pending' : 'status-failed';

    return `
        <div class="payment-card">
            <div class="payment-header">
                <div>
                    <div class="payment-mentor">${mentorName}</div>
                    <div class="payment-category">${settore}</div>
                </div>
                <div class="payment-amount">€${amount.toFixed(2)}</div>
            </div>
            <div class="payment-details">
                <div class="payment-detail-row">
                    <span class="detail-label">Date:</span>
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
