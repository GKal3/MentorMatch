import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api';

async function testPayment() {
  try {
    // 1. Login
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mail: 'mentee@test.com',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);
    
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }

    const { token } = loginData;
    console.log('✅ Login OK, Token:', token);

    // 2. Pagamento
    const paymentRes = await fetch(`${API_URL}/payments/card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prenotazioneId: 1,
        tokenStripe: 'tok_visa'
      })
    });
    const paymentData = await paymentRes.json();
    console.log('✅ Pagamento:', paymentData);

  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

testPayment();