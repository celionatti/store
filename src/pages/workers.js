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
  let allLocations = [];
  
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

  loadInitialData();

  async function loadInitialData() {
    try {
      const [workerData, locData] = await Promise.all([
        api.getWorkers(),
        api.getLocations()
      ]);
      allWorkers = workerData.workers || [];
      allLocations = locData.locations || locData || [];
      renderTable(allWorkers);
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
              <th>Assigned Store</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginated.map(w => {
              const isCurrentUser = w._id === currentUser?.id;
              const rowClass = isCurrentUser ? 'style="background-color: var(--color-bg);"' : '';
              const loc = allLocations.find(l => String(l._id) === String(w.locationId));
              return `
              <tr ${rowClass}>
                <td data-label="Name"><strong>${escapeHtml(w.name || 'Unknown')}</strong></td>
                <td data-label="Username">@${escapeHtml(w.username)}</td>
                <td data-label="Assigned Store">
                  <div class="flex items-center gap-xs">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" class="text-muted"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                    ${loc ? escapeHtml(loc.name) : '<span class="text-danger text-xs">Unassigned</span>'}
                  </div>
                </td>
                <td data-label="Role">
                  <span class="badge ${w.role === 'admin' ? 'success' : 'primary'}">
                    ${escapeHtml(w.role || 'worker').toUpperCase()}
                  </span>
                </td>
                <td data-label="Actions">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-icon primary" data-info-worker="${w._id}" title="Edit Assignment / Details">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
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

    wrapper.querySelectorAll('[data-info-worker]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-info-worker');
        const worker = workers.find(w => w._id === id);
        showEditWorkerModal(worker);
      });
    });

    wrapper.querySelectorAll('[data-delete-worker]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-worker');
        const worker = workers.find(w => w._id === id);
        showModal(
          'Delete Worker',
          `Are you sure you want to permanently delete <strong>@${escapeHtml(worker?.username || '')}</strong>?`,
          async () => {
            try {
              await api.deleteWorker(id);
              showToast('Worker deleted', 'success');
              loadInitialData();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        );
      });
    });
  }

  function showEditWorkerModal(worker) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    if (!overlay || !modal) return;

    modal.innerHTML = `
      <div class="modal-header">
        <h3>Edit Worker Assignment</h3>
      </div>
      <div class="modal-body" style="text-align: left;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--color-brand-light); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            ${escapeHtml(worker.name.charAt(0).toUpperCase())}
          </div>
          <div>
            <h4 style="margin: 0;">${escapeHtml(worker.name)}</h4>
            <div class="text-muted text-sm">@${escapeHtml(worker.username)}</div>
          </div>
        </div>

        <form id="edit-worker-form">
          <div class="form-group mb-md">
            <label class="form-label">Assigned Store</label>
            <select id="ew-location" class="form-select" required>
              <option value="">Select a Store</option>
              ${allLocations.map(l => `
                <option value="${l._id}" ${String(l._id) === String(worker.locationId) ? 'selected' : ''}>
                  ${escapeHtml(l.name)} ${l.isDefault ? '(Default)' : ''}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group mb-md">
            <label class="form-label">System Role</label>
            <select id="ew-role" class="form-select" required ${String(worker._id) === String(currentUser?.id) ? 'disabled' : ''}>
              <option value="worker" ${worker.role === 'worker' ? 'selected' : ''}>Worker</option>
              <option value="manager" ${worker.role === 'manager' ? 'selected' : ''}>Manager</option>
              <option value="admin" ${worker.role === 'admin' ? 'selected' : ''}>Administrator</option>
            </select>
            ${String(worker._id) === String(currentUser?.id) ? '<p class="text-xs text-info mt-xs">You cannot change your own role.</p>' : ''}
          </div>
          <div class="modal-actions" style="margin-top: 2rem;">
            <button type="button" class="btn btn-outline" id="ew-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary" id="ew-submit">Save Changes</button>
          </div>
        </form>
      </div>
    `;

    overlay.classList.add('show');
    const close = () => overlay.classList.remove('show');

    document.getElementById('ew-cancel').onclick = close;
    
    document.getElementById('edit-worker-form').onsubmit = async (e) => {
      e.preventDefault();
      const locationId = document.getElementById('ew-location').value;
      const role = document.getElementById('ew-role').value;
      
      const submitBtn = document.getElementById('ew-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      try {
        await api.updateWorker(worker._id, { locationId, role });
        showToast('Worker updated successfully', 'success');
        close();
        loadInitialData(); // Refresh list
      } catch (err) {
        showToast(err.message || 'Failed to update', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
      }
    };
  }
}
