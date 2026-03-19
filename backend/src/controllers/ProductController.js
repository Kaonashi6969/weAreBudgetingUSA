const ProductRepository = require('../models/ProductRepository');
const { getStoresForRegion } = require('../config/stores');
const { getAllRegions } = require('../config/regions');

class ProductController {
  async getProducts(req, res) {
    try {
      const products = await ProductRepository.getAll();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Returns the stores available for a given region.
   * Always sourced from config so the list is accurate even if the DB is empty.
   */
  async getStores(req, res) {
    try {
      const regionId = req.query.region || 'us';
      const stores = getStoresForRegion(regionId).map(s => ({ id: s.id, name: s.name }));
      res.json(stores);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Returns the list of supported regions for the frontend region selector.
   */
  async getRegions(req, res) {
    try {
      res.json(getAllRegions());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new ProductController();
