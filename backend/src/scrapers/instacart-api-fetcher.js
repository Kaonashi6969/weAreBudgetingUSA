const axios = require('axios');
require('dotenv').config();

class InstacartApiFetcher {
  constructor() {
    this.baseUrl = 'https://api.instacart.com/v1'; // Standard Developer Platform Base URL
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const clientId = process.env.INSTACART_CLIENT_ID;
    const clientSecret = process.env.INSTACART_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn('⚠️ [Instacart] Missing credentials in .env');
      return null;
    }

    try {
      const response = await axios.post('https://api.instacart.com/oauth/token', {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
      return this.accessToken;
    } catch (error) {
      console.error('❌ [Instacart] Auth error:', error.response?.data || error.message);
      return null;
    }
  }

  async searchProducts(term, zipCode = "90210") {
    console.log(`📡 [Instacart API] Searching: "${term}" in ${zipCode}`);
    
    const token = await this.getAccessToken();
    if (!token) {
      console.log('⚠️ [Instacart] No token available, falling back to mock or empty results');
      return this.getMockResults(term);
    }

    try {
      // API call to Instacart Developer Platform 'search' or 'items' endpoint
      const response = await axios.get(`${this.baseUrl}/items/search`, {
        params: {
          q: term,
          postal_code: zipCode
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const items = response.data?.items || [];
      return items.map(item => ({
        id: 'instacart-' + item.id,
        name: item.name,
        price: item.base_price || 0,
        currency: 'USD',
        category: 'Grocery',
        image_url: item.image_url,
        store: 'Instacart',
        url: item.view_url || `https://www.instacart.com/products/${item.id}`
      })).filter(p => p.price > 0);

    } catch (error) {
      console.error('❌ [Instacart API] Search error:', error.response?.data || error.message);
      return this.getMockResults(term);
    }
  }

  getMockResults(term) {
    if (process.env.NODE_ENV !== 'development') return [];
    
    return [
      {
        id: 'instacart-mock-1',
        name: `[Mock] ${term} from Instacart`,
        price: 4.99,
        currency: 'USD',
        category: 'Grocery',
        image_url: 'https://placehold.co/200x200?text=Instacart',
        store: 'Instacart',
        url: 'https://www.instacart.com'
      }
    ];
  }
}

module.exports = new InstacartApiFetcher();
