/**
 * Dashboard Page
 */
import { api } from '../api.js';
import { createStatsCard } from '../components/statsCard.js';
import { formatCurrency, getCurrencySymbol } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import Chart from 'chart.js/auto';
import { startPolling } from '../utils/polling.js';

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
        <div class="flex flex-between flex-align-center mb-md">
          <h3 style="margin: 0;">Revenue Trend</h3>
          <div class="tab-switcher" id="revenue-tabs">
            <button class="tab-btn active" data-period="monthly">Monthly</button>
            <button class="tab-btn" data-period="weekly">Weekly</button>
            <button class="tab-btn" data-period="daily">Daily</button>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="revenue-chart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Inventory Distribution</h3>
        <div class="chart-container">
          <canvas id="category-chart"></canvas>
        </div>
      </div>
    </div>
    <div class="card mt-lg">
      <div class="flex flex-between flex-align-center mb-md">
        <h3 style="margin: 0;">Low Stock Alerts</h3>
        <a href="#/stock-alerts" class="btn btn-outline btn-sm">View All</a>
      </div>
      <div id="low-stock-table"></div>
    </div>
  `;

  let revenueChart = null;
  let categoryChart = null;

  const stopPolling = startPolling(loadDashboard, 15000);

  async function loadDashboard() {
    try {
      const data = await api.getDashboard();
      const symbol = getCurrencySymbol();

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

      // Revenue chart tabs
      const revTabs = document.getElementById('revenue-tabs');
      if (revTabs) {
        revTabs.querySelectorAll('.tab-btn').forEach(btn => {
          btn.onclick = (e) => {
            const period = e.currentTarget.getAttribute('data-period');
            revTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            updateRevenueChart(period);
          };
        });
      }

      const revCtx = document.getElementById('revenue-chart')?.getContext('2d');
      if (revCtx) {
        if (revenueChart) {
          revenueChart.data.labels = data.revenueByMonth.map(m => m.label);
          revenueChart.data.datasets[0].data = data.revenueByMonth.map(m => m.total);
          revenueChart.update('none'); // Update without animation for smoother polling
        } else {
          initRevenueChart(revCtx, data.revenueByMonth);
        }
      }

      async function updateRevenueChart(period) {
        try {
          const newData = await api.getDashboard(period);
          if (revenueChart) {
            revenueChart.data.labels = newData.revenueByMonth.map(m => m.label);
            revenueChart.data.datasets[0].data = newData.revenueByMonth.map(m => m.total);
            revenueChart.update();
          }
        } catch (err) {
          showToast('Failed to update chart', 'error');
        }
      }

      function initRevenueChart(ctx, dataPoints) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
        const symbol = getCurrencySymbol();

        revenueChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: dataPoints.map(m => m.label),
            datasets: [{
              label: 'Revenue',
              data: dataPoints.map(m => m.total),
              backgroundColor: '#6366f1',
              borderRadius: 6,
              hoverBackgroundColor: '#4f46e5',
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              legend: { display: false },
              tooltip: {
                backgroundColor: isDark ? '#1e293b' : '#fff',
                titleColor: isDark ? '#f8fafc' : '#0f172a',
                bodyColor: isDark ? '#94a3b8' : '#64748b',
                borderColor: gridColor,
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                  label: (context) => {
                    const val = context.parsed.y ?? 0;
                    return `Revenue: ${symbol}${val.toLocaleString()}`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { 
                  color: textColor,
                  callback: v => symbol + (v >= 1000 ? (v / 1000) + 'k' : v)
                },
                grid: { 
                  color: gridColor,
                  drawBorder: false
                },
              },
              x: { 
                ticks: { color: textColor },
                grid: { display: false } 
              },
            },
          },
        });
      }

      // Category chart
      const catCtx = document.getElementById('category-chart');
      if (catCtx) {
        const categories = data.categoryBreakdown || [];
        if (categoryChart) {
          categoryChart.data.labels = categories.map(c => c.category || 'Uncategorized');
          categoryChart.data.datasets[0].data = categories.map(c => c.count);
          categoryChart.update('none');
        } else {
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
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: 'transparent',
                hoverOffset: 10
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '70%',
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { 
                    padding: 20, 
                    usePointStyle: true, 
                    pointStyle: 'circle',
                    font: { size: 12 }
                  },
                },
              },
            },
          });
        }
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
    stopPolling();
    if (revenueChart) revenueChart.destroy();
    if (categoryChart) categoryChart.destroy();
  };
}
