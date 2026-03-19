const database = require('../db/database');

class PriceRepository {
  async getLatestUpdateForProduct(productName, normalizedId, selectedStoreIds = []) {
    let query = `
      SELECT MAX(pr.updated_at) as last_update FROM prices pr 
      JOIN products p ON pr.product_id = p.id 
      WHERE (p.name LIKE ? OR p.id LIKE ?)
    `;
    
    const params = [`%${productName}%`, `%${normalizedId}%`];

    if (selectedStoreIds && selectedStoreIds.length > 0) {
      const placeholders = selectedStoreIds.map(() => '?').join(',');
      query += ` AND LOWER(pr.store_id) IN (${placeholders})`;
      const formattedIds = selectedStoreIds.map(id => String(id).toLowerCase());
      params.push(...formattedIds);
    }

    const result = await database.get(query, params);
    return result;
  }

  async upsert(productId, storeId, priceData) {
    const { price, unit, url } = priceData;
    await database.run(
      `INSERT INTO prices (product_id, store_id, price, unit, url, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(product_id, store_id) DO UPDATE SET
       price = excluded.price,
       url = excluded.url,
       updated_at = CURRENT_TIMESTAMP`,
      [productId, storeId, price, unit || 'pcs', url]
    );
  }
}

module.exports = new PriceRepository();
