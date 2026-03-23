/**
 * Germany Region
 *
 * Everything needed to run the German market lives here:
 *  - region metadata (id, name, currency, defaultSearchTerms, nlp)
 *  - stores served in this region
 *  - scraper registrations for those stores
 *
 * Status: placeholder — stores and scrapers not yet implemented.
 *
 * Steps to activate:
 *  1. Implement each store's API fetcher in src/scrapers/ (e.g. rewe-api-fetcher.js)
 *  2. Uncomment the store entries below and fill in the real URLs
 *  3. Uncomment and point scrapers entries to the fetcher files
 *  4. Verify the i18n file exists at frontend/public/assets/i18n/de.json
 */

'use strict';

// ── Region metadata ───────────────────────────────────────────────────────────

const region = {
  id: 'de',
  name: 'Germany',
  currency: { code: 'EUR', symbol: '€' },
  defaultSearchTerms: ['Hähnchenbrust', 'Milch', 'Eier', 'Reis', 'Weißbrot'],
  nlp: {
    processedWordPenalty: [
      'sosse', 'saft', 'getraenk', 'paste', 'ketchup', 'senf', 'pesto', 'dose', 'konserve',
    ],
    snackWordPenalty: ['keks', 'croissant', 'gebaeck', 'snack', 'chip'],
  },
};

// ── Stores ────────────────────────────────────────────────────────────────────

const stores = [
  // { id: 'rewe',    name: 'Rewe',    regions: ['de'], currency: 'EUR', scraperType: 'rewe-api',    url: 'https://shop.rewe.de/...' },
  // { id: 'edeka',   name: 'Edeka',   regions: ['de'], currency: 'EUR', scraperType: 'edeka-api',   url: 'https://...' },
  // { id: 'aldi_de', name: 'Aldi',    regions: ['de'], currency: 'EUR', scraperType: 'aldi-de-api', url: 'https://...' },
  // { id: 'lidl_de', name: 'Lidl',    regions: ['de'], currency: 'EUR', scraperType: 'lidl-de-api', url: 'https://...' },
];

// ── Scraper registrations ─────────────────────────────────────────────────────

const scrapers = {
  // 'rewe-api':    (store, term) => require('../../../scrapers/rewe-api-fetcher').searchProducts(term),
  // 'edeka-api':   (store, term) => require('../../../scrapers/edeka-api-fetcher').searchProducts(term),
  // 'aldi-de-api': (store, term) => require('../../../scrapers/aldi-de-api-fetcher').searchProducts(term),
  // 'lidl-de-api': (store, term) => require('../../../scrapers/lidl-de-api-fetcher').searchProducts(term),
};

module.exports = { region, stores, scrapers };
