/**
 * United States Region
 *
 * Everything needed to run the US market lives here:
 *  - region metadata (id, name, currency, defaultSearchTerms, nlp)
 *  - stores served in this region
 *  - scraper registrations for those stores
 *
 * To disable a store: add its id to DISABLED_SHOPS in your .env:
 *   SCRAPER_DISABLED_SHOPS=kroger,instacart
 */

'use strict';

// ── Region metadata ───────────────────────────────────────────────────────────

const region = {
  id: 'us',
  name: 'United States',
  currency: { code: 'USD', symbol: '$' },
  defaultSearchTerms: ['chicken breast', 'milk', 'eggs', 'rice', 'white bread'],
  nlp: {
    processedWordPenalty: [
      'sauce', 'juice', 'drink', 'pureed', 'mix', 'pesto',
      'concentrate', 'canned', 'ketchup', 'mustard',
    ],
    snackWordPenalty: ['snack', 'cookie', 'croissant', 'pastry', 'roll', 'bun'],
    brandWeights: {
      'Great Value': 1.0,  // Prefer store brands for budgeting
      'Kirkland':    1.0,
      'Organic':    -0.5,  // Slight penalty for organic when looking for cheapest
    },
  },
};

// ── Stores ────────────────────────────────────────────────────────────────────

const stores = [
  {
    id: 'walmart',
    name: 'Walmart',
    regions: ['us'],
    currency: 'USD',
    scraperType: 'walmart-api',
    isApiStore: true,
    url: 'https://www.walmart.com',
  },
  {
    id: 'kroger',
    name: 'Kroger',
    regions: ['us'],
    currency: 'USD',
    scraperType: 'kroger-api',
    isApiStore: true,
    url: 'KROGER_API',
    zipCode: process.env.KROGER_DEFAULT_ZIP || '45202',
  },
  {
    id: 'instacart',
    name: 'Instacart',
    regions: ['us'],
    currency: 'USD',
    scraperType: 'instacart-api',
    isApiStore: true,
    url: 'https://www.instacart.com',
  },
];

// ── Scraper registrations ─────────────────────────────────────────────────────
//
// Map scraperType → async (store, term) => Product[]
// API-based fetchers are listed here. Stores without an entry fall back to
// the browser DOM scraper (selectors come from the store object above).

const scrapers = {
  'walmart-api':   (store, term) => require('../../../scrapers/walmart-api-fetcher').searchProducts(term),
  'kroger-api':    (store, term) => require('../../../scrapers/kroger-api-fetcher').searchProducts(term, store.zipCode),
  'instacart-api': (store, term) => require('../../../scrapers/instacart-api-fetcher').searchProducts(term, store.zipCode),
};

module.exports = { region, stores, scrapers };
