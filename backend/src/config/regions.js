/**
 * ⚠️  This file is a backward-compatibility shim.
 *
 * Region configuration has moved to src/config/regions/<id>.js
 * (one self-contained file per region).
 *
 * To add a new region, copy src/config/regions/_template.js to
 * src/config/regions/<your-id>.js and fill it in — nothing else needs changing.
 *
 * This shim re-exports everything the old regions.js used to export so that
 * all existing require('../config/regions') calls continue to work unchanged.
 */


module.exports = require('./regions/index');
