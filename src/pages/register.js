import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderRegister(container) {
  container.innerHTML = `
    <div style="max-width: 450px; margin: 60px auto; padding: var(--space-xl);" class="card">
      <div style="text-align: center; margin-bottom: var(--space-lg);">
        <h2 style="margin-bottom: var(--space-xs);">Create an Account</h2>
        <p class="text-muted">Register to start managing your store</p>
      </div>
      <form id="register-form">
        <div class="form-group" style="margin-bottom: var(--space-md);">
          <label class="form-label" for="reg-name">Full Name</label>
          <input type="text" id="reg-name" class="form-input" placeholder="John Doe" required />
        </div>
        <div class="form-group" style="margin-bottom: var(--space-md);">
          <label class="form-label" for="reg-username">Username</label>
          <input type="text" id="reg-username" class="form-input" placeholder="johndoe" required minlength="3" />
        </div>
        <div class="form-group" style="margin-bottom: var(--space-md);">
          <label class="form-label" for="reg-password">Password</label>
          <div style="position: relative;">
            <input type="password" id="reg-password" class="form-input" placeholder="••••••••" required minlength="6" style="padding-right: 40px;" />
            <button type="button" id="toggle-reg-password" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px; display: flex;" aria-label="Toggle password visibility">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom: var(--space-lg);">
          <label class="form-label" for="reg-role">Account Type</label>
          <select id="reg-role" class="form-select">
            <option value="worker">Worker (Sales & Customers Only)</option>
            <option value="admin">Admin (Full Access)</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" id="register-btn" style="width: 100%; margin-bottom: var(--space-md);">
          Register
        </button>
        <div style="text-align: center;">
          <small class="text-muted">Already have an account? <a href="#/login">Sign in</a></small>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById('register-form');
  const regBtn = document.getElementById('register-btn');
  const toggleRegBtn = document.getElementById('toggle-reg-password');
  const regPassInput = document.getElementById('reg-password');

  if (toggleRegBtn && regPassInput) {
    toggleRegBtn.addEventListener('click', () => {
      const type = regPassInput.type === 'password' ? 'text' : 'password';
      regPassInput.type = type;
      toggleRegBtn.innerHTML = type === 'password' 
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
      const response = await api.register({ name, username, password, role });
      
      showToast(response.message || 'Registration successful. Please log in.', 'success');
      window.location.hash = '#/login';
    } catch (error) {
      showToast(error.message || 'Failed to register', 'error');
      regBtn.textContent = originalText;
      regBtn.disabled = false;
    }
  });
}
