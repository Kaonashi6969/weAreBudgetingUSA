const BasketService = require('./BasketService');
const RecipeRepository = require('../models/RecipeRepository');
const { parsePackageFromName, calculateProportionalCost } = require('../utils/units');

class RecipeService {
  /**
   * Resolve package info for a product match.
   * Prefers explicit DB columns; falls back to parsing the product name.
   */
  _getPackageInfo(match) {
    if (match.package_size && match.package_unit) {
      return { size: match.package_size, unit: match.package_unit };
    }
    return parsePackageFromName(match.name);
  }

  /**
   * Determine the effective price for a single ingredient + match pair.
   * If ingredient is structured ({name, qty, unit}) and package info is available,
   * calculates proportional cost. Otherwise returns the full product price as fallback.
   *
   * Returns { effectivePrice, proportional: { ... } | null }
   */
  _calculateEffectivePrice(ingredient, match) {
    const isStructured = ingredient && typeof ingredient === 'object' && ingredient.qty && ingredient.unit;
    if (!isStructured) {
      return { effectivePrice: match.price, proportional: null };
    }

    const packageInfo = this._getPackageInfo(match);
    if (!packageInfo) {
      return { effectivePrice: match.price, proportional: null };
    }

    const result = calculateProportionalCost(ingredient, packageInfo, match.price);
    if (!result) {
      // Incompatible units — fall back to full price
      return { effectivePrice: match.price, proportional: null };
    }

    return {
      effectivePrice: result.proportionalCost,
      proportional: {
        recipeCost: result.proportionalCost,
        packagesNeeded: result.packagesNeeded,
        usageRatio: result.usageRatio,
        packageSize: packageInfo.size,
        packageUnit: packageInfo.unit,
      }
    };
  }

  /**
   * Calculates per-ingredient prices and identifies the cheapest single store.
   * Supports both structured ({name, qty, unit}) and legacy (string) ingredients.
   */
  async getRecipePriceEstimate(recipeId, regionId = 'us', selectedStoreIds = []) {
    const recipe = await RecipeRepository.getById(recipeId);
    if (!recipe) return null;

    const ingredients = recipe.ingredients;

    // Build search terms from ingredient names only
    const searchTerms = ingredients.map(ing =>
      typeof ing === 'object' ? ing.name : ing
    ).join('\n');

    const searchResults = await BasketService.searchProducts(searchTerms, selectedStoreIds, regionId);

    const storeTotals = {};
    const ingredientEstimates = [];

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      const ingredient = ingredients[i]; // structured or string
      const term = result.userInput;
      const matches = result.matches;

      const isStructured = ingredient && typeof ingredient === 'object';
      const displayName = isStructured
        ? `${ingredient.qty} ${ingredient.unit} ${ingredient.name}`
        : term;

      if (matches.length === 0) {
        ingredientEstimates.push({
          name: displayName,
          searchName: term,
          qty: isStructured ? ingredient.qty : null,
          unit: isStructured ? ingredient.unit : null,
          avgPrice: null,
          status: 'not_found',
          proportional: null,
        });
        continue;
      }

      // Calculate effective prices for all matches
      const bestMatch = matches[0];
      const { effectivePrice: bestEffective, proportional } = this._calculateEffectivePrice(ingredient, bestMatch);

      const effectivePrices = matches.map(m => {
        const { effectivePrice } = this._calculateEffectivePrice(ingredient, m);
        return effectivePrice;
      }).filter(p => p > 0);

      const avgPrice = effectivePrices.length > 0
        ? effectivePrices.reduce((a, b) => a + b, 0) / effectivePrices.length
        : 0;

      // Track per-store totals using effective (proportional) prices
      const seenStoresInMatch = new Set();
      for (const match of matches) {
        if (!seenStoresInMatch.has(match.store_id)) {
          const { effectivePrice } = this._calculateEffectivePrice(ingredient, match);
          if (!storeTotals[match.store_id]) {
            storeTotals[match.store_id] = { total: 0, itemsCount: 0, storeName: match.store };
          }
          storeTotals[match.store_id].total += effectivePrice;
          storeTotals[match.store_id].itemsCount += 1;
          seenStoresInMatch.add(match.store_id);
        }
      }

      ingredientEstimates.push({
        name: displayName,
        searchName: term,
        qty: isStructured ? ingredient.qty : null,
        unit: isStructured ? ingredient.unit : null,
        avgPrice: parseFloat(avgPrice.toFixed(2)),
        bestPrice: parseFloat(bestEffective.toFixed(2)),
        bestStore: bestMatch.store,
        url: bestMatch.url || null,
        status: 'found',
        proportional,
      });
    }

    const storeRanking = Object.entries(storeTotals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => {
        if (b.itemsCount !== a.itemsCount) return b.itemsCount - a.itemsCount;
        return a.total - b.total;
      });

    const cheapestStore = storeRanking[0] || null;
    const averageTotal = ingredientEstimates
      .filter(i => i.avgPrice !== null)
      .reduce((sum, i) => sum + i.avgPrice, 0);

    return {
      recipeId,
      name: recipe.name,
      ingredientCount: ingredients.length,
      averageTotal: parseFloat(averageTotal.toFixed(2)),
      cheapestStore: cheapestStore ? {
        id: cheapestStore.id,
        name: cheapestStore.storeName,
        total: parseFloat(cheapestStore.total.toFixed(2)),
        itemsFound: cheapestStore.itemsCount
      } : null,
      ingredients: ingredientEstimates,
      allStoreTotals: storeRanking.slice(0, 5).map(s => ({
        id: s.id,
        name: s.storeName,
        total: parseFloat(s.total.toFixed(2)),
        itemsFound: s.itemsCount
      }))
    };
  }
}

module.exports = new RecipeService();