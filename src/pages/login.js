/**
 * Login Page
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderBottomNav } from '../components/bottomNav.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 100px auto; padding: var(--space-xl);" class="card">
      <div style="text-align: center; margin-bottom: var(--space-xl);">
        <h2 style="margin-bottom: var(--space-xs);">Welcome Back</h2>
        <p class="text-muted">Sign in to manage your store</p>
      </div>
      <form id="login-form">
        <div class="form-group">
          <label class="form-label" for="username">Username</label>
          <input type="text" id="username" class="form-input" placeholder="admin" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <div style="position: relative;">
            <input type="password" id="password" class="form-input" placeholder="••••••••" required style="padding-right: 40px;" />
            <button type="button" id="toggle-password" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px; display: flex;" aria-label="Toggle password visibility">
              <svg id="eye-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" id="login-btn" style="width: 100%;">
          Sign In
        </button>
        <div style="text-align: center; margin-top: var(--space-md);">
          <small class="text-muted">Don't have an account? <a href="#/register">Create one</a></small>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');
  const toggleBtn = document.getElementById('toggle-password');
  const passInput = document.getElementById('password');

  if (toggleBtn && passInput) {
    toggleBtn.addEventListener('click', () => {
      const type = passInput.type === 'password' ? 'text' : 'password';
      passInput.type = type;
      toggleBtn.innerHTML = type === 'password' 
        ? '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
        : '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Signing in...';
    loginBtn.disabled = true;

    try {
      const response = await api.login({ username: user, password: pass });
      
      // Store token and user data
      localStorage.setItem('store_auth', response.token);
      localStorage.setItem('store_user', JSON.stringify(response.user));
      
      showToast('Welcome back, ' + response.user.name + '!', 'success');
      // Re-render navigation for role-based visibility
      renderSidebar();
      renderBottomNav();
      window.location.hash = '#/';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (error) {
      showToast(error.message || 'Invalid username or password', 'error');
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  });
}

export function isAuthenticated() {
  return !!localStorage.getItem('store_auth');
}

export function getUser() {
  try {
    const data = localStorage.getItem('store_user');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export async function logout() {
  try {
    await api.logout();
  } catch (e) {
    console.error('Logout failed on server', e);
  }
  localStorage.removeItem('store_auth');
  localStorage.removeItem('store_user');
  // Re-render navigation to hide protected links
  renderSidebar();
  renderBottomNav();
  window.location.hash = '#/login';
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
