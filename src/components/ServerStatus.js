/**
 * Server Status Banner
 * Listens for 'server-status' events and displays a persistent warning if offline.
 */

let statusBanner = null;

export function initServerStatus() {
  window.addEventListener('server-status', (event) => {
    const { online, message } = event.detail;
    
    if (!online) {
      showBanner(message);
    } else {
      hideBanner();
    }
  });
}

function showBanner(message) {
  if (statusBanner) {
    statusBanner.querySelector('.message').textContent = message;
    return;
  }

  statusBanner = document.createElement('div');
  statusBanner.id = 'server-status-banner';
  statusBanner.innerHTML = `
    <div class="content">
      <span class="icon">⚠️</span>
      <span class="message">${message}</span>
      <button class="retry-btn">Retry Connection</button>
    </div>
  `;

  document.body.prepend(statusBanner);

  statusBanner.querySelector('.retry-btn').addEventListener('click', async () => {
    const btn = statusBanner.querySelector('.retry-btn');
    btn.disabled = true;
    btn.textContent = 'Retrying...';
    
    try {
      // Import api dynamically to avoid circular dependencies if any
      const { api } = await import('../api.js');
      await api.getSettings(); // Simple ping
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Retry Connection';
    }
  });
}

function hideBanner() {
  if (statusBanner) {
    statusBanner.remove();
    statusBanner = null;
  }
}
