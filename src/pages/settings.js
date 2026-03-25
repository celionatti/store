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
            <label class="form-label" for="st-slogan">Shop Slogan / Subtitle</label>
            <input type="text" id="st-slogan" class="form-input" placeholder="e.g. Your one-stop shop for electronics" />
          </div>
          <div class="form-group">
            <label class="form-label" for="st-address">Shop Address</label>
            <input type="text" id="st-address" class="form-input" placeholder="e.g. 123 Main St, Lagos" />
          </div>
          <div class="form-group">
            <label class="form-label" for="st-phone">Phone Number</label>
            <input type="text" id="st-phone" class="form-input" placeholder="e.g. +234 800 123 4567" />
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
          <div class="form-group">
            <label class="form-label" for="st-tax">Default Tax Rate (%)</label>
            <input type="number" id="st-tax" class="form-input" placeholder="e.g. 7.5" step="0.01" min="0" />
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
      <div style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--color-border);">
        <button id="st-backup" class="btn btn-outline btn-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 4px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Database Backup
        </button>
      </div>
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
        shopSlogan: document.getElementById('st-slogan').value,
        shopAddress: document.getElementById('st-address').value,
        shopPhone: document.getElementById('st-phone').value,
        currency: document.getElementById('st-currency').value,
        taxRate: document.getElementById('st-tax').value,
      };

      await api.updateSettings(payload);
      showToast('Settings saved successfully', 'success');
      
      // Update local storage currency if it changed
      import('../utils/helpers.js').then(h => h.setCurrentCurrency(payload.currency));

      // Update brand text across the UI immediately
      if (payload.shopName) {
        import('../utils/helpers.js').then(h => h.updateBrandName(payload.shopName));
      }
      
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('st-backup')?.addEventListener('click', async () => {
    try {
      const data = await api.getBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `store_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded successfully', 'success');
    } catch (err) {
      showToast('Failed to download backup', 'error');
    }
  });

  async function loadSettings() {
    try {
      const data = await api.getSettings();
      const s = data.settings || {};
      
      document.getElementById('st-name').value = s.shopName || '';
      document.getElementById('st-slogan').value = s.shopSlogan || '';
      document.getElementById('st-address').value = s.shopAddress || '';
      document.getElementById('st-phone').value = s.shopPhone || '';
      document.getElementById('st-currency').value = s.currency || 'NGN';
      document.getElementById('st-tax').value = s.taxRate || 0;
      
    } catch (err) {
      showToast('Failed to load settings', 'error');
    }
  }
}
