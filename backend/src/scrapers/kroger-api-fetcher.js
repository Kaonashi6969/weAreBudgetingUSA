const axios = require('axios');
require('dotenv').config();

class KrogerApiFetcher {
  constructor() {
    // Environment: Certification
    this.tokenUrl = 'https://api-ce.kroger.com/v1/connect/oauth2/token';
    this.apiUrl = 'https://api-ce.kroger.com/v1';
    this.clientId = process.env.KROGER_CLIENT_ID;
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    console.log('🔐 [Kroger API] Authenticating...');
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    try {
      const response = await axios.post(this.tokenUrl, 'grant_type=client_credentials&scope=product.compact', {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'weAreBudgeting-App'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      console.log('✅ [Kroger API] Authenticated successfully');
    } catch (error) {
      console.error('❌ [Kroger API] Authentication failed!');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data));
        console.error('Used Client ID:', this.clientId);
        // We don't print the secret for security, but we verify it's loaded
        console.error('Secret loaded:', this.clientSecret ? 'Yes (starts with ' + this.clientSecret.substring(0,3) + '...)' : 'No');
      } else {
        console.error('Error Message:', error.message);
      }
      throw error;
    }
  }

  async ensureAuthenticated() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  async searchProducts(term, zipCode = "45202") { // Default to Cincinnati (Kroger HQ)
    await this.ensureAuthenticated();
    
    console.log(`📡 [Kroger API] Searching: "${term}" near ${zipCode}`);
    
    try {
      const response = await axios.get(`${this.apiUrl}/products`, {
        params: {
          'filter.term': term,
          'filter.zipCode.near': zipCode,
          'filter.limit': 10
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      });

      console.log(`📦 [Kroger API] Response status: ${response.status}`);
      console.log(`📦 [Kroger API] Items found: ${response.data?.data?.length || 0}`);
      
      if (response.data?.data?.length > 0) {
          const item0 = response.data.data[0];
          console.log(`📦 [Kroger API] Item 0 'items' length: ${item0.items?.length || 0}`);
          if (item0.items?.length > 0) {
              console.log(`📦 [Kroger API] Item 0 first element: ${JSON.stringify(item0.items[0])}`);
          }
      }

      if (!response.data || !response.data.data) return [];

      return response.data.data.map(product => {
        const item = product.items[0];
        // In Certification/Sandbox, price might be missing or hidden. 
        // We'll use a mock price for development if it's missing to test the DB flow.
        const price = item?.price?.regular || item?.price?.promo || (process.env.NODE_ENV === 'development' ? 2.99 : 0);
        
        // Find best image
        const image = product.images?.find(i => i.perspective === 'front') || product.images?.[0];
        const imageUrl = image?.sizes?.find(s => s.size === 'medium')?.url || image?.sizes?.[0]?.url;

        return {
          id: product.productId,
          name: product.description,
          brand: product.brand,
          price: price,
          currency: 'USD',
          image_url: imageUrl,
          store: 'Kroger',
          // Use item ID if available, fallback to productId
          url: `https://www.kroger.com/p/${product.description.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${item?.itemId || product.productId}`
        };
      }).filter(p => p.price > 0);

    } catch (error) {
      console.error('❌ [Kroger API] Search error:', error.response?.data || error.message);
      return [];
    }
  }
}

module.exports = new KrogerApiFetcher();
