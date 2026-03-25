/**
 * Bottom Navigation Component for Mobile
 */

import { getUser } from '../pages/login.js';
import { NAV_ITEMS } from './sidebar.js';

const BOTTOM_NAV_ITEMS = [
  { label: 'Home', href: '#/', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  { label: 'Stock', href: '#/products', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' },
  { label: 'Sale', href: '#/sales', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
  { label: 'Scan', href: '#/scanner', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="11" y1="8" x2="11" y2="16"/><line x1="15" y1="8" x2="15" y2="12"/><line x1="19" y1="8" x2="19" y2="16"/><line x1="3" y1="8" x2="3" y2="16"/></svg>' },
  { label: 'Menu', href: '#', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>', isMenuToggle: true },
];

export function renderBottomNav() {
  const container = document.getElementById('bottom-nav');
  if (!container) return;

  const currentHash = location.hash || '#/';
  
  const user = getUser();
  const role = user?.role || 'worker';
  
  let html = '<div class="bottom-nav-inner" style="display: flex; width: 100%; justify-content: space-around; align-items: center;">';
  for (const item of BOTTOM_NAV_ITEMS) {
    if (role === 'worker' && ['#/', '#/products', '#/reports'].includes(item.href)) {
      continue; // Hide restricted links from workers
    }

    const isActive = currentHash === item.href;
    html += `
      <a href="${item.href}" class="bottom-nav-item ${isActive && !item.isMenuToggle ? 'active' : ''}" ${item.isMenuToggle ? 'id="bottom-nav-menu-toggle"' : ''}>
        ${item.icon}
        <span class="text-xs font-bold">${item.label}</span>
      </a>
    `;
  }
  html += '</div>';

  // Build Floating Menu HTML
  let menuHtml = '<div class="bottom-nav-menu" id="bottom-nav-menu">';
  const bottomNavLinks = BOTTOM_NAV_ITEMS.map(i => i.href);
  for (const section of NAV_ITEMS) {
    let sectionHtml = '';
    const sectionTitle = `<div class="nav-section-title">${section.section}</div>`;
    
    let hasItems = false;
    for (const item of section.items) {
      if (!item.allowedRoles.includes(role)) continue;
      // Do not duplicate links already shown in the 5 main bottom icons
      if (bottomNavLinks.includes(item.href)) continue;

      hasItems = true;
      const isActive = location.hash === item.href || (!location.hash && item.href === '#/');
      sectionHtml += `
        <a href="${item.href}" class="bottom-nav-menu-item ${isActive ? 'active' : ''}">
          ${item.icon}
          <span>${item.label}</span>
        </a>
      `;
    }
    
    if (hasItems) {
      menuHtml += sectionTitle + sectionHtml;
    }
  }
  
  menuHtml += `
    <div style="border-top: 1px solid var(--color-border); margin-top: var(--space-sm); padding-top: var(--space-xs);">
      <button id="mobile-menu-logout-btn" class="bottom-nav-menu-item text-danger" style="width: 100%; background: none; border: none; text-align: left; cursor: pointer;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Logout</span>
      </button>
    </div>
  </div>`;

  container.innerHTML = html + menuHtml;

  // Toggle Menu Logic
  const menuToggle = document.getElementById('bottom-nav-menu-toggle');
  const navMenu = document.getElementById('bottom-nav-menu');
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navMenu.classList.toggle('open');
      menuToggle.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      navMenu.classList.remove('open');
      menuToggle.classList.remove('active');
    });

    navMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('a') || e.target.closest('button')) {
        navMenu.classList.remove('open');
        menuToggle.classList.remove('active');
      }
    });
  }

  // Logout Logic from bottom menu
  const logoutBtn = document.getElementById('mobile-menu-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      import('../pages/login.js').then(module => module.logout());
    });
  }


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
