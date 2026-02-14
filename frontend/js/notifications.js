// Load notifications for Mentor/Mentee via getAllNot
let currentUser = null;
let allNotifications = [];
let notificationsApiBase = '';
let notificationsApiPrefix = '';

document.addEventListener('DOMContentLoaded', () => {
	if (!requireAuth()) return;
	
	currentUser = getCurrentUser();
	renderRoleSidebar();

	loadNotifications();

	const markAllBtn = document.querySelector('.mark-all-btn');
	if (markAllBtn) {
		markAllBtn.addEventListener('click', markAllAsRead);
	}

	setupFilters();
});

function renderRoleSidebar() {
	const sidebar = document.getElementById('role-sidebar');
	if (!sidebar || !currentUser) return;

	const role = (currentUser.ruolo || currentUser.role || '').toLowerCase();

	if (role === 'mentor') {
		sidebar.innerHTML = `
			<a href="dashboardMentor.html">Dashboard</a>
			<a href="avMentor.html">Availability</a>
			<a href="chat.html">Messages</a>
			<a href="appointmentsMentor.html">Appointments</a>
			<a href="reviewsMentor.html">Reviews</a>
			<a href="earnings.html">Earnings</a>
		`;
		return;
	}

	if (role === 'mentee') {
		sidebar.innerHTML = `
			<a href="dashboardMentee.html">Dashboard</a>
			<a href="appArea.html">My Sessions</a>
			<a href="chat.html">Messages</a>
			<a href="search.html">Find Mentors</a>
			<a href="paymentHistory.html">Payment History</a>
		`;
		return;
	}

	sidebar.style.display = 'none';
}

async function loadNotifications() {
	const token = localStorage.getItem('token') || sessionStorage.getItem('token');
	const role = (currentUser?.ruolo || currentUser?.role || '').toLowerCase();

	try {
		const notifications = await fetchNotificationsWithFallback(token, role);

		allNotifications = notifications;
		renderNotifications(allNotifications);
		if (typeof refreshNotificationBadge === 'function') {
			refreshNotificationBadge();
		}
	} catch (err) {
		console.error('Error loading notifications:', err);
		showEmptyState();
	}
}

async function fetchNotificationsWithFallback(token, role) {
	const routes = role === 'mentor'
		? ['/api/mentor/notifications', '/api/mentee/notifications']
		: ['/api/mentee/notifications', '/api/mentor/notifications'];

	if (role !== 'mentor' && role !== 'mentee') {
		console.warn('Unrecognized role, trying both notifications endpoints:', role);
	}

	const baseCandidates = getApiBaseCandidates();
	let lastError = null;

	for (const route of routes) {
		for (const base of baseCandidates) {
			const url = `${base}${route}`;
			try {
				const res = await fetch(url, {
					headers: { 'Authorization': `Bearer ${token}` }
				});

				if (res.status === 401) {
					console.warn('Notifications API unauthorized, redirecting to login:', url);
					handleUnauthorizedSession();
					throw new Error('Unauthorized session');
				}

				if (!res.ok) {
					lastError = new Error(`${url} -> HTTP ${res.status}`);
					continue;
				}

				const payload = await safeJson(res);
				notificationsApiBase = base;
				notificationsApiPrefix = route.startsWith('/api/mentor') ? '/api/mentor' : '/api/mentee';
				const notifications = extractNotifications(payload).map(normalizeNotification);
				console.log('Notifications loaded from:', url, 'count:', notifications.length);
				return notifications;
			} catch (error) {
				lastError = error;
			}
		}
	}

	throw lastError || new Error('Unable to load notifications from any endpoint');
}

function handleUnauthorizedSession() {
	localStorage.removeItem('token');
	localStorage.removeItem('user');
	sessionStorage.removeItem('token');
	sessionStorage.removeItem('user');
	sessionStorage.setItem('returnUrl', window.location.href);
	window.location.href = '/pages/login.html';
}

function getApiBaseCandidates() {
	const list = [];
	const origin = window.location.origin || '';

	if (origin && !origin.startsWith('file://')) {
		list.push(origin);
	}

	list.push('http://localhost:3000');
	list.push('');

	return [...new Set(list)];
}

async function safeJson(response) {
	try {
		return await response.json();
	} catch (_error) {
		return [];
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
		const notificationId = n.id;
		const tipo = n.tipo;
		const titolo = n.titolo;
		const contenuto = n.contenuto;
		const data = n.data;
		const timeStr = formatRelativeTime(data);
		const isUnread = n.isUnread;
		const category = n.category;
		if (isUnread) unreadCount++;

		const item = document.createElement('div');
		item.className = 'notification-item' + (isUnread ? ' unread' : '');
		item.dataset.category = category;
		if (notificationId != null) item.dataset.id = String(notificationId);

		const iconClass = `notification-icon ${iconClassByType(tipo)}`;
		item.innerHTML = `
			<div class="${iconClass}">${iconEmojiByType(tipo)}</div>
			<div class="notification-content">
				<div class="notification-title">${escapeHtml(titolo)}</div>
				<div class="notification-message">${escapeHtml(contenuto)}</div>
				<div class="notification-time">${timeStr}</div>
				<div class="notification-actions">
					${actionButtonsByType(tipo, notificationId)}
				</div>
			</div>
			${isUnread ? '<div class="unread-indicator"></div>' : ''}
		`;

		item.addEventListener('click', async () => {
			if (notificationId == null) return;
			await markNotificationRead(notificationId);
		});

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

async function markAllAsRead() {
	const token = getToken();
	const endpoint = `${notificationsApiBase}${notificationsApiPrefix}/notifications/read-all`;

	try {
		if (notificationsApiPrefix) {
			await fetch(endpoint, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});
		}
	} catch (error) {
		console.error('Error marking all notifications as read:', error);
	}

	allNotifications = allNotifications.map(n => ({ ...n, isUnread: false, stato: 'Read' }));
	renderNotifications(allNotifications);
	const active = document.querySelector('.filter-btn.active');
	if (active) {
		filterByType(active.textContent?.trim()?.toLowerCase());
	}

	if (typeof refreshNotificationBadge === 'function') {
		refreshNotificationBadge();
	}
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
	let visibleCount = 0;

	items.forEach(item => {
		const category = item.dataset.category || 'other';

		if (!label || label === 'all') {
			item.style.display = '';
			visibleCount++;
			return;
		}

		const expected = labelToCategory(label);
		const matches = category === expected;
		item.style.display = matches ? '' : 'none';
		if (matches) visibleCount++;
	});

	const empty = document.getElementById('empty-state');
	const list = document.getElementById('notifications-list');
	if (visibleCount === 0) {
		list.style.display = 'none';
		empty.style.display = 'block';
	} else {
		list.style.display = 'block';
		empty.style.display = 'none';
	}
}

function labelToCategory(label) {
	if (label === 'sessions') return 'sessions';
	if (label === 'messages') return 'messages';
	if (label === 'payments') return 'payments';
	if (label === 'reviews') return 'reviews';
	return 'other';
}

function extractNotifications(payload) {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.notifications)) return payload.notifications;
	return [];
}

function normalizeNotification(raw) {
	const id = raw?.Id ?? raw?.id ?? null;
	const tipo = raw?.Tipo || raw?.tipo || raw?.type || raw?.category || 'General';
	const titolo = raw?.Titolo || raw?.titolo || raw?.title || 'Notification';
	const contenuto = raw?.Contenuto || raw?.contenuto || raw?.message || '';
	const rawDate = raw?.Data || raw?.data || raw?.createdAt || null;
	const data = rawDate ? new Date(rawDate) : new Date();
	const stato = raw?.Stato || raw?.stato || null;
	const explicitRead = raw?.Letto ?? raw?.letto ?? raw?.isRead ?? raw?.read;
	const isUnread = stato
		? String(stato).toLowerCase() === 'unread'
		: (explicitRead === undefined ? true : !Boolean(explicitRead));

	return {
		id,
		tipo,
		titolo,
		contenuto,
		data,
		stato,
		isUnread,
		category: inferCategory(tipo, titolo, contenuto)
	};
}

function inferCategory(tipo, titolo, contenuto) {
	const text = `${tipo} ${titolo} ${contenuto}`.toLowerCase();

	if (text.includes('session') || text.includes('booking') || text.includes('appointment') || text.includes('prenot')) {
		return 'sessions';
	}

	if (text.includes('message') || text.includes('messaggio') || text.includes('chat')) {
		return 'messages';
	}

	if (text.includes('payment') || text.includes('pagament') || text.includes('refund') || text.includes('stripe') || text.includes('paypal')) {
		return 'payments';
	}

	if (text.includes('review') || text.includes('recension')) {
		return 'reviews';
	}

	return 'other';
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

function actionButtonsByType(tipo, notificationId) {
	const t = String(tipo || '').toLowerCase();
	const idAttr = notificationId != null ? ` data-id="${notificationId}"` : '';
	const role = (currentUser?.ruolo || currentUser?.role || '').toLowerCase();

	if (t.includes('message') || t.includes('chat') || t.includes('messaggio')) {
		return `<button class="action-btn open-link-btn"${idAttr} data-link="/pages/chat.html">Open chat</button>`;
	}

	if (t.includes('payment') || t.includes('pagament') || t.includes('refund') || t.includes('stripe') || t.includes('paypal')) {
		return `<button class="action-btn open-link-btn"${idAttr} data-link="/pages/paymentHistory.html">View payment</button>`;
	}

	if (t.includes('review') || t.includes('recension')) {
		const reviewsPage = role === 'mentee' ? '/pages/reviewsMentee.html' : '/pages/reviewsMentor.html';
		return `<button class="action-btn open-link-btn"${idAttr} data-link="${reviewsPage}">View review</button>`;
	}

	if (t.includes('session') || t.includes('booking') || t.includes('appointment') || t.includes('prenot')) {
		const sessionsPage = role === 'mentee' ? '/pages/appArea.html' : '/pages/appointmentsMentor.html';
		return `<button class="action-btn open-link-btn"${idAttr} data-link="${sessionsPage}">View session</button>`;
	}

	return '';
}

async function markNotificationRead(notificationId) {
	const item = allNotifications.find((n) => String(n.id) === String(notificationId));
	if (!item || !item.isUnread) return;

	const token = getToken();
	const endpoint = `${notificationsApiBase}${notificationsApiPrefix}/notifications/${notificationId}/read`;

	try {
		if (notificationsApiPrefix) {
			await fetch(endpoint, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});
		}
	} catch (error) {
		console.error('Error marking notification as read:', error);
	}

	allNotifications = allNotifications.map((n) =>
		String(n.id) === String(notificationId)
			? { ...n, isUnread: false, stato: 'Read' }
			: n
	);

	renderNotifications(allNotifications);
	const active = document.querySelector('.filter-btn.active');
	if (active) {
		filterByType(active.textContent?.trim()?.toLowerCase());
	}

	if (typeof refreshNotificationBadge === 'function') {
		refreshNotificationBadge();
	}
}

document.addEventListener('click', async (event) => {
	const btn = event.target.closest('.open-link-btn');
	if (!btn) return;

	event.preventDefault();
	event.stopPropagation();

	const notificationId = btn.dataset.id;
	const link = btn.dataset.link;

	if (notificationId) {
		await markNotificationRead(notificationId);
	}

	if (link) {
		window.location.href = link;
	}
});

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
