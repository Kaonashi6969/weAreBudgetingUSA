require('dotenv').config();
const database = require('./db/database');
const { getRegion } = require('./config/regions');

/**
 * Price Update Scheduler
 * Runs scrapers on a schedule to keep data fresh for a given region.
 */

class PriceUpdateScheduler {
  constructor() {
    this.intervals = [];
    this.isRunning = false;
  }

  /**
   * Schedule the universal scraper to run at regular intervals.
   * @param {string[]} searchTerms - Override the default terms for this region.
   * @param {string[]} storeIds    - Restrict scraping to specific stores.
   * @param {number}   intervalMs  - Milliseconds between runs (default: 12 h).
   * @param {string}   regionId    - Region context (default: 'us').
   */
  scheduleUniversalScraper(
    searchTerms = null,
    storeIds = null,
    intervalMs = 12 * 60 * 60 * 1000,
    regionId = 'us'
  ) {
    const region = getRegion(regionId);
    console.log(`📅 Scheduling Universal Scraper (${region.name}) every ${intervalMs / (60 * 60 * 1000)} hours`);

    const runScraper = async () => {
      try {
        console.log(`\n⏰ Running scheduled scraper (${region.name}) at ${new Date().toISOString()}`);
        const DirectStoreScraper = require('./scrapers/direct-store-scraper');
        const scraper = new DirectStoreScraper();

        const terms = searchTerms || region.defaultSearchTerms;

        await scraper.launch();
        for (const term of terms) {
          await scraper.scrapeOnDemand(term, storeIds || [], regionId);
        }
      } catch (err) {
        console.error('Scheduled scraper error:', err.message);
      }
    };

    // Run immediately on first schedule
    runScraper();

    // Then run on interval
    const intervalId = setInterval(runScraper, intervalMs);
    this.intervals.push(intervalId);
  }

  /**
   * Stop all scheduled tasks.
   */
  stop() {
    this.intervals.forEach(intervalId => clearInterval(intervalId));
    this.intervals = [];
    console.log('📅 All scheduled tasks stopped');
  }

  /**
   * Get database price statistics.
   */
  async getPriceStats() {
    try {
      const stats = await database.all(`
        SELECT 
          s.name as store,
          s.region,
          COUNT(p.id) as productCount,
          AVG(p.price) as avgPrice,
          MIN(p.price) as minPrice,
          MAX(p.price) as maxPrice
        FROM prices p
        JOIN stores s ON p.store_id = s.id
        GROUP BY s.id, s.name, s.region
      `);

      const lastUpdated = await database.get(`
        SELECT MAX(updated_at) as lastUpdate FROM prices
      `);

      return { stats, lastUpdated };
    } catch (err) {
      console.error('Error getting stats:', err);
      return null;
    }
  }
}

// Create and export singleton
const scheduler = new PriceUpdateScheduler();

module.exports = {
  PriceUpdateScheduler,
  scheduler
};
