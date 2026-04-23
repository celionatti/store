/**
 * Customers Page
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/helpers.js';
import { renderPagination } from '../components/pagination.js';

export function renderCustomers(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Customers</h2>
      <div class="flex gap-sm items-center">
        <div class="search-box">
          <input type="text" id="cust-search" placeholder="Search by name, phone..." class="form-input" style="width: 250px;" />
        </div>
        <a href="#/customers/new" class="btn btn-primary" id="add-customer-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Customer
        </a>
      </div>
    </div>
    <div id="customers-table">
      <div class="loader">Loading customers…</div>
    </div>
  `;

  let allCustomers = [];
  let currentPage = 1;
  const itemsPerPage = 10;
  let searchTimeout = null;

  loadCustomers();

  async function loadCustomers() {
    try {
      const search = document.getElementById('cust-search')?.value || '';
      const data = await api.getCustomers(search);
      allCustomers = data.customers || [];
      renderTable();
    } catch (err) {
      showToast(err.message || 'Failed to load customers', 'error');
    }
  }

  // Handle Search
  document.getElementById('cust-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadCustomers();
    }, 400);
  });

  function renderTable() {
    const wrapper = document.getElementById('customers-table');
    if (!wrapper) return;

    if (allCustomers.length === 0) {
      wrapper.innerHTML = '<div class="empty-state"><p>No customers found.</p></div>';
      return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = allCustomers.slice(start, start + itemsPerPage);

    wrapper.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name & Type</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Balance</th>
              <th>Total Spent</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginated.map(c => {
              const locationCount = (c.locationIds || []).length;
              const isGlobal = !!c.isGlobal;
              const isLinked = !isGlobal && locationCount > 1;

              return `
              <tr>
                <td data-label="Name & Type">
                  <div class="flex flex-col gap-xs">
                    <strong>${escapeHtml(c.name)}</strong>
                    <div class="flex gap-xs">
                      ${isGlobal ? '<span class="badge primary text-xs">🌐 GLOBAL</span>' : ''}
                      ${isLinked ? '<span class="badge success text-xs">🔗 LINKED</span>' : ''}
                    </div>
                  </div>
                </td>
                <td data-label="Email">${escapeHtml(c.email || '—')}</td>
                <td data-label="Phone">${escapeHtml(c.phone || '—')}</td>
                <td data-label="Balance" class="font-bold ${c.balance < 0 ? 'text-danger' : (c.balance > 0 ? 'text-success' : '')}">
                  ${c.balance < 0 ? '-' : ''}₦${Math.abs(c.balance || 0).toLocaleString()}
                </td>
                <td data-label="Total Spent" class="font-bold">₦${(c.totalSpent || 0).toLocaleString()}</td>
                <td data-label="Actions">
                  <div class="flex gap-sm">
                    <a href="#/customers/history/${c._id}" class="btn-icon" title="Purchase History">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </a>
                    <a href="#/customers/edit/${c._id}" class="btn-icon" title="Edit Customer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </a>
                  </div>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
      <div id="customers-pagination"></div>
    `;

    renderPagination(
      document.getElementById('customers-pagination'),
      allCustomers.length,
      currentPage,
      itemsPerPage,
      (newPage) => {
        currentPage = newPage;
        renderTable();
        window.scrollTo(0, 0);
      }
    );
  }
}
