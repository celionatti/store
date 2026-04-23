/**
 * Locations & Stores Management Page
 */
import { api } from '../api.js';
import { escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export function renderLocations(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Locations & Stores</h2>
    </div>

    <div class="card mb-lg">
      <h3 style="margin-bottom: var(--space-md);">Add New Location</h3>
      <form id="location-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="loc-name">Store Name *</label>
            <input type="text" id="loc-name" class="form-input" required placeholder="e.g. Main Warehouse" />
          </div>
          <div class="form-group">
            <label class="form-label" for="loc-address">Address & Details (Optional)</label>
            <input type="text" id="loc-address" class="form-input" placeholder="Physical address or notes..." />
          </div>
        </div>
        <button type="submit" class="btn btn-primary mt-md" id="loc-submit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Location
        </button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin-bottom: var(--space-md);">Registered Stores</h3>
      <div id="locations-list">
        <div class="loader">Loading…</div>
      </div>
    </div>
  `;

  let editingLocId = null;

  loadLocations();

  const form = document.getElementById('location-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loc-submit');
    btn.disabled = true;
    btn.textContent = editingLocId ? 'Updating…' : 'Adding…';

    try {
      const payload = {
        name: document.getElementById('loc-name').value.trim(),
        address: document.getElementById('loc-address').value.trim(),
        status: 'active'
      };

      if (editingLocId) {
        payload.id = editingLocId;
        await api.updateLocation(payload);
        showToast('Location updated successfully', 'success');
        editingLocId = null;
      } else {
        await api.createLocation(payload);
        showToast('Location added successfully', 'success');
      }

      form.reset();
      loadLocations();
    } catch (err) {
      showToast(err.message || 'Failed to add/update location', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Location
      `;
    }
  });

  async function loadLocations() {
    try {
      const data = await api.getLocations();
      const locations = data.locations || data || [];
      const wrapper = document.getElementById('locations-list');
      if (!wrapper) return;

      if (locations.length === 0) {
        wrapper.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <p>No locations yet. Added your first store above.</p>
          </div>
        `;
        return;
      }

      wrapper.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Store Name</th>
                <th>Address</th>
                <th>Status</th>
                <th style="text-align: right;">Default Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${locations.map(loc => `
                <tr>
                  <td data-label="Store Name">
                    <strong>${escapeHtml(loc.name)}</strong>
                  </td>
                  <td data-label="Address" class="text-muted">${escapeHtml(loc.address || '—')}</td>
                  <td data-label="Status">
                     <span class="badge ${loc.status === 'active' ? 'badge-success' : 'badge-danger'}">
                       ${loc.status === 'active' ? 'Active' : 'Disabled'}
                     </span>
                  </td>
                  <td data-label="Default Status" style="text-align: right;">
                    ${loc.isDefault ? '<span class="badge badge-primary">Default Store</span>' : '<button class="btn btn-outline btn-sm" data-makedefault="'+loc._id+'">Set Default</button>'}
                  </td>
                  <td data-label="Actions" style="text-align: right;">
                    <div class="flex gap-sm" style="justify-content: flex-end;">
                      <button class="btn-icon" data-edit-loc='${escapeHtml(JSON.stringify(loc))}' title="Edit Store">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button class="btn-icon danger" data-delete-loc="${loc._id}" title="Delete Store">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Set default handlers
      wrapper.querySelectorAll('button[data-makedefault]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const id = btn.dataset.makedefault;
          try {
             await api.updateLocation({ id, isDefault: true });
             showToast('Default store updated successfully', 'success');
             loadLocations();
          } catch(err) {
             showToast(err.message || 'Failed to update location', 'error');
             btn.disabled = false;
          }
        });
      });

      // Edit handlers
      wrapper.querySelectorAll('button[data-edit-loc]').forEach(btn => {
        btn.addEventListener('click', () => {
          const locInfo = JSON.parse(btn.dataset.editLoc);
          document.getElementById('loc-name').value = locInfo.name;
          document.getElementById('loc-address').value = locInfo.address || '';
          editingLocId = locInfo._id;
          
          const submitBtn = document.getElementById('loc-submit');
          submitBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Update Location
          `;
          
          document.getElementById('location-form').scrollIntoView({ behavior: 'smooth' });
        });
      });

      // Delete handlers
      wrapper.querySelectorAll('button[data-delete-loc]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.deleteLoc;
          showModal(
            'Delete Store',
            'Are you sure you want to delete this store? This action cannot be undone and may affect associated items.',
            async () => {
              try {
                await api.deleteLocation(id);
                showToast('Store deleted successfully', 'success');
                loadLocations();
              } catch (err) {
                showToast(err.message || 'Failed to delete store', 'error');
              }
            }
          );
        });
      });
    } catch (err) {
      const wrapper = document.getElementById('locations-list');
      if (wrapper) {
        wrapper.innerHTML = '<div class="empty-state"><p>Failed to load locations.</p></div>';
      }
    }
  }
}
