/**
 * Validation Utilities for API Payloads
 */
const { ObjectId } = require('mongodb');

function isValidObjectId(id) {
  if (!id) return false;
  if (ObjectId.isValid(id)) {
    if (String(new ObjectId(id)) === String(id)) return true;
  }
  return false;
}

function validateProduct(body) {
  const errors = [];
  if (!body) return ['Request body is missing or could not be parsed'];
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('Product name is required');
  }
  if (!body.sku || typeof body.sku !== 'string' || !body.sku.trim()) {
    errors.push('SKU is required');
  }
  const hasGeneralBarcode = body.barcode && typeof body.barcode === 'string' && body.barcode.trim();
  const hasItemBarcodes = Array.isArray(body.itemBarcodes) && body.itemBarcodes.length > 0;
  if (!hasGeneralBarcode && !hasItemBarcodes) {
    errors.push('A general barcode or at least one individual Item Barcode (IMEI) is required');
  }
  if (body.costPrice == null || isNaN(body.costPrice) || body.costPrice < 0) {
    errors.push('Cost price must be a non-negative number');
  }
  if (body.sellingPrice == null || isNaN(body.sellingPrice) || body.sellingPrice < 0) {
    errors.push('Selling price must be a non-negative number');
  }
  return errors;
}

function validateStockEntry(body) {
  const errors = [];
  if (!body.productId) {
    errors.push('Product ID is required');
  }
  if (!body.quantity || isNaN(body.quantity) || body.quantity <= 0) {
    errors.push('Quantity must be a positive number');
  }
  return errors;
}

function validateSale(body) {
  const errors = [];
  if (!body.productId) {
    errors.push('Product ID is required');
  }
  if (!body.quantity || isNaN(body.quantity) || body.quantity <= 0) {
    errors.push('Quantity must be a positive number');
  }
  if (body.totalAmount == null || isNaN(body.totalAmount) || body.totalAmount < 0) {
    errors.push('Total amount must be a non-negative number');
  }
  return errors;
}

function validateCartSale(body) {
  const errors = [];
  if (!body) return ['Request body is missing'];
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return ['At least one item is required'];
  }
  body.items.forEach((item, i) => {
    if (!item.productId) errors.push(`Item ${i + 1}: Product ID is required`);
    if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0) errors.push(`Item ${i + 1}: Quantity must be positive`);
    if (item.unitPrice == null || isNaN(item.unitPrice) || item.unitPrice < 0) errors.push(`Item ${i + 1}: Unit price must be non-negative`);
  });
  return errors;
}

function validateSupplier(body) {
  const errors = [];
  if (!body) return ['Request body is missing'];
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('Supplier name is required');
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('Invalid email format');
  }
  return errors;
}

module.exports = { 
  isValidObjectId,
  validateProduct, 
  validateStockEntry, 
  validateSale, 
  validateCartSale, 
  validateSupplier 
};
