/**
 * Sales Page — Multi-Item Cart Checkout
 */
import { api } from '../api.js';
import { formatCurrency, formatDateTime, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { renderPagination } from '../components/pagination.js';
import { printReceipt } from '../utils/receipt.js';
import { getUser } from './login.js';
import { startPolling } from '../utils/polling.js';

export function renderSales(container, params = {}) {
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'admin';

  container.innerHTML = `
    <div class="page-header">
      <h2>Sales</h2>
    </div>
    ${isAdmin ? `
    <div class="card mb-lg" style="background: var(--color-danger-bg); border-color: rgba(239, 68, 68, 0.2);">
      <h3 style="margin-bottom: var(--space-md); color: var(--color-danger);">Database Cleanup</h3>
      <p class="text-sm text-muted mb-md">Remove old sales data securely to save storage space. Warning: This cannot be undone.</p>
      <div class="form-row" style="align-items: center;">
        <select id="sl-bulk-delete-select" class="form-select" style="max-width: 200px;">
          <option value="6">Older than 6 Months</option>
          <option value="8">Older than 8 Months</option>
          <option value="12">Older than 1 Year</option>
        </select>
        <button id="sl-bulk-delete-btn" class="btn btn-danger">Delete Old Records</button>
      </div>
    </div>
    ` : ''}
    <div class="card mb-lg">
      <h3 style="margin-bottom: var(--space-md);">Add Item</h3>
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
            <label class="form-label">Item Total</label>
            <div id="sl-total" class="font-bold" style="padding: 10px 0; font-size: var(--font-size-xl);">—</div>
          </div>
          <div class="form-group">
            <label class="form-label">Est. Profit</label>
            <div id="sl-profit" class="text-success font-bold" style="padding: 10px 0;">—</div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary mt-md" id="sl-add-cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          <span>Add to Cart</span>
        </button>
      </form>
    </div>

    <div class="card mb-lg" id="cart-section" style="display: none;">
      <div class="flex flex-between flex-align-center mb-md">
        <h3 style="margin: 0;">🛒 Shopping Cart</h3>
        <button class="btn btn-outline btn-sm" id="cart-clear">Clear All</button>
      </div>
      <div id="cart-items"></div>
      
      <div id="cart-customer-section" style="border-top: 1px solid var(--color-border); padding-top: var(--space-md); margin-top: var(--space-md);">
        <div class="form-group">
          <label class="form-label" for="cart-customer">Assign to Customer (Optional)</label>
          <div class="flex gap-sm">
            <input type="text" id="cart-customer" class="form-input" list="customer-list" placeholder="Walk-in Customer" autocomplete="off" style="flex: 1;">
            <datalist id="customer-list"></datalist>
            <a href="#/customers/new" class="btn btn-icon" title="Add New Customer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </a>
          </div>
        </div>
      </div>

      <div id="cart-footer" style="border-top: 2px solid var(--color-border); padding-top: var(--space-md); margin-top: var(--space-md);">
        <div class="flex flex-between" style="margin-bottom: var(--space-sm);">
          <span class="text-muted" id="cart-count">0 items</span>
          <span class="font-bold" id="cart-profit-total" style="color: var(--color-success);">Profit: —</span>
        </div>
        <div class="flex flex-between flex-align-center">
          <span style="font-size: var(--font-size-xl); font-weight: 700;" id="cart-grand-total">Total: —</span>
          <button class="btn btn-success" id="cart-checkout-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Checkout</span>
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom: var(--space-md);">Recent Sales</h3>
      <div id="sales-history">
        <div class="loader">Loading…</div>
      </div>
    </div>
  `;

  let productsMap = {};
  let customersList = [];
  let currentSalesPage = 1;
  const salesPerPage = 10;
  let shopSettings = {};
  let cart = [];

  const stopProductsPolling = startPolling(loadProductOptions, 60000); // Products refresh every 60s
  const stopSalesPolling = startPolling(loadSalesHistory, 20000);    // Sales history refresh every 20s

  // Helper to populate IMEI dropdown, filtering out IMEIs already in cart
  function refreshImeiDropdown() {
    const product = productsMap[productSelect?.value];
    const imeiGroup = document.getElementById('sl-imei-group');
    const imeiSelect = document.getElementById('sl-imei');
    if (!product || !imeiGroup || !imeiSelect) return;

    if (product.itemBarcodes && product.itemBarcodes.length > 0) {
      const cartImeis = cart.filter(i => i.productId === product._id && i.soldItemBarcode).map(i => i.soldItemBarcode);
      const availableImeis = product.itemBarcodes.filter(imei => !cartImeis.includes(imei));

      if (availableImeis.length > 0) {
        imeiGroup.style.display = 'block';
        imeiSelect.innerHTML = '<option value="">Select an IMEI...</option>' +
          availableImeis.map(imei => `<option value="${escapeHtml(imei)}">${escapeHtml(imei)}</option>`).join('');
      } else {
        imeiGroup.style.display = 'block';
        imeiSelect.innerHTML = '<option value="">All IMEIs in cart</option>';
      }
      qtyInput.value = 1;
      qtyInput.readOnly = true;
    } else {
      imeiGroup.style.display = 'none';
      imeiSelect.innerHTML = '<option value="">Select an IMEI...</option>';
      qtyInput.readOnly = false;
    }
  }

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
      refreshImeiDropdown();
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

  // --- Cart Management ---
  function renderCart() {
    const section = document.getElementById('cart-section');
    const itemsEl = document.getElementById('cart-items');
    
    if (cart.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    const grandTotal = cart.reduce((s, i) => s + i.totalAmount, 0);
    const totalProfit = cart.reduce((s, i) => s + i.profit, 0);

    itemsEl.innerHTML = cart.map((item, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-border);">
        <div style="flex: 1;">
          <strong>${escapeHtml(item.productName)}</strong>
          ${item.soldItemBarcode ? `<br><small class="text-muted">IMEI: ${escapeHtml(item.soldItemBarcode)}</small>` : ''}
          <br><small class="text-muted">${item.quantity}x ${formatCurrency(item.unitPrice)}</small>
        </div>
        <div style="text-align: right; min-width: 100px;">
          <strong>${formatCurrency(item.totalAmount)}</strong>
          <br><small class="${item.profit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(item.profit)}</small>
        </div>
        <button class="btn-icon danger" data-remove-cart="${idx}" title="Remove" style="margin-left: var(--space-sm);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    document.getElementById('cart-count').textContent = `${cart.length} item${cart.length !== 1 ? 's' : ''}`;
    document.getElementById('cart-grand-total').textContent = `Total: ${formatCurrency(grandTotal)}`;
    document.getElementById('cart-profit-total').textContent = `Profit: ${formatCurrency(totalProfit)}`;

    // Remove item handlers
    itemsEl.querySelectorAll('button[data-remove-cart]').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.splice(parseInt(btn.dataset.removeCart), 1);
        renderCart();
        refreshImeiDropdown();
      });
    });
  }

  // Add to Cart
  const form = document.getElementById('sale-form');
  form?.addEventListener('submit', (e) => {
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

    // Check stock considering items already in cart for the same product
    const inCartQty = cart.filter(i => i.productId === product._id).reduce((s, i) => s + i.quantity, 0);
    if (qty + inCartQty > product.quantity) {
      showToast(`Only ${product.quantity - inCartQty} left in stock!`, 'warning');
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
      // Check if this IMEI is already in the cart
      if (cart.some(i => i.soldItemBarcode === soldItemBarcode)) {
        showToast('This IMEI is already in the cart', 'warning');
        return;
      }
    }

    cart.push({
      productId: product._id,
      productName: product.name,
      quantity: qty,
      soldItemBarcode,
      unitPrice: salePrice,
      costPrice: product.costPrice,
      totalAmount: salePrice * qty,
      profit: (salePrice - product.costPrice) * qty,
    });

    renderCart();
    refreshImeiDropdown();
    showToast(`${product.name} added to cart`, 'success');

    // Reset form for next item
    productSelect.value = '';
    qtyInput.value = 1;
    qtyInput.readOnly = false;
    salePriceInput.value = '';
    document.getElementById('sl-total').textContent = '—';
    document.getElementById('sl-profit').textContent = '—';
    document.getElementById('sl-imei-group').style.display = 'none';
  });

  // Clear Cart
  document.getElementById('cart-clear')?.addEventListener('click', () => {
    showModal('Clear Cart', 'Remove all items from the cart?', () => {
      cart = [];
      renderCart();
      refreshImeiDropdown();
    });
  });

  // Checkout
  document.getElementById('cart-checkout-btn')?.addEventListener('click', async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }

    const btn = document.getElementById('cart-checkout-btn');
    btn.disabled = true;
    btn.textContent = 'Processing…';

    const customerInput = document.getElementById('cart-customer');
    const typedName = customerInput?.value.trim();
    
    let customerId = null;
    let customerName = 'Walk-in Customer';

    if (typedName) {
      const matched = customersList.find(c => c.name.toLowerCase() === typedName.toLowerCase());
      if (matched) {
        customerId = matched._id;
        customerName = matched.name;
      } else {
        customerName = typedName;
      }
    }

    try {
      const res = await api.createCartSale({
        items: cart,
        customerId,
        customerName
      });
      const salesItems = res.sales || [res.sale || cart];

      showModal(
        'Sale Recorded',
        `${cart.length} item${cart.length > 1 ? 's' : ''} sold successfully! Would you like to print the receipt?`,
        () => printReceipt(salesItems, shopSettings),
      );

      cart = [];
      renderCart();
      loadProductOptions();
      loadSalesHistory();
    } catch (err) {
      showToast(err.message || 'Checkout failed', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg> <span>Checkout</span>`;
    }
  });

  const bulkBtn = document.getElementById('sl-bulk-delete-btn');
  bulkBtn?.addEventListener('click', () => {
    const months = parseInt(document.getElementById('sl-bulk-delete-select').value);
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    const beforeStr = date.toISOString().split('T')[0];
    
    showModal(
      'Confirm Bulk Deletion',
      `Are you unconditionally sure you want to permanently delete all sales recorded before <strong>${beforeStr}</strong>?`,
      async () => {
        try {
          const res = await api.bulkDeleteSales(beforeStr);
          showToast(res.message || 'Old records deleted successfully', 'success');
          loadSalesHistory();
        } catch(err) {
          showToast(err.message || 'Failed to bulk delete records', 'error');
        }
      }
    );
  });

  async function loadProductOptions() {
    try {
      const [data, settingsRes] = await Promise.all([
        api.getProducts(),
        api.getSettings()
      ]);
      const products = data.products || data || [];
      shopSettings = settingsRes.settings || {};
      
      productsMap = {};
      const select = document.getElementById('sl-product');
      if (!select) return;
      select.innerHTML = '<option value="">Select a product…</option>';
      products.forEach(p => {
        productsMap[p._id] = p;
        const opt = document.createElement('option');
        opt.value = p._id;
        opt.textContent = `${p.name} (Stock: ${p.quantity})`;
        select.appendChild(opt);
      });

      // Handle pre-selection from params
      if (params.productId) {
        select.value = params.productId;
        const event = new Event('change');
        select.dispatchEvent(event);

        if (params.barcode) {
          const imeiSelect = document.getElementById('sl-imei');
          if (imeiSelect && [...imeiSelect.options].some(o => o.value === params.barcode)) {
            imeiSelect.value = params.barcode;
            updateTotals();
          }
        }
      }
    } catch (err) {
      showToast('Failed to load products', 'error');
    }
    // Also load customers for the cart dropdown
    loadCustomerOptions();
  }

  async function loadCustomerOptions() {
    try {
      const data = await api.getCustomers();
      customersList = data.customers || data || [];
      const datalist = document.getElementById('customer-list');
      if (!datalist) return;
      
      datalist.innerHTML = customersList.map(c => `<option value="${escapeHtml(c.name)}"></option>`).join('');
    } catch (err) {
      console.warn('Failed to load customers for cart:', err);
    }
  }

  async function loadSalesHistory() {
    try {
      const data = await api.getSales();
      const sales = data.sales || data || [];
      const wrapper = document.getElementById('sales-history');
      if (!wrapper) return;

      const bulkSelect = document.getElementById('sl-bulk-delete-select');
      const bulkBtn = document.getElementById('sl-bulk-delete-btn');
      
      const checkBulkEligibility = () => {
        if (!bulkBtn || !bulkSelect || sales.length === 0) {
          if (bulkBtn) bulkBtn.style.display = 'none';
          return;
        }
        const months = parseInt(bulkSelect.value);
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        const hasOldRecords = sales.some(s => new Date(s.createdAt) < cutoffDate);
        bulkBtn.style.display = hasOldRecords ? 'inline-block' : 'none';
      };

      if (bulkSelect) {
        checkBulkEligibility();
        bulkSelect.addEventListener('change', checkBulkEligibility);
      }

      if (sales.length === 0) {
        wrapper.innerHTML = '<div class="empty-state"><p>No sales recorded yet.</p></div>';
        return;
      }

      const start = (currentSalesPage - 1) * salesPerPage;
      const paginatedSales = sales.slice(start, start + salesPerPage);

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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${paginatedSales.map(s => `
                <tr>
                  <td data-label="Product">
                    <strong>${escapeHtml(s.productName || '—')}</strong>
                    ${s.soldItemBarcode ? `<br><small class="text-muted" style="word-break: break-all;">IMEI: ${escapeHtml(s.soldItemBarcode)}</small>` : ''}
                    ${s.customerName ? `<br><small class="text-info">Cust: ${escapeHtml(s.customerName)}</small>` : ''}
                    ${s.transactionId ? `<br><small class="text-muted text-xs">TXN: ${s.transactionId.slice(-6)}</small>` : ''}
                  </td>
                  <td data-label="Qty">${s.quantity}</td>
                  <td data-label="Unit Price">${formatCurrency(s.unitPrice)}</td>
                  <td data-label="Total" class="font-bold">${formatCurrency(s.totalAmount)}</td>
                  <td data-label="Profit" class="text-success font-bold">${formatCurrency(s.profit)}</td>
                  <td data-label="Date" class="text-muted text-sm">
                    ${formatDateTime(s.createdAt)}
                    ${s.cancellationRequested ? `<br><span class="badge" style="background:var(--color-warning-bg);color:var(--color-warning);font-size:0.75rem;padding:2px 6px;border-radius:4px;margin-top:4px;display:inline-block;">Cancel Requested</span>` : ''}
                  </td>
                  <td data-label="Actions" style="white-space: nowrap;">
                    <button class="btn-icon" data-print="${s._id}" title="Print Receipt">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>
                    ${isAdmin ? `
                      <button class="btn-icon danger" data-refund="${s._id}" title="Refund/Cancel Sale">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                      </button>
                      ${s.cancellationRequested ? `
                        <button class="btn-icon warning" data-reject-report="${s._id}" title="Reject Cancellation Request: ${escapeHtml(s.cancellationReason || '')}">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      ` : ''}
                    ` : `
                      <button class="btn-icon warning" data-report="${s._id}" title="${s.cancellationRequested ? 'Cancellation Pending' : 'Report Issue / Request Cancellation'}" ${s.cancellationRequested ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                      </button>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div id="sales-pagination"></div>
      `;

      renderPagination(
        document.getElementById('sales-pagination'),
        sales.length,
        currentSalesPage,
        salesPerPage,
        (newPage) => {
          currentSalesPage = newPage;
          loadSalesHistory();
        }
      );

      wrapper.querySelectorAll('button[data-print]').forEach(btn => {
        btn.addEventListener('click', () => {
          const saleId = btn.dataset.print;
          const sale = sales.find(s => s._id === saleId);
          if (sale) {
            // If part of a multi-item transaction, print all items
            if (sale.transactionId) {
              const txnSales = sales.filter(s => s.transactionId === sale.transactionId);
              printReceipt(txnSales, shopSettings);
            } else {
              printReceipt(sale, shopSettings);
            }
          }
        });
      });

      wrapper.querySelectorAll('button[data-refund]').forEach(btn => {
        btn.addEventListener('click', () => {
          const saleId = btn.dataset.refund;
          showModal(
            'Refund & Cancel Sale',
            'Are you sure you want to completely reverse this sale? The quantity will be returned to the main inventory.',
            async () => {
              try {
                await api.deleteSale(saleId);
                showToast('Sale effectively refunded and reversed.', 'success');
                loadSalesHistory();
                loadProductOptions();
              } catch (err) {
                showToast(err.message || 'Failed to reverse sale', 'error');
              }
            }
          );
        });
      });

      wrapper.querySelectorAll('button[data-reject-report]').forEach(btn => {
        btn.addEventListener('click', () => {
          const saleId = btn.dataset.rejectReport;
          showModal(
            'Reject Request',
            'Are you sure you want to reject this cancellation request and keep the sale?',
            async () => {
              try {
                await api.rejectSaleReport(saleId);
                showToast('Report rejected.', 'success');
                loadSalesHistory();
              } catch (err) {
                showToast(err.message || 'Failed to reject report', 'error');
              }
            }
          );
        });
      });

      wrapper.querySelectorAll('button[data-report]').forEach(btn => {
        btn.addEventListener('click', () => {
          const saleId = btn.dataset.report;
          showModal(
            'Report Sale',
            `
              <p class="mb-sm">Please provide a reason for requesting the cancellation of this sale:</p>
              <textarea id="modal-report-reason" class="form-input" rows="3" placeholder="Customer returned item, incorrect entry, etc."></textarea>
            `,
            async () => {
              const reasonInput = document.getElementById('modal-report-reason');
              const reason = reasonInput ? reasonInput.value : '';
              if (!reason.trim()) {
                showToast('You must provide a reason.', 'warning');
                return false; // prevent closing
              }
              try {
                await api.reportSale(saleId, reason);
                showToast('Cancellation request submitted.', 'success');
                loadSalesHistory();
              } catch (err) {
                showToast(err.message || 'Failed to submit report', 'error');
              }
            }
          );
        });
      });
    } catch (err) {
      document.getElementById('sales-history').innerHTML =
        '<div class="empty-state"><p>Failed to load sales.</p></div>';
    }
  }

  // Cleanup
  return () => {
    stopProductsPolling();
    stopSalesPolling();
  };
}
