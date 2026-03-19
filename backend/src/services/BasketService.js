const ProductRepository = require('../models/ProductRepository');
const PriceRepository = require('../models/PriceRepository');
const natural = require('natural');
const { getRegion } = require('../config/regions');
const { getStoresByIds } = require('../config/stores');

const tokenizer = new natural.WordTokenizer();
const metaphone = natural.Metaphone;
const JaroWinklerDistance = natural.JaroWinklerDistance;

class BasketService {
  async getStaleTerms(itemsStr, selectedStoreIds = []) {
    const inputs = typeof itemsStr === 'string' 
      ? itemsStr.split(/[\r\n,]+/).map(i => i.trim().toLowerCase()).filter(i => i.length > 0)
      : [];

    // If every selected store is API-based (noCache:true), skip the TTL check entirely
    // and treat all terms as stale so fresh data is always fetched from the API.
    const selectedStores = getStoresByIds(selectedStoreIds);
    const allNoCache = selectedStores.length > 0 && selectedStores.every(s => s.noCache === true);
    if (allNoCache) {
      console.log(`[Cache] All selected stores are API-based. Bypassing TTL — treating all ${inputs.length} term(s) as stale.`);
      return inputs;
    }

    const staleItems = [];

    for (const input of inputs) {
      const processedInput = input;
      const normalizedInput = processedInput.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ");
      
      // Pass store IDs to only check staleness for the selected stores
      const latestPrice = await PriceRepository.getLatestUpdateForProduct(processedInput, normalizedInput.replace(/\s+/g, "_"), selectedStoreIds);

      console.log(`[Check Stale] Term: "${processedInput}", Found in selected stores: ${latestPrice?.last_update ? 'YES ('+latestPrice.last_update+')' : 'NO'}`);

      if (!latestPrice || !latestPrice.last_update) {
        staleItems.push(processedInput);
      } else {
        const lastUpdated = new Date(latestPrice.last_update);
        const now = new Date();
        const diffInHours = (now - lastUpdated) / (1000 * 60 * 60);

        if (diffInHours > 24) {
          staleItems.push(processedInput);
        }
      }
    }
    return staleItems;
  }

  async calculateCheapestBasket(userInput, selectedStoreIds = [], regionId = 'us') {
    const region = getRegion(regionId);
    const { processedWordPenalty, snackWordPenalty } = region.nlp;

    console.log(`Calculate: "${userInput}", Stores: ${selectedStoreIds}, Region: ${regionId}`);
    const inputs = typeof userInput === 'string' 
      ? userInput.split(/[\r\n,]+/).map(item => item.trim().toLowerCase()).filter(item => item.length > 0)
      : [];

    const productsWithPrices = await ProductRepository.getWithPrices(selectedStoreIds);
    console.log(`Matching against ${productsWithPrices.length} total price records`);
    const results = [];

    for (const input of inputs) {
      const processedInput = input;
      const lowInput = input.toLowerCase();

      const normalizedInput = processedInput
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, " ");

      const iWords = normalizedInput.split(/\s+/).filter(w => w.length > 0);

      const scoredOffers = productsWithPrices.map(p => {
        const pNameLower = p.name.toLowerCase();
        const cleanPName = pNameLower
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9 ]/g, " ");

        // 1. String similarity (JaroWinkler is good for typos, but not enough for substrings)
        const similarity = JaroWinklerDistance(normalizedInput, cleanPName);
        
        // 2. Exact word match (The most important part - it's "vaj" regardless of name length)
        const pTokens = tokenizer.tokenize(cleanPName);
        const iTokens = tokenizer.tokenize(normalizedInput);
        
        // Exact whole word match (e.g. "paradicsom" matches "fuztos paradicsom" but NOT "paradicsomle")
        const hasExactToken = iTokens.every(it => pTokens.includes(it));
        
        let score = similarity;

        if (hasExactToken) {
            // HUGE boost for finding the actual root word
            score += 3.0;

            // Category Penalty: penalise processed/liquid versions the user didn’t ask for
            const cleanPNom = cleanPName.toLowerCase();
            const isProcessed = processedWordPenalty.some(pw =>
              pTokens.some(pt => pt.toLowerCase() === pw) || cleanPNom.includes(pw)
            );
            const userAskedForProcessed = iTokens.some(it => processedWordPenalty.includes(it));

            if (isProcessed && !userAskedForProcessed) {
              score -= 3.5;
            }

            // Snack/Pastry Penalty
            const isSnack = snackWordPenalty.some(sw => pTokens.includes(sw) || cleanPName.includes(sw));
            if (isSnack) {
              score -= 1.8;
            }

            // Length Bonus: favour shorter, purer names
            const lengthRatio = normalizedInput.length / cleanPName.length;
            score += lengthRatio * 0.6;
        } else {
            // Not an exact word match (e.g. searching "Paradicsom" but finding "Paradicsomos")
            score *= 0.1;
        }

        // Start of name boost
        if (cleanPName.startsWith(normalizedInput)) {
            score += 0.3;
        }

        return { ...p, score };
      });

      // Filter matches and sort by distance score (primary) and price (secondary)
      const matches = scoredOffers
        .filter(o => o.score >= 0.8) // Higher threshold because exact matches start at ~1.5
        .sort((a, b) => (b.score - a.score) || (a.price - b.price));

      console.log(`Input "${input}" found ${matches.length} matches. Best score: ${matches[0]?.score?.toFixed(2) || 0}`);
      
      const topMatches = matches.slice(0, 5);

      if (topMatches.length > 0) {
        results.push({
          userInput: input,
          matches: topMatches
        });
      }
    }
    return results;
  }
}

module.exports = new BasketService();
