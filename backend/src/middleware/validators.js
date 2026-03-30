const { z } = require('zod');

// Schema for searching/filtering products
const ProductFilterSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  category: z.string().optional()
});

// Schema for adding/updating products in the basket
const BasketItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().default(1)
});

// Schema for the POST /basket request
const BasketRequestSchema = z.object({
  items: z.union([
    z.string().min(1).max(2000),
    z.array(z.string().min(1).max(200)).min(1).max(50)
  ]),
  selectedStores: z.union([
    z.array(z.string().min(1).max(50)),
    z.string().max(500)
  ]).optional(),
  region: z.string().regex(/^[a-z]{2}$/).optional().default('us')
});

// Generic middleware helper for validating requests
const validate = (schema) => (req, res, next) => {
  try {
    // Validate either body or query based on request type
    const dataToValidate = req.method === 'GET' ? req.query : req.body;
    schema.parse(dataToValidate);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }
      });
    }
    next(error);
  }
};

// Schema for GET /recipes
const RecipeListSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  region: z.string().regex(/^[a-z]{2}$/).optional()
});

// Schema for GET /recipes/:id/price-estimate
const RecipePriceEstimateSchema = z.object({
  region: z.string().regex(/^[a-z]{2}$/).optional().default('us'),
  stores: z.string().max(500).optional()
});

module.exports = {
  ProductFilterSchema,
  BasketItemSchema,
  BasketRequestSchema,
  RecipeListSchema,
  RecipePriceEstimateSchema,
  validate
};
