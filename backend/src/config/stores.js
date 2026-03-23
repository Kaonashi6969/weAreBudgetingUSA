/**
 * ⚠️  This file is a backward-compatibility shim.
 *
 * Store configuration has moved to src/config/regions/<id>.js
 * (each region file owns its own stores).
 *
 * To add a store for an existing or new region, edit (or create)
 * src/config/regions/<id>.js — nothing else needs changing.
 *
 * This shim re-exports everything the old stores.js used to export so that
 * all existing require('../config/stores') calls continue to work unchanged.
 */

module.exports = require('./regions/index');
