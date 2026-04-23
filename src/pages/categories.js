/**
 * Categories Management Page
 */
import { api } from '../api.js';
import { escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export function renderCategories(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Categories</h2>
    </div>

    <div class="card mb-lg">
      <h3 style="margin-bottom: var(--space-md);">Add New Category</h3>
      <form id="category-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="cat-name">Category Name *</label>
            <input type="text" id="cat-name" class="form-input" required placeholder="e.g. Electronics" />
          </div>
          <div class="form-group">
            <label class="form-label" for="cat-desc">Description (Optional)</label>
            <input type="text" id="cat-desc" class="form-input" placeholder="Brief description of this category" />
          </div>
        </div>
        <button type="submit" class="btn btn-primary mt-md" id="cat-submit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Category
        </button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin-bottom: var(--space-md);">All Categories</h3>
      <div id="categories-list">
        <div class="loader">Loading…</div>
      </div>
    </div>
  `;

  loadCategories();

  const form = document.getElementById('category-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('cat-submit');
    btn.disabled = true;
    btn.textContent = 'Adding…';

    try {
      const payload = {
        name: document.getElementById('cat-name').value.trim(),
        description: document.getElementById('cat-desc').value.trim(),
      };

      await api.createCategory(payload);
      showToast('Category added successfully', 'success');
      form.reset();
      loadCategories();
    } catch (err) {
      showToast(err.message || 'Failed to add category', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Category
      `;
    }
  });

  async function loadCategories() {
    try {
      const data = await api.getCategories();
      const categories = data.categories || data || [];
      const wrapper = document.getElementById('categories-list');
      if (!wrapper) return;

      if (categories.length === 0) {
        wrapper.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
            <p>No categories yet. Add your first category above.</p>
          </div>
        `;
        return;
      }

      wrapper.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${categories.map(cat => `
                <tr>
                  <td data-label="Name">
                    <strong>${escapeHtml(cat.name)}</strong>
                  </td>
                  <td data-label="Description" class="text-muted">${escapeHtml(cat.description || '—')}</td>
                  <td data-label="Actions" style="text-align: right;">
                    <button class="btn-icon danger" data-delete="${cat._id}" title="Delete Category">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Delete handlers
      wrapper.querySelectorAll('button[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.delete;
          showModal(
            'Delete Category',
            'Are you sure you want to delete this category? Products using it will not be affected but will show the old category name.',
            async () => {
              try {
                await api.deleteCategory(id);
                showToast('Category deleted successfully', 'success');
                loadCategories();
              } catch (err) {
                showToast(err.message || 'Failed to delete category', 'error');
              }
            }
          );
        });
      });
    } catch (err) {
      const wrapper = document.getElementById('categories-list');
      if (wrapper) {
        wrapper.innerHTML = '<div class="empty-state"><p>Failed to load categories.</p></div>';
      }
    }
  }
}
