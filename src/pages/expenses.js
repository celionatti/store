/**
 * Expenses Page
 */
import { api } from '../api.js';
import { formatCurrency, formatDateTime, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export function renderExpenses(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Expense Management</h2>
    </div>
    
    <div class="card mb-lg">
      <h3 style="margin-bottom: var(--space-md);">Record New Expense</h3>
      <form id="expense-form">
        <div class="form-grid">
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label" for="ex-amount">Amount *</label>
            <input type="number" id="ex-amount" class="form-input" required min="0.01" step="0.01" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ex-category">Category *</label>
            <select id="ex-category" class="form-select" required>
              <option value="">Select category…</option>
              <option value="Rent">Rent</option>
              <option value="Utilities">Utilities</option>
              <option value="Salaries">Salaries</option>
              <option value="Inventory">Inventory</option>
              <option value="Marketing">Marketing</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ex-date">Date</label>
            <input type="date" id="ex-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label" for="ex-desc">Description (Optional)</label>
            <input type="text" id="ex-desc" class="form-input" placeholder="e.g. Monthly electricity bill" />
          </div>
        </div>
        <button type="submit" class="btn btn-primary mt-md" id="ex-submit">
          Record Expense
        </button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin-bottom: var(--space-md);">Recent Expenses</h3>
      <div id="expense-history">
        <div class="loader">Loading…</div>
      </div>
    </div>
  `;

  loadExpenses();

  const form = document.getElementById('expense-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ex-submit');
    btn.disabled = true;

    try {
      const payload = {
        amount: parseFloat(document.getElementById('ex-amount').value),
        category: document.getElementById('ex-category').value,
        description: document.getElementById('ex-desc').value,
        date: document.getElementById('ex-date').value,
      };

      await api.createExpense(payload);
      showToast('Expense recorded successfully', 'success');
      form.reset();
      document.getElementById('ex-date').value = new Date().toISOString().split('T')[0];
      loadExpenses();
    } catch (err) {
      showToast(err.message || 'Failed to record expense', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  async function loadExpenses() {
    try {
      const data = await api.getExpenses();
      const expenses = data.expenses || data || [];
      const wrapper = document.getElementById('expense-history');
      if (!wrapper) return;

      if (expenses.length === 0) {
        wrapper.innerHTML = '<div class="empty-state"><p>No expenses recorded yet.</p></div>';
        return;
      }

      wrapper.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${expenses.map(ex => `
                <tr>
                  <td><span class="badge badge-info">${escapeHtml(ex.category)}</span></td>
                  <td>${escapeHtml(ex.description || '—')}</td>
                  <td class="font-bold text-danger">${formatCurrency(ex.amount)}</td>
                  <td class="text-muted text-sm">${formatDateTime(ex.date)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      document.getElementById('expense-history').innerHTML = '<div class="empty-state"><p>Failed to load expenses.</p></div>';
    }
  }
}
