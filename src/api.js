/**
 * API Client — Thin fetch wrapper for all backend calls
 */
const BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE}${endpoint}`;
  const token = localStorage.getItem('store_auth');
  
  const headers = { 
    'Content-Type': 'application/json',
    ...options.headers 
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    headers,
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('store_auth');
      localStorage.removeItem('store_user');
      window.location.hash = '#/login';
    }
    const message = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),

  // Products
  getProducts: (query = '') => request(`/products${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  getProductByBarcode: (code) => request(`/products/barcode/${encodeURIComponent(code)}`),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Stock
  getStockEntries: () => request('/stock'),
  createStockEntry: (data) => request('/stock', { method: 'POST', body: data }),

  // Customers
  getCustomers: () => request('/customers'),
  createCustomer: (data) => request('/customers', { method: 'POST', body: data }),

  // Workers
  getWorkers: () => request('/workers'),
  deleteWorker: (id) => request(`/workers/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request(`/sales${qs ? `?${qs}` : ''}`);
  },
  createSale: (data) => request('/sales', { method: 'POST', body: data }),
  deleteSale: (id) => request(`/sales/${id}`, { method: 'DELETE' }),
  bulkDeleteSales: (before) => request(`/sales?before=${encodeURIComponent(before)}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Audit Logs
  getAuditLogs: () => request('/audit'),
  bulkDeleteAuditLogs: (before) => request(`/audit?before=${encodeURIComponent(before)}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request(`/expenses${qs ? `?${qs}` : ''}`);
  },
  createExpense: (data) => request('/expenses', { method: 'POST', body: data }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: data }),
};
