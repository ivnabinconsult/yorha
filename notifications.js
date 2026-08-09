/* ── notifications.js — wire into app.js ──
   Uses apiFetch() from auth.js. Assumes a backend route
   GET /api/notifications and PUT /api/notifications/:id/read
   (build these to match your Notification model). */

const NOTIF_ICONS = {
  purchase: 'buy', payout: 'buy', chapter: 'content',
  follow: 'content', system: 'system', review: 'content',
};

function notifDotClass(type) {
  return NOTIF_ICONS[type] || 'system';
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'd';
}

function notifItemHtml(n) {
  return `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="openNotification('${n._id}')">
      <div class="notif-dot ${notifDotClass(n.type)}">●</div>
      <div class="notif-item-body">
        <p class="notif-item-title">${n.title}</p>
        <p class="notif-item-sub">${n.body}</p>
      </div>
      <span class="notif-item-time">${timeAgo(n.createdAt)}</span>
    </div>`;
}

let notifCache = [];

async function loadNotifications() {
  try {
    const data = await apiFetch('/notifications');
    notifCache = data.notifications || [];
    renderNotifications();
    updateNotifBadge();
  } catch (err) {
    console.error('Failed to load notifications:', err.message);
  }
}

function renderNotifications() {
  const html = notifCache.length
    ? notifCache.map(notifItemHtml).join('')
    : `<div class="notif-empty">No notifications yet.</div>`;

  document.querySelectorAll('.notif-panel-list').forEach(el => el.innerHTML = html);
  const page = document.getElementById('notifPageList');
  if (page) page.innerHTML = html;
}

function updateNotifBadge() {
  const unread = notifCache.filter(n => !n.read).length;
  document.querySelectorAll('.notif-badge').forEach(badge => {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.toggle('hidden', unread === 0);
  });
}
function toggleNotifPanel(btn) {
  const wrap = btn ? btn.closest('.notif-bell-wrap') : document.querySelector('.notif-bell-wrap');
  wrap?.querySelector('.notif-panel')?.classList.toggle('open');
}

async function markAllNotifsRead() {
  notifCache.forEach(n => n.read = true);
  renderNotifications();
  updateNotifBadge();
  try {
    await apiFetch('/notifications/read-all', { method: 'PUT' });
  } catch (err) {
    console.error('Failed to mark all read:', err.message);
  }
}

async function openNotification(id) {
  const n = notifCache.find(x => x._id === id);
  if (n && !n.read) {
    n.read = true;
    renderNotifications();
    updateNotifBadge();
    apiFetch(`/notifications/${id}/read`, { method: 'PUT' }).catch(() => {});
  }
  // TODO: route to the relevant page (product, payout history, etc.)
  // based on n.link or n.type
}

// Close dropdown when clicking outside it
document.addEventListener('click', (e) => {
  document.querySelectorAll('.notif-bell-wrap').forEach(wrap => {
    if (!wrap.contains(e.target)) {
      wrap.querySelector('.notif-panel')?.classList.remove('open');
    }
  });
});

/* ── Toasts ── call showToast('Purchase confirmed', 'Bleach Vol. 12 added to your library') */
function showToast(title, body, type = 'success', duration = 4000) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <div class="notif-dot ${type === 'error' ? 'system' : 'buy'}" style="width:24px;height:24px;font-size:12px">●</div>
    <div style="flex:1">
      <p class="notif-item-title">${title}</p>
      <p class="notif-item-sub">${body}</p>
      <div class="toast-bar" style="animation-duration:${duration}ms"></div>
    </div>
    <button class="toast-close" aria-label="Dismiss">✕</button>`;

  el.querySelector('.toast-close').onclick = () => el.remove();
  stack.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) loadNotifications();
});
