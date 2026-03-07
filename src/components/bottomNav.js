/**
 * Bottom Navigation Component for Mobile
 */

const BOTTOM_NAV_ITEMS = [
  { label: 'Home', href: '#/', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },

  { label: 'Stock', href: '#/products', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' },
  { label: 'Sale', href: '#/sales', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
  { label: 'Scan', href: '#/scanner', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="11" y1="8" x2="11" y2="16"/><line x1="15" y1="8" x2="15" y2="12"/><line x1="19" y1="8" x2="19" y2="16"/><line x1="3" y1="8" x2="3" y2="16"/></svg>' },
  { label: 'Reports', href: '#/reports', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
];

import { getUser } from '../pages/login.js';

export function renderBottomNav() {
  const container = document.getElementById('bottom-nav');
  if (!container) return;

  const currentHash = location.hash || '#/';
  
  const user = getUser();
  const role = user?.role || 'worker';
  
  let html = '';
  for (const item of BOTTOM_NAV_ITEMS) {
    if (role === 'worker' && ['#/', '#/products', '#/reports'].includes(item.href)) {
      continue; // Hide restricted links from workers
    }

    const isActive = currentHash === item.href;
    html += `
      <a href="${item.href}" class="bottom-nav-item ${isActive ? 'active' : ''}">
        ${item.icon}
        <span class="text-xs font-bold">${item.label}</span>
      </a>
    `;
  }

  container.innerHTML = html;


  // Floating Action Button Logic
  const fab = document.getElementById('main-fab');
  const fabContainer = document.getElementById('fab-container');
  
  if (fab && !fab.dataset.initialized) {
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      fabContainer.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      fabContainer?.classList.remove('open');
    });

    // Close FAB menu when a link is clicked
    const fabMenu = document.getElementById('fab-menu');
    fabMenu?.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        fabContainer?.classList.remove('open');
      }
    });

    fab.dataset.initialized = 'true';
  }
}
