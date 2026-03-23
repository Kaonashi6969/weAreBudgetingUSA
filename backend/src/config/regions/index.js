/**
 * Region Registry — auto-loader
 *
 * Reads every *.js file in this directory (except _template.js and itself),
 * merges their { region, stores, scrapers } exports, and re-exports the same
 * API that the old regions.js and stores.js used to provide.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  To add a new region: drop a new <id>.js file in this folder.   │
 * │  No other file needs to change.                                 │
 * └─────────────────────────────────────────────────────────────────┘
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Auto-load all region files ────────────────────────────────────────────────

const SKIP = new Set(['index.js', '_template.js']);

const REGIONS       = {};   // { [id]: regionMeta }
const ALL_STORES    = [];   // flat list of all store objects
const API_FETCHERS  = {};   // { [scraperType]: (store, term) => Promise<Product[]> }

fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && !SKIP.has(f))
  .forEach(file => {
    const mod = require(path.join(__dirname, file));

    // Region metadata
    if (mod.region && mod.region.id) {
      REGIONS[mod.region.id] = mod.region;
    }

    // Stores
    if (Array.isArray(mod.stores)) {
      ALL_STORES.push(...mod.stores);
    }

    // Scraper registrations
    if (mod.scrapers && typeof mod.scrapers === 'object') {
      Object.assign(API_FETCHERS, mod.scrapers);
    }
  });

// ── Runtime env: disabled shops ───────────────────────────────────────────────

const DISABLED_SHOPS = (process.env.SCRAPER_DISABLED_SHOPS || '')
  .split(',')
  .map(id => id.trim().toLowerCase())
  .filter(Boolean);

// ── Public API (drop-in replacement for regions.js + stores.js) ───────────────

const DEFAULT_REGION_ID = 'us';

/** Returns full region config (including NLP). Falls back to 'us'. */
function getRegion(regionId) {
  return REGIONS[regionId] || REGIONS[DEFAULT_REGION_ID];
}

/** Returns all regions as lightweight objects safe to send to the frontend. */
function getAllRegions() {
  return Object.values(REGIONS).map(({ id, name, currency }) => ({ id, name, currency }));
}

/** Returns active stores for a given region (respects SCRAPER_DISABLED_SHOPS). */
function getStoresForRegion(regionId) {
  return ALL_STORES.filter(s =>
    (!regionId || s.regions.includes(regionId)) &&
    !DISABLED_SHOPS.includes(s.id),
  );
}

/** Returns all active stores regardless of region. */
function getAllActiveStores() {
  return ALL_STORES.filter(s => !DISABLED_SHOPS.includes(s.id));
}

/** Returns store objects for a given array of store IDs. */
function getStoresByIds(ids = []) {
  const lower = ids.map(id => String(id).toLowerCase());
  return ALL_STORES.filter(s => lower.includes(s.id.toLowerCase()));
}

module.exports = {
  // region helpers
  REGIONS,
  DEFAULT_REGION_ID,
  getRegion,
  getAllRegions,
  // store helpers
  ALL_STORES,
  getStoresForRegion,
  getAllActiveStores,
  getStoresByIds,
  // scraper registry (used by DirectStoreScraper)
  API_FETCHERS,
};
