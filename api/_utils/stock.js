/**
 * Multi-Store Stock Utilities
 */

/**
 * Maps a product's locationStock to the requested location context.
 * Performs on-the-fly migration if legacy global stock is found.
 */
function mapProductForLocation(product, locationId, isAdmin = false) {
  if (!product) return null;

  // Initialize locationStock if missing
  let locationStock = product.locationStock || [];

  // Migration: If legacy fields exist and haven't been migrated yet
  if (product.quantity !== undefined && locationStock.length === 0) {
    // We assume the legacy stock belongs to the first "default" location if we don't know better
    // But since we can't easily guess the ID here without another DB call, we'll use a placeholder
    // that we can fix up or just treat as the "Primary" store.
    // In practice, it's better to find the 'isDefault' location from the DB, 
    // but for on-the-fly read mapping, we'll just treat the first request's location 
    // as the recipient of the legacy stock if none exists.
    if (locationId) {
      locationStock = [{
        locationId: String(locationId),
        quantity: parseInt(product.quantity) || 0,
        itemBarcodes: Array.isArray(product.itemBarcodes) ? product.itemBarcodes : []
      }];
    }
  }

  const activeStock = locationStock.find(s => String(s.locationId) === String(locationId)) || {
    locationId: locationId,
    quantity: 0,
    itemBarcodes: []
  };

  const totalQuantity = locationStock.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);

  // Return a cloned object with mapped quantity for the UI
  const mapped = { ...product };
  
  // These are now the primary fields for the UI/POS
  mapped.quantity = activeStock.quantity;
  mapped.itemBarcodes = activeStock.itemBarcodes;
  
  // For Admins, we expose the total across all stores
  if (isAdmin) {
    mapped.totalQuantity = totalQuantity;
    mapped.allStock = locationStock; 
  }

  // Clean up legacy fields to avoid confusion in downstream logic
  delete mapped.locationStock;

  return mapped;
}

module.exports = { mapProductForLocation };
