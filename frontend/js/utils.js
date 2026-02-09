// Funzioni utility globali

// Gestione logout universale
document.addEventListener('DOMContentLoaded', () => {
    setupLogout();
});

function setupLogout() {
    const logoutLinks = document.querySelectorAll('a[href*="LOGOUT"], a[href="#"], nav a:nth-child(3)');
    logoutLinks.forEach(link => {
        const text = link.textContent.toUpperCase();
        if (text.includes('LOGOUT') || text.includes('ESCI')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
    });
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('pendingPayment');
    localStorage.removeItem('pendingPayment');
    window.location.href = '/pages/index.html';
}

// Verifica autenticazione e reindirizza se necessario
function requireAuth(returnUrl = null) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    
    if (!token || !user.id) {
        // Salva URL di ritorno se fornito
        if (returnUrl) {
            sessionStorage.setItem('returnUrl', returnUrl);
        } else {
            sessionStorage.setItem('returnUrl', window.location.href);
        }
        window.location.href = '/pages/login.html';
        return false;
    }
    return true;
}

// Controlla ruolo utente
function requireRole(requiredRole) {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const userRole = (user.ruolo || '').toLowerCase();
    const required = requiredRole.toLowerCase();
    
    if (userRole !== required) {
        alert(`Accesso negato. Questa pagina è solo per ${requiredRole}.`);
        
        // Reindirizza alla dashboard corretta
        if (userRole === 'mentor') {
            window.location.href = '/pages/dashboardMentor.html';
        } else if (userRole === 'mentee') {
            window.location.href = '/pages/dashboardMentee.html';
        } else {
            window.location.href = '/pages/index.html';
        }
        return false;
    }
    return true;
}

// Ottieni utente corrente
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
}

// Ottieni token
function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}