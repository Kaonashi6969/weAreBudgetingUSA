// Backward-compat shim — import from src/config/stores.js instead.
const { getStoresForRegion } = require('../config/stores');

// Returns all active US stores by default (the original behaviour).
module.exports = getStoresForRegion('us');


