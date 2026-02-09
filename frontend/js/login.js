// Script per il login
document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', handleLogin);
    }
    
    // Gestisci invio con Enter
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin(e);
            }
        });
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Validazione base
    if (!email || !password) {
        alert('Inserisci email e password');
        return;
    }
    
    console.log('Tentativo di login:', { email });
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mail: email,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Salva il token nella sessione
            sessionStorage.setItem('token', result.token);
            sessionStorage.setItem('user', JSON.stringify(result.user));
            
            console.log('Login riuscito per:', result.user);
            
            // Controlla se c'è un URL di ritorno (da requireAuth)
            const returnUrl = sessionStorage.getItem('returnUrl');
            if (returnUrl) {
                sessionStorage.removeItem('returnUrl');
                window.location.href = returnUrl;
                return;
            }
            
            // Redirect basato sul ruolo (normalizzato)
            const ruolo = (result.user.ruolo || '').toLowerCase();
            if (ruolo === 'mentor') {
                window.location.href = '/pages/dashboardMentor.html';
            } else if (ruolo === 'mentee') {
                window.location.href = '/pages/dashboardMentee.html';
            } else {
                window.location.href = '/pages/index.html';
            }
        } else {
            alert('Errore: ' + result.message);
        }
        
    } catch (error) {
        console.error('Errore nel login:', error);
        alert('Errore nel login: ' + error.message);
    }
}
