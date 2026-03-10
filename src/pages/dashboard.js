/**
 * Dashboard Page
 */
import { api } from '../api.js';
import { createStatsCard } from '../components/statsCard.js';
import { formatCurrency } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import Chart from 'chart.js/auto';

export function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Dashboard</h2>
    </div>
    <div class="info-note">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="color:var(--color-info); flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      <div>
        <strong>Inventory Insight:</strong> Primary value is your <strong>Investment</strong> (Cost Price). <strong>Potential</strong> is your expected Revenue (Selling Price).
      </div>
    </div>
    <div class="stats-grid" id="stats-grid">
      <div class="stat-card"><div class="loader">Loading…</div></div>
      <div class="stat-card"><div class="loader">Loading…</div></div>
      <div class="stat-card"><div class="loader">Loading…</div></div>
      <div class="stat-card"><div class="loader">Loading…</div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card">
        <h3>Monthly Revenue</h3>
        <div class="chart-container">
          <canvas id="revenue-chart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Sales by Category</h3>
        <div class="chart-container">
          <canvas id="category-chart"></canvas>
        </div>
      </div>
    </div>
    <div class="card mt-lg">
      <h3 style="margin-bottom: var(--space-md);">Low Stock Alerts</h3>
      <div id="low-stock-table"></div>
    </div>
  `;

  let revenueChart = null;
  let categoryChart = null;

  loadDashboard();

  async function loadDashboard() {
    try {
      const data = await api.getDashboard();

      // Stats cards
      const statsGrid = document.getElementById('stats-grid');
      if (statsGrid) {
        statsGrid.innerHTML = `
          ${createStatsCard('Total Products', data.totalProducts ?? 0, 'brand',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>'
          )}
          ${createStatsCard('Inventory Value', formatCurrency(data.investmentValue ?? 0), 'info',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>',
            `Potential: ${formatCurrency(data.potentialValue ?? 0)}`
          )}
          ${createStatsCard("Today's Sales", formatCurrency(data.todaySales ?? 0), 'success',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
          )}
          ${createStatsCard('Monthly Revenue', formatCurrency(data.monthlyRevenue ?? 0), 'warning',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'
          )}
        `;
      }

      // Revenue chart
      const revCtx = document.getElementById('revenue-chart');
      if (revCtx) {
        const months = data.revenueByMonth || [];
        revenueChart = new Chart(revCtx, {
          type: 'bar',
          data: {
            labels: months.map(m => m.label),
            datasets: [{
              label: 'Revenue',
              data: months.map(m => m.total),
              backgroundColor: 'rgba(99, 102, 241, 0.7)',
              borderColor: 'rgba(99, 102, 241, 1)',
              borderWidth: 1,
              borderRadius: 6,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: v => '$' + v.toLocaleString() },
                grid: { color: 'rgba(0,0,0,.05)' },
              },
              x: { grid: { display: false } },
            },
          },
        });
      }

      // Category chart
      const catCtx = document.getElementById('category-chart');
      if (catCtx) {
        const categories = data.categoryBreakdown || [];
        const colors = [
          '#6366f1', '#10b981', '#f59e0b', '#ef4444',
          '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
        ];
        categoryChart = new Chart(catCtx, {
          type: 'doughnut',
          data: {
            labels: categories.map(c => c.category || 'Uncategorized'),
            datasets: [{
              data: categories.map(c => c.count),
              backgroundColor: colors.slice(0, categories.length),
              borderWidth: 0,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 },
              },
            },
          },
        });
      }

      // Low stock table
      const lowStockEl = document.getElementById('low-stock-table');
      if (lowStockEl) {
        const lowStock = data.lowStockProducts || [];
        if (lowStock.length === 0) {
          lowStockEl.innerHTML = '<div class="empty-state"><p>No low-stock products — all good!</p></div>';
        } else {
          lowStockEl.innerHTML = `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>In Stock</th>
                    <th>Reorder Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${lowStock.map(p => `
                    <tr>
                      <td><strong>${p.name}</strong></td>
                      <td class="text-muted">${p.sku}</td>
                      <td>${p.quantity}</td>
                      <td>${p.reorderLevel}</td>
                      <td>${p.quantity <= 0
                          ? '<span class="badge badge-danger">Out of Stock</span>'
                          : '<span class="badge badge-warning">Low Stock</span>'
                        }</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard', 'error');
    }
  }

  // Cleanup
  return () => {
    if (revenueChart) revenueChart.destroy();
    if (categoryChart) categoryChart.destroy();
  };
}
