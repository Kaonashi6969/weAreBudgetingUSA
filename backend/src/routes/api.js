const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const BasketController = require('../controllers/BasketController');
const ListController = require('../controllers/ListController');
const { validate, BasketRequestSchema } = require('../middleware/validators');

// Region discovery (used by frontend region selector)
router.get('/regions', ProductController.getRegions);

// Product and Store routes
router.get('/products', ProductController.getProducts);
router.get('/stores', ProductController.getStores);   // supports ?region=us

// Basket logic routes
router.post('/basket', validate(BasketRequestSchema), BasketController.processBasket);

// Grocery List routes
router.post('/lists', ListController.saveList);
router.get('/lists', ListController.getLists);
router.delete('/lists/:id', ListController.deleteList);

module.exports = router;
