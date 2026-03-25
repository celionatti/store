/**
 * Workers Page (Admin Only)
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { escapeHtml } from '../utils/helpers.js';
import { renderPagination } from '../components/pagination.js';
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

  let allWorkers = [];
  let currentPage = 1;
  const itemsPerPage = 10;

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

    if (workers.length === 0) {
      wrapper.innerHTML = '<div class="empty-state"><p>No workers found.</p></div>';
      return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = workers.slice(start, start + itemsPerPage);

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
            ${paginated.map(w => {
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
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-icon primary" data-info-worker="${w._id}" title="View Details">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    </button>
                    ${!isCurrentUser ? `
                      <button class="btn-icon danger" data-delete-worker="${w._id}" title="Delete Worker">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    ` : '<span class="text-muted text-sm">Active</span>'}
                  </div>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
      <div id="workers-pagination"></div>
    `;

    renderPagination(
      document.getElementById('workers-pagination'),
      workers.length,
      currentPage,
      itemsPerPage,
      (newPage) => {
        currentPage = newPage;
        renderTable(workers);
        window.scrollTo(0, 0);
      }
    );

    // Attach info listeners
    wrapper.querySelectorAll('[data-info-worker]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-info-worker');
        const worker = workers.find(w => w._id === id);
        showWorkerInfo(worker);
      });
    });

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

  function showWorkerInfo(worker) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    if (!overlay || !modal) return;

    modal.innerHTML = `
      <div class="modal-header">
        <h3>Worker Details</h3>
      </div>
      <div class="modal-body" style="text-align: left;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
          ${worker.image ? `<img src="${escapeHtml(worker.image)}" alt="Profile Image" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">` : `<div style="width: 64px; height: 64px; border-radius: 50%; background: var(--color-surface-hover); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--text-muted); border: 2px solid var(--border-color);">${escapeHtml(worker.name.charAt(0).toUpperCase())}</div>`}
          <div>
            <h4 style="margin: 0; font-size: 1.25rem;">${escapeHtml(worker.name)}</h4>
            <div class="text-muted" style="margin-top: 4px;">@${escapeHtml(worker.username)} &bull; ${escapeHtml(worker.role || 'worker').toUpperCase()}</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; background: var(--color-surface); padding: 1rem; border-radius: 8px;">
          <div>
            <strong class="text-muted text-sm" style="display:block; margin-bottom: 4px;">Email</strong>
            <div>${worker.email ? escapeHtml(worker.email) : 'N/A'}</div>
          </div>
          <div>
            <strong class="text-muted text-sm" style="display:block; margin-bottom: 4px;">Phone</strong>
            <div>${worker.phone ? escapeHtml(worker.phone) : 'N/A'}</div>
          </div>
        </div>
        
        <div style="margin-bottom: 1rem; background: var(--color-surface); padding: 1rem; border-radius: 8px;">
          <strong class="text-muted text-sm" style="display:block; margin-bottom: 4px;">Address</strong>
          <div>${worker.address ? escapeHtml(worker.address).replace(/\n/g, '<br/>') : 'N/A'}</div>
        </div>
        
        <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--text-color); font-size: 1rem;">Emergency / Parent Details</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: var(--color-surface); padding: 1rem; border-radius: 8px;">
          <div>
            <strong class="text-muted text-sm" style="display:block; margin-bottom: 4px;">Contact Name</strong>
            <div>${worker.parentName ? escapeHtml(worker.parentName) : 'N/A'}</div>
          </div>
          <div>
            <strong class="text-muted text-sm" style="display:block; margin-bottom: 4px;">Contact Phone</strong>
            <div>${worker.parentPhone ? escapeHtml(worker.parentPhone) : 'N/A'}</div>
          </div>
        </div>
      </div>
      <div class="modal-actions" style="justify-content: flex-end; margin-top: 1.5rem;">
        <button class="btn btn-primary" id="info-modal-close">Close</button>
      </div>
    `;

    overlay.classList.add('show');
    const close = () => {
      overlay.classList.remove('show');
      overlay.removeEventListener('click', bgClick);
    };
    document.getElementById('info-modal-close').addEventListener('click', close);
    const bgClick = (e) => { if (e.target === overlay) close(); };
    overlay.addEventListener('click', bgClick);
  }
}
