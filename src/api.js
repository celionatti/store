/**
 * API Client — Thin fetch wrapper for all backend calls
 */
const BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE}${endpoint}`;
  const token = localStorage.getItem('store_auth');
  const activeLocationId = localStorage.getItem('active_location_id') || '';
  
  const headers = { 
    'Content-Type': 'application/json',
    'X-Location-Id': activeLocationId,
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

  try {
    const res = await fetch(url, config);
    
    // Server is up and responding
    window.dispatchEvent(new CustomEvent('server-status', { detail: { online: true } }));

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
  } catch (err) {
    // Detect connection errors (server down, network issues)
    if (err instanceof TypeError || err.message === 'Failed to fetch' || err.code === 'ECONNREFUSED') {
      window.dispatchEvent(new CustomEvent('server-status', { 
        detail: { 
          online: false, 
          message: 'The server is unreachable. Please check if it is started or contact support.' 
        } 
      }));
      throw new Error('Server connection failed. Please ensure the backend server is running.');
    }
    throw err;
  }
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
  getCustomer: (id) => request(`/customers?id=${id}`),
  createCustomer: (data) => request('/customers', { method: 'POST', body: data }),
  updateCustomer: (id, data) => request(`/customers?id=${id}`, { method: 'PUT', body: data }),

  // Workers
  getWorkers: () => request('/workers'),
  updateWorker: (id, data) => request(`/workers/${id}`, { method: 'PUT', body: data }),
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
  createCartSale: (data) => request('/sales', { method: 'POST', body: data }),
  deleteSale: (id) => request(`/sales/${id}`, { method: 'DELETE' }),
  bulkDeleteSales: (before) => request(`/sales?before=${encodeURIComponent(before)}`, { method: 'DELETE' }),
  reportSale: (id, reason) => request('/sales/report', { method: 'POST', body: { id, reason } }),
  rejectSaleReport: (id) => request('/sales/reject-report', { method: 'POST', body: { id } }),

  // Dashboard
  getDashboard: (period = '') => request(`/dashboard${period ? `?period=${period}` : ''}`),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: data }),
  deleteCategory: (id) => request(`/categories?id=${id}`, { method: 'DELETE' }),

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
  getBackup: () => request('/settings/backup'),

  // Suppliers
  getSuppliers: (search = '') => request(`/suppliers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getSupplier: (id) => request(`/suppliers/${id}`),
  createSupplier: (data) => request('/suppliers', { method: 'POST', body: data }),
  updateSupplier: (id, data) => request(`/suppliers/${id}`, { method: 'PUT', body: data }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),

  // Batch Operations
  lookupBarcodes: (codes) => request('/products/batch-lookup', { method: 'POST', body: { codes } }),
  createBulkStockEntries: (data) => request('/stock/bulk', { method: 'POST', body: data }),

  // Stock Intelligence
  getStockAlerts: () => request('/stock/alerts'),

  // Bulk Operations
  importProducts: (products) => request('/products/import', { method: 'POST', body: { products } }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request('/notifications', { method: 'PUT', body: { id } }),
  deleteNotification: (id) => request(`/notifications?id=${id}`, { method: 'DELETE' }),

  // Locations / Stores
  getLocations: () => request('/locations'),
  createLocation: (data) => request('/locations', { method: 'POST', body: data }),
  updateLocation: (data) => request('/locations', { method: 'PUT', body: data }),
  deleteLocation: (id) => request(`/locations?id=${id}`, { method: 'DELETE' }),
};
