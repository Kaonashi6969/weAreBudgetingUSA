const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const BasketController = require('../controllers/BasketController');
const ListController = require('../controllers/ListController');
const { validate, BasketRequestSchema } = require('../middleware/validators');
const database = require('../db/database');

// Mock User Middleware for API routes in Development
router.use(async (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    try {
      if (!database.db) {
        await database.initialize();
      }
      const mockEmail = process.env.DEV_MOCK_USER_EMAIL || 'tester1@example.com';
      const user = await database.get('SELECT * FROM users WHERE email = ?', [mockEmail]);
      if (user) {
        req.user = user;
      }
    } catch (err) {
      console.error('API Mock user fetch error:', err);
    }
  }
  next();
});

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
