/**
 * Simple Polling Utility
 */

export function startPolling(callback, interval = 10000) {
  let timerId = null;
  let isStopped = false;

  const poll = async () => {
    if (isStopped) return;
    
    try {
      await callback();
    } catch (err) {
      console.warn('Polling error:', err);
    } finally {
      if (!isStopped) {
        timerId = setTimeout(poll, interval);
      }
    }
  };

  // Start initial call
  poll();

  // Return cleanup function
  return () => {
    isStopped = true;
    if (timerId) clearTimeout(timerId);
  };
}
