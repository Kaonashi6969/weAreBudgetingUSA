// Get list of shops to skip from environment variables (comma separated IDs)
const DISABLED_SHOPS = (process.env.SCRAPER_DISABLED_SHOPS || "").split(",").map(id => id.trim());

/**
 * Filtered store configuration based on environment settings.
 * To disable a shop in dev or test: 
 * Set SCRAPER_DISABLED_SHOPS=tesco,lidl in your .env file
 */
module.exports = [
  {
    name: "Kroger",
    id: "kroger",
    url: "KROGER_API",
    currency: "USD",
    zipCode: "45202"
  },
  {
    name: "Walmart",
    id: "walmart",
    url: "https://www.walmart.com",
    currency: "USD"
  },
  {
    name: "Instacart",
    id: "instacart",
    url: "https://www.instacart.com",
    currency: "USD"
  },
  {
    name: "Tesco",
    id: "tesco",
    url: "https://bevasarlas.tesco.hu/groceries/hu-HU/search?query=",
    suffix: "&inputType=free+text",
    itemSelector: "li[data-testid]",
    nameSelector: "h2 a, .gyT8MW_titleLink",
    priceSelector: ".gyT8MW_priceText",
    linkSelector: "h2 a, .gyT8MW_titleLink",
    imageSelector: "img.gyT8MW_image"
  },
  {
    name: "Auchan",
    id: "auchan",
    url: "https://auchan.hu/shop/search?q%5B%5D=",
    itemSelector: 'li[role="article"]',
    nameSelector: 'h3',
    priceSelector: '.q79l0cL0',
    linkSelector: 'a.xtt1nL9f',
    imageSelector: 'img.tVOcaHnl'
  },
  {
    name: "Lidl",
    id: "lidl",
    url: "https://www.lidl.hu/q/search?q=",
    itemSelector: '.odsc-tile',
    nameSelector: '.product-grid-box__title',
    priceSelector: '.ods-price__value',
    linkSelector: '.odsc-tile__link',
    imageSelector: '.odsc-tile__img img'
  },
  {
    name: "Aldi",
    id: "aldi",
    url: "https://www.aldi.hu/hu/search.html?search=",
    itemSelector: 'article.wrapper',
    nameSelector: '.product-title',
    priceSelector: '.at-product-price_lbl',
    linkSelector: 'a.at-moreinfo_btn',
    baseUrl: 'https://www.aldi.hu',
    imageSelector: '.product-image img'
  }
].filter(shop => !DISABLED_SHOPS.includes(shop.id));


