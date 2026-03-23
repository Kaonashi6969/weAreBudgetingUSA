/**
 * United Kingdom Region
 *
 * Everything needed to run the UK market lives here:
 *  - region metadata (id, name, currency, defaultSearchTerms, nlp)
 *  - stores served in this region
 *  - scraper registrations for those stores
 *
 * Status: placeholder — stores and scrapers not yet implemented.
 *
 * Steps to activate:
 *  1. Implement each store's API fetcher in src/scrapers/ (e.g. tesco-api-fetcher.js)
 *  2. Uncomment the store entries below and fill in the real URLs
 *  3. Uncomment and point scrapers entries to the fetcher files
 *  4. Add the UK i18n file at frontend/public/assets/i18n/uk.json
 */

'use strict';

// ── Region metadata ───────────────────────────────────────────────────────────

const region = {
  id: 'uk',
  name: 'United Kingdom',
  currency: { code: 'GBP', symbol: '£' },
  defaultSearchTerms: ['chicken breast', 'milk', 'eggs', 'rice', 'bread'],
  nlp: {
    processedWordPenalty: [
      'sauce', 'juice', 'drink', 'paste', 'tin', 'concentrate', 'ketchup', 'chutney',
    ],
    snackWordPenalty: ['crisps', 'biscuit', 'cake', 'pastry', 'crisp'],
  },
};

// ── Stores ────────────────────────────────────────────────────────────────────

const stores = [
  // { id: 'tesco',       name: 'Tesco',       regions: ['uk'], currency: 'GBP', scraperType: 'tesco-api',       url: 'https://...' },
  // { id: 'sainsburys',  name: "Sainsbury's", regions: ['uk'], currency: 'GBP', scraperType: 'sainsburys-api',  url: 'https://...' },
  // { id: 'asda',        name: 'Asda',        regions: ['uk'], currency: 'GBP', scraperType: 'asda-api',        url: 'https://...' },
  // { id: 'morrisons',   name: 'Morrisons',   regions: ['uk'], currency: 'GBP', scraperType: 'morrisons-api',   url: 'https://...' },
];

// ── Scraper registrations ─────────────────────────────────────────────────────

const scrapers = {
  // 'tesco-api':      (store, term) => require('../../../scrapers/tesco-api-fetcher').searchProducts(term),
  // 'sainsburys-api': (store, term) => require('../../../scrapers/sainsburys-api-fetcher').searchProducts(term),
  // 'asda-api':       (store, term) => require('../../../scrapers/asda-api-fetcher').searchProducts(term),
  // 'morrisons-api':  (store, term) => require('../../../scrapers/morrisons-api-fetcher').searchProducts(term),
};

module.exports = { region, stores, scrapers };
