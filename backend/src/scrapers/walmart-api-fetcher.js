const axios = require('axios');
require('dotenv').config();

class WalmartApiFetcher {
  constructor() {
    this.apiUrl = 'https://www.walmart.com/search/api/preso';
  }

  async searchProducts(term) {
    console.log(`📡 [Walmart] Searching: "${term}"`);
    
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          q: term,
          prg: 'desktop',
          page: 1,
          ps: 24
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      const items = response.data?.searchResults?.itemStacks?.[0]?.items || response.data?.items || [];
      return this.mapItems(items);

    } catch (error) {
      console.error('❌ [Walmart] API error:', error.message);
      return [];
    }
  }

  mapItems(items) {
    return items.map(item => ({
      id: item.usItemId || item.productId,
      name: item.name || item.title,
      price: item.priceInfo?.currentPrice?.price || item.price || 0,
      currency: 'USD',
      image_url: item.image || item.thumbnailUrl,
      store: 'Walmart',
      url: `https://www.walmart.com${item.canonicalUrl || '/ip/' + item.usItemId}`
    })).filter(p => p.price > 0);
  }
}

module.exports = new WalmartApiFetcher();
