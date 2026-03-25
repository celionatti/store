/**
 * Supplier Management Page
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { debounce, escapeHtml } from '../utils/helpers.js';

export function renderSuppliers(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Suppliers</h2>
      <div class="flex gap-md wrap">
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="supplier-search" placeholder="Search suppliers…" />
        </div>
        <button class="btn btn-primary" id="add-supplier-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Supplier
        </button>
      </div>
    </div>
    
    <div id="suppliers-list" class="mt-lg">
      <div class="loader">Loading suppliers…</div>
    </div>
  `;

  let allSuppliers = [];
  loadSuppliers();

  const searchInput = document.getElementById('supplier-search');
  searchInput?.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase();
    renderList(allSuppliers.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.contactPerson.toLowerCase().includes(query)
    ));
  }, 250));

  document.getElementById('add-supplier-btn')?.addEventListener('click', () => {
    showSupplierModal();
  });

  async function loadSuppliers() {
    try {
      const data = await api.getSuppliers();
      allSuppliers = data.suppliers || data || [];
      renderList(allSuppliers);
    } catch (err) {
      showToast(err.message || 'Failed to load suppliers', 'error');
      document.getElementById('suppliers-list').innerHTML = '<div class="empty-state">Failed to load suppliers.</div>';
    }
  }

  function renderList(suppliers) {
    const wrapper = document.getElementById('suppliers-list');
    if (!wrapper) return;

    if (suppliers.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state">
          <p>No suppliers found.</p>
        </div>
      `;
      return;
    }

    wrapper.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact Person</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${suppliers.map(s => `
              <tr>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td>${escapeHtml(s.contactPerson || '—')}</td>
                <td>${escapeHtml(s.email || '—')}</td>
                <td>${escapeHtml(s.phone || '—')}</td>
                <td><span class="badge info">${escapeHtml(s.category || 'General')}</span></td>
                <td>
                  <div class="flex gap-sm">
                    <button class="btn-icon" data-edit="${s._id}" title="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon danger" data-delete="${s._id}" title="Delete">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    wrapper.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => showSupplierModal(suppliers.find(s => s._id === btn.dataset.edit)));
    });

    wrapper.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delete;
        const supplier = suppliers.find(s => s._id === id);
        showModal('Delete Supplier', `Are you sure you want to delete <strong>${escapeHtml(supplier.name)}</strong>?`, async () => {
          try {
            await api.deleteSupplier(id);
            showToast('Supplier deleted', 'success');
            loadSuppliers();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      });
    });
  }

  function showSupplierModal(supplier = null) {
    const isEdit = !!supplier;
    const title = isEdit ? 'Edit Supplier' : 'Add New Supplier';
    
    // Using a custom modal style for better layout
    const content = `
      <form id="supplier-form">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" id="sup-name" class="form-input" value="${supplier?.name || ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Contact Person</label>
          <input type="text" id="sup-contact" class="form-input" value="${supplier?.contactPerson || ''}" />
        </div>
        <div class="form-row">
          <div class="form-group" style="flex: 1;">
            <label class="form-label">Email</label>
            <input type="email" id="sup-email" class="form-input" value="${supplier?.email || ''}" />
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="form-label">Phone</label>
            <input type="text" id="sup-phone" class="form-input" value="${supplier?.phone || ''}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <input type="text" id="sup-category" class="form-input" placeholder="Electronics, Clothing, etc." value="${supplier?.category || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <textarea id="sup-address" class="form-input" rows="2">${supplier?.address || ''}</textarea>
        </div>
      </form>
    `;

    showModal(title, content, async () => {
      const data = {
        name: document.getElementById('sup-name').value,
        contactPerson: document.getElementById('sup-contact').value,
        email: document.getElementById('sup-email').value,
        phone: document.getElementById('sup-phone').value,
        address: document.getElementById('sup-address').value,
        category: document.getElementById('sup-category').value,
      };

      try {
        if (isEdit) {
          await api.updateSupplier(supplier._id, data);
          showToast('Supplier updated', 'success');
        } else {
          await api.createSupplier(data);
          showToast('Supplier added', 'success');
        }
        loadSuppliers();
      } catch (err) {
        showToast(err.message, 'error');
        throw err; // Keep modal open on error
      }
    });

    const confirmBtn = document.getElementById('modal-confirm');
    if (confirmBtn) confirmBtn.textContent = isEdit ? 'Update Supplier' : 'Add Supplier';
  }
}
