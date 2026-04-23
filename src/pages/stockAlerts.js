/**
 * Stock Alerts Page
 */
import { api } from '../api.js';
import { formatCurrency, getStockBadge, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export function renderStockAlerts(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Stock Alerts</h2>
      <p class="text-muted">Products that are at or below their reorder levels.</p>
    </div>
    <div id="alerts-list">
      <div class="loader">Checking stock levels…</div>
    </div>
  `;

  loadAlerts();

  async function loadAlerts() {
    try {
      const data = await api.getStockAlerts();
      const alerts = data.alerts || data || [];
      renderTable(alerts);
    } catch (err) {
      showToast(err.message || 'Failed to load stock alerts', 'error');
      document.getElementById('alerts-list').innerHTML = '<div class="empty-state">Failed to load alerts.</div>';
    }
  }

  function renderTable(alerts) {
    const wrapper = document.getElementById('alerts-list');
    if (!wrapper) return;

    if (alerts.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="color:var(--color-success);"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <h3>All Good!</h3>
          <p>All products have sufficient stock levels.</p>
        </div>
      `;
      return;
    }

    wrapper.innerHTML = `
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Supplier</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${alerts.map(p => `
                <tr>
                  <td data-label="Product"><strong>${escapeHtml(p.name)}</strong></td>
                  <td data-label="SKU" class="text-muted text-sm">${escapeHtml(p.sku)}</td>
                  <td data-label="Supplier">${escapeHtml(p.supplierName)}</td>
                  <td data-label="Price">${formatCurrency(p.sellingPrice)}</td>
                  <td data-label="Stock" class="font-bold ${p.quantity === 0 ? 'text-danger' : 'text-warning'}">${p.quantity}</td>
                  <td data-label="Threshold" class="text-muted">${p.reorderLevel}</td>
                  <td data-label="Status">${getStockBadge(p.quantity, p.reorderLevel)}</td>
                  <td data-label="Action">
                    <a href="#/stock?productId=${p._id}" class="btn btn-primary btn-sm">Restock</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}
