/**
 * Stock Entry Page — supports single product + multi-IMEI container scanning
 */
import { api } from '../api.js';
import { formatCurrency, formatDateTime, escapeHtml, getStockBadge, parseMultiCodes } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export function renderStockEntry(container, params = {}) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Stock Entry</h2>
    </div>

    <!-- Container / Bulk Scan Section -->
    <div class="card mb-lg">
      <h3 style="margin-bottom: var(--space-sm);">
        <span style="display:flex; align-items:center; gap:var(--space-sm);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          Scan Container / Multiple IMEIs
        </span>
      </h3>
      <p class="text-sm text-muted mb-md">Scan a QR code containing multiple IMEIs or paste them below to quickly add stock for multiple items at once.</p>

      <div id="se-scanner-viewfinder"></div>
      <div class="flex gap-sm mb-md flex-wrap">
        <button class="btn btn-primary btn-sm" id="se-scanner-start">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Scan QR Code
        </button>
        <button class="btn btn-outline btn-sm" id="se-scanner-stop" disabled>Stop Scanner</button>
      </div>

      <div class="form-group" style="margin-bottom: var(--space-md);">
        <label class="form-label" for="se-bulk-input">Or paste IMEIs / barcodes:</label>
        <div class="form-row">
          <textarea id="se-bulk-input" class="form-input" rows="3" placeholder="Paste multiple IMEIs here (comma, semicolon, or newline separated)…" style="resize: vertical;"></textarea>
          <button class="btn btn-primary btn-sm" id="se-bulk-lookup" style="align-self: flex-end;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Lookup
          </button>
        </div>
      </div>

      <div id="se-bulk-results" style="display:none;"></div>
    </div>

    <!-- Manual Single Product Entry -->
    <div class="card mb-lg">
      <h3 style="margin-bottom: var(--space-md);">Record Single Product Stock</h3>
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
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">Incoming Items (IMEIs / Barcodes) - Optional</label>
            <div class="form-row mb-sm">
              <textarea id="sf-imei-input" class="form-input" rows="2" placeholder="Scan or paste multiple IMEIs or barcode text here..." style="resize: vertical; min-height: 42px;"></textarea>
              <button type="button" class="btn btn-outline btn-sm" id="sf-add-imei">Add</button>
              <button type="button" class="btn btn-outline btn-sm" id="sf-scan-imei" title="Scan IMEI">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                <span class="hide-mobile">Scan</span>
              </button>
            </div>
            <div id="sf-imei-list"></div>
            <p class="text-sm text-muted mt-sm">Tip: Quantity will automatically update to match the number of IMEIs you provide here.</p>
          </div>
          <div id="sf-scanner-container" style="display:none; grid-column: 1 / -1; margin-top: var(--space-md);">
            <div id="sf-scanner-viewfinder" style="width: 100%; max-width: 400px; border-radius: var(--radius-md); overflow: hidden; border: 2px solid var(--color-border);"></div>
            <button type="button" class="btn btn-outline btn-sm mt-sm" id="sf-stop-scan">Stop Camera</button>
          </div>
          <div class="form-group">
            <label class="form-label" for="sf-supplier">Supplier</label>
            <div class="flex gap-sm">
              <select id="sf-supplier" class="form-select" style="flex: 1;">
                <option value="">Select a supplier…</option>
              </select>
              <a href="#/suppliers" class="btn btn-icon" title="Add New Supplier">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </a>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="sf-cost">Total Cost (for this entry)</label>
            <input type="number" id="sf-cost" class="form-input" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div class="form-group" style="grid-column: 1 / -1; padding-top: var(--space-md); border-top: 1px solid var(--color-border); margin-top: var(--space-sm);">
            <div style="margin-bottom: var(--space-sm); font-weight: 500; display: flex; align-items: center; gap: var(--space-sm);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21.5 12H16l-3.26 13L6.5 1 4 12H2.5"/></svg>
              Update Product Base Pricing (Optional)
            </div>
            <p class="text-sm text-muted mb-md">If the price has changed, enter the new prices below to update the product catalog alongside this stock entry.</p>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="sf-new-cost">New Cost Price</label>
                <input type="number" id="sf-new-cost" class="form-input" min="0" step="0.01" placeholder="Leave empty to keep current" />
              </div>
              <div class="form-group">
                <label class="form-label" for="sf-new-price">New Selling Price</label>
                <input type="number" id="sf-new-price" class="form-input" min="0" step="0.01" placeholder="Leave empty to keep current" />
              </div>
            </div>
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

  let html5QrCode = null;
  let sfHtml5QrCode = null;
  let singleFormItemBarcodes = [];
  let allProducts = [];

  // ─── Container Scanner ───
  document.getElementById('se-scanner-start')?.addEventListener('click', async () => {
    const { Html5Qrcode } = await import('html5-qrcode');
    html5QrCode = new Html5Qrcode('se-scanner-viewfinder');

    document.getElementById('se-scanner-start').disabled = true;
    document.getElementById('se-scanner-stop').disabled = false;

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          await stopBulkScanner();
          // Put scanned text into the textarea and auto-lookup
          document.getElementById('se-bulk-input').value = decodedText;
          performBulkLookup(decodedText);
        },
        () => {} // ignore scan errors
      );
    } catch (err) {
      showToast('Could not access camera. Please allow camera permission.', 'error');
      document.getElementById('se-scanner-start').disabled = false;
      document.getElementById('se-scanner-stop').disabled = true;
    }
  });

  document.getElementById('se-scanner-stop')?.addEventListener('click', stopBulkScanner);

  async function stopBulkScanner() {
    if (html5QrCode) {
      try { await html5QrCode.stop(); } catch (e) { /* ignore */ }
    }
    document.getElementById('se-scanner-start').disabled = false;
    document.getElementById('se-scanner-stop').disabled = true;
  }

  // Manual bulk lookup
  document.getElementById('se-bulk-lookup')?.addEventListener('click', () => {
    const text = document.getElementById('se-bulk-input').value.trim();
    if (text) performBulkLookup(text);
  });

  async function performBulkLookup(text) {
    const codes = parseMultiCodes(text);

    if (codes.length === 0) {
      showToast('No valid codes found in input', 'warning');
      return;
    }

    const resultsDiv = document.getElementById('se-bulk-results');
    if (!resultsDiv) return;
    resultsDiv.style.display = 'block';

    // If only 1 code, do a simple single-product lookup approach
    if (codes.length === 1) {
      resultsDiv.innerHTML = '<div class="loader">Looking up product…</div>';
      try {
        const product = await api.getProductByBarcode(codes[0]);
        // Auto-fill the single product form instead
        const select = document.getElementById('sf-product');
        if (select) {
          // Find and select the matching option
          for (const opt of select.options) {
            if (opt.value === product._id) {
              select.value = product._id;
              break;
            }
          }
          document.getElementById('sf-quantity').value = 1;
        }
        resultsDiv.innerHTML = `
          <div class="scan-summary-bar" style="margin-bottom:0;">
            <div class="scan-summary-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
              <h3>Found: ${escapeHtml(product.name)}</h3>
            </div>
            <p class="text-sm" style="opacity:0.85; margin-top:4px;">Product auto-selected in the form below. Set quantity and submit.</p>
          </div>
        `;
        showToast(`Found: ${product.name}. Form pre-filled!`, 'success');
      } catch (err) {
        resultsDiv.innerHTML = `
          <div class="unmatched-section">
            <p>Product not found for code: <strong>${escapeHtml(codes[0])}</strong></p>
            <a href="#/products/new?barcode=${encodeURIComponent(codes[0])}" class="btn btn-primary btn-sm mt-sm">Create New Product</a>
          </div>
        `;
      }
      return;
    }

    // Multi-code batch lookup
    resultsDiv.innerHTML = `<div class="loader">Looking up ${codes.length} items…</div>`;

    try {
      const data = await api.lookupBarcodes(codes);
      const { results, summary } = data;
      renderBulkResults(results, summary);
    } catch (err) {
      resultsDiv.innerHTML = `
        <div class="unmatched-section">
          <p>Failed to look up items: ${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }

  function renderBulkResults(results, summary) {
    const resultsDiv = document.getElementById('se-bulk-results');
    if (!resultsDiv) return;

    // Group matched results by product
    const productGroups = {};
    const unmatched = [];

    for (const r of results) {
      if (r.matched && r.product) {
        const pid = r.product._id;
        if (!productGroups[pid]) {
          productGroups[pid] = { product: r.product, codes: [] };
        }
        productGroups[pid].codes.push(r.code);
      } else {
        unmatched.push(r.code);
      }
    }

    const sortedGroups = Object.values(productGroups).sort((a, b) =>
      a.product.name.localeCompare(b.product.name)
    );

    resultsDiv.innerHTML = `
      <div class="container-scan-results">
        <!-- Summary Bar -->
        <div class="scan-summary-bar">
          <div class="scan-summary-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <h3>Container Scan Results</h3>
          </div>
          <div class="scan-summary-stats">
            <div class="scan-stat">
              <span class="scan-stat-value">${summary.total}</span>
              <span class="scan-stat-label">Total Items</span>
            </div>
            <div class="scan-stat matched">
              <span class="scan-stat-value">${summary.matched}</span>
              <span class="scan-stat-label">Matched</span>
            </div>
            ${summary.unmatched > 0 ? `
            <div class="scan-stat unmatched">
              <span class="scan-stat-value">${summary.unmatched}</span>
              <span class="scan-stat-label">Unmatched</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Matched Products Table -->
        ${sortedGroups.length > 0 ? `
        <div class="scan-section">
          <h4 class="scan-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
            Matched Products (${summary.matched} items across ${sortedGroups.length} products)
          </h4>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>IMEI / Serial</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Sell Price</th>
                  <th>Current Stock</th>
                </tr>
              </thead>
              <tbody>
                ${sortedGroups.map(g => {
                  return g.codes.map((code, idx) => `
                    <tr class="scan-item-row matched-row ${idx === 0 ? 'product-group-start' : ''}">
                      <td data-label="Product">
                        ${idx === 0 ? `<strong>${escapeHtml(g.product.name)}</strong><br><span class="text-muted text-sm">${escapeHtml(g.product.sku)}</span>` : '<span class="text-muted text-sm">↳ same</span>'}
                      </td>
                      <td data-label="Category">${idx === 0 ? escapeHtml(g.product.category || '—') : ''}</td>
                      <td data-label="IMEI"><code class="imei-code">${escapeHtml(code)}</code></td>
                      <td data-label="Qty"><span class="badge badge-info">1</span></td>
                      <td data-label="Cost">${idx === 0 ? `<input type="number" class="se-bulk-cost-input form-input" style="width:80px; padding:2px 6px; font-size:12px; min-height:0; height:24px;" data-pid="${g.product._id}" value="${g.product.costPrice || ''}" step="0.01" />` : ''}</td>
                      <td data-label="Sell">${idx === 0 ? `<input type="number" class="se-bulk-price-input form-input" style="width:80px; padding:2px 6px; font-size:12px; min-height:0; height:24px;" data-pid="${g.product._id}" value="${g.product.sellingPrice || ''}" step="0.01" />` : ''}</td>
                      <td data-label="Stock">${idx === 0 ? getStockBadge(g.product.quantity, g.product.reorderLevel) : ''}</td>
                    </tr>
                  `).join('');
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="hide-on-mobile" style="text-align:right;"><strong>Total items to stock:</strong></td>
                  <td data-label="Total Matches"><strong class="badge badge-success">${summary.matched}</strong></td>
                  <td colspan="3" class="hide-on-mobile"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- Unmatched IMEIs -->
        ${unmatched.length > 0 ? `
        <div class="scan-section unmatched-section">
          <h4 class="scan-section-title unmatched-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            Unregistered Items (${unmatched.length})
          </h4>
          <p class="text-sm text-muted mb-md">These IMEIs don't match any product. They will be skipped. Register them as products first.</p>
          <div style="margin-bottom: var(--space-md);">
            <a href="#/products/new?imeis=${encodeURIComponent(unmatched.join(','))}" class="btn btn-primary btn-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create Product with these IMEIs
            </a>
          </div>
          <div class="unmatched-codes-grid">
            ${unmatched.map(code => `
              <div class="unmatched-code-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>${escapeHtml(code)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Batch Stock Entry Form -->
        ${sortedGroups.length > 0 ? `
        <div class="scan-section batch-stock-section">
          <h4 class="scan-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            Add to Stock
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="se-batch-supplier">Supplier</label>
              <select id="se-batch-supplier" class="form-select">
                <option value="">Select a supplier…</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="se-batch-cost">Total Cost (entire shipment)</label>
              <input type="number" id="se-batch-cost" class="form-input" min="0" step="0.01" placeholder="0.00" />
            </div>
          </div>
          <button class="btn btn-success" id="se-batch-stock-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
            Add ${summary.matched} Items to Stock
          </button>
        </div>
        ` : ''}
      </div>
    `;

    // Load suppliers for batch form & wire up button
    if (sortedGroups.length > 0) {
      loadBatchSuppliers();
      setupBatchStockBtn(sortedGroups);
    }
  }

  async function loadBatchSuppliers() {
    try {
      const data = await api.getSuppliers();
      const suppliers = data.suppliers || data || [];
      const select = document.getElementById('se-batch-supplier');
      if (!select) return;
      suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s._id;
        opt.textContent = s.name;
        select.appendChild(opt);
      });
    } catch (err) { /* optional */ }
  }

  function setupBatchStockBtn(sortedGroups) {
    const btn = document.getElementById('se-batch-stock-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" class="spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        Processing…
      `;

      const entries = [];
      for (const g of sortedGroups) {
        const costOverride = document.querySelector(`.se-bulk-cost-input[data-pid="${g.product._id}"]`)?.value;
        const priceOverride = document.querySelector(`.se-bulk-price-input[data-pid="${g.product._id}"]`)?.value;

        for (const code of g.codes) {
          entries.push({
            productId: g.product._id,
            productName: g.product.name,
            quantity: 1,
            imei: code,
            newCostPrice: costOverride,
            newSellingPrice: priceOverride
          });
        }
      }

      const supplierSelect = document.getElementById('se-batch-supplier');
      const supplier = supplierSelect?.selectedOptions[0]?.text || '';
      const totalCost = parseFloat(document.getElementById('se-batch-cost')?.value) || 0;

      try {
        const result = await api.createBulkStockEntries({ entries, supplier, totalCost });
        showToast(result.message || 'Stock entries recorded!', 'success');

        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
          Done! Stock Updated
        `;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline');

        // Refresh stock history
        loadStockHistory();
      } catch (err) {
        showToast(err.message || 'Failed to record stock entries', 'error');
        btn.disabled = false;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
          Retry — Add Items to Stock
        `;
      }
    });
  }

  // ─── Single Product Form ───
  loadProductOptions();
  loadSupplierOptions();
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
      supplier: document.getElementById('sf-supplier').selectedOptions[0]?.text || '',
      totalCost: parseFloat(document.getElementById('sf-cost').value) || 0,
      newCostPrice: document.getElementById('sf-new-cost').value,
      newSellingPrice: document.getElementById('sf-new-price').value,
      itemBarcodes: singleFormItemBarcodes,
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
      singleFormItemBarcodes = [];
      renderSfImeis();
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
      allProducts = data.products || data || [];
      const select = document.getElementById('sf-product');
      if (!select) return;
      allProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p._id;
        opt.textContent = `${p.name} (${p.sku})`;
        select.appendChild(opt);
      });

      if (params.productId) {
        select.value = params.productId;
      }
    } catch (err) {
      showToast('Failed to load products', 'error');
    }
  }

  // Handle product dropdown change to auto-fill current prices
  document.getElementById('sf-product')?.addEventListener('change', (e) => {
    const pid = e.target.value;
    const match = allProducts.find(p => p._id === pid);
    if (match) {
      document.getElementById('sf-new-cost').value = match.costPrice || '';
      document.getElementById('sf-new-price').value = match.sellingPrice || '';
    } else {
      document.getElementById('sf-new-cost').value = '';
      document.getElementById('sf-new-price').value = '';
    }
  });

  // ─── Single Form IMEI Builder Logic ───
  function renderSfImeis() {
    const list = document.getElementById('sf-imei-list');
    if (!list) return;

    if (singleFormItemBarcodes.length === 0) {
      list.innerHTML = "";
    } else {
      list.innerHTML = `
        <div class="imei-builder-container">
          <div class="imei-builder-header">
            <div class="imei-builder-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
              Registered Items
              <span class="imei-builder-count">${singleFormItemBarcodes.length}</span>
            </div>
            <div class="imei-builder-actions">
              <button type="button" class="btn-clear" onclick="window.clearAllSfImeis()">Clear All</button>
            </div>
          </div>
          <div class="imei-builder-grid">
            ${singleFormItemBarcodes
              .map(
                (imei, index) => `
              <div class="imei-chip">
                <span class="imei-chip-text" title="${escapeHtml(imei)}">${escapeHtml(imei)}</span>
                <button type="button" class="imei-chip-remove" onclick="window.removeSfImei(${index})" title="Remove Item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    const qtyInput = document.getElementById("sf-quantity");
    if (singleFormItemBarcodes.length > 0) {
      qtyInput.value = singleFormItemBarcodes.length;
    }
  }

  window.removeSfImei = (index) => {
    singleFormItemBarcodes.splice(index, 1);
    renderSfImeis();
  };

  window.clearAllSfImeis = () => {
    if (confirm("Are you sure you want to remove all items?")) {
      singleFormItemBarcodes = [];
      renderSfImeis();
    }
  };

  document.getElementById("sf-add-imei")?.addEventListener("click", () => {
    const input = document.getElementById("sf-imei-input");
    const val = input.value.trim();
    if (!val) return;

    const codes = parseMultiCodes(val);
    let addedCount = 0;
    
    for (const code of codes) {
      if (!singleFormItemBarcodes.includes(code)) {
        singleFormItemBarcodes.push(code);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      renderSfImeis();
      input.value = "";
      if (addedCount > 1) {
        showToast(`Added ${addedCount} new items`);
      }
    } else {
      showToast("Items already registered or invalid", "warning");
    }
  });

  // Single Form QR Scanner
  async function startSfScanner() {
    const scannerContainer = document.getElementById("sf-scanner-container");
    const scanImeiBtn = document.getElementById("sf-scan-imei");
    
    if (scannerContainer.style.display === "block") return;
    scannerContainer.style.display = "block";
    scanImeiBtn.disabled = true;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      sfHtml5QrCode = new Html5Qrcode("sf-scanner-viewfinder");
      await sfHtml5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          const codes = parseMultiCodes(decodedText);
          let added = 0;
          for (const code of codes) {
            if (!singleFormItemBarcodes.includes(code)) {
              singleFormItemBarcodes.push(code);
              added++;
            }
          }
          if (added > 0) {
            renderSfImeis();
            showToast(`Scanned ${added} code(s)`, "success");
            setTimeout(stopSfScanner, 1000);
          }
        },
        () => {} // ignore errors
      );
    } catch (err) {
      showToast("Could not access camera", "error");
      scanImeiBtn.disabled = false;
      scannerContainer.style.display = "none";
    }
  }

  async function stopSfScanner() {
    if (sfHtml5QrCode && sfHtml5QrCode.isScanning) {
      try {
        await sfHtml5QrCode.stop();
      } catch (e) {
        /* ignore */
      }
    }
    const scanImeiBtn = document.getElementById("sf-scan-imei");
    if (scanImeiBtn) scanImeiBtn.disabled = false;
    document.getElementById("sf-scanner-container").style.display = "none";
  }

  document.getElementById("sf-scan-imei")?.addEventListener("click", startSfScanner);
  document.getElementById("sf-stop-scan")?.addEventListener("click", stopSfScanner);

  async function loadSupplierOptions() {
    try {
      const data = await api.getSuppliers();
      const suppliers = data.suppliers || data || [];
      const select = document.getElementById('sf-supplier');
      if (!select) return;
      suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s._id;
        opt.textContent = s.name;
        select.appendChild(opt);
      });
    } catch (err) {
      showToast('Failed to load suppliers', 'error');
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
                  <td data-label="Product"><strong>${escapeHtml(e.productName || '—')}</strong>${e.isBulk ? ' <span class="badge badge-info" style="font-size:10px;">Bulk</span>' : ''}</td>
                  <td data-label="Qty"><span class="badge badge-info">+${e.quantity}</span></td>
                  <td data-label="Supplier" class="text-muted">${escapeHtml(e.supplier || '—')}</td>
                  <td data-label="Cost">${formatCurrency(e.totalCost)}</td>
                  <td data-label="Date" class="text-muted text-sm">${formatDateTime(e.createdAt)}</td>
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

  // Cleanup
  return () => {
    stopBulkScanner();
  };
}
