/**
 * Hungary Region
 *
 * Everything needed to run the Hungarian market lives here:
 *  - region metadata (id, name, currency, defaultSearchTerms, nlp)
 *  - stores served in this region
 *  - scraper registrations for those stores
 *
 * Status: Auchan browser scraper is active. Walmart is shared with US.
 *
 * Steps to add more stores:
 *  1. Add a store entry below
 *  2. If it needs an API fetcher, create it in src/scrapers/ and register it in scrapers below
 *  3. If it uses browser DOM scraping, provide itemSelector / nameSelector / priceSelector /
 *     linkSelector / imageSelector on the store object — no scrapers entry needed
 */

'use strict';

// ── Region metadata ───────────────────────────────────────────────────────────

const region = {
  id: 'hu',
  name: 'Hungary',
  currency: { code: 'HUF', symbol: 'Ft' },
  defaultSearchTerms: ['csirkemell', 'tej', 'tojás', 'rizs', 'fehér kenyér'],
  nlp: {
    processedWordPenalty: [
      'szósz', 'lé', 'ital', 'paszta', 'ketchup', 'mustár', 'pesto', 'konzerv',
    ],
    snackWordPenalty: ['keksz', 'croissant', 'sütemény', 'snack', 'chips'],
  },
};

// ── Stores ────────────────────────────────────────────────────────────────────

const stores = [
  {
    id: "tesco",
    name: "Tesco",
    regions: ['hu'],
    currency: 'HUF',
    scraperType: 'tesco-scraper',
    url: "https://bevasarlas.tesco.hu/groceries/hu-HU/search?query=",
    itemSelector: "li[data-testid]",
    nameSelector: "h2 a, .gyT8MW_titleLink",
    priceSelector: ".gyT8MW_priceText",
    linkSelector: "h2 a, .gyT8MW_titleLink",
    imageSelector: "img.gyT8MW_image",
    maxPages: 3,
    pagination: { param: 'page', start: 2, increment: 1 },
    nextPageSelector: 'a[data-testid="next"]',
  },
  {
    id: 'auchan',
    name: 'Auchan',
    regions: ['hu'],
    currency: 'HUF',
    scraperType: 'auchan-scraper',
    url: 'https://auchan.hu/shop/search?q%5B%5D=',
    itemSelector:  'li[role="article"]',
    nameSelector:  'h3',
    priceSelector: '.q79l0cL0',
    linkSelector:  'a.xtt1nL9f',
    imageSelector: 'img.tVOcaHnl',
    maxPages: 3,
    pagination: { param: 'page', start: 2, increment: 1 },
    nextPageSelector: 'a[rel="next"], .pagination__next',
  },
  {
    id: "lidl",
    name: "Lidl",
    regions: ['hu'],
    currency: 'HUF',
    scraperType: 'lidl-scraper',
    url: "https://www.lidl.hu/q/search?q=",
    itemSelector: '.odsc-tile',
    nameSelector: '.product-grid-box__title',
    priceSelector: '.ods-price__value',
    linkSelector: '.odsc-tile__link',
    imageSelector: '.odsc-image-gallery__image',
    maxPages: 3,
    pagination: { param: 'page', start: 2, increment: 1 },
    nextPageSelector: '.btn-pagination--next, [data-testid="pagination-next"]',
  },
  {
    id: "aldi",
    name: "Aldi",
    regions: ['hu'],
    currency: 'HUF',
    scraperType: 'aldi-scraper',
    url: "https://www.aldi.hu/hu/search.html?search=",
    itemSelector: '.plp_product',
    nameSelector: '.product-title',
    priceSelector: '.at-product-price_lbl',
    linkSelector: 'a',
    baseUrl: 'https://www.aldi.hu',
    imageSelector: 'img.at-product-images_img',
    maxPages: 3,
    pagination: { param: 'offset', start: 24, increment: 24 },
    nextPageSelector: '.pagination__next, [aria-label="Következő oldal"]',
  }
];

// ── Scraper registrations ─────────────────────────────────────────────────────
//
// 'walmart-api' is handled by the US region's scraper registration; the
// aggregated API_FETCHERS map in DirectStoreScraper merges all regions.
// Only add entries here for scrapers unique to Hungary.

const scrapers = {
  // 'spar-hu-api':  (store, term) => require('../../../scrapers/spar-hu-api-fetcher').searchProducts(term),
  // 'tesco-hu-api': (store, term) => require('../../../scrapers/tesco-hu-api-fetcher').searchProducts(term),
};

module.exports = { region, stores, scrapers };
