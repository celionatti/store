/**
 * Customer Purchase History Page
 */
import { api } from '../api.js';
import { formatCurrency, formatDateTime, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export function renderCustomerHistory(container, params = {}) {
  const customerId = params.id;
  if (!customerId) {
    container.innerHTML = '<div class="empty-state">No customer specified.</div>';
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="flex flex-align-center gap-md">
        <a href="#/customers" class="btn-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </a>
        <h2 id="cust-history-title">Customer History</h2>
      </div>
    </div>
    <div id="history-content">
      <div class="loader">Loading history…</div>
    </div>
  `;

  loadHistory();

  async function loadHistory() {
    try {
      // Fetch all sales and filter client-side for now, unless API supports it
      const [salesData, customersData] = await Promise.all([
        api.getSales(),
        api.getCustomers()
      ]);
      
      const customer = (customersData.customers || []).find(c => c._id === customerId);
      if (customer) {
        document.getElementById('cust-history-title').textContent = `${customer.name}'s History`;
      }

      // Note: This is an optimization point. Ideally the API would support ?customerId=...
      // For now, filtering client-side if the data is small enough.
      const sales = (salesData.sales || []).filter(s => s.customerId === customerId);
      
      renderTable(sales);
    } catch (err) {
      showToast('Failed to load history', 'error');
    }
  }

  function renderTable(sales) {
    const wrapper = document.getElementById('history-content');
    if (!wrapper) return;

    if (sales.length === 0) {
      wrapper.innerHTML = '<div class="empty-state">No purchases found for this customer.</div>';
      return;
    }

    wrapper.innerHTML = `
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sales.map(s => `
                <tr>
                  <td>${formatDateTime(s.createdAt)}</td>
                  <td><strong>${escapeHtml(s.productName)}</strong></td>
                  <td>${s.quantity}</td>
                  <td class="font-bold">${formatCurrency(s.totalAmount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}
