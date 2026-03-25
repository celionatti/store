import { formatCurrency, debounce, getStockBadge, escapeHtml } from '../utils/helpers.js';
import { logout, getUser } from '../pages/login.js';

export const NAV_ITEMS = [
  {
    section: 'Main',
    items: [
      { label: 'Dashboard', href: '#/', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', allowedRoles: ['admin'] },
      { label: 'Products', href: '#/products', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>', allowedRoles: ['admin'] },
      { label: 'Categories', href: '#/categories', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>', allowedRoles: ['admin'] },
      { label: 'Suppliers', href: '#/suppliers', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>', allowedRoles: ['admin'] },
      { label: 'Stock Alerts', href: '#/stock-alerts', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', allowedRoles: ['admin', 'worker'] },
      { label: 'Customers', href: '#/customers', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>', allowedRoles: ['admin', 'worker'] },
    ]
  },
  {
    section: 'Operations',
    items: [
      { label: 'Stock Entry', href: '#/stock', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', allowedRoles: ['admin'] },
      { label: 'Sales', href: '#/sales', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>', allowedRoles: ['admin', 'worker'] },
      { label: 'Scanner', href: '#/scanner', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="11" y1="8" x2="11" y2="16"/><line x1="15" y1="8" x2="15" y2="12"/><line x1="19" y1="8" x2="19" y2="16"/><line x1="3" y1="8" x2="3" y2="16"/></svg>', allowedRoles: ['admin', 'worker'] },
    ]
  },
  {
    section: 'Analytics',
    items: [
      { label: 'Reports', href: '#/reports', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', allowedRoles: ['admin'] },
      { label: 'Expenses', href: '#/expenses', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>', allowedRoles: ['admin'] },
      { label: 'Activity History', href: '#/audit-logs', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', allowedRoles: ['admin'] },
      { label: 'Workers', href: '#/workers', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>', allowedRoles: ['admin'] },
      { label: 'Settings', href: '#/settings', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>', allowedRoles: ['admin'] },
    ]
  }
];

export function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  const user = getUser();
  const role = user?.role || 'worker';

  let html = '';
  for (const section of NAV_ITEMS) {
    let sectionHtml = '';
    const sectionTitle = `<div class="nav-section-title">${section.section}</div>`;
    
    let hasItems = false;
    for (const item of section.items) {
      if (!item.allowedRoles.includes(role)) {
        continue; // Hide links based on role
      }
      
      hasItems = true;
      const isActive = location.hash === item.href || (!location.hash && item.href === '#/');
      sectionHtml += `
        <a href="${item.href}" class="${isActive ? 'active' : ''}">
          ${item.icon}
          <span>${item.label}</span>
        </a>
      `;
    }
    
    // Only render the section if there are visible items
    if (hasItems) {
      html += sectionTitle + sectionHtml;
    }
  }
  nav.innerHTML = html;

  // Handle Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
  });

  // Mobile sidebar toggle
  const hamburger = document.getElementById('hamburger');
  const sidebarContainer = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  const close = () => {
    sidebarContainer.classList.remove('open');
    overlay.classList.remove('active');
  };

  hamburger?.addEventListener('click', () => {
    sidebarContainer.classList.toggle('open');
    overlay.classList.toggle('active');
  });

  overlay?.addEventListener('click', close);

  // Close sidebar on nav click (mobile)
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) close();
  });
}
