const RecipeRepository = require('./src/models/RecipeRepository');
const database = require('./src/db/database');

const recipes = [
  // ── US recipes ───────────────────────────────────────────────────────────
  {
    id: 'us-beef-tacos',
    name: 'Classic Beef Tacos',
    description: 'Ground beef tacos with all the essential toppings.',
    image_url: '/assets/recipes/taco-night.jpg',
    category: 'Mexican',
    region: 'us',
    servings: 4,
    ingredients: [
      { name: 'ground beef', qty: 1, unit: 'lb' },
      { name: 'taco shells', qty: 8, unit: 'pcs' },
      { name: 'shredded lettuce', qty: 2, unit: 'cups' },
      { name: 'cheddar cheese', qty: 4, unit: 'oz' },
      { name: 'salsa', qty: 8, unit: 'oz' },
      { name: 'sour cream', qty: 4, unit: 'oz' },
      { name: 'avocado', qty: 2, unit: 'pcs' },
    ],
    instructions: '1. Brown the beef. 2. Add taco seasoning. 3. Warm shells. 4. Assemble with toppings.'
  },
  {
    id: 'us-pancakes',
    name: 'Fluffy Pancakes',
    description: 'The best breakfast staple for lazy Sundays.',
    image_url: '/assets/recipes/pancakes.jpg',
    category: 'Breakfast',
    region: 'us',
    servings: 4,
    ingredients: [
      { name: 'all purpose flour', qty: 1.5, unit: 'cups' },
      { name: 'milk', qty: 1.25, unit: 'cups' },
      { name: 'eggs', qty: 1, unit: 'pcs' },
      { name: 'butter', qty: 3, unit: 'tbsp' },
      { name: 'baking powder', qty: 3.5, unit: 'tsp' },
      { name: 'sugar', qty: 1, unit: 'tbsp' },
      { name: 'maple syrup', qty: 4, unit: 'tbsp' },
    ],
    instructions: '1. Mix dry ingredients. 2. Add wet ingredients. 3. Cook on griddle. 4. Add syrup.'
  },
  {
    id: 'us-mac-and-cheese',
    name: 'Mac & Cheese',
    description: 'Creamy baked macaroni and cheese — comfort food at its best.',
    category: 'Comfort Food',
    region: 'us',
    servings: 6,
    ingredients: [
      { name: 'elbow macaroni', qty: 1, unit: 'lb' },
      { name: 'cheddar cheese', qty: 8, unit: 'oz' },
      { name: 'milk', qty: 2, unit: 'cups' },
      { name: 'butter', qty: 4, unit: 'tbsp' },
      { name: 'all purpose flour', qty: 0.25, unit: 'cups' },
      { name: 'salt', qty: 1, unit: 'tsp' },
      { name: 'bread crumbs', qty: 0.5, unit: 'cups' },
    ],
    instructions: '1. Cook macaroni. 2. Make cheese sauce with butter, flour, milk, cheese. 3. Combine, top with bread crumbs. 4. Bake at 375°F for 25 min.'
  },
  {
    id: 'us-chicken-stir-fry',
    name: 'Chicken Stir-Fry',
    description: 'Quick and healthy chicken with vegetables and soy sauce.',
    image_url: '/assets/recipes/chicken-stir-fry.jpg',
    category: 'Asian',
    region: 'us',
    servings: 2,
    ingredients: [
      { name: 'chicken breast', qty: 1, unit: 'lb' },
      { name: 'broccoli', qty: 2, unit: 'cups' },
      { name: 'carrots', qty: 2, unit: 'pcs' },
      { name: 'soy sauce', qty: 3, unit: 'tbsp' },
      { name: 'ginger', qty: 1, unit: 'tbsp' },
      { name: 'garlic', qty: 3, unit: 'pcs' },
      { name: 'rice', qty: 1, unit: 'cups' },
    ],
    instructions: '1. Cook rice. 2. Sauté chicken. 3. Add vegetables and sauce. 4. Serve over rice.'
  },

  // ── HU recipes ───────────────────────────────────────────────────────────
  {
    id: 'hu-gulyas',
    name: 'Gulyás',
    description: 'Gazdag, fűszeres magyar gulyásleves marhahússal, pirospaprikával és zöldségekkel.',
    image_url: '/assets/recipes/gulyas.jpg',
    category: 'Magyaros',
    region: 'hu',
    servings: 4,
    ingredients: [
      { name: 'marhalábszár', qty: 500, unit: 'g' },
      { name: 'vöröshagyma', qty: 2, unit: 'darab' },
      { name: 'sertészsír', qty: 2, unit: 'ek' },
      { name: 'fűszerpaprika', qty: 2, unit: 'ek' },
      { name: 'köménymag', qty: 1, unit: 'tk' },
      { name: 'fokhagyma', qty: 2, unit: 'darab' },
      { name: 'sárgarépa', qty: 2, unit: 'darab' },
      { name: 'fehérrépa', qty: 1, unit: 'darab' },
      { name: 'burgonya', qty: 3, unit: 'darab' },
      { name: 'paradicsom', qty: 1, unit: 'darab' },
      { name: 'Étkezési paprika', qty: 1, unit: 'darab' },
      { name: 'Tengeri só', qty: 1, unit: 'tk' },
    ],
    instructions: '1. A hagymát apróra vágjuk, zsíron üvegesre pirítjuk. 2. Lehúzzuk a tűzről, hozzáadjuk a pirospaprikát, majd a felkockázott marhahúst. 3. Sózzuk, borsozzuk, hozzáadjuk a köményt és a zúzott fokhagymát. 4. Kevés vízzel felöntjük, és közepes lángon pároljuk kb. 1 órán át. 5. Hozzáadjuk a felaprított zöldségeket (répa, fehérrépa, paprika, paradicsom), majd felöntjük a maradék vízzel. 6. Amikor a hús majdnem puha, beletesszük a kockázott burgonyát. 7. További 20–30 percig főzzük, amíg minden megpuhul, majd forrón tálaljuk.'
  },
  {
    id: 'hu-langos',
    name: 'Lángos',
    description: 'Crispy deep-fried dough topped with sour cream and cheese.',
    category: 'Street Food',
    region: 'hu',
    servings: 4,
    ingredients: [
      { name: 'liszt', qty: 500, unit: 'g' },
      { name: 'élesztő', qty: 25, unit: 'g' },
      { name: 'tej', qty: 250, unit: 'ml' },
      { name: 'só', qty: 1, unit: 'tk' },
      { name: 'fokhagyma', qty: 3, unit: 'pcs' },
      { name: 'tejföl', qty: 200, unit: 'g' },
      { name: 'reszelt sajt', qty: 200, unit: 'g' },
      { name: 'olaj', qty: 500, unit: 'ml' },
    ],
    instructions: '1. Mix dough from flour, yeast, milk. 2. Let rise 1 hr. 3. Shape into flat rounds. 4. Deep-fry until golden. 5. Rub with garlic. 6. Top with sour cream and cheese.'
  },
  {
    id: 'hu-toltott-kaposzta',
    name: 'Töltött Káposzta',
    description: 'Stuffed cabbage rolls simmered in sauerkraut — a holiday staple.',
    category: 'Magyaros',
    region: 'hu',
    servings: 6,
    ingredients: [
      { name: 'káposzta', qty: 1, unit: 'pcs' },
      { name: 'darált sertéshús', qty: 500, unit: 'g' },
      { name: 'rizs', qty: 100, unit: 'g' },
      { name: 'vöröshagyma', qty: 1, unit: 'pcs' },
      { name: 'pirospaprika', qty: 1, unit: 'ek' },
      { name: 'savanyú káposzta', qty: 500, unit: 'g' },
      { name: 'tejföl', qty: 200, unit: 'g' },
      { name: 'paradicsompüré', qty: 2, unit: 'ek' },
    ],
    instructions: '1. Boil cabbage leaves. 2. Mix pork, rice, onion, paprika. 3. Roll stuffing in leaves. 4. Layer with sauerkraut in pot. 5. Simmer 2 hrs. 6. Serve with sour cream.'
  }
];

async function seed() {
  console.log('Starting recipe seeding...');

  for (const recipeData of recipes) {
    try {
      await RecipeRepository.upsert(recipeData);
      console.log(`Upserted recipe: ${recipeData.name}`);
    } catch (err) {
      console.error(`Error upserting recipe ${recipeData.name}:`, err);
    }
  }

  console.log('Seeding complete.');
}

// Export for use by server startup
module.exports = { seed, recipes };

// Run directly if executed as a script
if (require.main === module) {
  database.initialize().then(() => seed()).then(() => process.exit(0));
}