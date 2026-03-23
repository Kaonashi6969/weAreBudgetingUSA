/**
 * Region Registry
 *
 * Each entry defines a supported geographic market with its own currency,
 * default search terms, and NLP penalty word lists used by BasketService.
 *
 * To add a new region:
 *  1. Add an entry here (id, name, currency, defaultSearchTerms, nlp)
 *  2. Add the region's stores in src/config/stores.js
 *  3. Create any needed API fetchers in src/scrapers/
 */

const REGIONS = {
  us: {
    id: 'us',
    name: 'United States',
    currency: { code: 'USD', symbol: '$' },
    defaultSearchTerms: ['chicken breast', 'milk', 'eggs', 'rice', 'white bread'],
    nlp: {
      processedWordPenalty: [
        'sauce', 'juice', 'drink', 'pureed', 'mix', 'pesto',
        'concentrate', 'canned', 'ketchup', 'mustard'
      ],
      snackWordPenalty: ['snack', 'cookie', 'croissant', 'pastry', 'roll', 'bun'],
      brandWeights: {
        'Great Value': 1.0,  // Prefer store brands for budgeting
        'Kirkland': 1.0,
        'Organic': -0.5      // Slight penalty for organic if looking for cheapest (can be adjusted)
      }
    }
  },

  // ── Future: United Kingdom ──
  uk: {
    id: 'uk',
    name: 'United Kingdom',
    currency: { code: 'GBP', symbol: '£' },
    defaultSearchTerms: ['chicken breast', 'milk', 'eggs', 'rice', 'bread'],
    nlp: {
      processedWordPenalty: [
        'sauce', 'juice', 'drink', 'paste', 'tin', 'concentrate', 'ketchup', 'chutney'
      ],
      snackWordPenalty: ['crisps', 'biscuit', 'cake', 'pastry', 'crisp']
    }
  },

  // ── Future: Germany ──
  de: {
    id: 'de',
    name: 'Germany',
    currency: { code: 'EUR', symbol: '€' },
    defaultSearchTerms: ['Hähnchenbrust', 'Milch', 'Eier', 'Reis', 'Weißbrot'],
    nlp: {
      processedWordPenalty: [
        'sosse', 'saft', 'getraenk', 'paste', 'ketchup', 'senf', 'pesto', 'dose', 'konserve'
      ],
      snackWordPenalty: ['keks', 'croissant', 'gebaeck', 'snack', 'chip']
    }
  }
};

const DEFAULT_REGION_ID = 'us';

/**
 * Returns the config for a given region ID, falling back to 'us' if unknown.
 */
function getRegion(regionId) {
  return REGIONS[regionId] || REGIONS[DEFAULT_REGION_ID];
}

/**
 * Returns all defined regions as an array (safe to expose to the frontend).
 */
function getAllRegions() {
  return Object.values(REGIONS).map(({ id, name, currency }) => ({ id, name, currency }));
}

module.exports = { REGIONS, DEFAULT_REGION_ID, getRegion, getAllRegions };
