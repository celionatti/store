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
      <a href="#/customers/new" class="btn btn-primary" id="add-customer-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Customer
      </a>
    </div>
    <div id="customers-table">
      <div class="loader">Loading customers…</div>
    </div>
  `;

  let allCustomers = [];
  let currentPage = 1;
  const itemsPerPage = 10;

  loadCustomers();

  async function loadCustomers() {
    try {
      const data = await api.getCustomers();
      const customers = data.customers || [];
      renderTable(customers);
    } catch (err) {
      showToast(err.message || 'Failed to load customers', 'error');
    }
  }

  function renderTable(customers) {
    const wrapper = document.getElementById('customers-table');
    if (!wrapper) return;

    if (customers.length === 0) {
      wrapper.innerHTML = '<div class="empty-state"><p>No customers found.</p></div>';
      return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = customers.slice(start, start + itemsPerPage);

    wrapper.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Total Spent</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginated.map(c => `
              <tr>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${escapeHtml(c.email)}</td>
                <td>${escapeHtml(c.phone)}</td>
                <td class="font-bold">₦${c.totalSpent.toLocaleString()}</td>
                <td>
                  <button class="btn-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div id="customers-pagination"></div>
    `;

    renderPagination(
      document.getElementById('customers-pagination'),
      customers.length,
      currentPage,
      itemsPerPage,
      (newPage) => {
        currentPage = newPage;
        renderTable(customers);
        window.scrollTo(0, 0);
      }
    );
  }
}
