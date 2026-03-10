/**
 * Audit Logs Page (Admin Only)
 */
import { api } from '../api.js';
import { formatDateTime, escapeHtml } from '../utils/helpers.js';
import { renderPagination } from '../components/pagination.js';

export function renderAuditLogs(container) {
  let logs = [];
  let currentPage = 1;
  const logsPerPage = 15;

  container.innerHTML = `
    <div class="page-header">
      <h2>Activity History</h2>
    </div>
    <div class="card">
      <div id="audit-logs-content">
        <div class="loader">Loading history…</div>
      </div>
    </div>
  `;

  loadLogs();

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

    if (logs.length === 0) {
      wrapper.innerHTML = '<div class="empty-state"><p>No activity logs found.</p></div>';
      return;
    }

    const start = (currentPage - 1) * logsPerPage;
    const paginated = logs.slice(start, start + logsPerPage);

    wrapper.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>Details</th>
              <th style="text-align: right;">Date & Time</th>
            </tr>
          </thead>
          <tbody>
            ${paginated.map(log => `
              <tr>
                <td><span class="badge ${getBadgeClass(log.action)}">${escapeHtml(log.action.replace(/_/g, ' '))}</span></td>
                <td><strong>${escapeHtml(log.username)}</strong></td>
                <td class="text-sm">${escapeHtml(log.details)}</td>
                <td class="text-muted text-sm" style="text-align: right;">${formatDateTime(log.timestamp)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div id="audit-pagination"></div>
    `;

    renderPagination(
      document.getElementById('audit-pagination'),
      logs.length,
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
