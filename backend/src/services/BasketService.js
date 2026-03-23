const ProductRepository = require('../models/ProductRepository');
const PriceRepository = require('../models/PriceRepository');
const natural = require('natural');
const { getRegion } = require('../config/regions');
const { getStoresByIds } = require('../config/stores');

const tokenizer = new natural.WordTokenizer();
const JaroWinklerDistance = natural.JaroWinklerDistance;
const LevenshteinDistance = natural.LevenshteinDistance;

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
    const { processedWordPenalty, snackWordPenalty, brandWeights = {} } = region.nlp;

    console.log(`Calculate: "${userInput}", Stores: ${selectedStoreIds}, Region: ${regionId}`);
    const inputs = typeof userInput === 'string' 
      ? userInput.split(/[\r\n,]+/).map(item => item.trim().toLowerCase()).filter(item => item.length > 0)
      : [];

    const productsWithPrices = await ProductRepository.getWithPrices(selectedStoreIds);
    console.log(`Matching against ${productsWithPrices.length} total price records`);
    const results = [];

    for (const input of inputs) {
      const lowInput = input.toLowerCase().trim();

      const normalizedInput = lowInput
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, " ");

      const iTokens = tokenizer.tokenize(normalizedInput).map(t => t.toLowerCase());
      if (iTokens.length === 0) continue;

      const scoredOffers = productsWithPrices.map(p => {
        const pNameLower = p.name.toLowerCase();
        const cleanPName = pNameLower
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9 ]/g, " ");

        const pTokens = tokenizer.tokenize(cleanPName).map(t => t.toLowerCase());
        
        // 1. Exact Match Check (Highest Priority)
        // If the normalized input exactly matches the product name (stripped of non-alphanumeric)
        if (cleanPName.replace(/\s+/g, '') === normalizedInput.replace(/\s+/g, '')) {
            return { ...p, score: 99.0 }; // Absolute winner
        }

        // 2. Exact word match check (Must contain all user words)
        const containsAllTokens = iTokens.every(it => pTokens.includes(it));
        
        // 3. Substring match check (Backup for partial words)
        const containsAsSubstring = iTokens.every(it => cleanPName.includes(it));

        let score = 0;

        if (containsAllTokens) {
            score += 10.0;
            // Short name bonus (prefer "Milk" over "Milk with Vitamin D and Omega 3")
            const lengthPenalty = (cleanPName.length - normalizedInput.length) * 0.05;
            score -= lengthPenalty;
        } else if (containsAsSubstring) {
            score += 5.0;
        } else {
            // Fuzzy similarity fallback (JaroWinkler is good for typos)
            const similarity = JaroWinklerDistance(normalizedInput, cleanPName);
            score += similarity * 2.0;
        }

        // 4. Position Bonus (Word appears at the start)
        if (cleanPName.startsWith(normalizedInput)) {
            score += 2.0;
        }

        // 5. NLP Penalties (Category Mismatch)
        const isProcessed = processedWordPenalty.some(pw => pTokens.includes(pw) || cleanPName.includes(pw));
        const userAskedForProcessed = iTokens.some(it => processedWordPenalty.includes(it));

        if (isProcessed && !userAskedForProcessed) {
            score -= 6.0; // Heavy penalty for unwanted "Juice" when asking for "Orange"
        }

        const isSnack = snackWordPenalty.some(sw => pTokens.includes(sw) || cleanPName.includes(sw));
        const userAskedForSnack = iTokens.some(it => snackWordPenalty.includes(it));

        if (isSnack && !userAskedForSnack) {
            score -= 3.0; // Penalty for "Cookies" etc.
        }

        // 6. Brand Weight/Quality (Optional from config)
        for (const [brand, weight] of Object.entries(brandWeights)) {
            if (pTokens.includes(brand.toLowerCase())) {
                score += weight;
            }
        }

        return { ...p, score };
      });

      // Filter matches and sort:
      // 1. By score (Relevance)
      // 2. By price (Secondary, if score is very close)
      const matches = scoredOffers
        .filter(o => o.score > 0.5) 
        .sort((a, b) => {
            // If scores are significantly different, use score
            if (Math.abs(b.score - a.score) > 0.1) {
                return b.score - a.score;
            }
            // Otherwise, cheaper is better
            return a.price - b.price;
        });

      console.log(`Input "${input}" found ${matches.length} matches. Best score: ${matches[0]?.score?.toFixed(2) || 0}`);
      
      const topMatches = matches.slice(0, 50); // Increased from 10 to 50 for more variety

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
