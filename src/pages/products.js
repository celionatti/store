/**
 * Products List Page
 */
import { api } from '../api.js';
import { formatCurrency, debounce, getStockBadge, escapeHtml, escapeCSV } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { renderPagination } from '../components/pagination.js';

export function renderProducts(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Products</h2>
      <div class="flex gap-md wrap">
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="product-search" placeholder="Search by name, SKU, or IMEI…" />
        </div>
        <button class="btn btn-outline" id="export-products" title="Export to CSV">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span class="hide-mobile">Export</span>
        </button>
        <a href="#/products/new" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span class="hide-mobile">Add Product</span>
        </a>
      </div>
    </div>
    <div id="products-table">
      <div class="loader">Loading products…</div>
    </div>
  `;

  let allProducts = [];
  let currentPage = 1;
  const itemsPerPage = 10;

  loadProducts();

  const searchInput = document.getElementById('product-search');
  searchInput?.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase();
    currentPage = 1; // Reset to first page on search
    renderTable(allProducts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      (Array.isArray(p.itemBarcodes) && p.itemBarcodes.some(b => b.toLowerCase().includes(query)))
    ));
  }, 250));

  document.getElementById('export-products')?.addEventListener('click', () => {
    if (allProducts.length === 0) return;
    
    const headers = ['Product Name', 'SKU', 'Barcode', 'Category', 'Cost Price', 'Selling Price', 'Quantity', 'IMEIs'].map(escapeCSV);
    const rows = allProducts.map(p => [
      escapeCSV(p.name),
      escapeCSV(p.sku),
      escapeCSV(p.barcode || ''),
      escapeCSV(p.category || ''),
      escapeCSV(p.costPrice),
      escapeCSV(p.sellingPrice),
      escapeCSV(p.quantity),
      escapeCSV((p.itemBarcodes || []).join('; '))
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  async function loadProducts() {
    try {
      const data = await api.getProducts();
      allProducts = data.products || data || [];
      renderTable(allProducts);
    } catch (err) {
      showToast(err.message || 'Failed to load products', 'error');
      document.getElementById('products-table').innerHTML =
        '<div class="empty-state"><p>Failed to load products.</p></div>';
    }
  }

  function renderTable(products) {
    const wrapper = document.getElementById('products-table');
    if (!wrapper) return;

    if (products.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          <p>No products found</p>
          <a href="#/products/new" class="btn btn-primary btn-sm">Add your first product</a>
        </div>
      `;
      return;
    }

    // Slice for pagination
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = products.slice(start, start + itemsPerPage);

    wrapper.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th class="hide-mobile">Category</th>
              <th class="hide-mobile">Cost</th>
              <th class="hide-mobile">Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedProducts.map(p => `
              <tr>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td class="text-muted text-sm">${escapeHtml(p.sku)}</td>
                <td class="hide-mobile">${escapeHtml(p.category || '—')}</td>
                <td class="hide-mobile">${formatCurrency(p.costPrice)}</td>
                <td class="hide-mobile">${formatCurrency(p.sellingPrice)}</td>
                <td>${p.quantity}</td>
                <td>${getStockBadge(p.quantity, p.reorderLevel)}</td>
                <td>
                  <div class="flex gap-sm">
                    <a href="#/products/edit/${p._id}" class="btn-icon" title="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </a>
                    <button class="btn-icon danger" data-delete="${p._id}" title="Delete">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div id="products-pagination"></div>
    `;

    renderPagination(
      document.getElementById('products-pagination'),
      products.length,
      currentPage,
      itemsPerPage,
      (newPage) => {
        currentPage = newPage;
        renderTable(products);
        window.scrollTo(0, 0);
      }
    );

    // Delete handlers
    wrapper.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delete;
        const product = products.find(p => p._id === id);
        showModal(
          'Delete Product',
          `Are you sure you want to delete <strong>${escapeHtml(product?.name || '')}</strong>? This action cannot be undone.`,
          async () => {
            try {
              await api.deleteProduct(id);
              showToast('Product deleted', 'success');
              loadProducts();
            } catch (err) {
              showToast(err.message || 'Failed to delete', 'error');
            }
          }
        );
      });
    });
  }
}
