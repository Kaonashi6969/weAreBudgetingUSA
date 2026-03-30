require("dotenv").config();
const { chromium } = require("playwright");
const database = require("../db/database");
const PriceRepository = require('../models/PriceRepository');
const ProductRepository = require('../models/ProductRepository');
const { getStoresForRegion, getAllActiveStores, API_FETCHERS } = require('../config/regions');const { filterRelevantProducts } = require('../utils/product-relevance');
// API_FETCHERS is assembled automatically from all region files in src/config/regions/.
// To add scraper support for a new store, register it in that store's region file â€”
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
      console.log('ðŸš€ Browser launched in HEADED mode for debugging.');
    }
  }

  async scrapeStore(store, termStr) {
    // Ensure the store row exists in the DB so JOINs work
    const region = store.regions?.[0] || 'us';
    await database.run(
      'INSERT OR IGNORE INTO stores (id, name, region) VALUES (?, ?, ?)',
      [store.id, store.name, region],
    );

    // API-based fetcher (preferred, no browser needed)
    const apiFetcher = API_FETCHERS[store.scraperType];
    if (apiFetcher) {
      console.log(`[DirectStoreScraper] Using ${store.scraperType} for: ${termStr}`);
      try {
        const results = await apiFetcher(store, termStr);
        if (results && results.length > 0) {
          console.log(`âœ… [${store.name}] API returned ${results.length} results`);
          const relevant = filterRelevantProducts(results, termStr, region);
          for (const item of relevant) {
            await ProductRepository.upsertWithPrice(item, store.id);
          }
          return relevant;
        }
      } catch (err) {
        console.error(`âŒ [${store.name}] API error: ${err.message}`);
      }
      return []; // API-only stores do not fall back to browser
    }

    // Browser DOM scraper â€” used for stores without a registered API fetcher
    return this._browserScrape(store, termStr);
  }

  async _browserScrape(store, termStr) {
    await this.launch();

    const page = await this.browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    });

    const maxPages = store.maxPages || 1;
    const baseUrl = store.url + encodeURIComponent(termStr) + (store.suffix || '');
    const allItems = [];

    try {
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      });

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        // Build the URL for this page
        let searchUrl = baseUrl;
        if (pageNum > 1) {
          if (!store.pagination) break; // No pagination config â€” stop
          const { param, start, increment } = store.pagination;
          const value = start + (pageNum - 2) * increment;
          searchUrl = `${baseUrl}&${param}=${value}`;
        }

        console.log(`ðŸ“¡ [${store.name}] Page ${pageNum}/${maxPages}: ${searchUrl}`);

        const response = await page.goto(searchUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });

        if (!response || response.status() >= 400) {
          console.warn(`âš ï¸ [${store.name}] Page ${pageNum} HTTP ${response?.status() || 'no response'} â€” stopping.`);
          break;
        }

        // Accept cookie dialog on first page only
        if (pageNum === 1) {
          try {
            await page.waitForTimeout(1000);
            for (const selector of [
              "button:has-text('Accept All')",
              "button:has-text('Accept')",
              "button#accept-all",
              "button:has-text('Ã–sszes elfogadÃ¡sa')",
              "button:has-text('Elfogad')",
            ]) {
              const btn = await page.$(selector);
              if (btn && await btn.isVisible()) {
                await btn.click({ force: true });
                break;
              }
            }
          } catch (e) { /* ignore */ }
        }

        // Scroll to trigger lazy-loading
        await page.waitForTimeout(pageNum === 1 ? 2000 : 1500);
        await page.evaluate(async () => {
          for (let i = 0; i < 3; i++) {
            window.scrollBy(0, 500);
            await new Promise(r => setTimeout(r, 500));
          }
        });
        await page.waitForTimeout(800);

        // Extract items using store selectors
        const items = await page.evaluate((s) => {
          const results = [];
          document.querySelectorAll(s.itemSelector).forEach(el => {
            const nameEl = el.querySelector(s.nameSelector);
            const priceEl = el.querySelector(s.priceSelector);
            if (!nameEl || !priceEl) return;

            const name = nameEl.innerText.trim();
            const priceText = priceEl.innerText.replace(/[^0-9,.]/g, '').replace(',', '.');
            const price = parseInt(priceText.split('.')[0]);
            if (!price || price <= 0) return;

            // Link
            let link = '';
            if (s.linkSelector === 'self') {
              link = el.getAttribute('href') || el.href || '';
            } else {
              const linkEl = el.querySelector(s.linkSelector);
              if (linkEl) link = linkEl.getAttribute('href') || linkEl.href || '';
            }

            // Image (tries multiple lazy-load patterns)
            let image_url = '';
            const imgEl = s.imageSelector ? el.querySelector(s.imageSelector) : el.querySelector('img');
            if (imgEl) {
              const srcset = imgEl.getAttribute('srcset');
              const dataSrc = imgEl.getAttribute('data-src') ||
                              imgEl.getAttribute('data-original') ||
                              imgEl.getAttribute('data-lazy-src') ||
                              imgEl.getAttribute('data-srcset');
              const src = imgEl.getAttribute('src') || imgEl.src || '';

              if (srcset) {
                image_url = srcset.split(',')[0].trim().split(' ')[0];
              } else if (dataSrc && !dataSrc.startsWith('data:image')) {
                image_url = dataSrc;
              } else if (src && !src.startsWith('data:image')) {
                image_url = src;
              }

              // Fallback: look for <source> inside <picture>
              if (!image_url || image_url.startsWith('data:image')) {
                const source = el.querySelector('source');
                if (source) {
                  const sSet = source.getAttribute('srcset');
                  if (sSet) image_url = sSet.split(',')[0].trim().split(' ')[0];
                }
              }
            }

            // Fix relative URLs
            if (link && !link.startsWith('http')) {
              const base = s.baseUrl
                ? (s.baseUrl.endsWith('/') ? s.baseUrl.slice(0, -1) : s.baseUrl)
                : window.location.origin;
              link = base + (link.startsWith('/') ? link : '/' + link);
            }
            if (image_url && !image_url.startsWith('http') && !image_url.startsWith('data:')) {
              image_url = window.location.origin + (image_url.startsWith('/') ? image_url : '/' + image_url);
            }

            // Dietary tags (English + Hungarian keywords)
            const n = name.toLowerCase();
            const tags = [];
            if (n.includes('vegan') || n.includes('vegÃ¡n') || n.includes('plant-based') || n.includes('nÃ¶vÃ©nyi')) tags.push('vegan');
            if (n.includes('gluten-free') || n.includes('glutÃ©nmentes') || / gm /.test(n) || n.startsWith('gm ') || n.endsWith(' gm')) tags.push('gf');
            if (n.includes('keto') || n.includes('ketogÃ©n')) tags.push('keto');
            if (/\bbio\b/.test(n) || n.includes('organic') || n.includes('Ã¶ko') || n.includes('organikus')) tags.push('bio');

            results.push({ name, price, url: link, image_url, dietary_tags: tags });
          });
          return results;
        }, store);

        if (items.length === 0) {
          console.log(`[${store.name}] Page ${pageNum}: no items found â€” stopping.`);
          break;
        }

        console.log(`âœ… [${store.name}] Page ${pageNum}: ${items.length} items`);
        allItems.push(...items);

        // Check if a "next page" button exists; if not, stop early
        if (store.nextPageSelector) {
          const hasNext = await page.$(store.nextPageSelector);
          if (!hasNext) {
            console.log(`[${store.name}] No next-page element found â€” stopping at page ${pageNum}.`);
            break;
          }
        }
      }

      // Filter by relevance, then save to DB
      const regionId = store.regions?.[0] || 'us';
      const relevantItems = filterRelevantProducts(allItems, termStr, regionId);

      for (const item of relevantItems) {
        const productId = item.name.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
          .substring(0, 150);
        await ProductRepository.upsertWithPrice({ ...item, id: productId, category: 'Scraped' }, store.id);
        const label = item.image_url ? `Image: ${item.image_url.substring(0, 50)}...` : 'NO IMAGE';
        console.log(`${item.image_url ? 'âœ…' : 'âš ï¸'} [${store.name}] ${item.name} | ${label}`);
      }

      console.log(`[${store.name}] Total saved: ${relevantItems.length}/${allItems.length} items across ${Math.min(maxPages, allItems.length > 0 ? maxPages : 1)} page(s)`);
      return relevantItems;

    } catch (err) {
      console.error(`âŒ [${store.name}] Error: ${err.message}`);
      return allItems; // return whatever was collected
    } finally {
      await page.close();
    }
  }

  async savePrice(productName, storeName, price, url, image_url = '', category = 'Requested', regionId = 'us') {
    try {
      const storeId = storeName.toLowerCase().replace(/\s+/g, '_');
      const productId = productName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 150);

      await database.run(
        'INSERT OR IGNORE INTO stores (id, name, region) VALUES (?, ?, ?)',
        [storeId, storeName, regionId],
      );

      const dietaryTags = JSON.stringify([]);
      await database.run(
        `INSERT INTO products (id, name, category, image_url, dietary_tags)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           category = excluded.category,
           image_url = excluded.image_url`,
        [productId, productName, category, image_url, dietaryTags],
      );

      await PriceRepository.upsert(productId, storeId, { price, unit: 'pcs', url });

      if (image_url) {
        console.log(`âœ… [${storeName}] Saved: ${productName} | Image: ${image_url.substring(0, 50)}...`);
      } else {
        console.warn(`âš ï¸ [${storeName}] Saved: ${productName} | NO IMAGE FOUND`);
      }
    } catch (e) {
      console.error(`âŒ [${storeName}] Save error for ${productName}:`, e.message);
    }
  }

  /**
   * Scrape a search term across all (or selected) stores for a given region.
   */
  async scrapeOnDemand(term, selectedStoreIds = [], regionId = 'us') {
    const storeScope = selectedStoreIds.length > 0
      ? `Stores: ${selectedStoreIds.join(', ')}`
      : `All ${regionId.toUpperCase()} stores`;
    console.log(`ðŸš€ On-demand scrape: "${term}" | ${storeScope}`);

    try {
      await this.launch();
      await database.initialize();

      const regionStores = getStoresForRegion(regionId);
      const storesToScrape = selectedStoreIds.length > 0
        ? regionStores.filter(s => selectedStoreIds.includes(s.id) || selectedStoreIds.includes(s.name.toLowerCase()))
        : regionStores;

      // scrapeStore handles saving internally â€” no second loop needed
      const counts = await Promise.all(storesToScrape.map(async (store) => {
        try {
          const items = await this.scrapeStore(store, term);
          return items.length;
        } catch (err) {
          console.error(`Error scraping ${store.name}:`, err);
          return 0;
        }
      }));

      const total = counts.reduce((a, b) => a + b, 0);
      console.log(`âœ… Scrape complete. Items cached: ${total}`);
    } catch (err) {
      console.error(`Error in scrapeOnDemand for "${term}":`, err);
    }
  }
}

module.exports = DirectStoreScraper;
