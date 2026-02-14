// Funzioni utility globali

// Gestione logout universale
document.addEventListener('DOMContentLoaded', () => {
    enforceGuestOnRegMentorPage();
    setupRegMentorAccessGuard();
    syncHeaderAuthButtons();
    injectDashboardHeaderLink();
    initProfileMenuModal();
    setupLogout();
    refreshNotificationBadge();
});

function isAuthenticatedAppUser() {
    const token = getToken();
    const user = getCurrentUser();
    const role = String(user?.ruolo || user?.role || '').toLowerCase();
    return Boolean(token && (role === 'mentor' || role === 'mentee'));
}

function clearAuthState() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('pendingPayment');
    localStorage.removeItem('pendingPayment');
}

function setupRegMentorAccessGuard() {
    const links = document.querySelectorAll('a[href*="regMentor.html"]');
    if (!links.length) return;

    links.forEach((link) => {
        link.addEventListener('click', (event) => {
            if (!isAuthenticatedAppUser()) return;

            event.preventDefault();
            alert('You are currently logged in. We will log you out before opening the mentor registration page.');
            clearAuthState();
            window.location.href = '/pages/regMentor.html';
        });
    });
}

function enforceGuestOnRegMentorPage() {
    const currentPath = (window.location.pathname || '').toLowerCase();
    if (!currentPath.endsWith('/regmentor.html')) return;
    if (!isAuthenticatedAppUser()) return;

    alert('You are currently logged in. You have been logged out to continue with mentor registration.');
    clearAuthState();
}

function syncHeaderAuthButtons() {
    const nav = document.querySelector('header nav');
    if (!nav) return;

    const token = getToken();
    const user = getCurrentUser();
    const role = String(user?.ruolo || user?.role || '').toLowerCase();
    const isAuthenticated = Boolean(token && (role === 'mentor' || role === 'mentee'));

    const loginLink = Array.from(nav.querySelectorAll('a')).find((a) =>
        (a.textContent || '').trim().toUpperCase() === 'LOGIN'
    );

    if (loginLink) {
        loginLink.style.display = isAuthenticated ? 'none' : '';
    }

    const logoutLinks = Array.from(nav.querySelectorAll('a')).filter((a) => {
        const text = (a.textContent || '').trim().toUpperCase();
        return text === 'LOGOUT' || text === 'ESCI';
    });
    logoutLinks.forEach((link) => link.remove());
}

function injectDashboardHeaderLink() {
    const nav = document.querySelector('header nav');
    if (!nav) return;

    if (nav.querySelector('.dashboard-header-link')) return;

    const token = getToken();
    const user = getCurrentUser();
    const role = String(user?.ruolo || user?.role || '').toLowerCase();

    if (!token || (role !== 'mentor' && role !== 'mentee')) return;

    const dashboardHref = role === 'mentor' ? '/pages/dashboardMentor.html' : '/pages/dashboardMentee.html';

    const link = document.createElement('a');
    link.href = dashboardHref;
    link.className = 'dashboard-header-link';
    link.textContent = getUserInitials(user);
    link.setAttribute('aria-label', 'Dashboard');
    link.setAttribute('title', 'Dashboard');

    link.addEventListener('click', (event) => {
        event.preventDefault();
        openProfileMenuModal();
    });

    nav.appendChild(link);
}

function initProfileMenuModal() {
    if (!isAuthenticatedAppUser()) return;
    if (document.getElementById('profileMenuOverlay')) return;

    const user = getCurrentUser();
    const role = String(user?.ruolo || user?.role || '').toLowerCase();
    const roleLabel = role === 'mentor' ? 'Mentor' : 'Mentee';
    const fullName = `${String(user?.nome || user?.firstName || '').trim()} ${String(user?.cognome || user?.lastName || '').trim()}`.trim() || 'User';
    const dashboardHref = role === 'mentor' ? '/pages/dashboardMentor.html' : '/pages/dashboardMentee.html';

    const overlay = document.createElement('div');
    overlay.id = 'profileMenuOverlay';
    overlay.className = 'profile-menu-overlay';
    overlay.innerHTML = `
        <div class="profile-menu-dialog" role="dialog" aria-modal="true" aria-label="Account menu">
            <div class="profile-menu-header">
                <div class="profile-menu-avatar">${getUserInitials(user)}</div>
                <div class="profile-menu-meta">
                    <div class="profile-menu-name">${fullName}</div>
                    <div class="profile-menu-role">Logged in as ${roleLabel}</div>
                </div>
            </div>
            <div class="profile-menu-actions">
                <button type="button" class="profile-menu-btn profile-menu-dashboard" id="profileMenuDashboardBtn">Go to Dashboard</button>
                <button type="button" class="profile-menu-btn profile-menu-logout" id="profileMenuLogoutBtn">Logout</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeProfileMenuModal();
        }
    });

    const dashboardBtn = document.getElementById('profileMenuDashboardBtn');
    const logoutBtn = document.getElementById('profileMenuLogoutBtn');

    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => {
            window.location.href = dashboardHref;
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeProfileMenuModal();
        }
    });
}

function openProfileMenuModal() {
    const overlay = document.getElementById('profileMenuOverlay');
    if (!overlay) return;
    overlay.classList.add('is-open');
}

function closeProfileMenuModal() {
    const overlay = document.getElementById('profileMenuOverlay');
    if (!overlay) return;
    overlay.classList.remove('is-open');
}

function getUserInitials(user) {
    const firstName = String(user?.nome || user?.firstName || user?.name || '').trim();
    const lastName = String(user?.cognome || user?.lastName || '').trim();

    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    if (initials.trim()) return initials;

    const email = String(user?.email || '').trim();
    if (email) return email.charAt(0).toUpperCase();

    return 'U';
}

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
    closeProfileMenuModal();
    clearAuthState();
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
        alert(`Access denied. This page is only for ${requiredRole}.`);
        
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

async function refreshNotificationBadge() {
    const token = getToken();
    const user = getCurrentUser();
    const role = String(user?.ruolo || user?.role || '').toLowerCase();

    if (!token || (role !== 'mentor' && role !== 'mentee')) {
        removeNotificationBadge();
        return;
    }

    const routes = role === 'mentor'
        ? ['/api/mentor/notifications/unread-count', '/api/mentee/notifications/unread-count']
        : ['/api/mentee/notifications/unread-count', '/api/mentor/notifications/unread-count'];

    const baseCandidates = getNotificationApiBases();
    let unreadCount = 0;

    for (const route of routes) {
        for (const base of baseCandidates) {
            try {
                const res = await fetch(`${base}${route}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) continue;
                const payload = await res.json();
                unreadCount = Number(payload?.unreadCount || payload?.data?.unreadCount || 0);
                updateNotificationBadge(unreadCount);
                return;
            } catch (_error) {
                // try next candidate
            }
        }
    }

    removeNotificationBadge();
}

function getNotificationApiBases() {
    const list = [];
    const origin = window.location.origin || '';
    if (origin && !origin.startsWith('file://')) {
        list.push(origin);
    }
    list.push('http://localhost:3000');
    list.push('');
    return [...new Set(list)];
}

function updateNotificationBadge(unreadCount) {
    const links = document.querySelectorAll('nav a[href*="notification"]');
    links.forEach((link) => {
        link.classList.add('notification-nav-link');

        let dot = link.querySelector('.notification-nav-dot');
        if (unreadCount > 0) {
            if (!dot) {
                dot = document.createElement('span');
                dot.className = 'notification-nav-dot';
                link.appendChild(dot);
            }
            dot.style.display = 'block';
        } else if (dot) {
            dot.style.display = 'none';
        }
    });
}

function removeNotificationBadge() {
    const dots = document.querySelectorAll('.notification-nav-dot');
    dots.forEach((dot) => dot.remove());
}