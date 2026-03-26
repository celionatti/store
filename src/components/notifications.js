import { api } from '../api.js';
import { getUser } from '../pages/login.js';

let notifications = [];
let unreadCount = 0;
let isDropdownOpen = false;
let isFirstFetch = true;
let notifiedIds = new Set();

export async function initNotifications() {
  const user = getUser();
  if (!user || user.role !== 'admin') return;

  const topbar = document.getElementById('topbar');
  const themeToggle = document.getElementById('theme-toggle');
  
  if (!topbar || !themeToggle) return;

  // Inject Bell Icon
  const bellContainer = document.createElement('div');
  bellContainer.className = 'notification-container';

  const bellBtn = document.createElement('button');
  bellBtn.className = 'btn-icon';
  bellBtn.id = 'notification-bell';
  bellBtn.title = 'Notifications';
  bellBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 01-3.46 0"></path>
    </svg>
    <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
  `;

  const dropdown = document.createElement('div');
  dropdown.className = 'notification-dropdown';
  dropdown.id = 'notification-dropdown';
  dropdown.style.display = 'none';

  bellContainer.appendChild(bellBtn);
  bellContainer.appendChild(dropdown);

  // Insert before theme toggle
  topbar.insertBefore(bellContainer, themeToggle);

  // Toggle Dropdown
  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isDropdownOpen = !isDropdownOpen;
    dropdown.style.display = isDropdownOpen ? 'block' : 'none';

    // Request native notification permission on first interaction
    if (isDropdownOpen && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!bellContainer.contains(e.target)) {
      isDropdownOpen = false;
      dropdown.style.display = 'none';
    }
  });

  // Initial Fetch & Poll
  await fetchNotifications();
  setInterval(fetchNotifications, 60000); // Poll every minute
}

async function fetchNotifications() {
  try {
    const data = await api.getNotifications();
    const user = getUser();
    if (!user) return;
    
    notifications = data.notifications || [];
    unreadCount = notifications.filter(n => !n.readBy.includes(user.id)).length;
    
    // Handle Native Notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      notifications.forEach(notif => {
        if (!notif.readBy.includes(user.id) && !notifiedIds.has(notif._id)) {
          if (!isFirstFetch) {
            new Notification('Store — New Sale', {
              body: notif.message,
              icon: '/icon-192.png'
            });
          }
          notifiedIds.add(notif._id);
        }
      });
    } else {
      // Prevent spam on later permission grants by marking existing ones as seen
      notifications.forEach(notif => notifiedIds.add(notif._id));
    }
    
    isFirstFetch = false;
    updateUI();
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
  }
}

function updateUI() {
  const badge = document.getElementById('notification-badge');
  const dropdown = document.getElementById('notification-dropdown');
  const user = getUser();
  
  if (!badge || !dropdown || !user) return;

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }

  if (notifications.length === 0) {
    dropdown.innerHTML = '<div class="notification-empty">No notifications</div>';
    return;
  }

  let html = '<div class="notification-header">Notifications</div><div class="notification-list">';
  
  notifications.forEach(notif => {
    const isRead = notif.readBy.includes(user.id);
    const dateObj = new Date(notif.createdAt);
    
    html += `
      <div class="notification-item ${isRead ? 'read' : 'unread'}" data-id="${notif._id}">
        <div class="notification-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" width="16" height="16">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
          </svg>
        </div>
        <div class="notification-content">
          <div class="notification-text">${notif.message}</div>
          <div class="notification-time">${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${dateObj.toLocaleDateString()}</div>
        </div>
        ${!isRead ? '<div class="notification-dot"></div>' : ''}
        <button class="notification-delete-btn" aria-label="Delete Notification" data-id="${notif._id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
          </svg>
        </button>
      </div>
    `;
  });
  
  html += '</div>';
  dropdown.innerHTML = html;

  // Add click listeners to mark as read
  const items = dropdown.querySelectorAll('.notification-item.unread');
  items.forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation(); // Keep dropdown open
      if (e.target.closest('.notification-delete-btn')) return;
      const id = item.getAttribute('data-id');
      await markAsRead(id);
    });
  });

  // Add click listeners to delete
  const deleteBtns = dropdown.querySelectorAll('.notification-delete-btn');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      await deleteNotification(id);
    });
  });
}

async function deleteNotification(id) {
  try {
    // Optimistic update
    notifications = notifications.filter(n => n._id !== id);
    const user = getUser();
    if (user) {
      unreadCount = notifications.filter(n => !n.readBy.includes(user.id)).length;
    }
    updateUI();
    
    await api.deleteNotification(id);
  } catch (err) {
    console.error('Failed to delete notification:', err);
    fetchNotifications();
  }
}

async function markAsRead(id) {
  try {
    await api.markNotificationRead(id);
    const user = getUser();
    // Optimistic update
    const notif = notifications.find(n => n._id === id);
    if (notif && user && !notif.readBy.includes(user.id)) {
      notif.readBy.push(user.id);
      unreadCount = Math.max(0, unreadCount - 1);
      updateUI();
    }
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
  }
}
