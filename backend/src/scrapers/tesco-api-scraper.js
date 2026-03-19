const axios = require('axios');

class TescoApiScraper {
  constructor() {
    this.apiUrl = 'https://xapi.tesco.com/';
    this.apiKey = 'SPr9p907l7z1G98T16as4L5PAn759C4X'; 
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  }

  async search(query, cookies = []) {
    console.log(`📡 [Tesco API] Searching: ${query} ${cookies.length > 0 ? '(using browser cookies)' : ''}`);
    
    // Convert cookie array to string format for header
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const graphqlQuery = `query Search($query: String!, $page: Int = 1, $count: Int = 24, $sortBy: String = "relevance", $filterCriteria: [filterCriteria], $showDepositReturnCharge: Boolean = true) {
      search(query: $query, page: $page, count: $count, sortBy: $sortBy, filterCriteria: $filterCriteria) {
        results {
          node {
            ... on ProductType {
              id
              title
              defaultImageUrl
              sellers(type: TOP, limit: 1) {
                results {
                  price {
                    actual
                  }
                }
              }
            }
            ... on MPProduct {
              id
              title
              defaultImageUrl
              sellers(type: TOP, limit: 1) {
                results {
                  price {
                    actual
                  }
                }
              }
            }
          }
        }
      }
    }`;

    try {
      const response = await axios.post(this.apiUrl, {
        operationName: "Search",
        variables: {
          query: query,
          page: 1,
          count: 24,
          sortBy: "relevance",
          filterCriteria: [{ name: "inputType", values: ["free text"] }],
          showDepositReturnCharge: true
        },
        query: graphqlQuery
      }, {
        headers: {
          'content-type': 'application/json',
          'accept': '*/*',
          'accept-language': 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
          'x-apikey': this.apiKey,
          'origin': 'https://bevasarlas.tesco.hu',
          'referer': 'https://bevasarlas.tesco.hu/',
          'user-agent': this.userAgent,
          'cookie': cookieHeader
        }
      });

      if (!response.data || !response.data.data || !response.data.data.search) {
        console.error('❌ [Tesco API] Invalid response format', response.data);
        return [];
      }

      const results = response.data.data.search.results;
      return results.map(item => {
        const node = item.node;
        const price = node.sellers?.results[0]?.price?.actual;
        
        return {
          id: node.id,
          name: node.title,
          price: price,
          image_url: node.defaultImageUrl,
          store: 'Tesco',
          url: `https://bevasarlas.tesco.hu/groceries/hu-HU/products/${node.id}`
        };
      }).filter(item => item.price !== undefined);
      
    } catch (error) {
      console.error('❌ [Tesco API] Error fetching data:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
      }
      return [];
    }
  }
}

module.exports = new TescoApiScraper();
