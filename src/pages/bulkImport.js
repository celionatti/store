/**
 * Bulk Import Page
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderBulkImport(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Bulk Product Import</h2>
      <a href="#/products" class="btn btn-outline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to Products
      </a>
    </div>
    
    <div class="card">
      <div class="info-note mb-lg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="color:var(--color-info);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          Upload a CSV file with headers: <strong>name, sku, barcode, itemBarcodes (semi-colon separated), category, costPrice, sellingPrice, quantity, reorderLevel</strong>.
        </div>
      </div>
      
      <div id="import-zone" class="import-dropzone">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <p>Click to select or drag & drop CSV file</p>
        <input type="file" id="csv-input" accept=".csv" style="display:none" />
      </div>
      
      <div id="import-preview" style="display:none;" class="mt-lg">
        <h3>Preview (<span id="preview-count">0</span> items)</h3>
        <div class="table-wrapper mb-md" style="max-height: 300px; overflow-y: auto;">
          <table id="preview-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Barcode</th>
                <th>Price</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="flex gap-md">
          <button class="btn btn-primary" id="start-import">Start Import</button>
          <button class="btn btn-outline" id="cancel-import">Cancel</button>
        </div>
      </div>
      
      <div id="import-results" style="display:none;" class="mt-lg">
        <div class="card bg-alt">
          <h3 id="result-status">Import Results</h3>
          <p id="result-summary"></p>
          <div id="result-errors" class="text-danger text-sm mt-sm" style="max-height: 200px; overflow-y: auto;"></div>
        </div>
      </div>
    </div>
  `;

  const dropzone = document.getElementById('import-zone');
  const fileInput = document.getElementById('csv-input');
  const preview = document.getElementById('import-preview');
  const previewTable = document.getElementById('preview-table').querySelector('tbody');
  const startBtn = document.getElementById('start-import');
  let parsedProducts = [];

  dropzone?.addEventListener('click', () => fileInput.click());
  
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  async function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      parseCSV(text);
    };
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      showToast('CSV is empty or missing data', 'warning');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const p = {};
      headers.forEach((h, index) => {
        p[h] = values[index]?.trim() || '';
      });
      
      // Special handling for IMEIs
      if (p.itembarcodes) {
        p.itemBarcodes = p.itembarcodes.split(';').map(b => b.trim()).filter(Boolean);
      } else {
        p.itemBarcodes = [];
      }
      
      products.push(p);
    }

    parsedProducts = products;
    renderPreview(products);
  }

  function renderPreview(products) {
    previewTable.innerHTML = products.slice(0, 10).map(p => `
      <tr>
        <td data-label="Name">${escapeHtml(p.name)}</td>
        <td data-label="SKU">${escapeHtml(p.sku)}</td>
        <td data-label="Barcode">${escapeHtml(p.barcode)}</td>
        <td data-label="Price">${p.sellingprice || p.sellingPrice}</td>
        <td data-label="Qty">${p.quantity}</td>
      </tr>
    `).join('') + (products.length > 10 ? `<tr><td colspan="5" data-label="Total" class="text-center text-muted">... and ${products.length - 10} more</td></tr>` : '');
    
    document.getElementById('preview-count').textContent = products.length;
    dropzone.style.display = 'none';
    preview.style.display = 'block';
  }

  startBtn?.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Importing...';
    
    try {
      const result = await api.importProducts(parsedProducts);
      showResults(result);
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
      startBtn.disabled = false;
      startBtn.textContent = 'Start Import';
    }
  });

  document.getElementById('cancel-import')?.addEventListener('click', () => {
    renderBulkImport(container);
  });

  function showResults(result) {
    preview.style.display = 'none';
    const resultsArea = document.getElementById('import-results');
    resultsArea.style.display = 'block';
    
    document.getElementById('result-summary').textContent = `Successfully imported ${result.success} products. ${result.errors.length} failed.`;
    
    const errorList = document.getElementById('result-errors');
    if (result.errors.length > 0) {
      errorList.innerHTML = '<strong>Errors:</strong><ul>' + result.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('') + '</ul>';
    } else {
      errorList.innerHTML = '<span class="text-success">All products imported successfully!</span>';
    }
  }
}
