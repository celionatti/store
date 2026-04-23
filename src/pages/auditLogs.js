/**
 * Audit Logs Page (Admin Only)
 */
import { api } from '../api.js';
import { formatDateTime, escapeHtml } from '../utils/helpers.js';
import { renderPagination } from '../components/pagination.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderAuditLogs(container) {
  let logs = [];
  let currentPage = 1;
  const logsPerPage = 15;

  container.innerHTML = `
    <div class="page-header">
      <h2>Activity History</h2>
      <div class="flex gap-sm">
        <select id="al-filter-action" class="form-select" style="max-width: 180px;">
          <option value="">All Actions</option>
          <option value="SALE">Sales</option>
          <option value="CREATE">Creation</option>
          <option value="UPDATE">Updates</option>
          <option value="DELETE">Deletions</option>
          <option value="LOGIN">Logins</option>
        </select>
      </div>
    </div>
    <div class="card mb-lg" style="background: var(--color-danger-bg); border-color: rgba(239, 68, 68, 0.2);">
      <h3 style="margin-bottom: var(--space-md); color: var(--color-danger);">Database Cleanup</h3>
      <p class="text-sm text-muted mb-md">Remove old activity records to save storage space. Warning: This cannot be undone.</p>
      <div class="form-row" style="align-items: center;">
        <select id="al-bulk-delete-select" class="form-select" style="max-width: 200px;">
          <option value="0.25">Older than 1 Week</option>
          <option value="1">Older than 1 Month</option>
          <option value="3">Older than 3 Months</option>
          <option value="6">Older than 6 Months</option>
        </select>
        <button id="al-bulk-delete-btn" class="btn btn-danger">Clear History</button>
      </div>
    </div>

    <div class="card">
      <div id="audit-logs-content">
        <div class="loader">Loading history…</div>
      </div>
    </div>
  `;

  loadLogs();

  const bulkBtn = document.getElementById('al-bulk-delete-btn');
  bulkBtn?.addEventListener('click', () => {
    const months = parseFloat(document.getElementById('al-bulk-delete-select').value);
    const date = new Date();
    
    if (months === 0.25) {
      date.setDate(date.getDate() - 7); // 1 week
    } else {
      date.setMonth(date.getMonth() - months);
    }
    
    const beforeStr = date.toISOString().split('T')[0];

    showModal(
      'Clear Activity History',
      `Are you sure you want to permanently delete all logs recorded before <strong>${beforeStr}</strong>?`,
      async () => {
        try {
          const res = await api.bulkDeleteAuditLogs(beforeStr);
          showToast(res.message || 'Old logs cleared successfully', 'success');
          loadLogs();
        } catch (err) {
          showToast(err.message || 'Failed to clear history', 'error');
        }
      }
    );
  });

  const filterSelect = document.getElementById('al-filter-action');
  filterSelect?.addEventListener('change', () => {
    currentPage = 1;
    renderTable();
  });

  async function loadLogs() {
    try {
      const data = await api.getAuditLogs();
      logs = data.logs || [];
      renderTable();
    } catch (err) {
      document.getElementById('audit-logs-content').innerHTML = `
        <div class="empty-state">
          <p class="text-danger">Failed to load activity logs.</p>
        </div>
      `;
    }
  }

  function renderTable() {
    const wrapper = document.getElementById('audit-logs-content');
    if (!wrapper) return;

    const actionFilter = document.getElementById('al-filter-action')?.value || '';
    const filteredLogs = actionFilter 
      ? logs.filter(l => l.action.includes(actionFilter))
      : logs;

    if (filteredLogs.length === 0) {
      wrapper.innerHTML = '<div class="empty-state"><p>No activity logs match your filter.</p></div>';
      return;
    }

    const start = (currentPage - 1) * logsPerPage;
    const paginated = filteredLogs.slice(start, start + logsPerPage);

    wrapper.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>Store</th>
              <th>Details</th>
              <th style="text-align: right;">Date & Time</th>
            </tr>
          </thead>
          <tbody>
            ${paginated.map(log => `
              <tr>
                <td data-label="Action"><span class="badge ${getBadgeClass(log.action)}">${escapeHtml(log.action.replace(/_/g, ' '))}</span></td>
                <td data-label="User">
                  <strong>${escapeHtml(log.username)}</strong>
                  ${log.role ? `<br><span class="badge ${log.role === 'admin' ? 'badge-danger' : log.role === 'manager' ? 'badge-warning' : 'badge-info'}" style="font-size:10px; opacity:0.8">${escapeHtml(log.role)}</span>` : ''}
                </td>
                <td data-label="Store"><span class="text-sm font-bold">${escapeHtml(log.storeName || 'Default Store')}</span></td>
                <td data-label="Details" class="text-sm">${escapeHtml(log.details)}</td>
                <td data-label="Date & Time" class="text-muted text-sm" style="text-align: right;">${formatDateTime(log.timestamp)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div id="audit-pagination"></div>
    `;

    renderPagination(
      document.getElementById('audit-pagination'),
      filteredLogs.length,
      currentPage,
      logsPerPage,
      (newPage) => {
        currentPage = newPage;
        renderTable();
      }
    );
  }

  function getBadgeClass(action) {
    if (action.includes('SALE')) return 'badge-success';
    if (action.includes('DELETE')) return 'badge-danger';
    if (action.includes('CREATE')) return 'badge-brand';
    if (action.includes('UPDATE')) return 'badge-warning';
    return 'badge-info';
  }
}
