'use strict';

/**
 * Unit normalisation and package-size parsing.
 *
 * All weights are normalised to **grams** (g).
 * All volumes are normalised to **millilitres** (ml).
 * Countable items stay as **pcs**.
 */

// ── Conversion tables ────────────────────────────────────────────────────────

const WEIGHT_TO_GRAMS = {
  g: 1, gr: 1, gram: 1, grams: 1, gramm: 1,
  dkg: 10,
  kg: 1000, kilo: 1000, kilogram: 1000,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
};

const VOLUME_TO_ML = {
  ml: 1, milliliter: 1, millilitre: 1,
  cl: 10, centiliter: 10,
  dl: 100, deciliter: 100,
  l: 1000, liter: 1000, litre: 1000,
  'fl oz': 29.5735, floz: 29.5735,
  cup: 236.588, cups: 236.588,
  pt: 473.176, pint: 473.176, pints: 473.176,
  qt: 946.353, quart: 946.353,
  gal: 3785.41, gallon: 3785.41, gallons: 3785.41,
};

const COUNT_UNITS = new Set([
  'pcs', 'pc', 'piece', 'pieces', 'db', 'darab',
  'count', 'ct', 'ea', 'each', 'pack', 'st', 'stück', 'stk',
]);

// ── Public helpers ───────────────────────────────────────────────────────────

/**
 * Classify a unit string into a canonical form.
 * Returns { base: 'g'|'ml'|'pcs', factor: number }.
 * `factor` converts one source-unit into the base unit.
 */
function classifyUnit(raw) {
  if (!raw) return { base: 'pcs', factor: 1 };
  const u = raw.trim().toLowerCase().replace(/\.$/, '');

  if (WEIGHT_TO_GRAMS[u] !== undefined) return { base: 'g', factor: WEIGHT_TO_GRAMS[u] };
  if (VOLUME_TO_ML[u] !== undefined) return { base: 'ml', factor: VOLUME_TO_ML[u] };
  if (COUNT_UNITS.has(u)) return { base: 'pcs', factor: 1 };

  // Hungarian / German recipe shorthands
  if (u === 'evőkanál' || u === 'ek' || u === 'tbsp' || u === 'tablespoon') return { base: 'ml', factor: 15 };
  if (u === 'teáskanál' || u === 'tk' || u === 'tsp' || u === 'teaspoon') return { base: 'ml', factor: 5 };

  return { base: 'pcs', factor: 1 };
}

/**
 * Convert a quantity from one unit to a base unit (g / ml / pcs).
 * Returns { qty: number, unit: 'g'|'ml'|'pcs' }.
 */
function normaliseQuantity(qty, unit) {
  const { base, factor } = classifyUnit(unit);
  return { qty: qty * factor, unit: base };
}

/**
 * Try to parse package size from a product name.
 * E.g. "All Purpose Flour 5 lb" → { size: 2267.96, unit: 'g' }
 *      "Whole Milk 1 Gallon"    → { size: 3785.41, unit: 'ml' }
 *      "Large Eggs 12 Count"    → { size: 12,      unit: 'pcs' }
 *
 * Returns null if nothing could be parsed.
 */
function parsePackageFromName(name) {
  if (!name) return null;

  // Pattern: number (optional decimal) + optional space + unit word
  // Capture from the end of the name first (most likely position)
  const patterns = [
    // "12 Count", "6 Pack", "12 ct"
    /(\d+(?:\.\d+)?)\s*(?:count|ct|pack|pk|stk|db)\b/i,
    // "5 lb", "2.5kg", "500 g", "16 oz"
    /(\d+(?:\.\d+)?)\s*-?\s*(lbs?|pounds?|kg|kilo|g|gr|grams?|gramm|oz|ounces?|dkg)\b/i,
    // "1 Gallon", "64 fl oz", "1.5 L", "500 ml"
    /(\d+(?:\.\d+)?)\s*-?\s*(gal(?:lons?)?|quarts?|qt|pints?|pt|fl\s*oz|floz|liters?|litres?|l|ml|cl|dl|cups?)\b/i,
  ];

  for (const pat of patterns) {
    const m = name.match(pat);
    if (m) {
      const rawQty = parseFloat(m[1]);
      const rawUnit = m[2] || m[0].replace(/[\d.\s-]/g, '');

      // Handle "count" type matches
      if (/count|ct|pack|pk|stk|db/i.test(m[0])) {
        return { size: rawQty, unit: 'pcs' };
      }

      const { base, factor } = classifyUnit(rawUnit);
      return { size: rawQty * factor, unit: base };
    }
  }
  return null;
}

/**
 * Calculate how much of a store product is needed for a recipe ingredient.
 *
 * @param {{ qty: number, unit: string }} recipeIngredient – normalised
 * @param {{ size: number, unit: string } | null} packageInfo – normalised (or null)
 * @param {number} productPrice – store shelf price for one package
 * @returns {{ proportionalCost: number, packagesNeeded: number, usageRatio: number } | null}
 *          null if units are incompatible or data is missing.
 */
function calculateProportionalCost(recipeIngredient, packageInfo, productPrice) {
  if (!packageInfo || !productPrice || productPrice <= 0) return null;

  const need = normaliseQuantity(recipeIngredient.qty, recipeIngredient.unit);
  const pkg = { qty: packageInfo.size, unit: packageInfo.unit };

  // Units must be compatible (both weight, both volume, or both count)
  if (need.unit !== pkg.unit) return null;
  if (pkg.qty <= 0) return null;

  const usageRatio = need.qty / pkg.qty; // e.g. 0.2 means 20% of one package
  const packagesNeeded = Math.ceil(usageRatio);  // must buy whole packages
  const proportionalCost = parseFloat((usageRatio * productPrice).toFixed(2));

  return { proportionalCost, packagesNeeded, usageRatio: parseFloat(usageRatio.toFixed(4)) };
}

module.exports = {
  classifyUnit,
  normaliseQuantity,
  parsePackageFromName,
  calculateProportionalCost,
};
