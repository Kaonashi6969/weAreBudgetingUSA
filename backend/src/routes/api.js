const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const BasketController = require('../controllers/BasketController');
const ListController = require('../controllers/ListController');
const RecipeController = require('../controllers/RecipeController');
const { validate, BasketRequestSchema, RecipeListSchema, RecipePriceEstimateSchema } = require('../middleware/validators');

// Region discovery (used by frontend region selector)
router.get('/regions', ProductController.getRegions);

// Product and Store routes
router.get('/products', ProductController.getProducts);
router.get('/stores', ProductController.getStores);   // supports ?region=us

// Recipe routes
router.get('/recipes', validate(RecipeListSchema), RecipeController.getAllRecipes);
router.get('/recipes/:id', RecipeController.getRecipeById);
router.get('/recipes/:id/price-estimate', validate(RecipePriceEstimateSchema), RecipeController.getRecipePriceEstimate);

// Basket logic routes
router.post('/basket', validate(BasketRequestSchema), BasketController.processBasket);

// Grocery List routes
router.post('/lists', ListController.saveList);
router.get('/lists', ListController.getLists);
router.patch('/lists/:id', ListController.updateList);
router.delete('/lists/:id', ListController.deleteList);

module.exports = router;
