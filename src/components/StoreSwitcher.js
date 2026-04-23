/**
 * Store Switcher Component
 * Appears in the topbar to allow switching between locations (Admins)
 * or displaying the current assigned location (Workers).
 */
import { api } from '../api.js';
import { getUser } from '../pages/login.js';
import { getLocationId, setLocationId, escapeHtml } from '../utils/helpers.js';

export async function initStoreSwitcher() {
  const container = document.getElementById('store-switcher-container');
  if (!container) return;

  const user = getUser();
  if (!user) {
    container.innerHTML = '';
    return;
  }

  try {
    const data = await api.getLocations();
    const locations = data.locations || data || [];

    // If regular worker/manager, they are locked to their own locationId
    if (user.role !== 'admin') {
      const myLoc = locations.find(l => String(l._id) === String(user.locationId)) || 
                    locations.find(l => l.isDefault) || 
                    locations[0];

      container.innerHTML = `
        <div class="store-badge" title="Your Assigned Store">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right: var(--space-xs);"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          ${escapeHtml(myLoc?.name || 'Main Store')}
        </div>
      `;
      // Ensure local state matches the matched location
      if (myLoc) setLocationId(myLoc._id);
      return;
    }

    // Admin View: Dropdown to switch
    let activeLocId = getLocationId();
    
    // If no activeLocId in localStorage, default to the one marked as isDefault
    if (!activeLocId) {
      const defaultLoc = locations.find(l => l.isDefault) || locations[0];
      if (defaultLoc) {
        activeLocId = defaultLoc._id;
        setLocationId(activeLocId);
      }
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="flex-shrink: 0; color: var(--color-text-muted);"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <select id="store-switcher-select" class="form-select" style="min-width: 154px; padding: 4px 28px 4px 8px; font-size: 0.875rem; height: 36px;">
          ${locations.map(loc => `
            <option value="${loc._id}" ${loc._id === activeLocId ? 'selected' : ''}>
              ${loc.name} ${loc.isDefault ? '(Default)' : ''}
            </option>
          `).join('')}
        </select>
      </div>
    `;

    document.getElementById('store-switcher-select')?.addEventListener('change', (e) => {
      const newId = e.target.value;
      setLocationId(newId);
      // Reload page to refresh all data filters
      window.location.reload();
    });

  } catch (err) {
    console.warn('Failed to init store switcher:', err);
    container.innerHTML = '';
  }
}
