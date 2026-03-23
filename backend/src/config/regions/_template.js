/**
 * ════════════════════════════════════════════════════════════════════
 *  HOW TO ADD A NEW REGION
 * ════════════════════════════════════════════════════════════════════
 *
 *  1. Copy this file to src/config/regions/<region-id>.js
 *     (e.g. fr.js for France, ca.js for Canada)
 *
 *  2. Fill in the three sections below:
 *       a) Region metadata  — id, name, currency, defaultSearchTerms, nlp
 *       b) Stores           — at least one store entry
 *       c) Scraper registrations — if using an API fetcher
 *
 *  3. For each store that uses browser DOM scraping (no API):
 *       - Set scraperType to a unique string (e.g. 'mystore-scraper')
 *       - Add itemSelector / nameSelector / priceSelector / linkSelector /
 *         imageSelector to the store object
 *       - No entry needed in the scrapers map below
 *
 *  4. For each store that has an API fetcher:
 *       - Create src/scrapers/<mystore>-api-fetcher.js
 *       - Add an entry in the scrapers map below
 *
 *  5. Add an i18n file at frontend/public/assets/i18n/<region-id>.json
 *     (copy en.json or another language file as a starting point)
 *
 *  6. That's it! The region is automatically registered by index.js —
 *     no changes needed anywhere else.
 * ════════════════════════════════════════════════════════════════════
 */

'use strict';

// ── a) Region metadata ────────────────────────────────────────────────────────

const region = {
  id: 'xx',                           // ← 2-letter ISO country code (lowercase)
  name: 'Country Name',               // ← Human-readable name shown in the UI
  currency: { code: 'XXX', symbol: '?' },  // ← ISO 4217 code + display symbol
  defaultSearchTerms: [               // ← Translated to this region's language
    'chicken breast', 'milk', 'eggs', 'rice', 'bread',
  ],
  nlp: {
    // Words that indicate a product is processed/non-raw — penalised in scoring
    processedWordPenalty: [
      'sauce', 'juice', 'drink', 'paste', 'ketchup',
    ],
    // Words that indicate a snack/sweet — penalised when searching for staples
    snackWordPenalty: ['snack', 'cookie', 'pastry', 'chip'],
    // Optional: brand name scoring adjustments (positive = boost, negative = penalise)
    // brandWeights: { 'StoreBrand': 1.0, 'Premium': -0.5 },
  },
};

// ── b) Stores ─────────────────────────────────────────────────────────────────

const stores = [
  // Example for API-based store:
  // {
  //   id: 'mystore',
  //   name: 'My Store',
  //   regions: ['xx'],
  //   currency: 'XXX',
  //   scraperType: 'mystore-api',
  //   noCache: true,
  //   url: 'https://www.mystore.xx',
  // },

  // Example for browser DOM-scraped store:
  // {
  //   id: 'mystore2',
  //   name: 'My Store 2',
  //   regions: ['xx'],
  //   currency: 'XXX',
  //   scraperType: 'mystore2-scraper',
  //   noCache: true,
  //   url: 'https://www.mystore2.xx/search?q=',
  //   itemSelector:  'li.product-item',
  //   nameSelector:  'h2.product-name',
  //   priceSelector: 'span.price',
  //   linkSelector:  'a.product-link',
  //   imageSelector: 'img.product-image',
  // },
];

// ── c) Scraper registrations ──────────────────────────────────────────────────
//
// Only needed for stores with an API fetcher (not browser DOM scrapers).
// Key must match the store's scraperType.

const scrapers = {
  // 'mystore-api': (store, term) => require('../../../scrapers/mystore-api-fetcher').searchProducts(term),
};

module.exports = { region, stores, scrapers };
