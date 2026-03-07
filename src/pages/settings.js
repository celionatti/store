/**
 * Settings Page
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderSettings(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Store Settings</h2>
    </div>
    
    <div class="card mb-lg">
      <h3 style="margin-bottom: var(--space-md);">General Configuration</h3>
      <form id="settings-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="st-name">Shop Name</label>
            <input type="text" id="st-name" class="form-input" placeholder="e.g. My Awesome Store" />
          </div>
          <div class="form-group">
            <label class="form-label" for="st-currency">Base Currency</label>
            <select id="st-currency" class="form-select">
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn btn-primary mt-md" id="st-submit">
          Save Settings
        </button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin-bottom: var(--space-md);">System Information</h3>
      <p class="text-muted">Software Version: 1.2.0 (Accounting Update)</p>
      <p class="text-muted">Developed by: <strong>Celio Natti</strong></p>
      <p class="text-muted">System Status: <span class="badge badge-success">Online</span></p>
    </div>
  `;

  loadSettings();

  const form = document.getElementById('settings-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('st-submit');
    btn.disabled = true;

    try {
      const payload = {
        shopName: document.getElementById('st-name').value,
        currency: document.getElementById('st-currency').value,
      };

      await api.updateSettings(payload);
      showToast('Settings saved successfully', 'success');
      
      // Update local storage currency if it changed
      import('../utils/helpers.js').then(h => h.setCurrentCurrency(payload.currency));
      
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  async function loadSettings() {
    try {
      const data = await api.getSettings();
      const s = data.settings || {};
      
      document.getElementById('st-name').value = s.shopName || '';
      document.getElementById('st-currency').value = s.currency || 'NGN';
      
    } catch (err) {
      showToast('Failed to load settings', 'error');
    }
  }
}
