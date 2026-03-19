require("dotenv").config();
const { chromium } = require("playwright");
const database = require("../db/database");
const PriceRepository = require('../models/PriceRepository');
const StoreRepository = require('../models/StoreRepository');
const ProductRepository = require('../models/ProductRepository');
const STORES = require('./config');
const tescoApiScraper = require('./tesco-api-scraper');
const krogerApiFetcher = require('./kroger-api-fetcher');
const walmartApiFetcher = require('./walmart-api-fetcher');
const instacartApiFetcher = require('./instacart-api-fetcher');

class DirectStoreScraper {
  constructor() {
    this.browser = null;
  }

  async launch() {
    if (this.browser) return;
    
    const isHeadless = process.env.SCRAPER_HEADLESS !== 'false';
    
    this.browser = await chromium.launch({ 
      headless: isHeadless,
      args: ["--disable-blink-features=AutomationControlled"]
    });
    
    if (!isHeadless) {
      console.log('🚀 Browser launched in HEADED mode for debugging.');
    }
  }

  async scrapeStore(store, termStr) {
    // Kroger API Fetching (USA)
    if (store.id === 'kroger') {
      console.log(`[DirectStoreScraper] Handling Kroger API for: ${termStr}`);
      try {
        const results = await krogerApiFetcher.searchProducts(termStr, store.zipCode || "45202");
        console.log(`[DirectStoreScraper] Kroger API returned raw results: ${results?.length || 0}`);
        
        if (results && results.length > 0) {
          console.log(`✅ [${store.name}] API returned ${results.length} results!`);
          
          for (const item of results) {
              console.log(`[DirectStoreScraper] Upserting product: ${item.name}`);
              await ProductRepository.upsertWithPrice(item, store.id);
          }

          return results;
        }
      } catch (err) {
        console.error(`❌ [${store.name}] API error: ${err.message}`);
      }
      return []; // Kroger is API only, no fallback needed for now
    }

    // Instacart Scraper (USA)
    if (store.id === 'instacart') {
      console.log(`[DirectStoreScraper] Handling Instacart API for: ${termStr}`);
      try {
        const results = await instacartApiFetcher.searchProducts(termStr, store.zipCode || "90210");
        
        if (results && results.length > 0) {
          console.log(`✅ [${store.name}] API returned ${results.length} results!`);
          for (const item of results) {
              await ProductRepository.upsertWithPrice(item, store.id);
          }
          return results;
        }
      } catch (err) {
        console.error(`❌ [${store.name}] API error: ${err.message}`);
      }
      return [];
    }

    await this.launch();
    
    const page = await this.browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    });

    // Check if we have an API scraper for this store
    if (store.id === 'tesco') {
      try {
        // 1. Quick initial navigation to get current session context
        await page.goto(store.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // 2. Perform the GraphQL search INSIDE the browser context to bypass Akamai/TLS fingerprinting
        const results = await page.evaluate(async ({ query, apiUrl, apiKey }) => {
          const graphqlQuery = `query Search($query: String!, $page: Int = 1, $count: Int = 24, $sortBy: String = "relevance", $filterCriteria: [filterCriteria], $showDepositReturnCharge: Boolean = true) {
            search(query: $query, page: $page, count: $count, sortBy: $sortBy, filterCriteria: $filterCriteria) {
              results {
                node {
                  ... on ProductType { id title defaultImageUrl sellers(type: TOP, limit: 1) { results { price { actual } } } }
                  ... on MPProduct { id title defaultImageUrl sellers(type: TOP, limit: 1) { results { price { actual } } } }
                }
              }
            }
          }`;

          try {
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-apikey': apiKey
              },
              body: JSON.stringify({
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
              })
            });

            const text = await response.text();
            if (!response.ok) {
              console.error(`Tesco API error: ${response.status} ${text}`);
              return null;
            }
            
            const data = JSON.parse(text);
            if (!data || !data.data || !data.data.search) return null;

            return data.data.search.results.map(item => {
              const node = item.node;
              return {
                id: node.id,
                name: node.title,
                price: node.sellers?.results[0]?.price?.actual,
                image_url: node.defaultImageUrl,
                store: 'Tesco',
                url: `https://bevasarlas.tesco.hu/groceries/hu-HU/products/${node.id}`
              };
            }).filter(i => i.price !== undefined);
          } catch (e) {
            return null;
          }
        }, { 
          query: termStr, 
          apiUrl: 'https://xapi.tesco.com/', 
          apiKey: 'SPr9p907l7z1G98T16as4L5PAn759C4X' 
        });

        if (results && results.length > 0) {
          console.log(`✅ [${store.name}] API (In-Browser) returned ${results.length} results!`);
          await page.close();
          return results;
        }
        console.log(`⚠️ [${store.name}] API returned no results, falling back to browser scraping.`);
      } catch (err) {
        console.error(`❌ [${store.name}] API error (In-Browser), falling back to browser: ${err.message}`);
      }
    }

    console.log(`🔍 [${store.name}] Searching (Browser DOM): ${termStr}`);
    
    try {
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      });

      const searchUrl = store.url + encodeURIComponent(termStr) + (store.suffix || "");
      
      console.log(`📡 [${store.name}] Navigating to: ${searchUrl}`);

      const response = await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 60000 
      });

      if (!response || response.status() >= 400) {
        throw new Error(`Failed to load page: ${response ? response.status() : 'No response'}`);
      }

      // Quick cookie accept
      try {
        await page.waitForTimeout(1000);
        const cookieButtons = ["button:has-text('Összes elfogadása')", "button:has-text('Elfogad')", "button#accept-all"];
        for (const selector of cookieButtons) {
          const btn = await page.$(selector);
          if (btn && await btn.isVisible()) {
            await btn.click({ force: true });
            break;
          }
        }
      } catch (e) {}
      
      await page.waitForTimeout(2000); 
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(1000);

      const items = await page.evaluate((s) => {
        const results = [];
        const container = document.querySelectorAll(s.itemSelector);

        container.forEach(el => {
          const nameEl = el.querySelector(s.nameSelector);
          const priceEl = el.querySelector(s.priceSelector);
          
          let linkEl;
          if (s.linkSelector === 'self') {
            linkEl = el;
          } else {
            linkEl = el.querySelector(s.linkSelector);
          }

          if (nameEl && priceEl) {
            const name = nameEl.innerText.trim();
            const priceText = priceEl.innerText.replace(/[^0-9,.]/g, "").replace(",", ".");
            const price = parseInt(priceText.split(".")[0]);
            
            let link = "";
            if (s.linkSelector === 'self') {
               link = el.getAttribute("href") || el.href || "";
            } else if (linkEl) {
               link = linkEl.getAttribute("href") || linkEl.href || "";
            }

            let image_url = "";
            if (s.imageSelector) {
              const imgEl = el.querySelector(s.imageSelector);
              if (imgEl) {
                // Check srcset first for high-quality/WebP links, then src or data-src
                const srcset = imgEl.getAttribute("srcset");
                if (srcset) {
                  // Get the first URL in the srcset (usually the best/only one provided)
                  image_url = srcset.split(',')[0].trim().split(' ')[0];
                } else {
                  image_url = imgEl.getAttribute("src") || imgEl.getAttribute("data-src") || "";
                }
                
                // If it's still a base64 placeholder, try looking for sibling <source> tags
                if (image_url.startsWith('data:image')) {
                  const pictureEl = imgEl.closest('picture');
                  if (pictureEl) {
                    const sourceEl = pictureEl.querySelector('source');
                    if (sourceEl) {
                      const sourceSrcset = sourceEl.getAttribute('srcset');
                      if (sourceSrcset) {
                        image_url = sourceSrcset.split(',')[0].trim().split(' ')[0];
                      }
                    }
                  }
                }
              }
            }
            
            if (link && !link.startsWith("http")) {
              if (s.baseUrl) {
                // Ensure no double slashes when joining baseUrl and link
                const base = s.baseUrl.endsWith('/') ? s.baseUrl.slice(0, -1) : s.baseUrl;
                const path = link.startsWith('/') ? link : '/' + link;
                link = base + path;
              } else {
                link = window.location.origin + (link.startsWith("/") ? "" : "/") + link;
              }
            }

            if (price > 10) {
              results.push({ name, price, url: link, image_url });
            }
          }
        });
        return results;
      }, store);

      return items;
    } catch (err) {
      console.error(`❌ [${store.name}] Error: ${err.message}`);
      return [];
    } finally {
      await page.close();
    }
  }

  async savePrice(productName, storeName, price, url, image_url = "", category = "Requested") {
    try {
      const storeId = storeName.toLowerCase().replace(/\s+/g, "_");
      const productId = productName.toLowerCase().replace(/\s+/g, "_").substring(0, 150);

      // Using repositories for database operations
      await database.run("INSERT OR IGNORE INTO stores (id, name) VALUES (?, ?)", [storeId, storeName]);
      await database.run("INSERT OR IGNORE INTO products (id, name, category, image_url) VALUES (?, ?, ?, ?)", [productId, productName, category, image_url]);
      
      // Update image_url if it was ignored during INSERT IGNORE
      if (image_url) {
        await database.run("UPDATE products SET image_url = ? WHERE id = ? AND (image_url IS NULL OR image_url = '')", [image_url, productId]);
      }
      
      await PriceRepository.upsert(productId, storeId, { price, unit: 'db', url });
    } catch (e) {
      console.error("Save error:", e.message);
    }
  }

  async scrapeOnDemand(term, selectedStoreIds = []) {
    console.log(`🚀 Triggering on-demand scrape for: "${term}" ${selectedStoreIds.length > 0 ? `(Stores: ${selectedStoreIds.join(', ')})` : '(All stores)'}`);
    try {
      await this.launch();
      // database.initialize() is called in server.js, but keeping it for standalone runs
      await database.initialize();

      const storesToScrape = selectedStoreIds.length > 0
        ? STORES.filter(s => selectedStoreIds.includes(s.name.toLowerCase()) || selectedStoreIds.includes(s.id))
        : STORES;

      const scrapePromises = storesToScrape.map(async (store) => {
        try {
          const items = await this.scrapeStore(store, term);
          for (const item of items) {
            await this.savePrice(item.name, store.name, item.price, item.url, item.image_url);
          }
          return items.length;
        } catch (err) {
          console.error(`Error scraping ${store.name}:`, err);
          return 0;
        }
      });

      const counts = await Promise.all(scrapePromises);
      const total = counts.reduce((a, b) => a + b, 0);
      console.log(`✅ On-demand scrape completed. Total items cached: ${total}`);
    } catch (err) {
      console.error(`Error in scrapeOnDemand for "${term}":`, err);
      // Don't crash the whole request if scraping fails, just log it
    }
  }

  async run() {
    // Legacy support for manual runs
    await this.scrapeOnDemand("rizs");
    if (this.browser) await this.browser.close();
  }
}

module.exports = DirectStoreScraper;
