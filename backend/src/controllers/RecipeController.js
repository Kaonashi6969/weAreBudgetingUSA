const RecipeRepository = require('../models/RecipeRepository');
const RecipeService = require('../services/RecipeService');

class RecipeController {
  async getAllRecipes(req, res) {
    try {
      const { category, q, region } = req.query;
      let recipes;

      if (q) {
        recipes = await RecipeRepository.search(q, region);
      } else if (category) {
        recipes = await RecipeRepository.getByCategory(category, region);
      } else {
        recipes = await RecipeRepository.getAll(region);
      }

      res.json(recipes);
    } catch (err) {
      console.error('Error fetching recipes:', err);
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  }

  async getRecipeById(req, res) {
    try {
      const recipe = await RecipeRepository.getById(req.params.id);
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      res.json(recipe);
    } catch (err) {
      console.error('Error fetching recipe:', err);
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  }

  async getRecipePriceEstimate(req, res) {
    try {
      const { id } = req.params;
      const { region, stores } = req.query;
      const storeIds = stores ? stores.split(',') : [];

      const estimate = await RecipeService.getRecipePriceEstimate(id, region || 'us', storeIds);
      if (!estimate) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      res.json(estimate);
    } catch (err) {
      console.error('Error calculating recipe price estimate:', err);
      res.status(500).json({ error: 'Failed to calculate price estimate' });
    }
  }
}

module.exports = new RecipeController();