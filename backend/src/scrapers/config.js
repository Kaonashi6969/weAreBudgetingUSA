// Get list of shops to skip from environment variables (comma separated IDs)
const DISABLED_SHOPS = (process.env.SCRAPER_DISABLED_SHOPS || "").split(",").map(id => id.trim());

/**
 * Filtered store configuration based on environment settings.
 * To disable a shop in dev or test: 
 * Set SCRAPER_DISABLED_SHOPS=tesco,lidl in your .env file
 */
module.exports = [
  {
    name: "Walmart",
    id: "walmart",
    url: "https://www.walmart.com",
    currency: "USD"
  },
  {
    name: "Kroger",
    id: "kroger",
    url: "KROGER_API",
    currency: "USD",
    zipCode: "45202"
  },
  {
    name: "Instacart",
    id: "instacart",
    url: "https://www.instacart.com",
    currency: "USD"
  }
].filter(shop => !DISABLED_SHOPS.includes(shop.id));


