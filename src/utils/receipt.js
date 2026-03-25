/**
 * Receipt Printing Utility
 */
import { formatCurrency, formatDateTime } from './helpers.js';

export function printReceipt(saleOrItems, settings = {}) {
  const businessName = settings.shopName || 'Celio Store';
  const businessSlogan = settings.shopSlogan || 'Professional Store Management';
  const businessAddress = settings.shopAddress || '';
  const businessPhone = settings.shopPhone || '';

  // Normalize to array of items
  const items = Array.isArray(saleOrItems) ? saleOrItems : [saleOrItems];
  const grandTotal = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const receiptId = items[0]?.transactionId || items[0]?._id || 'N/A';
  const receiptDate = items[0]?.createdAt || new Date().toISOString();

  const printWindow = window.open('', '_blank', 'width=600,height=700');

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding-right: 8px; word-break: break-word;">
        ${item.productName || '—'}
        ${item.soldItemBarcode ? `<br><small style="font-size: 10px;">IMEI: ${item.soldItemBarcode}</small>` : ''}
      </td>
      <td style="text-align: center; padding: 0 4px;">${item.quantity}</td>
      <td style="text-align: right; padding-left: 4px;">${formatCurrency(item.unitPrice)}</td>
      <td style="text-align: right; padding-left: 4px;">${formatCurrency(item.totalAmount || (item.unitPrice * item.quantity))}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${receiptId}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; padding: 10px; color: #000; line-height: 1.4; max-width: 300px; margin: 0 auto; text-align: left; }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
        .header p { margin: 4px 0; font-size: 12px; }
        .contact-info { font-style: italic; }
        .details { margin-bottom: 15px; font-size: 12px; }
        .details div { margin-bottom: 3px; }
        .items { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .items th { border-bottom: 2px solid #000; padding: 6px 0; font-size: 12px; }
        .items td { padding: 6px 0; font-size: 12px; vertical-align: top; border-bottom: 1px dashed #ccc; }
        .total-section { border-top: 2px dashed #000; padding-top: 10px; }
        .subtotal-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 8px; }
        .footer { text-align: center; margin-top: 25px; font-size: 11px; border-top: 1px dashed #ccc; padding-top: 12px; }
        @media print { 
          @page { margin: 0; }
          body { padding: 0; width: 100%; max-width: 100%; margin: 0; }
          .no-print { display: none; } 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${businessName}</h1>
        <p>${businessSlogan}</p>
        ${businessAddress ? `<p class="contact-info">${businessAddress}</p>` : ''}
        ${businessPhone ? `<p class="contact-info">Phone: ${businessPhone}</p>` : ''}
      </div>

      <div class="details">
        <div><strong>Receipt:</strong> ${receiptId}</div>
        <div><strong>Date:</strong> ${formatDateTime(receiptDate)}</div>
        ${items[0]?.workerName ? `<div><strong>Cashier:</strong> ${items[0].workerName}</div>` : ''}
        ${items[0]?.customerName ? `<div><strong>Customer:</strong> ${items[0].customerName}</div>` : ''}
        <div><strong>Items:</strong> ${items.length}</div>
      </div>

      <table class="items">
        <thead>
          <tr>
            <th style="text-align: left; padding-right: 8px; width: 40%;">Product</th>
            <th style="text-align: center; padding: 0 4px;">Qty</th>
            <th style="text-align: right; padding-left: 4px;">Price</th>
            <th style="text-align: right; padding-left: 4px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="total-section">
        <div class="subtotal-row">
          <span>Subtotal (${items.length} item${items.length > 1 ? 's' : ''}):</span>
          <span>${formatCurrency(items.reduce((sum, item) => sum + (item.totalAmount - (item.taxAmount || 0)), 0))}</span>
        </div>
        <div class="subtotal-row">
          <span>Tax:</span>
          <span>${formatCurrency(items.reduce((sum, item) => sum + (item.taxAmount || 0), 0))}</span>
        </div>
        <div class="total-row">
          <span>GRAND TOTAL:</span>
          <span>${formatCurrency(grandTotal)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for your patronage!</p>
        <p>Please keep this receipt for your records.</p>
      </div>

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
