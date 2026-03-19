const ProductRepository = require('../models/ProductRepository');
const StoreRepository = require('../models/StoreRepository');
const STORES_CONFIG = require('../scrapers/config');

class ProductController {
  async getProducts(req, res) {
    try {
      const products = await ProductRepository.getAll();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getStores(req, res) {
    try {
      // Map from hardcoded config to ensure stores are always available for filtering
      // even if the database is empty.
      const stores = STORES_CONFIG.map(s => ({
        id: s.id,
        name: s.name
      }));
      res.json(stores);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new ProductController();
