/**
 * Reusable Pagination Component
 */
export function renderPagination(container, totalItems, currentPage, itemsPerPage, onPageChange) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <div class="pagination mt-lg">
      <button class="btn btn-outline btn-sm" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
        <span class="hide-mobile">Prev</span>
      </button>
      <div class="page-num-container">
  `;

  // Page numbers
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  if (start > 1) {
    html += `<button class="btn btn-outline btn-sm page-num" data-page="1">1</button>`;
    if (start > 2) html += `<span class="text-muted">...</span>`;
  }

  for (let i = start; i <= end; i++) {
    html += `
      <button class="btn ${i === currentPage ? 'btn-primary' : 'btn-outline'} btn-sm page-num" data-page="${i}">
        ${i}
      </button>
    `;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) html += `<span class="text-muted">...</span>`;
    html += `<button class="btn btn-outline btn-sm page-num" data-page="${totalPages}">${totalPages}</button>`;
  }

  html += `
      </div>
      <button class="btn btn-outline btn-sm" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>
        <span class="hide-mobile">Next</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="text-xs text-muted ml-auto">
        Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Event Listeners
  container.querySelector('#prev-page')?.addEventListener('click', () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  });

  container.querySelector('#next-page')?.addEventListener('click', () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  });

  container.querySelectorAll('.page-num').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (page !== currentPage) onPageChange(page);
    });
  });
}
