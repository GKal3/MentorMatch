// Test API flow: Login, then get mentor personal data
const baseUrl = 'http://localhost:3000';

async function testAPI() {
    try {
        // Step 1: Login (assuming test user exists)
        console.log('Step 1: Logging in...');
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mail: 'giuliakale@hotmail.com',
                password: 'Giulia123!'
            })
        });
        
        const loginData = await loginRes.json();
        console.log('Login response:', loginData);
        
        if (!loginData.token) {
            console.error('Login failed, no token received');
            return;
        }
        
        const token = loginData.token;
        const userId = loginData.user?.id;
        
        console.log('\nStep 2: Getting mentor personal data...');
        console.log(`Using user ID: ${userId}`);
        
        const personalRes = await fetch(`${baseUrl}/api/mentor/personal/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const personalData = await personalRes.json();
        console.log('\nMentor personal data received:');
        console.log(JSON.stringify(personalData, null, 2));
        
        if (personalData.Data_Nascita) {
            console.log(`\n✓ Data_Nascita value: "${personalData.Data_Nascita}"`);
            console.log(`✓ Data_Nascita type: ${typeof personalData.Data_Nascita}`);
            
            // Test the formatting logic
            const dateValue = personalData.Data_Nascita;
            const dateString = typeof dateValue === 'string' ? dateValue : new Date(dateValue).toISOString();
            const parts = dateString.slice(0, 10).split('-');
            const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
            console.log(`✓ Formatted date: ${formatted}`);
        }
        
    } catch (error) {
        console.error('Error during API test:', error.message);
    }
    
    process.exit(0);
}

testAPI();
