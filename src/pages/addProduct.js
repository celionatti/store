/**
 * Add / Edit Product Page
 */
import { api } from "../api.js";
import { showToast } from "../components/toast.js";
import { generateSKU, escapeHtml, parseMultiCodes } from "../utils/helpers.js";

export function renderAddProduct(container, params = {}) {
  const isEdit = !!params.id;

  container.innerHTML = `
    <div class="page-header">
      <h2>${isEdit ? "Edit Product" : "Add New Product"}</h2>
      <a href="#/products" class="btn btn-outline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        <span class="hide-mobile">Back to Products</span>
      </a>
    </div>
    <div class="card">
      <form id="product-form">
        <div class="form-grid">
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label" for="pf-name">Product Name *</label>
            <input type="text" id="pf-name" class="form-input" required placeholder="e.g. Wireless Mouse" />
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label" for="pf-sku">SKU *</label>
            <div class="form-row">
              <input type="text" id="pf-sku" class="form-input" required placeholder="e.g. WIR-2453" />
              <button type="button" class="btn btn-outline btn-sm" id="gen-sku" title="Auto-generate SKU">Generate</button>
            </div>
          </div>
          <div class="form-group" style="grid-column: 1 / -1; display: grid; gap: var(--space-sm);">
            <label class="form-label" for="pf-barcode">General Barcode (Optional if IMEIs added)</label>
            <div class="form-row">
              <input type="text" id="pf-barcode" class="form-input" placeholder="e.g. 123456789012" />
              <button type="button" class="btn btn-outline btn-sm" id="scan-barcode" title="Scan Barcode">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                <span class="hide-mobile">Scan General</span>
              </button>
            </div>
          </div>
          <div class="form-group" style="grid-column: 1 / -1; border-top: 1px solid var(--color-border); padding-top: var(--space-md);">
            <label class="form-label">Individual Items (IMEIs / Unique Barcodes)</label>
            <div class="form-row mb-sm">
              <textarea id="pf-imei-input" class="form-input" rows="2" placeholder="Type a single IMEI or paste multiple (comma, semicolon, or newline separated)…" style="resize: vertical; min-height: 42px;"></textarea>
              <button type="button" class="btn btn-outline btn-sm" id="add-imei">Add</button>
              <button type="button" class="btn btn-outline btn-sm" id="scan-imei" title="Scan IMEI">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                <span class="hide-mobile">Scan IMEI</span>
              </button>
            </div>
            <div id="imei-list"></div>
            <p class="text-sm text-muted mt-sm">Tip: Paste multiple IMEIs at once (comma, semicolon, or newline separated). Quantity auto-updates based on count.</p>
          </div>
          <div id="pf-scanner-container" style="display:none; grid-column: 1 / -1; margin-top: var(--space-md);">
            <div id="pf-scanner-viewfinder" style="width: 100%; max-width: 400px; border-radius: var(--radius-md); overflow: hidden; border: 2px solid var(--color-border);"></div>
            <button type="button" class="btn btn-outline btn-sm mt-sm" id="stop-scan">Stop Camera</button>
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-category">Category</label>
            <select id="pf-category" class="form-select">
              <option value="">No Category</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-supplier">Supplier</label>
            <select id="pf-supplier" class="form-select">
              <option value="">No Supplier</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-cost">Cost Price *</label>
            <input type="number" id="pf-cost" class="form-input" required min="0" step="0.01" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-price">Selling Price *</label>
            <input type="number" id="pf-price" class="form-input" required min="0" step="0.01" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-quantity">Quantity in Stock</label>
            <input type="number" id="pf-quantity" class="form-input" min="0" value="0" placeholder="0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-reorder">Reorder Level</label>
            <input type="number" id="pf-reorder" class="form-input" min="0" value="10" placeholder="10" />
          </div>
        </div>
        <div style="margin-top: var(--space-lg);">
          <button type="submit" class="btn btn-primary" id="pf-submit">
            ${isEdit ? "Update Product" : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById("product-form");
  let html5QrCode = null;
  let scanTarget = "barcode"; // 'barcode' or 'imei'
  let itemBarcodes = [];

  // Auto-generate SKU
  document.getElementById("gen-sku")?.addEventListener("click", () => {
    const nameInput = document.getElementById("pf-name");
    document.getElementById("pf-sku").value = generateSKU(nameInput?.value);
  });

  function renderImeis() {
    const list = document.getElementById("imei-list");
    if (!list) return;

    if (itemBarcodes.length === 0) {
      list.innerHTML = "";
    } else {
      list.innerHTML = `
        <div class="imei-builder-container">
          <div class="imei-builder-header">
            <div class="imei-builder-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
              Registered Items
              <span class="imei-builder-count">${itemBarcodes.length}</span>
            </div>
            <div class="imei-builder-actions">
              <button type="button" class="btn-clear" onclick="window.clearAllImeis()">Clear All</button>
            </div>
          </div>
          <div class="imei-builder-grid">
            ${itemBarcodes
              .map(
                (imei, index) => `
              <div class="imei-chip">
                <span class="imei-chip-text" title="${escapeHtml(imei)}">${escapeHtml(imei)}</span>
                <button type="button" class="imei-chip-remove" onclick="window.removeImei(${index})" title="Remove Item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `;
    }

    const qtyInput = document.getElementById("pf-quantity");
    if (itemBarcodes.length > 0) {
      qtyInput.value = itemBarcodes.length;
    }
  }

  window.removeImei = (index) => {
    itemBarcodes.splice(index, 1);
    renderImeis();
  };

  window.clearAllImeis = () => {
    if (confirm("Are you sure you want to remove all items?")) {
      itemBarcodes = [];
      renderImeis();
    }
  };

  document.getElementById("add-imei")?.addEventListener("click", () => {
    const input = document.getElementById("pf-imei-input");
    const val = input.value.trim();
    if (!val) return;

    // Parse for multiple codes (comma, semicolon, newline, JSON array, etc.)
    const codes = parseMultiCodes(val);
    let addedCount = 0;
    for (const code of codes) {
      if (code && !itemBarcodes.includes(code)) {
        itemBarcodes.push(code);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      input.value = "";
      renderImeis();
      if (addedCount > 1) {
        showToast(`Added ${addedCount} IMEIs`, "success");
      }
    } else {
      showToast("IMEIs already added or input was empty", "warning");
    }
  });

  document
    .getElementById("pf-imei-input")
    ?.addEventListener("keypress", (e) => {
      // Enter without Shift triggers Add (Shift+Enter for new line in textarea)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        document.getElementById("add-imei").click();
      }
    });

  // Barcode Scanner Integration
  const scanBarcodeBtn = document.getElementById("scan-barcode");
  const scanImeiBtn = document.getElementById("scan-imei");
  const stopBtn = document.getElementById("stop-scan");
  const scannerContainer = document.getElementById("pf-scanner-container");

  async function startScanner(target) {
    scanTarget = target;
    const { Html5Qrcode } = await import("html5-qrcode");
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("pf-scanner-viewfinder");
    }

    if (scanBarcodeBtn) scanBarcodeBtn.disabled = true;
    if (scanImeiBtn) scanImeiBtn.disabled = true;
    scannerContainer.style.display = "block";

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (scanTarget === "barcode") {
            document.getElementById("pf-barcode").value = decodedText;
            showToast("General barcode scanned!", "success");
            stopScanner();
          } else if (scanTarget === "imei") {
            // Support multi-IMEI QR codes scanned via camera
            const codes = parseMultiCodes(decodedText);
            let addedCount = 0;
            for (const code of codes) {
              if (code && !itemBarcodes.includes(code)) {
                itemBarcodes.push(code);
                addedCount++;
              }
            }
            if (addedCount > 0) {
              renderImeis();
              showToast(addedCount > 1 ? `${addedCount} IMEIs scanned!` : "IMEI scanned!", "success");
            }
          }
        },
        () => {}, // ignore errors
      );
    } catch (err) {
      showToast("Could not access camera", "error");
      if (scanBarcodeBtn) scanBarcodeBtn.disabled = false;
      if (scanImeiBtn) scanImeiBtn.disabled = false;
      scannerContainer.style.display = "none";
    }
  }

  scanBarcodeBtn?.addEventListener("click", () => startScanner("barcode"));
  scanImeiBtn?.addEventListener("click", () => startScanner("imei"));
  stopBtn?.addEventListener("click", stopScanner);

  async function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
      try {
        await html5QrCode.stop();
      } catch (e) {
        /* ignore */
      }
    }
    if (scanBarcodeBtn) scanBarcodeBtn.disabled = false;
    if (scanImeiBtn) scanImeiBtn.disabled = false;
    scannerContainer.style.display = "none";
  }

  // Load existing product for edit
  loadInitialData();

  async function loadInitialData() {
    // Load suppliers and categories for dropdowns
    try {
      const [supData, catData] = await Promise.all([
        api.getSuppliers(),
        api.getCategories(),
      ]);

      const suppliers = supData.suppliers || supData || [];
      const supSelect = document.getElementById("pf-supplier");
      if (supSelect) {
        suppliers.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s._id;
          opt.textContent = s.name;
          supSelect.appendChild(opt);
        });
      }

      const categories = catData.categories || catData || [];
      const catSelect = document.getElementById("pf-category");
      if (catSelect) {
        categories.forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.name;
          opt.textContent = c.name;
          catSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Failed to load form data:", err);
    }

    if (isEdit) {
      loadProduct(params.id);
    } else {
      if (params.barcode) {
        document.getElementById("pf-barcode").value = params.barcode;
      }
      if (params.imeis) {
        itemBarcodes = parseMultiCodes(decodeURIComponent(params.imeis));
        renderImeis();
      }
    }
  }

  async function loadProduct(id) {
    try {
      const resp = await api.getProduct(id);
      const product = resp.product || resp;
      document.getElementById("pf-name").value = product.name || "";
      document.getElementById("pf-sku").value = product.sku || "";
      document.getElementById("pf-barcode").value = product.barcode || "";
      document.getElementById("pf-category").value = product.category || "";
      document.getElementById("pf-cost").value = product.costPrice || "";
      document.getElementById("pf-price").value = product.sellingPrice || "";
      document.getElementById("pf-quantity").value = product.quantity ?? 0;
      document.getElementById("pf-reorder").value = product.reorderLevel ?? 10;
      const supSelect = document.getElementById("pf-supplier");
      if (supSelect) supSelect.value = product.supplierId || "";
      if (product.itemBarcodes) {
        itemBarcodes = [...product.itemBarcodes];
        renderImeis();
      }
    } catch (err) {
      showToast(err.message || "Failed to load product", "error");
    }
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById("pf-name").value.trim(),
      sku: document.getElementById("pf-sku").value.trim(),
      barcode: document.getElementById("pf-barcode").value.trim(),
      itemBarcodes,
      category: document.getElementById("pf-category").value.trim(),
      costPrice: parseFloat(document.getElementById("pf-cost").value) || 0,
      sellingPrice: parseFloat(document.getElementById("pf-price").value) || 0,
      quantity: parseInt(document.getElementById("pf-quantity").value) || 0,
      reorderLevel: parseInt(document.getElementById("pf-reorder").value) || 10,
      supplierId: document.getElementById("pf-supplier")?.value || null,
    };

    if (
      !payload.name ||
      !payload.sku ||
      (!payload.barcode && payload.itemBarcodes.length === 0)
    ) {
      showToast(
        "Product Name, SKU, and at least one barcode/IMEI are required",
        "warning",
      );
      return;
    }

    const submitBtn = document.getElementById("pf-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? "Updating…" : "Creating…";

    try {
      if (isEdit) {
        await api.updateProduct(params.id, payload);
        showToast("Product updated successfully", "success");
      } else {
        await api.createProduct(payload);
        showToast("Product created successfully", "success");
      }
      location.hash = "/products";
    } catch (err) {
      showToast(err.message || "Failed to save product", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? "Update Product" : "Create Product";
    }
  });

  // Cleanup on page change
  return () => {
    stopScanner();
  };
}
