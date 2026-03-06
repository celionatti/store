/**
 * Stock Entry Page
 */
import { api } from '../api.js';
import { formatCurrency, formatDateTime, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export function renderStockEntry(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Stock Entry</h2>
    </div>
    <div class="card mb-lg">
      <h3 style="margin-bottom: var(--space-md);">Record New Stock Arrival</h3>
      <form id="stock-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="sf-product">Product *</label>
            <select id="sf-product" class="form-select" required>
              <option value="">Select a product…</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="sf-quantity">Quantity *</label>
            <input type="number" id="sf-quantity" class="form-input" required min="1" placeholder="0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="sf-supplier">Supplier</label>
            <input type="text" id="sf-supplier" class="form-input" placeholder="e.g. Acme Supply Co." />
          </div>
          <div class="form-group">
            <label class="form-label" for="sf-cost">Total Cost</label>
            <input type="number" id="sf-cost" class="form-input" min="0" step="0.01" placeholder="0.00" />
          </div>
        </div>
        <button type="submit" class="btn btn-success mt-md" id="sf-submit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
          Record Stock Entry
        </button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin-bottom: var(--space-md);">Recent Stock Entries</h3>
      <div id="stock-history">
        <div class="loader">Loading…</div>
      </div>
    </div>
  `;

  // Load products for dropdown
  loadProductOptions();
  // Load stock history
  loadStockHistory();

  const form = document.getElementById('stock-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productSelect = document.getElementById('sf-product');
    const productId = productSelect.value;
    const productName = productSelect.options[productSelect.selectedIndex]?.text || '';

    const payload = {
      productId,
      productName,
      quantity: parseInt(document.getElementById('sf-quantity').value) || 0,
      supplier: document.getElementById('sf-supplier').value.trim(),
      totalCost: parseFloat(document.getElementById('sf-cost').value) || 0,
    };

    if (!payload.productId || payload.quantity <= 0) {
      showToast('Please select a product and enter a valid quantity', 'warning');
      return;
    }

    const btn = document.getElementById('sf-submit');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      await api.createStockEntry(payload);
      showToast('Stock entry recorded! Quantity updated.', 'success');
      form.reset();
      loadStockHistory();
    } catch (err) {
      showToast(err.message || 'Failed to record stock entry', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg> Record Stock Entry`;
    }
  });

  async function loadProductOptions() {
    try {
      const data = await api.getProducts();
      const products = data.products || data || [];
      const select = document.getElementById('sf-product');
      if (!select) return;
      products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p._id;
        opt.textContent = `${p.name} (${p.sku})`;
        select.appendChild(opt);
      });
    } catch (err) {
      showToast('Failed to load products', 'error');
    }
  }

  async function loadStockHistory() {
    try {
      const data = await api.getStockEntries();
      const entries = data.entries || data || [];
      const wrapper = document.getElementById('stock-history');
      if (!wrapper) return;

      if (entries.length === 0) {
        wrapper.innerHTML = '<div class="empty-state"><p>No stock entries yet.</p></div>';
        return;
      }

      wrapper.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Supplier</th>
                <th>Total Cost</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(e => `
                <tr>
                  <td><strong>${escapeHtml(e.productName || '—')}</strong></td>
                  <td><span class="badge badge-info">+${e.quantity}</span></td>
                  <td class="text-muted">${escapeHtml(e.supplier || '—')}</td>
                  <td>${formatCurrency(e.totalCost)}</td>
                  <td class="text-muted text-sm">${formatDateTime(e.createdAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      document.getElementById('stock-history').innerHTML =
        '<div class="empty-state"><p>Failed to load history.</p></div>';
    }
  }
}
