/**
 * Add Worker Page (Admin Only)
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderAddWorker(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Register New Worker</h2>
      <a href="#/workers" class="btn btn-outline">Cancel</a>
    </div>

    <div class="card" style="max-width: 600px; margin: 0 auto;">
      <form id="worker-form">
        <div class="form-group">
          <label class="form-label" for="reg-name">Full Name <span class="text-danger">*</span></label>
          <input type="text" id="reg-name" class="form-input" required placeholder="John Doe" />
        </div>
        
        <div class="form-row" style="flex-wrap: wrap;">
          <div class="form-group" style="flex:1; min-width: 200px;">
            <label class="form-label" for="reg-username">Username <span class="text-danger">*</span></label>
            <input type="text" id="reg-username" class="form-input" required placeholder="johndoe" minlength="3"/>
          </div>
          <div class="form-group" style="flex:1; min-width: 200px;">
            <label class="form-label" for="reg-password">Temporary Password <span class="text-danger">*</span></label>
            <div style="position: relative;">
              <input type="password" id="reg-password" class="form-input" required placeholder="••••••••" minlength="6" style="padding-right: 40px;"/>
              <button type="button" id="toggle-worker-password" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px; display: flex;" aria-label="Toggle password visibility">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-role">Account Type <span class="text-danger">*</span></label>
          <select id="reg-role" class="form-select">
            <option value="worker">Worker (Sales & Customers Only)</option>
            <option value="admin">Admin (Full Access)</option>
          </select>
        </div>

        <div style="margin-top: var(--space-xl); display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary" id="save-btn" style="min-width: 150px;">
            Register Worker
          </button>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById('worker-form');
  const regBtn = document.getElementById('save-btn');
  const toggleWorkerBtn = document.getElementById('toggle-worker-password');
  const workerPassInput = document.getElementById('reg-password');

  if (toggleWorkerBtn && workerPassInput) {
    toggleWorkerBtn.addEventListener('click', () => {
      const type = workerPassInput.type === 'password' ? 'text' : 'password';
      workerPassInput.type = type;
      toggleWorkerBtn.innerHTML = type === 'password' 
        ? '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
        : '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;

    const originalText = regBtn.textContent;
    regBtn.textContent = 'Registering...';
    regBtn.disabled = true;

    try {
      await api.register({ name, username, password, role });
      
      showToast('Worker registered successfully!', 'success');
      window.location.hash = '#/workers';
    } catch (error) {
      showToast(error.message || 'Failed to register worker', 'error');
      regBtn.textContent = originalText;
      regBtn.disabled = false;
    }
  });
}
