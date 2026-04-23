/**
 * Barcode Scanner Page — supports single + multi-IMEI container scanning
 */
import { api } from '../api.js';
import { formatCurrency, getStockBadge, escapeHtml, parseMultiCodes } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';


/**
 * Determines if the scanned text is multi-code (container) vs single barcode
 */
function isMultiCodeScan(text) {
  if (!text) return false;
  const trimmed = text.trim();

  // JSON array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return true;

  // Contains delimiter characters
  if (/[,;\n\r|\t]/.test(trimmed)) return true;

  return false;
}

export function renderScanner(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Barcode Scanner</h2>
    </div>
    <div class="card scanner-wrapper">
      <div id="scanner-viewfinder"></div>
      <div class="flex-between mt-md">
        <button class="btn btn-primary" id="scanner-start">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Start Scanner
        </button>
        <button class="btn btn-outline" id="scanner-stop" disabled>
          Stop Scanner
        </button>
      </div>
      <div style="margin-top: var(--space-md);">
        <label class="form-label" for="manual-barcode">Or enter barcode / paste multiple IMEIs:</label>
        <div class="form-row">
          <textarea id="manual-barcode" class="form-input" rows="2" placeholder="Enter single barcode or paste multiple IMEIs (comma, semicolon, or newline separated)…" style="resize: vertical; min-height: 42px;"></textarea>
          <button class="btn btn-primary btn-sm" id="manual-lookup">Lookup</button>
        </div>
        <p class="text-sm text-muted" style="margin-top: 4px;">Tip: Paste multiple IMEIs to scan an entire container at once.</p>
      </div>
    </div>

    <div id="scan-result" class="card scan-result-card mt-lg" style="display:none;">
      <div id="scan-result-content"></div>
    </div>
  `;

  let html5QrCode = null;

  // Start scanner
  document.getElementById('scanner-start')?.addEventListener('click', async () => {
    const { Html5Qrcode } = await import('html5-qrcode');
    html5QrCode = new Html5Qrcode('scanner-viewfinder');

    document.getElementById('scanner-start').disabled = true;
    document.getElementById('scanner-stop').disabled = false;

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        onScanSuccess,
        () => {} // ignore scan errors
      );
    } catch (err) {
      showToast('Could not access camera. Please allow camera permission.', 'error');
      document.getElementById('scanner-start').disabled = false;
      document.getElementById('scanner-stop').disabled = true;
    }
  });

  // Stop scanner
  document.getElementById('scanner-stop')?.addEventListener('click', stopScanner);

  // Manual lookup
  document.getElementById('manual-lookup')?.addEventListener('click', () => {
    const code = document.getElementById('manual-barcode').value.trim();
    if (code) handleScannedText(code);
  });

  document.getElementById('manual-barcode')?.addEventListener('keypress', (e) => {
    // Only trigger on Enter without Shift (allow Shift+Enter for new lines)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const code = e.target.value.trim();
      if (code) handleScannedText(code);
    }
  });

  async function onScanSuccess(decodedText) {
    // Stop scanner after successful scan
    await stopScanner();
    handleScannedText(decodedText);
  }

  /**
   * Route the scanned text to single-product or multi-product handling
   */
  function handleScannedText(text) {
    if (isMultiCodeScan(text)) {
      const codes = parseMultiCodes(text);
      if (codes.length > 1) {
        lookupMultipleCodes(codes);
      } else if (codes.length === 1) {
        lookupBarcode(codes[0]);
      }
    } else {
      lookupBarcode(text.trim());
    }
  }

  async function stopScanner() {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
      } catch (e) { /* ignore */ }
    }
    document.getElementById('scanner-start').disabled = false;
    document.getElementById('scanner-stop').disabled = true;
  }

  // ─── Single barcode lookup (existing behavior) ───
  async function lookupBarcode(code) {
    const resultCard = document.getElementById('scan-result');
    const resultContent = document.getElementById('scan-result-content');
    if (!resultCard || !resultContent) return;

    resultCard.style.display = 'block';
    resultContent.innerHTML = '<div class="loader">Looking up product…</div>';

    try {
      const product = await api.getProductByBarcode(code);

      resultContent.innerHTML = `
        <div class="flex-between mb-md">
          <h3>${escapeHtml(product.name)}</h3>
          ${getStockBadge(product.quantity, product.reorderLevel)}
        </div>
        <div class="form-grid">
          <div><span class="text-muted text-sm">SKU:</span> ${escapeHtml(product.sku)}</div>
          <div><span class="text-muted text-sm">Barcode:</span> ${escapeHtml(product.barcode)}</div>
          <div><span class="text-muted text-sm">Category:</span> ${escapeHtml(product.category || '—')}</div>
          <div><span class="text-muted text-sm">Stock:</span> ${product.quantity}</div>
          <div><span class="text-muted text-sm">Cost Price:</span> ${formatCurrency(product.costPrice)}</div>
          <div><span class="text-muted text-sm">Selling Price:</span> ${formatCurrency(product.sellingPrice)}</div>
        </div>
        <div class="flex gap-sm mt-lg">
          <a href="#/stock" class="btn btn-primary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            Add Stock
          </a>
          <a href="#/sales?productId=${product._id}&barcode=${encodeURIComponent(code)}" class="btn btn-success btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            Record Sale
          </a>
          <a href="#/products/edit/${product._id}" class="btn btn-outline btn-sm">
            Edit Product
          </a>
        </div>
      `;
    } catch (err) {
      resultContent.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <p>Product not found for barcode: <strong>${escapeHtml(code)}</strong></p>
          <a href="#/products/new?barcode=${encodeURIComponent(code)}" class="btn btn-primary btn-sm">Create New Product</a>
        </div>
      `;
    }
  }

  // ─── Multi-code container lookup ───
  async function lookupMultipleCodes(codes) {
    const resultCard = document.getElementById('scan-result');
    const resultContent = document.getElementById('scan-result-content');
    if (!resultCard || !resultContent) return;

    resultCard.style.display = 'block';
    resultContent.innerHTML = `
      <div class="container-scan-loading">
        <div class="loader">Looking up ${codes.length} items…</div>
      </div>
    `;

    try {
      const data = await api.lookupBarcodes(codes);
      const { results, summary } = data;

      renderContainerResults(results, summary);
    } catch (err) {
      resultContent.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <p>Failed to look up items: ${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }

  function renderContainerResults(results, summary) {
    const resultContent = document.getElementById('scan-result-content');
    if (!resultContent) return;

    // Group matched results by product
    const productGroups = {};
    const unmatched = [];

    for (const r of results) {
      if (r.matched && r.product) {
        const pid = r.product._id;
        if (!productGroups[pid]) {
          productGroups[pid] = {
            product: r.product,
            codes: [],
          };
        }
        productGroups[pid].codes.push(r.code);
      } else {
        unmatched.push(r.code);
      }
    }

    const sortedGroups = Object.values(productGroups).sort((a, b) =>
      a.product.name.localeCompare(b.product.name)
    );

    resultContent.innerHTML = `
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
                      <td data-label="Cost">${idx === 0 ? `<input type="number" class="bulk-cost-input form-input" style="width:80px; padding:2px 6px; font-size:12px; min-height:0; height:24px;" data-pid="${g.product._id}" value="${g.product.costPrice || ''}" step="0.01" />` : ''}</td>
                      <td data-label="Sell">${idx === 0 ? `<input type="number" class="bulk-price-input form-input" style="width:80px; padding:2px 6px; font-size:12px; min-height:0; height:24px;" data-pid="${g.product._id}" value="${g.product.sellingPrice || ''}" step="0.01" />` : ''}</td>
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
          <p class="text-sm text-muted mb-md">These IMEIs don't match any existing product. They will be skipped during stock entry. You can register them as new products first.</p>
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
              <label class="form-label" for="batch-supplier">Supplier</label>
              <select id="batch-supplier" class="form-select">
                <option value="">Select a supplier…</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="batch-cost">Total Cost (entire shipment)</label>
              <input type="number" id="batch-cost" class="form-input" min="0" step="0.01" placeholder="0.00" />
            </div>
          </div>
          <button class="btn btn-success" id="batch-stock-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
            Add ${summary.matched} Items to Stock
          </button>
        </div>
        ` : ''}
      </div>
    `;

    // Load suppliers for the batch form
    if (sortedGroups.length > 0) {
      loadBatchSuppliers();
      setupBatchStockButton(sortedGroups);
    }
  }

  async function loadBatchSuppliers() {
    try {
      const data = await api.getSuppliers();
      const suppliers = data.suppliers || data || [];
      const select = document.getElementById('batch-supplier');
      if (!select) return;
      suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s._id;
        opt.textContent = s.name;
        select.appendChild(opt);
      });
    } catch (err) {
      // Silently fail – supplier is optional
    }
  }

  function setupBatchStockButton(sortedGroups) {
    const btn = document.getElementById('batch-stock-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" class="spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        Processing…
      `;

      // Build entries array: one per IMEI, each with quantity 1
      const entries = [];
      for (const g of sortedGroups) {
        const costOverride = document.querySelector(`.bulk-cost-input[data-pid="${g.product._id}"]`)?.value;
        const priceOverride = document.querySelector(`.bulk-price-input[data-pid="${g.product._id}"]`)?.value;

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

      const supplierSelect = document.getElementById('batch-supplier');
      const supplier = supplierSelect?.selectedOptions[0]?.text || '';
      const totalCost = parseFloat(document.getElementById('batch-cost')?.value) || 0;

      try {
        const result = await api.createBulkStockEntries({ entries, supplier, totalCost });
        showToast(result.message || 'Stock entries recorded!', 'success');

        // Show success state
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
          Done! Stock Updated
        `;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline');

        // Add "View Stock" link
        const stockLink = document.createElement('a');
        stockLink.href = '#/stock';
        stockLink.className = 'btn btn-primary btn-sm';
        stockLink.style.marginLeft = 'var(--space-sm)';
        stockLink.innerHTML = 'View Stock Entries';
        btn.parentElement.appendChild(stockLink);
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

  // Cleanup
  return () => {
    stopScanner();
  };
}
