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
- **State**: The `UiStore` (service with signals) is the source of truth for global state (user, region, notifications).

## 🔙 Backend Guidelines (Node.js)
- **Pattern**: Follow the Repository Pattern for database access (`backend/src/models/`).
- **Validation**: Use middleware for request validation (e.g., `validators.js`).
- **Security**: Always sanitize inputs using the `sanitizer.js` middleware.
- **Modularity**: New store support should be added via the **Region Plugin System** in `backend/src/config/regions/`.

## 🔍 Specialized Logic
- **Scraping**: Logic resides in `backend/src/scrapers/` using Playwright.
- **NLP Matching**: The `BasketService.calculateCheapestBasket` handles the core scoring logic using the `natural` library. Use existing scoring patterns for consistency.

## 🧪 Testing
- Keep tests scoped and mock external dependencies (APIs, Database).
