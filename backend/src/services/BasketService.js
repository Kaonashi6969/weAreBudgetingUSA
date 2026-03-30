'use strict';

const ProductRepository = require('../models/ProductRepository');
const PriceRepository = require('../models/PriceRepository');
const { getStoresByIds } = require('../config/stores');
const { scoreRelevance } = require('../utils/product-relevance');

class BasketService {

  // ── Cache staleness check ──────────────────────────────────────────────────

  async getStaleTerms(itemsStr, selectedStoreIds = []) {
    const inputs = typeof itemsStr === 'string'
      ? itemsStr.split(/[\r\n,]+/).map(i => i.trim().toLowerCase()).filter(i => i.length > 0)
      : [];

    const selectedStores = getStoresByIds(selectedStoreIds);
    // API stores: 1-hour TTL (rate limit protection). Browser-scraped: 24-hour TTL.
    const allApiStores = selectedStores.length > 0 && selectedStores.every(s => s.isApiStore === true);
    const ttlHours = allApiStores ? 1 : 24;
    console.log(`[Cache] TTL: ${ttlHours}h (${allApiStores ? 'API stores' : 'browser scraped'})`);

    const staleItems = [];

    for (const input of inputs) {
      const normalizedInput = input
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ');

      const latestPrice = await PriceRepository.getLatestUpdateForProduct(
        input, normalizedInput.replace(/\s+/g, '_'), selectedStoreIds,
      );

      if (!latestPrice?.last_update) {
        console.log(`[Cache] MISS: "${input}"`);
        staleItems.push(input);
        continue;
      }

      const diffHours = (Date.now() - new Date(latestPrice.last_update).getTime()) / 3_600_000;
      if (diffHours > ttlHours) {
        console.log(`[Cache] STALE: "${input}" (${diffHours.toFixed(1)}h old)`);
        staleItems.push(input);
      } else {
        console.log(`[Cache] HIT: "${input}" (${diffHours.toFixed(1)}h old)`);
      }
    }

    return staleItems;
  }

  // ── Product search (replaces NLP scoring engine) ───────────────────────────

  /**
   * Search for products matching user inputs, optionally filtered by dietary tags.
   *
   * Uses the NLP-based scoreRelevance() engine for matching (modifier-suffix
   * detection, processed-food penalties, non-grocery rejection, compound-word
   * analysis). Products scoring below 0.30 are excluded.
   *
   * @param {string}   userInput        Newline/comma-separated search terms
   * @param {string[]} selectedStoreIds
   * @param {string}   regionId
   * @param {string[]} filters          Dietary filter IDs e.g. ['gf','vegan']
   */
  async searchProducts(userInput, selectedStoreIds = [], regionId = 'us', filters = []) {
    const inputs = typeof userInput === 'string'
      ? userInput.split(/[\r\n,]+/).map(i => i.trim()).filter(i => i.length > 0)
      : [];

    if (inputs.length === 0) return [];

    const products = await ProductRepository.getWithPrices(selectedStoreIds, regionId);
    console.log(`[Search] "${inputs.join(', ')}" → ${products.length} records (filters: ${filters.join(',') || 'none'})`);

    const results = [];

    for (const input of inputs) {
      // Dietary filters: AND logic — product must carry ALL requested tags
      let candidates = products;
      if (filters.length > 0) {
        candidates = candidates.filter(p => {
          const tags = Array.isArray(p.dietary_tags) ? p.dietary_tags : [];
          return filters.every(f => tags.includes(f));
        });
        console.log(`[Filter] ${filters.join('+')} → ${candidates.length} candidates for "${input}"`);
      }

      const scored = candidates.map(p => {
        const relevance = scoreRelevance(p.name, input, regionId);
        return { ...p, relevance };
      }).filter(p => p.relevance >= 0.30);

      scored.sort((a, b) => {
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        return (a.price || 0) - (b.price || 0);
      });

      // Always push so the frontend can render a "no results" row per term
      results.push({ userInput: input, matches: scored.slice(0, 30) });
    }

    return results;
  }
}

module.exports = new BasketService();
