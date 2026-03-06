/**
 * Barcode Scanner Page
 */
import { api } from '../api.js';
import { formatCurrency, getStockBadge, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

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
        <label class="form-label" for="manual-barcode">Or enter barcode manually:</label>
        <div class="form-row">
          <input type="text" id="manual-barcode" class="form-input" placeholder="Enter barcode…" />
          <button class="btn btn-primary btn-sm" id="manual-lookup">Lookup</button>
        </div>
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
    if (code) lookupBarcode(code);
  });

  document.getElementById('manual-barcode')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const code = e.target.value.trim();
      if (code) lookupBarcode(code);
    }
  });

  async function onScanSuccess(decodedText) {
    // Stop scanner after successful scan
    await stopScanner();
    lookupBarcode(decodedText);
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
          <a href="#/sales" class="btn btn-success btn-sm">
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
          <a href="#/products/new" class="btn btn-primary btn-sm">Create New Product</a>
        </div>
      `;
    }
  }

  // Cleanup
  return () => {
    stopScanner();
  };
}
