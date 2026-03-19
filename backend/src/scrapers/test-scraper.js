const { getAllActiveStores } = require('../config/stores');
const DirectStoreScraper = require('./direct-store-scraper');

/**
 * CLI Tool for testing scrapers individually
 * Usage: node src/scrapers/test-scraper.js [shop-id] [query]
 * Example: node src/scrapers/test-scraper.js walmart "chicken breast"
 */

async function testSingleScraper() {
  const args = process.argv.slice(2);
  const targetId = args[0];
  const query = args[1] || 'chicken breast';

  const allStores = getAllActiveStores();

  if (!targetId) {
    console.log('Available shop IDs:', allStores.map(s => s.id).join(', '));
    console.log('Usage: node test-scraper.js [id] [query]');
    return;
  }

  const shopConfig = allStores.find(s => s.id === targetId);

  if (!shopConfig) {
    console.error(`Error: Shop with ID "${targetId}" not found in config or is currently disabled.`);
    return;
  }

  console.log(`--- Testing ${shopConfig.name} for "${query}" ---`);

  const scraper = new DirectStoreScraper();
  try {
    const results = await scraper.scrapeStore(shopConfig, query);
    console.log(`\nFound ${results.length} results:`);
    results.slice(0, 5).forEach((r, i) => {
      const currency = shopConfig.currency || 'USD';
      console.log(`${i+1}. ${r.name} - ${r.price} ${currency}`);
    });
    if (results.length > 5) console.log('...');
  } catch (error) {
    console.error('Scraping failed:', error.message);
  }
}

testSingleScraper();
