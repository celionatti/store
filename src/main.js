/**
 * StoreKeep — App Entry Point
 */
import { Router } from './router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderBottomNav } from './components/bottomNav.js'; // Added import
import { renderDashboard } from './pages/dashboard.js';
import { renderProducts } from './pages/products.js';
import { renderAddProduct } from './pages/addProduct.js';
import { renderStockEntry } from './pages/stockEntry.js';
import { renderSales } from './pages/sales.js';
import { renderReports } from './pages/reports.js';
import { renderScanner } from './pages/scanner.js';
import { renderCustomers } from './pages/customers.js';
import { renderAddCustomer } from './pages/addCustomer.js';
import { renderWorkers } from './pages/workers.js';
import { renderAddWorker } from './pages/addWorker.js';
import { renderLogin, logout } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderExpenses } from './pages/expenses.js';
import { renderSettings } from './pages/settings.js';
import { renderSuppliers } from './pages/suppliers.js';
import { renderStockAlerts } from './pages/stockAlerts.js';
import { renderBulkImport } from './pages/bulkImport.js';
import { renderAuditLogs } from './pages/auditLogs.js';
import { renderCategories } from './pages/categories.js';
import { renderLocations } from './pages/locations.js';
import { renderCustomerHistory } from './pages/customerHistory.js';
import { initServerStatus } from './components/ServerStatus.js';
import { initNotifications } from './components/notifications.js';
import { initStoreSwitcher } from './components/StoreSwitcher.js';

import { getTheme, setTheme, toggleTheme } from './utils/helpers.js';

// Remove Vite default styles
const defaultStyle = document.querySelector('link[href*="style.css"][href*="src"]');
if (defaultStyle) defaultStyle.remove();

import { api } from './api.js';

// Initialize sidebar, bottom navigation and theme
document.addEventListener('DOMContentLoaded', async () => {
  const user = (await import('./pages/login.js')).getUser();
  if (user && user.role !== 'admin' && user.locationId) {
    localStorage.setItem('active_location_id', user.locationId);
  }

  renderSidebar();
  renderBottomNav();
  initServerStatus();
  initNotifications();
  initStoreSwitcher();
  
  // Sync global settings
  try {
    const data = await api.getSettings();
    if (data?.settings) {
      const { currency, shopName } = data.settings;
      if (currency) {
        import('./utils/helpers.js').then(h => h.setCurrentCurrency(currency));
      }
      if (shopName) {
        import('./utils/helpers.js').then(h => h.updateBrandName(shopName));
      }
    }
  } catch (err) {
    console.warn('Failed to sync settings:', err);
  }

  // Initialize theme
  const theme = getTheme();
  setTheme(theme);
  updateThemeUI(theme);

  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('click', () => {
    const newTheme = toggleTheme();
    updateThemeUI(newTheme);
  });

  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  mobileLogoutBtn?.addEventListener('click', () => {
    logout();
  });
});

function updateThemeUI(theme) {
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  if (sunIcon && moonIcon) {
    sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
    moonIcon.style.display = theme === 'dark' ? 'none' : 'block';
  }
}

// Initialize router
const router = new Router([
  { path: '/',               title: 'Dashboard',    render: renderDashboard, requiresAuth: true, allowedRoles: ['admin', 'manager'] },
  { path: '/products',       title: 'Products',     render: renderProducts,  requiresAuth: true, allowedRoles: ['admin', 'manager'] },
  { path: '/products/new',   title: 'Add Product',  render: renderAddProduct, requiresAuth: true, allowedRoles: ['admin', 'manager'] },
  { path: '/products/edit/:id', title: 'Edit Product', render: renderAddProduct, requiresAuth: true, allowedRoles: ['admin', 'manager'] },
  { path: '/stock',          title: 'Stock Entry',  render: renderStockEntry, requiresAuth: true, allowedRoles: ['admin', 'manager'] },
  { path: '/sales',          title: 'Sales',        render: renderSales,     requiresAuth: true, allowedRoles: ['admin', 'manager', 'worker'] },
  { path: '/reports',        title: 'Reports',      render: renderReports,   requiresAuth: true, allowedRoles: ['admin', 'manager'] },
  { path: '/scanner',        title: 'Scanner',      render: renderScanner,   requiresAuth: true, allowedRoles: ['admin', 'manager', 'worker'] },
  { path: '/customers',      title: 'Customers',    render: renderCustomers, requiresAuth: true, allowedRoles: ['admin', 'manager', 'worker'] },
  { path: '/customers/new',  title: 'Add Customer', render: renderAddCustomer, requiresAuth: true, allowedRoles: ['admin', 'manager', 'worker'] },
  { path: '/customers/edit/:id', title: 'Edit Customer', render: renderAddCustomer, requiresAuth: true, allowedRoles: ['admin', 'manager', 'worker'] },
  { path: '/customers/history/:id', title: 'Customer History', render: renderCustomerHistory, requiresAuth: true, allowedRoles: ['admin', 'manager', 'worker'] },
  { path: '/workers',        title: 'Workers',      render: renderWorkers,   requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/workers/new',    title: 'Register Worker', render: renderAddWorker, requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/expenses',       title: 'Expenses',     render: renderExpenses,  requiresAuth: true, allowedRoles: ['admin', 'manager'] },
  { path: '/audit-logs',     title: 'Activity History', render: renderAuditLogs, requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/suppliers',      title: 'Suppliers',    render: renderSuppliers, requiresAuth: true, allowedRoles: ['admin', 'manager'] },
  { path: '/categories',     title: 'Categories',   render: renderCategories, requiresAuth: true, allowedRoles: ['admin', 'manager'] },
  { path: '/locations',      title: 'Locations',    render: renderLocations,  requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/stock-alerts',   title: 'Stock Alerts', render: renderStockAlerts, requiresAuth: true, allowedRoles: ['admin', 'manager', 'worker'] },
  { path: '/bulk-import',    title: 'Bulk Import',  render: renderBulkImport, requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/settings',       title: 'Settings',     render: renderSettings,  requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/login',          title: 'Sign In',      render: renderLogin },
  { path: '/register',       title: 'Register',     render: renderRegister },
]);

// Initial render
router.resolve();
