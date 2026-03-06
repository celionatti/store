/**
 * Confirmation Modal Component
 */

export function showModal(title, message, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');
  if (!overlay || !modal) return;

  modal.innerHTML = `
    <h3>${title}</h3>
    <p>${message}</p>
    <div class="modal-actions">
      <button class="btn btn-outline" id="modal-cancel">Cancel</button>
      <button class="btn btn-danger" id="modal-confirm">Confirm</button>
    </div>
  `;

  overlay.classList.add('show');

  const close = () => overlay.classList.remove('show');

  document.getElementById('modal-cancel').addEventListener('click', close);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    close();
    onConfirm();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}
