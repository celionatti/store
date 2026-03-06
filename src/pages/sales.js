/**
 * Sales Page
 */
import { api } from '../api.js';
import { formatCurrency, formatDateTime, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export function renderSales(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Sales</h2>
    </div>
    <div class="card mb-lg">
      <h3 style="margin-bottom: var(--space-md);">Record New Sale</h3>
      <form id="sale-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="sl-product">Product *</label>
            <select id="sl-product" class="form-select" required>
              <option value="">Select a product…</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="sl-quantity">Quantity *</label>
            <input type="number" id="sl-quantity" class="form-input" required min="1" value="1" />
          </div>
          
          <div class="form-group" id="sl-imei-group" style="display:none; grid-column: 1 / -1;">
            <label class="form-label" for="sl-imei">Select Specific Item (IMEI) *</label>
            <div class="form-row">
              <select id="sl-imei" class="form-select">
                <option value="">Select an IMEI...</option>
              </select>
            </div>
            <p class="text-sm text-muted mt-sm">This product tracks individual IMEIs. Selling one will remove it from stock and set quantity to 1.</p>
          </div>
        </div>
        <div class="form-grid mt-md">
          <div class="form-group">
            <label class="form-label" for="sl-sale-price">Sales Price *</label>
            <input type="number" id="sl-sale-price" class="form-input" required min="0" step="0.01" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label class="form-label">Total Amount</label>
            <div id="sl-total" class="font-bold" style="padding: 10px 0; font-size: var(--font-size-xl);">—</div>
          </div>
          <div class="form-group">
            <label class="form-label">Estimated Profit</label>
            <div id="sl-profit" class="text-success font-bold" style="padding: 10px 0;">—</div>
          </div>
        </div>
        <button type="submit" class="btn btn-success mt-md" id="sl-submit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          Record Sale
        </button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin-bottom: var(--space-md);">Recent Sales</h3>
      <div id="sales-history">
        <div class="loader">Loading…</div>
      </div>
    </div>
  `;

  let productsMap = {};

  loadProductOptions();
  loadSalesHistory();

  // Auto-calculate totals
  const productSelect = document.getElementById('sl-product');
  const qtyInput = document.getElementById('sl-quantity');
  const salePriceInput = document.getElementById('sl-sale-price');
  productSelect?.addEventListener('change', () => {
    const product = productsMap[productSelect.value];
    const imeiGroup = document.getElementById('sl-imei-group');
    const imeiSelect = document.getElementById('sl-imei');
    
    if (product) {
      salePriceInput.value = product.sellingPrice;
      if (product.itemBarcodes && product.itemBarcodes.length > 0) {
        imeiGroup.style.display = 'block';
        imeiSelect.innerHTML = '<option value="">Select an IMEI...</option>' + 
          product.itemBarcodes.map(imei => `<option value="${escapeHtml(imei)}">${escapeHtml(imei)}</option>`).join('');
        qtyInput.value = 1;
        qtyInput.readOnly = true;
      } else {
        imeiGroup.style.display = 'none';
        imeiSelect.innerHTML = '<option value="">Select an IMEI...</option>';
        qtyInput.readOnly = false;
      }
    } else {
      salePriceInput.value = '';
      imeiGroup.style.display = 'none';
      imeiSelect.innerHTML = '<option value="">Select an IMEI...</option>';
      qtyInput.readOnly = false;
    }
    updateTotals();
  });
  qtyInput?.addEventListener('input', updateTotals);
  salePriceInput?.addEventListener('input', updateTotals);

  function updateTotals() {
    const product = productsMap[productSelect.value];
    const qty = parseInt(qtyInput.value) || 0;
    const salePrice = parseFloat(salePriceInput.value) || 0;

    if (product && qty > 0 && salePrice > 0) {
      const total = salePrice * qty;
      document.getElementById('sl-total').textContent = formatCurrency(total);
      
      const profit = (salePrice - product.costPrice) * qty;
      const profitEl = document.getElementById('sl-profit');
      profitEl.textContent = formatCurrency(profit);
      profitEl.className = profit >= 0 ? 'text-success font-bold' : 'text-danger font-bold';
    } else {
      document.getElementById('sl-total').textContent = '—';
      document.getElementById('sl-profit').textContent = '—';
    }
  }

  const form = document.getElementById('sale-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const product = productsMap[productSelect.value];
    if (!product) {
      showToast('Please select a product', 'warning');
      return;
    }

    const qty = parseInt(qtyInput.value) || 0;
    if (qty <= 0) {
      showToast('Please enter a valid quantity', 'warning');
      return;
    }

    if (qty > product.quantity) {
      showToast(`Only ${product.quantity} in stock!`, 'warning');
      return;
    }

    const salePrice = parseFloat(salePriceInput.value) || 0;
    if (salePrice <= 0) {
      showToast('Please enter a valid sales price', 'warning');
      return;
    }

    const imeiGroup = document.getElementById('sl-imei-group');
    const imeiSelect = document.getElementById('sl-imei');
    let soldItemBarcode = null;
    if (imeiGroup && imeiGroup.style.display !== 'none') {
      soldItemBarcode = imeiSelect.value;
      if (!soldItemBarcode) {
        showToast('Please select the specific IMEI being sold', 'warning');
        return;
      }
    }

    const payload = {
      productId: product._id,
      productName: product.name,
      quantity: qty,
      soldItemBarcode,
      unitPrice: salePrice,
      costPrice: product.costPrice,
      totalAmount: salePrice * qty,
      profit: (salePrice - product.costPrice) * qty,
    };

    const btn = document.getElementById('sl-submit');
    btn.disabled = true;
    btn.textContent = 'Processing…';

    try {
      await api.createSale(payload);
      showToast('Sale recorded successfully!', 'success');
      form.reset();
      document.getElementById('sl-total').textContent = '—';
      document.getElementById('sl-profit').textContent = '—';
      // Refresh product list for updated quantities
      loadProductOptions();
      loadSalesHistory();
    } catch (err) {
      showToast(err.message || 'Failed to record sale', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> Record Sale`;
    }
  });

  async function loadProductOptions() {
    try {
      const data = await api.getProducts();
      const products = data.products || data || [];
      productsMap = {};
      const select = document.getElementById('sl-product');
      if (!select) return;
      // Clear and re-populate
      select.innerHTML = '<option value="">Select a product…</option>';
      products.forEach(p => {
        productsMap[p._id] = p;
        const opt = document.createElement('option');
        opt.value = p._id;
        opt.textContent = `${p.name} (Stock: ${p.quantity})`;
        select.appendChild(opt);
      });
    } catch (err) {
      showToast('Failed to load products', 'error');
    }
  }

  async function loadSalesHistory() {
    try {
      const data = await api.getSales();
      const sales = data.sales || data || [];
      const wrapper = document.getElementById('sales-history');
      if (!wrapper) return;

      if (sales.length === 0) {
        wrapper.innerHTML = '<div class="empty-state"><p>No sales recorded yet.</p></div>';
        return;
      }

      wrapper.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
                <th>Profit</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${sales.map(s => `
                <tr>
                  <td><strong>${escapeHtml(s.productName || '—')}</strong>${s.soldItemBarcode ? `<br><small class="text-muted">IMEI: ${escapeHtml(s.soldItemBarcode)}</small>` : ''}</td>
                  <td>${s.quantity}</td>
                  <td class="hide-mobile">${formatCurrency(s.unitPrice)}</td>
                  <td class="font-bold">${formatCurrency(s.totalAmount)}</td>
                  <td class="text-success font-bold hide-mobile">${formatCurrency(s.profit)}</td>
                  <td class="text-muted text-sm hide-mobile">${formatDateTime(s.createdAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      document.getElementById('sales-history').innerHTML =
        '<div class="empty-state"><p>Failed to load sales.</p></div>';
    }
  }
}
