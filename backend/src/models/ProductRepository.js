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
    // Ensure dietary_tags is stored as JSON string
    const dietaryTags = JSON.stringify(item.dietary_tags || []);

    await database.run(
      `INSERT INTO products (id, name, image_url, category, dietary_tags)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       image_url = excluded.image_url,
       dietary_tags = excluded.dietary_tags`,
      [item.id, item.name, item.image_url, item.category || 'General', dietaryTags]
    );

    // 2. Insert or update price
    await PriceRepository.upsert(item.id, storeId, {
      price: item.price,
      unit: item.unit || 'pcs',
      url: item.url
    });
  }

  async getWithPrices(selectedStoreIds = [], regionId = null) {
    let query = `
      SELECT p.id, p.name, p.image_url, p.dietary_tags, pr.price, s.name as store, pr.url, pr.updated_at, s.id as store_id
      FROM products p 
      JOIN prices pr ON p.id = pr.product_id
      JOIN stores s ON pr.store_id = s.id
    `;
    const conditions = [];
    const params = [];

    if (selectedStoreIds && selectedStoreIds.length > 0) {
      const placeholders = selectedStoreIds.map(() => '?').join(',');
      conditions.push(`LOWER(s.id) IN (${placeholders})`);
      selectedStoreIds.forEach(id => params.push(String(id).toLowerCase()));
    }

    if (regionId) {
      conditions.push('s.region = ?');
      params.push(regionId);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DB Exec] ${query} | Params: ${JSON.stringify(params)}`);
    }
    return await database.all(query, params);
  }
}

module.exports = new ProductRepository();
