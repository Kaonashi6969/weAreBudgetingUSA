const BaseRepository = require('./BaseRepository');
const PriceRepository = require('./PriceRepository');
const database = require('../db/database');

class ProductRepository extends BaseRepository {
  constructor() {
    super('products');
  }

  async findByNameLike(name) {
    return await database.all(`SELECT * FROM ${this.tableName} WHERE name LIKE ?`, [`%${name}%`]);
  }

  async upsertWithPrice(item, storeId) {
    // 1. Insert or update product
    // Note: Database schema uses 'category' string, not 'category_id'
    await database.run(
      `INSERT INTO products (id, name, image_url, category)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       image_url = excluded.image_url`,
      [item.id, item.name, item.image_url, item.category || 'General']
    );

    // 2. Insert or update price
    await PriceRepository.upsert(item.id, storeId, {
      price: item.price,
      unit: item.unit || 'pcs',
      url: item.url
    });
  }

  async getWithPrices(selectedStoreIds = []) {
    let query = `
      SELECT p.id, p.name, p.image_url, pr.price, s.name as store, pr.url, pr.updated_at, s.id as store_id
      FROM products p 
      JOIN prices pr ON p.id = pr.product_id
      JOIN stores s ON pr.store_id = s.id
    `;
    
    if (selectedStoreIds && selectedStoreIds.length > 0) {
      const placeholders = selectedStoreIds.map(() => '?').join(',');
      const formattedIds = selectedStoreIds.map(id => String(id).toLowerCase());
      query += ` WHERE LOWER(s.id) IN (${placeholders})`;
      console.log(`[DB Exec] ${query} | Params: ${JSON.stringify(formattedIds)}`);
      return await database.all(query, formattedIds);
    }

    console.log(`[DB Exec] ${query} | No filter`);
    return await database.all(query);
  }
}

module.exports = new ProductRepository();
