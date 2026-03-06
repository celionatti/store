/**
 * Reports Page
 */
import { api } from '../api.js';
import { createStatsCard } from '../components/statsCard.js';
import { formatCurrency, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export function renderReports(container) {
  // Default date range: last 30 days
  const today = new Date();
  const thirtyAgo = new Date(today);
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);

  const toStr = today.toISOString().split('T')[0];
  const fromStr = thirtyAgo.toISOString().split('T')[0];

  container.innerHTML = `
    <div class="page-header">
      <h2>Reports</h2>
    </div>
    <div class="card mb-lg">
      <h3 style="margin-bottom: var(--space-md);">Date Range</h3>
      <div class="form-row" style="flex-wrap: wrap;">
        <div class="form-group" style="flex:1; min-width: 140px;">
          <label class="form-label" for="rp-from">From</label>
          <input type="date" id="rp-from" class="form-input" value="${fromStr}" />
        </div>
        <div class="form-group" style="flex:1; min-width: 140px;">
          <label class="form-label" for="rp-to">To</label>
          <input type="date" id="rp-to" class="form-input" value="${toStr}" />
        </div>
        <div style="display: flex; gap: var(--space-md); flex-wrap: wrap; margin-bottom: var(--space-lg); width: 100%;">
          <button class="btn btn-primary" id="rp-apply" style="flex: 1; min-width: 120px;">
            Apply
          </button>
          <button class="btn btn-outline" id="rp-export" style="flex: 1; min-width: 120px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>
    </div>

    <div class="stats-grid" id="report-stats">
      <div class="stat-card"><div class="loader">Loading…</div></div>
      <div class="stat-card"><div class="loader">Loading…</div></div>
      <div class="stat-card"><div class="loader">Loading…</div></div>
    </div>

    <div class="card mt-lg">
      <h3 style="margin-bottom: var(--space-md);">Top Selling Products</h3>
      <div id="top-products">
        <div class="loader">Loading…</div>
      </div>
    </div>
  `;

  let currentSales = [];

  // Load initial report
  loadReport(fromStr, toStr);

  document.getElementById('rp-apply')?.addEventListener('click', () => {
    const from = document.getElementById('rp-from').value;
    const to = document.getElementById('rp-to').value;
    if (!from || !to) {
      showToast('Please select both dates', 'warning');
      return;
    }
    loadReport(from, to);
  });

  document.getElementById('rp-export')?.addEventListener('click', () => {
    if (currentSales.length === 0) {
      showToast('No data to export', 'warning');
      return;
    }
    const from = document.getElementById('rp-from').value;
    const to = document.getElementById('rp-to').value;
    exportToCSV(currentSales, `sales_report_${from}_to_${to}.csv`);
  });

  async function exportToCSV(data, filename) {
    if (!data || data.length === 0) return;
    
    const headers = ['Date', 'Product', 'Quantity', 'Unit Price', 'Cost Price', 'Total', 'Profit'];
    const rows = data.map(s => [
      new Date(s.createdAt).toLocaleDateString(),
      s.productName,
      s.quantity,
      s.unitPrice,
      s.costPrice,
      s.totalAmount,
      s.profit
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function loadReport(from, to) {
    try {
      const [salesData, expensesData] = await Promise.all([
        api.getSales(from, to),
        api.getExpenses(from, to)
      ]);

      const sales = salesData.sales || salesData || [];
      const expenses = expensesData.expenses || expensesData || [];
      currentSales = sales;

      let totalRevenue = 0;
      let totalGrossProfit = 0;
      let totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      let totalSalesCount = sales.length;
      const productSales = {};

      for (const s of sales) {
        totalRevenue += s.totalAmount || 0;
        totalGrossProfit += s.profit || 0;
        const key = s.productName || s.productId;
        if (!productSales[key]) {
          productSales[key] = { name: s.productName || '—', quantity: 0, revenue: 0 };
        }
        productSales[key].quantity += s.quantity;
        productSales[key].revenue += s.totalAmount || 0;
      }

      const netProfit = totalGrossProfit - totalExpenses;

      // Stats cards
      const statsEl = document.getElementById('report-stats');
      if (statsEl) {
        statsEl.innerHTML = `
          ${createStatsCard('Total Revenue', formatCurrency(totalRevenue), 'success',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
          )}
          ${createStatsCard('Gross Profit', formatCurrency(totalGrossProfit), 'brand',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
          )}
          ${createStatsCard('Expenses', formatCurrency(totalExpenses), 'danger',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
          )}
          ${createStatsCard('Net Profit', formatCurrency(netProfit), 'info',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1L12 23M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
          )}
        `;
      }

      // Top products
      const topList = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const topEl = document.getElementById('top-products');
      if (topEl) {
        if (topList.length === 0) {
          topEl.innerHTML = '<div class="empty-state"><p>No sales data for this period.</p></div>';
        } else {
          topEl.innerHTML = `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${topList.map((p, i) => `
                    <tr>
                      <td class="text-muted">${i + 1}</td>
                      <td><strong>${escapeHtml(p.name)}</strong></td>
                      <td>${p.quantity}</td>
                      <td class="font-bold">${formatCurrency(p.revenue)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to load report', 'error');
    }
  }
}
