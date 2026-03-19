const BasketService = require('../services/BasketService');
const DirectStoreScraper = require('../scrapers/direct-store-scraper');
const scraper = new DirectStoreScraper();

class BasketController {
  async processBasket(req, res) {
    try {
      const { items, selectedStores, region = 'us' } = req.body;

      if (!items) {
        return res.status(400).json({
          success: false,
          error: 'Missing items field',
          message: 'Request body must include "items" field'
        });
      }

      const storeList = Array.isArray(selectedStores) ? selectedStores : (selectedStores ? selectedStores.split(',') : []);
      const itemsStr = Array.isArray(items) ? items.join('\n') : items;
      const isPro = req.user?.tier === 'pro';

      // JIT Scraping — restricted to PRO users
      const staleTerms = await BasketService.getStaleTerms(itemsStr, storeList);
      let scrapedTerms = [];

      if (staleTerms.length > 0) {
        if (isPro) {
          console.log(`🕒 PRO User: Found ${staleTerms.length} stale/missing terms. Updating cache...`);
          for (const term of staleTerms) {
            await scraper.scrapeOnDemand(term, storeList, region);
            scrapedTerms.push(term.toLowerCase());
          }
        } else {
          console.log(`ℹ️ FREE User: ${staleTerms.length} stale terms found, skipping JIT scraping.`);
        }
      }

      const results = await BasketService.calculateCheapestBasket(itemsStr, storeList, region);

      const finalResults = results.map(item => ({
        ...item,
        isFresh: scrapedTerms.includes(item.userInput.toLowerCase())
      }));

      console.log(`Basket result: ${JSON.stringify(finalResults).substring(0, 200)}...`);
      res.json(finalResults);
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
