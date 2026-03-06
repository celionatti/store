/**
 * Utility helpers
 */

export function getCurrentCurrency() {
  return localStorage.getItem('store_currency') || 'NGN';
}

export function setCurrentCurrency(currency) {
  localStorage.setItem('store_currency', currency);
}

export function formatCurrency(amount) {
  const currency = getCurrentCurrency();
  const locale = currency === 'NGN' ? 'en-NG' : 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function generateSKU(name) {
  const prefix = (name || 'PROD')
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${random}`;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function getStockBadge(quantity, reorderLevel) {
  if (quantity <= 0) {
    return '<span class="badge badge-danger">Out of Stock</span>';
  }
  if (quantity <= reorderLevel) {
    return '<span class="badge badge-warning">Low Stock</span>';
  }
  return '<span class="badge badge-success">In Stock</span>';
}
export function getTheme() {
  return localStorage.getItem('store_theme') || 'light';
}

export function setTheme(theme) {
  localStorage.setItem('store_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme() {
  const newTheme = getTheme() === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}
