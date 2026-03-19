require("dotenv").config();
const { chromium } = require("playwright");
const database = require("../db/database");
const PriceRepository = require('../models/PriceRepository');
const ProductRepository = require('../models/ProductRepository');
const { getStoresForRegion, getAllActiveStores } = require('../config/stores');
const krogerApiFetcher = require('./kroger-api-fetcher');
const walmartApiFetcher = require('./walmart-api-fetcher');
const instacartApiFetcher = require('./instacart-api-fetcher');

/**
 * Dispatch map: scraperType → fetcher function.
 * To support a new store, register its scraperType here and create its fetcher.
 * Browser DOM scraping is used automatically for any store without an entry here.
 */
const API_FETCHERS = {
  'kroger-api':    (store, term) => krogerApiFetcher.searchProducts(term, store.zipCode),
  'walmart-api':   (store, term) => walmartApiFetcher.searchProducts(term),
  'instacart-api': (store, term) => instacartApiFetcher.searchProducts(term, store.zipCode)
};

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
    // API-based fetcher (preferred, no browser needed)
    const apiFetcher = API_FETCHERS[store.scraperType];
    if (apiFetcher) {
      console.log(`[DirectStoreScraper] Using ${store.scraperType} for: ${termStr}`);
      try {
        const results = await apiFetcher(store, termStr);
        if (results && results.length > 0) {
          console.log(`✅ [${store.name}] API returned ${results.length} results`);
          for (const item of results) {
            await ProductRepository.upsertWithPrice(item, store.id);
          }
          return results;
        }
      } catch (err) {
        console.error(`❌ [${store.name}] API error: ${err.message}`);
      }
      return []; // API-only stores do not fall back to browser
    }

    // Browser DOM scraper — used for stores without a registered API fetcher
    return this._browserScrape(store, termStr);
  }

  async _browserScrape(store, termStr) {
    await this.launch();

    const page = await this.browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    });

    console.log(`🔍 [${store.name}] Searching (Browser DOM): ${termStr}`);
    
    try {
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
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
        const cookieButtons = ["button:has-text('Accept All')", "button:has-text('Accept')", "button#accept-all"];
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

async savePrice(productName, storeName, price, url, image_url = "", category = "Requested", regionId = "us") {
    try {
      const storeId = storeName.toLowerCase().replace(/\s+/g, "_");
      const productId = productName.toLowerCase().replace(/\s+/g, "_").substring(0, 150);

      await database.run("INSERT OR IGNORE INTO stores (id, name, region) VALUES (?, ?, ?)", [storeId, storeName, regionId]);
      await database.run("INSERT OR IGNORE INTO products (id, name, category, image_url) VALUES (?, ?, ?, ?)", [productId, productName, category, image_url]);

      // Update image_url if it was ignored during INSERT IGNORE
      if (image_url) {
        await database.run("UPDATE products SET image_url = ? WHERE id = ? AND (image_url IS NULL OR image_url = '')", [image_url, productId]);
      }
      
      await PriceRepository.upsert(productId, storeId, { price, unit: 'pcs', url });
    } catch (e) {
      console.error("Save error:", e.message);
    }
  }

  /**
   * Scrape a search term across all (or selected) stores for a given region.
   * @param {string}   term              - The product to search for.
   * @param {string[]} selectedStoreIds  - Optional subset of store IDs to target.
   * @param {string}   regionId          - Region context (default: 'us').
   */
  async scrapeOnDemand(term, selectedStoreIds = [], regionId = 'us') {
    const storeScope = selectedStoreIds.length > 0 ? `Stores: ${selectedStoreIds.join(', ')}` : `All ${regionId.toUpperCase()} stores`;
    console.log(`🚀 On-demand scrape: "${term}" | ${storeScope}`);
    try {
      await this.launch();
      // database.initialize() is called in server.js, but kept here for standalone use.
      await database.initialize();

      const regionStores = getStoresForRegion(regionId);
      const storesToScrape = selectedStoreIds.length > 0
        ? regionStores.filter(s => selectedStoreIds.includes(s.name.toLowerCase()) || selectedStoreIds.includes(s.id))
        : regionStores;

      const counts = await Promise.all(storesToScrape.map(async (store) => {
        try {
          const items = await this.scrapeStore(store, term);
          for (const item of items) {
            await this.savePrice(item.name, store.name, item.price, item.url, item.image_url, "Requested", regionId);
          }
          return items.length;
        } catch (err) {
          console.error(`Error scraping ${store.name}:`, err);
          return 0;
        }
      }));

      const total = counts.reduce((a, b) => a + b, 0);
      console.log(`✅ Scrape complete. Items cached: ${total}`);
    } catch (err) {
      console.error(`Error in scrapeOnDemand for "${term}":`, err);
      // Non-fatal: don't crash the request if scraping fails
    }
  }
}

module.exports = DirectStoreScraper;
