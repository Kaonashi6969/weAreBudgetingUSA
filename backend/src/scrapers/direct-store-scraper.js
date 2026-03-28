require("dotenv").config();
const { chromium } = require("playwright");
const database = require("../db/database");
const PriceRepository = require('../models/PriceRepository');
const ProductRepository = require('../models/ProductRepository');
const { getStoresForRegion, getAllActiveStores, API_FETCHERS } = require('../config/regions');

// API_FETCHERS is assembled automatically from all region files in src/config/regions/.
// To add scraper support for a new store, register it in that store's region file —
// no changes needed here.

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
        const cookieButtons = [
          "button:has-text('Accept All')", 
          "button:has-text('Accept')", 
          "button#accept-all",
          "button:has-text('Összes elfogadása')", 
          "button:has-text('Elfogad')"
        ];
        for (const selector of cookieButtons) {
          const btn = await page.$(selector);
          if (btn && await btn.isVisible()) {
            await btn.click({ force: true });
            break;
          }
        }
      } catch (e) {}
      
      await page.waitForTimeout(2000); 
      await page.evaluate(async () => {
        // Scroll incrementally to trigger lazy loading
        for (let i = 0; i < 3; i++) {
          window.scrollBy(0, 500);
          await new Promise(r => setTimeout(r, 500));
        }
      });
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
                // Better image detection for Tesco and others
                const srcset = imgEl.getAttribute("srcset");
                const dataSrc = imgEl.getAttribute("data-src") || 
                                imgEl.getAttribute("data-original") || 
                                imgEl.getAttribute("data-lazy-src") ||
                                imgEl.getAttribute("data-srcset");
                const src = imgEl.getAttribute("src") || imgEl.src || "";

                if (srcset) {
                  image_url = srcset.split(',')[0].trim().split(' ')[0];
                } else if (dataSrc && !dataSrc.startsWith('data:image')) {
                  image_url = dataSrc;
                } else if (src && !src.startsWith('data:image')) {
                  image_url = src;
                }
                
                // Fallback to searching for images in child picture/source tags
                if (!image_url || image_url.startsWith('data:image')) {
                  const source = el.querySelector('source');
                  if (source) {
                    const sSet = source.getAttribute('srcset');
                    if (sSet) image_url = sSet.split(',')[0].trim().split(' ')[0];
                  }
                }
              }
            } else {
              // If no specific image selector, try a generic find
              const anyImg = el.querySelector('img');
              if (anyImg) image_url = anyImg.getAttribute('src') || anyImg.src;
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

            // Also fix relative image URLs if they exist
            if (image_url && !image_url.startsWith("http") && !image_url.startsWith("data:")) {
              image_url = window.location.origin + (image_url.startsWith("/") ? "" : "/") + image_url;
            }

            if (price > 0) {
              // Enhanced dietary tags for Hungarian/English
              const lowerName = name.toLowerCase();
              const dietaryTags = [];
              
              // Vegan: English + Hungarian (növényi, vegán)
              if (lowerName.includes('vegan') || lowerName.includes('vegán') || lowerName.includes('plant-based') || lowerName.includes('növényi')) {
                dietaryTags.push('vegan');
              }
              
              // Gluten-Free: English + Hungarian (gluténmentes, gm, mentes)
              // Note: "gm" usually stands for gluténmentes in HU shops
              if (lowerName.includes('gluten-free') || lowerName.includes('gluténmentes') || lowerName.includes(' gm ') || lowerName.startsWith('gm ') || lowerName.endsWith(' gm')) {
                dietaryTags.push('gf');
              }
              
              // Keto: Simple keyword
              if (lowerName.includes('keto') || lowerName.includes('ketogén')) {
                dietaryTags.push('keto');
              }
              
              // Bio/Organic: English + Hungarian (bio, öko, organikus)
              if (lowerName.includes('bio ') || lowerName.startsWith('bio ') || lowerName.includes('organic') || lowerName.includes('öko') || lowerName.includes('organikus')) {
                dietaryTags.push('bio');
              }

              results.push({ name, price, url: link, image_url, dietary_tags: dietaryTags });
            }
          }
        });
        return results;
      }, store);

      // 4. Save results to DB
      for (const item of items) {
        const productId = item.name.toLowerCase().replace(/\s+/g, "_").substring(0, 150);
        await ProductRepository.upsertWithPrice({
          ...item,
          id: productId,
          category: "Scraped"
        }, store.id);
      }

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

      // 1. Ensure store exists
      await database.run(
        "INSERT OR IGNORE INTO stores (id, name, region) VALUES (?, ?, ?)", 
        [storeId, storeName, regionId]
      );

      // 2. Upsert product with its image_url
      // We use ON CONFLICT to ensure the image_url is ALWAYS updated, even if the product existed with a blank one.
      await database.run(
        `INSERT INTO products (id, name, category, image_url) 
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
         name = excluded.name,
         category = excluded.category,
         image_url = excluded.image_url`,
        [productId, productName, category, image_url]
      );
      
      // 3. Upsert the current price for this store
      await PriceRepository.upsert(productId, storeId, { price, unit: 'pcs', url });

      if (image_url) {
        console.log(`✅ [${storeName}] Saved: ${productName} | Image: ${image_url.substring(0, 50)}...`);
      } else {
        console.warn(`⚠️ [${storeName}] Saved: ${productName} | NO IMAGE FOUND`);
      }

    } catch (e) {
      console.error(`❌ [${storeName}] Save error for ${productName}:`, e.message);
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
