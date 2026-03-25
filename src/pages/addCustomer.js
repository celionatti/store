/**
 * Add / Edit Customer Page
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderAddCustomer(container, params = {}) {
  const isEdit = !!params.id;
  
  container.innerHTML = `
    <div class="page-header">
      <h2>${isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
      <a href="#/customers" class="btn btn-outline">Cancel</a>
    </div>

    <div class="card" style="max-width: 600px; margin: 0 auto;">
      <form id="customer-form">
        <div class="form-group">
          <label class="form-label" for="cust-name">Full Name <span class="text-danger">*</span></label>
          <input type="text" id="cust-name" class="form-input" required placeholder="Jane Doe" />
        </div>
        
        <div class="form-row" style="flex-wrap: wrap;">
          <div class="form-group" style="flex:1; min-width: 200px;">
            <label class="form-label" for="cust-email">Email Address</label>
            <input type="email" id="cust-email" class="form-input" placeholder="jane@example.com" />
          </div>
          <div class="form-group" style="flex:1; min-width: 200px;">
            <label class="form-label" for="cust-phone">Phone Number</label>
            <input type="tel" id="cust-phone" class="form-input" placeholder="08012345678" />
          </div>
          <div class="form-group" style="flex:1; min-width: 200px;">
            <label class="form-label" for="cust-balance">Initial Balance (Credit/Debt)</label>
            <input type="number" id="cust-balance" class="form-input" placeholder="0.00" step="0.01" />
            <small class="text-muted">Use negative for debt, positive for credit.</small>
          </div>
        </div>

        <div style="margin-top: var(--space-xl); display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary" id="save-btn" style="min-width: 150px;">
            ${isEdit ? 'Update Customer' : 'Save Customer'}
          </button>
        </div>
      </form>
    </div>
  `;

  if (isEdit) {
    loadCustomer(params.id);
  }

  async function loadCustomer(id) {
    try {
      const { customer } = await api.getCustomer(id);
      document.getElementById('cust-name').value = customer.name;
      document.getElementById('cust-email').value = customer.email || '';
      document.getElementById('cust-phone').value = customer.phone || '';
      document.getElementById('cust-balance').value = customer.balance || 0;
    } catch (err) {
      showToast(err.message || 'Failed to load customer', 'error');
    }
  }

  const form = document.getElementById('customer-form');
  const saveBtn = document.getElementById('save-btn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById('cust-name').value,
      email: document.getElementById('cust-email').value,
      phone: document.getElementById('cust-phone').value,
      balance: document.getElementById('cust-balance').value,
    };

    const originalText = saveBtn.textContent;
    saveBtn.textContent = isEdit ? 'Updating...' : 'Saving...';
    saveBtn.disabled = true;

    try {
      if (isEdit) {
        await api.updateCustomer(params.id, payload);
        showToast('Customer updated successfully', 'success');
      } else {
        await api.createCustomer(payload);
        showToast('Customer added successfully', 'success');
      }
      window.location.hash = '#/customers';
    } catch (err) {
      showToast(err.message || 'Failed to save customer', 'error');
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  });
}
