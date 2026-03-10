/**
 * Receipt Printing Utility
 */
import { formatCurrency, formatDateTime } from './helpers.js';

export function printReceipt(sale, businessName = 'Celio Store') {
  const printWindow = window.open('', '_blank', 'width=600,height=600');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${sale._id}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; line-height: 1.4; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24px; }
        .details { margin-bottom: 20px; font-size: 14px; }
        .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
        .items td { padding: 5px 0; }
        .total-section { border-top: 1px dashed #000; padding-top: 10px; text-align: right; }
        .total-row { display: flex; justify-content: flex-end; gap: 20px; font-weight: bold; font-size: 18px; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${businessName}</h1>
        <p>Professional Store Management</p>
      </div>
      
      <div class="details">
        <div><strong>Receipt ID:</strong> ${sale._id}</div>
        <div><strong>Date:</strong> ${formatDateTime(sale.createdAt)}</div>
      </div>
      
      <table class="items">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              ${sale.productName}
              ${sale.soldItemBarcode ? `<br><small style="font-size: 10px;">IMEI: ${sale.soldItemBarcode}</small>` : ''}
            </td>
            <td>${sale.quantity}</td>
            <td style="text-align: right;">${formatCurrency(sale.unitPrice)}</td>
            <td style="text-align: right;">${formatCurrency(sale.totalAmount)}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="total-section">
        <div class="total-row">
          <span>GRAND TOTAL:</span>
          <span>${formatCurrency(sale.totalAmount)}</span>
        </div>
      </div>
      
      <div class="footer">
        <p>Thank you for your patronage!</p>
        <p>Please keep this receipt for your records.</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          // Optionally close window after print
          // window.onafterprint = function() { window.close(); };
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
