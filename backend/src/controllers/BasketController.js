const BasketService = require('../services/BasketService');
const DirectStoreScraper = require('../scrapers/direct-store-scraper');
const scraper = new DirectStoreScraper();

class BasketController {
  async processBasket(req, res) {
    try {
      const { items, selectedStores, region = 'us', filters = [] } = req.body;

      if (!items) {
        return res.status(400).json({
          success: false,
          error: 'Missing items field',
          message: 'Request body must include "items" field'
        });
      }

      const storeList = Array.isArray(selectedStores) ? selectedStores : (selectedStores ? selectedStores.split(',') : []);
      const itemsStr = Array.isArray(items) ? items.join('\n') : items;
      const filterList = Array.isArray(filters) ? filters : [];
      const isPro = req.user?.tier === 'pro';

      // JIT Scraping — restricted to PRO users
      const staleTerms = await BasketService.getStaleTerms(itemsStr, storeList);

      if (staleTerms.length > 0) {
        if (isPro) {
          console.log(`🕒 PRO: ${staleTerms.length} stale/missing term(s). Refreshing cache...`);
          for (const term of staleTerms) {
            await scraper.scrapeOnDemand(term, storeList, region);
          }
        } else {
          console.log(`ℹ️ FREE: ${staleTerms.length} stale term(s), skipping JIT scrape.`);
        }
      }

      const results = await BasketService.searchProducts(itemsStr, storeList, region, filterList);

      console.log(`Basket result: ${results.length} groups returned.`);
      res.json(results);
    } catch (err) {
      console.error('Error processing basket:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
      });
    }
  }
}

module.exports = new BasketController();
