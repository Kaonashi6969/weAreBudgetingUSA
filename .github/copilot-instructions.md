# GitHub Copilot Instructions - We Are Budgeting USA

This repository contains a professional grocery search engine and price comparison tool. 

## 🏗️ Project Overview
- **Frontend**: Angular 21 (Signals, Standalone Components, Modern Control Flow `@if`/`@for`).
- **Backend**: Node.js, Express, SQLite.
- **Architecture**: Layered/Clean Architecture with a Plugin-based Region system.

## 🛠️ General Coding Standards
- **Strict Typing**: Always use precise types. Avoid `any`. Refer to `frontend/src/app/models/types.ts` for shared interfaces.
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/components, and kebab-case for file names.
- **Documentation**: Use JSDoc for complex logic. Keep comments concise and meaningful.

## 🎨 Frontend Guidelines (Angular 21)
- **Reactivity**: Use **Signals** (`signal()`, `computed()`, `effect()`) for state management instead of manual change detection or excessive RxJS where appropriate.
- **Components**: Use **Standalone Components**. Ensure components are modular and reusable.
- **Styling**: Use SCSS with the defined CSS custom-property token system in `styles.scss` for dark mode support.
- **Control Flow**: Use the modern `@if`, `@for`, `@switch` syntax.
- **State**: The `UiStore` (service with signals) is the source of truth for global state (user, region, notifications). Region is persisted to `localStorage` for cross-page currency consistency.

## 🔙 Backend Guidelines (Node.js)
- **Pattern**: Follow the Repository Pattern for database access (`backend/src/models/`).
- **Validation**: Use middleware for request validation (e.g., `validators.js`).
- **Security**: Always sanitize inputs using the `sanitizer.js` middleware.
- **Modularity**: New store support should be added via the **Region Plugin System** in `backend/src/config/regions/`.

## 🔍 Specialized Logic
- **Scraping**: Logic resides in `backend/src/scrapers/` using Playwright. Scraped results are filtered through `product-relevance.js` before saving to the DB.
- **NLP Relevance Scoring**: `backend/src/utils/product-relevance.js` is the shared scoring engine used by both the scraper (`filterRelevantProducts`) and `BasketService.searchProducts` (`scoreRelevance`). Features: modifier-suffix detection (HU case forms, EN/DE adjectives), compound-word analysis, multi-word coverage, processed-food penalties, non-grocery auto-rejection, Dice-coefficient fallback. Threshold: 0.30.
- **Recipes**: Regional recipes with real-time price estimates. Backend: `RecipeRepository` (region-aware CRUD), `RecipeService` (price estimation via BasketService), `RecipeController`. Frontend: `RecipeListComponent`, `RecipeDetailComponent` — both use `effect()` to reactively reload on region changes. Validated by Zod schemas (`RecipeListSchema`, `RecipePriceEstimateSchema`).

## 🧪 Testing
- Keep tests scoped and mock external dependencies (APIs, Database).
