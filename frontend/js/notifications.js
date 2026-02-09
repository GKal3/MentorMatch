// Caricamento notifiche per Mentor/Mentee tramite getAllNot
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
	if (!requireAuth()) return;
	
	currentUser = getCurrentUser();

	loadNotifications();

	const markAllBtn = document.querySelector('.mark-all-btn');
	if (markAllBtn) {
		markAllBtn.addEventListener('click', markAllAsRead);
	}

	setupFilters();
});

async function loadNotifications() {
	const token = localStorage.getItem('token') || sessionStorage.getItem('token');
	const role = currentUser.ruolo; // 'Mentor' | 'Mentee'

	let url = '';
	if (role === 'Mentee') {
		url = 'http://localhost:3000/api/mentee/notifications';
	} else if (role === 'Mentor') {
		url = 'http://localhost:3000/api/mentor/notifications';
	} else {
		console.warn('Ruolo non riconosciuto:', role);
		url = 'http://localhost:3000/api/mentee/notifications';
	}

	try {
		const res = await fetch(url, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		const data = await res.json();

		const notifications = Array.isArray(data) ? data : (data.data || []);
		renderNotifications(notifications);
	} catch (err) {
		console.error('Errore caricamento notifiche:', err);
		showEmptyState();
	}
}

function renderNotifications(items) {
	const list = document.getElementById('notifications-list');
	const empty = document.getElementById('empty-state');
	const unreadCountEl = document.getElementById('unread-count');

	list.innerHTML = '';

	if (!items || items.length === 0) {
		showEmptyState();
		unreadCountEl.textContent = '0';
		return;
	}

	empty.style.display = 'none';
	list.style.display = 'block';

	let unreadCount = 0;

	items.forEach(n => {
		const tipo = n.Tipo || 'Generale';
		const titolo = n.Titolo || 'Notifica';
		const contenuto = n.Contenuto || '';
		const data = n.Data ? new Date(n.Data) : new Date();
		const timeStr = formatRelativeTime(data);

		// Heuristic: mark unread based on presence of a flag; if none, treat recent (<48h) as unread
		const isUnread = n.Letto === false || (Date.now() - data.getTime()) < 48 * 3600 * 1000;
		if (isUnread) unreadCount++;

		const item = document.createElement('div');
		item.className = 'notification-item' + (isUnread ? ' unread' : '');

		const iconClass = `notification-icon ${iconClassByType(tipo)}`;
		item.innerHTML = `
			<div class="${iconClass}">${iconEmojiByType(tipo)}</div>
			<div class="notification-content">
				<div class="notification-title">${escapeHtml(titolo)}</div>
				<div class="notification-message">${escapeHtml(contenuto)}</div>
				<div class="notification-time">${timeStr}</div>
				<div class="notification-actions">
					${actionButtonsByType(tipo)}
				</div>
			</div>
			${isUnread ? '<div class="unread-indicator"></div>' : ''}
		`;

		list.appendChild(item);
	});

	unreadCountEl.textContent = String(unreadCount);
}

function showEmptyState() {
	const list = document.getElementById('notifications-list');
	const empty = document.getElementById('empty-state');
	list.style.display = 'none';
	empty.style.display = 'block';
}

function markAllAsRead() {
	// UI-only: rimuove stato unread; backend non definito per update
	document.querySelectorAll('.notification-item.unread').forEach(el => el.classList.remove('unread'));
	const unreadCountEl = document.getElementById('unread-count');
	unreadCountEl.textContent = '0';
}

function setupFilters() {
	const buttons = document.querySelectorAll('.filter-btn');
	buttons.forEach(btn => {
		btn.addEventListener('click', () => {
			buttons.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');

			const label = btn.textContent?.trim()?.toLowerCase();
			filterByType(label);
		});
	});
}

function filterByType(label) {
	const items = document.querySelectorAll('.notification-item');
	items.forEach(item => {
		const message = item.querySelector('.notification-message')?.textContent?.toLowerCase() || '';
		const title = item.querySelector('.notification-title')?.textContent?.toLowerCase() || '';

		if (!label || label === 'all') {
			item.style.display = '';
			return;
		}

		const matches = (
			(label === 'sessions' && (title.includes('session') || message.includes('session'))) ||
			(label === 'messages' && (title.includes('message') || message.includes('message'))) ||
			(label === 'payments' && (title.includes('payment') || message.includes('payment'))) ||
			(label === 'reviews' && (title.includes('review') || message.includes('review')))
		);
		item.style.display = matches ? '' : 'none';
	});
}

function iconClassByType(tipo) {
	const t = (tipo || '').toLowerCase();
	if (t.includes('session')) return 'icon-session';
	if (t.includes('message')) return 'icon-message';
	if (t.includes('payment')) return 'icon-payment';
	if (t.includes('review')) return 'icon-review';
	if (t.includes('reminder')) return 'icon-reminder';
	return 'icon-reminder';
}

function iconEmojiByType(tipo) {
	const t = (tipo || '').toLowerCase();
	if (t.includes('session')) return '📅';
	if (t.includes('message')) return '💬';
	if (t.includes('payment')) return '💳';
	if (t.includes('review')) return '⭐';
	if (t.includes('reminder')) return '🔔';
	return '🔔';
}

function formatRelativeTime(date) {
	const diff = (Date.now() - date.getTime()) / 1000; // seconds
	if (diff < 60) return 'Just now';
	if (diff < 3600) return `${Math.floor(diff/60)} minutes ago`;
	if (diff < 86400) return `${Math.floor(diff/3600)} hours ago`;
	const days = Math.floor(diff/86400);
	if (days === 1) return 'Yesterday';
	return `${days} days ago`;
}

function escapeHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
