/**
 * Workers Page (Admin Only)
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { escapeHtml } from '../utils/helpers.js';
import { getUser } from './login.js';

export function renderWorkers(container) {
  const currentUser = getUser();
  
  container.innerHTML = `
    <div class="page-header">
      <h2>Manage Workers</h2>
      <a href="#/workers/new" class="btn btn-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Register New Worker
      </a>
    </div>
    <div id="workers-table">
      <div class="loader">Loading workers…</div>
    </div>
  `;

  loadWorkers();

  async function loadWorkers() {
    try {
      const data = await api.getWorkers();
      const workers = data.workers || [];
      renderTable(workers);
    } catch (err) {
      showToast(err.message || 'Failed to load workers', 'error');
    }
  }

  function renderTable(workers) {
    const wrapper = document.getElementById('workers-table');
    if (!wrapper) return;

    wrapper.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Date Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${workers.map(w => {
              const isCurrentUser = w._id === currentUser?.id;
              const rowClass = isCurrentUser ? 'style="background-color: var(--color-surface);"' : '';
              return `
              <tr ${rowClass}>
                <td><strong>${escapeHtml(w.name || 'Unknown')}</strong></td>
                <td>@${escapeHtml(w.username)}</td>
                <td>
                  <span class="badge ${w.role === 'admin' ? 'success' : 'primary'}">
                    ${escapeHtml(w.role || 'worker').toUpperCase()}
                  </span>
                </td>
                <td>${w.createdAt ? new Date(w.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td>
                  ${!isCurrentUser ? `
                    <button class="btn-icon danger" data-delete-worker="${w._id}" title="Delete Worker">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  ` : '<span class="text-muted text-sm">Active User</span>'}
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Attach delete listeners
    wrapper.querySelectorAll('[data-delete-worker]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-worker');
        const worker = workers.find(w => w._id === id);
        
        showModal(
          'Delete Worker',
          `Are you sure you want to permanently delete <strong>@${escapeHtml(worker?.username || '')}</strong>? They will immediately lose access to the system.`,
          async () => {
            try {
              await api.deleteWorker(id);
              showToast('Worker deleted successfully', 'success');
              loadWorkers();
            } catch (err) {
              showToast(err.message || 'Failed to delete worker', 'error');
            }
          }
        );
      });
    });
  }
}
