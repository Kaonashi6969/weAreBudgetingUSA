/**
 * Store Registry
 *
 * Each store declares:
 *  - `regions`     : which geographic markets it serves
 *  - `scraperType` : which fetcher DirectStoreScraper should use
 *
 * To add a new store for a new or existing region:
 *  1. Create its API fetcher in src/scrapers/ (e.g. sainsburys-api-fetcher.js)
 *  2. Add an entry below with the correct `regions` array and `scraperType`
 *  3. Register the scraperType → fetcher function in DirectStoreScraper's API_FETCHERS map
 *
 * To disable a store at runtime (e.g. in dev/test):
 *  Set SCRAPER_DISABLED_SHOPS=kroger,instacart in your .env file
 */

const DISABLED_SHOPS = (process.env.SCRAPER_DISABLED_SHOPS || '')
  .split(',')
  .map(id => id.trim().toLowerCase())
  .filter(Boolean);

const ALL_STORES = [
  // ── United States ──────────────────────────────────────────────────────────
  {
    id: 'walmart',
    name: 'Walmart',
    regions: ['us'],
    currency: 'USD',
    scraperType: 'walmart-api',
    noCache: true,
    url: 'https://www.walmart.com'
  },
  {
    id: 'kroger',
    name: 'Kroger',
    regions: ['us'],
    currency: 'USD',
    scraperType: 'kroger-api',
    noCache: true,
    url: 'KROGER_API',
    zipCode: process.env.KROGER_DEFAULT_ZIP || '45202'
  },
  {
    id: 'instacart',
    name: 'Instacart',
    regions: ['us'],
    currency: 'USD',
    scraperType: 'instacart-api',
    noCache: true,
    url: 'https://www.instacart.com'
  }

  // ── Future: United Kingdom ──────────────────────────────────────────────────
  // { id: 'tesco_uk',    name: 'Tesco',        regions: ['uk'], currency: 'GBP', scraperType: 'tesco-uk-api',    url: '...' },
  // { id: 'sainsburys',  name: "Sainsbury's",  regions: ['uk'], currency: 'GBP', scraperType: 'sainsburys-api', url: '...' },
  // { id: 'asda',        name: 'Asda',         regions: ['uk'], currency: 'GBP', scraperType: 'asda-api',       url: '...' },

  // ── Future: Germany ─────────────────────────────────────────────────────────
  // { id: 'rewe',   name: 'Rewe',   regions: ['de'], currency: 'EUR', scraperType: 'rewe-api',   url: '...' },
  // { id: 'edeka',  name: 'Edeka',  regions: ['de'], currency: 'EUR', scraperType: 'edeka-api',  url: '...' },
];

/**
 * Returns active (non-disabled) stores for a given region.
 * If regionId is omitted or null, returns all active stores regardless of region.
 */
function getStoresForRegion(regionId) {
  return ALL_STORES.filter(s =>
    (!regionId || s.regions.includes(regionId)) &&
    !DISABLED_SHOPS.includes(s.id)
  );
}

/**
 * Returns all non-disabled stores regardless of region.
 */
function getAllActiveStores() {
  return ALL_STORES.filter(s => !DISABLED_SHOPS.includes(s.id));
}

/**
 * Returns store objects for a given array of store IDs.
 */
function getStoresByIds(ids = []) {
  const lower = ids.map(id => String(id).toLowerCase());
  return ALL_STORES.filter(s => lower.includes(s.id.toLowerCase()));
}

module.exports = { ALL_STORES, getStoresForRegion, getAllActiveStores, getStoresByIds };
