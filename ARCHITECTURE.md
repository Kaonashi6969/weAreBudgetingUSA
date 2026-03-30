# 🏗️ We Are Budgeting - Technical Architecture

This document provides a deep dive into the technical design, architectural patterns, and core algorithms of the "We Are Budgeting" project.

## 🗄️ Project Structure

The project is split into a **Unified Repository** with a clear separation between `backend` and `frontend`.

### 🔙 Backend (Node.js + Express + SQLite)

A layered architecture focused on domain isolation and testability:

- **src/config/regions/**: The **Region Plugin System**.
  - `index.js`: Dynamically loads all `<region>.js` files from the directory.
  - `<id>.js` (e.g., `hu.js`, `us.js`): Self-contained configuration for a market. Defines metadata (currency, NLP rules), store selectors (item, name, price, image), and scraper registrations.
- **src/middleware/validators.js**: Zod schemas including `BasketRequestSchema` (validates `items`, `selectedStores`, `region`), `RecipeListSchema` (validates `q`, `category`, `region`), and `RecipePriceEstimateSchema` (validates `region`, `stores`) — wired as middleware on respective routes.
- **src/middleware/sanitizer.js**: XSS/HTML sanitization of all request inputs, including recursive sanitization of string properties inside nested objects in arrays.
- **src/services/**: The "Brain" of the app.
  - `BasketService.js`: Delegates product search to the NLP scoring engine (`product-relevance.js`) and handles basket aggregation.
  - `RecipeService.js`: Calculates real-time price estimates for recipe ingredients by delegating to `BasketService`. Returns per-ingredient matches, per-store totals, and the cheapest store.
  - `BackupService.js`: Manages SQLite snapshots and filesystem integrity.
- **src/utils/**:
  - `product-relevance.js`: **NLP-based relevance scoring engine** used by both the scraper (save-time filtering) and `BasketService` (search-time scoring). Features: modifier-suffix detection (HU case forms, EN/DE adjectives), compound-word analysis, multi-word coverage check, processed-food penalties, non-grocery auto-rejection (cosmetics, pet food, air fresheners), and Dice-coefficient fallback. Region-aware via `LANG` mapping.
  - `units.js`: Unit normalization, `parsePackageFromName()`, and `calculateProportionalCost()` for structured ingredient pricing.
- **src/models/**: Implements the **Repository Pattern**. 
  - Abstracts SQL queries and logic (e.g., `ProductRepository`, `PriceRepository`, `ListRepository`, `RecipeRepository`).
  - `RecipeRepository`: Region-aware CRUD with centralized JSON parsing (`_parseRows()`) for `ingredients` fields.
  - Uses `BaseRepository` for shared logic.
- **src/scrapers/**: Automated data collection layer.
  - Uses **Playwright** with `playwright-extra-plugin-stealth`.
  - `direct-store-scraper.js`: A universal engine that executes DOM-based scraping or calls specialized `API_FETCHERS` based on the active region/store configuration. Support for lazy-loading (auto-scroll) and relative URL resolution. Applies `filterRelevantProducts()` from `product-relevance.js` **before saving** to the database to discard irrelevant results.
- **src/db/database.js**: SQLite connection management and schema initializations.

### 🎨 Frontend (Angular 21)

Modern standalone component architecture using high-performance reactivity and strict clean code principles:

- **src/app/components/**: A modular library of **10+ standalone components**:
  - `IconComponent`: Root SVG handling with `:host` flexbox logic for perfect alignment.
  - `ToastListComponent`: Global notification system driven by `UiStore`.
  - `BasketComponent` / `ProfileComponent`: Feature-level logic orchestrators.
  - `ProductResultCard` / `SavedListCard`: Reusable UI bricks for results and data visualization.
  - `RecipeListComponent`: Displays regional recipes filtered by category/search, with reactive region switching via `effect()`.
  - `RecipeDetailComponent`: Full recipe view with ingredient list, instructions, and real-time price estimates from the basket engine.
- **src/app/guards/auth.guard.ts**: Functional `CanActivateFn` guard — redirects unauthenticated users to `/` if `UIStore.user()` is null. Applied to `/profile` and `/saved-lists`.
- **src/app/models/types.ts**: Central **Source of Truth** for all data interfaces, eliminating `any` and ensuring 100% type safety.
- **src/app/services/**:
  - `ApiService`: Standard HTTP wrapper with JWT injection for authenticated requests and typed Observables.
  - `UiStore`: **Signal-based** global state for notifications, user session, active region, basket state, and **dark mode** (`darkMode` signal initialized from `window.matchMedia`, toggled via `setDarkMode()`). Region is persisted to `localStorage` so the correct currency survives page refreshes.
  - `NativeService`: Wraps **Capacitor** device APIs (camera, etc.) with `isNative()` detection and graceful web fallbacks.
- **Routing**: `/profile` and `/saved-lists` routes are **lazy-loaded** (`loadComponent`) and **guard-protected** (`canActivate: [authGuard]`). `/recipes` and `/recipes/:id` are lazy-loaded without auth requirements.
- **SCSS Styling**: Scoped styles using SCSS pre-processor. A **CSS design-token system** is defined in `styles.scss` as `:root` custom properties with a `@mixin dark-tokens` block applied under both `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`. The `AppComponent` sets the attribute reactively via `effect()`, and listens for OS preference changes via `matchMedia.addEventListener`.
- **Angular Control Flow**: Migrated to `@if` and `@for` (Angular 17+ Modern Control Flow) for faster rendering and cleaner templates.

---

## 🔍 Core Search & Relevance Scoring

The search pipeline uses a **two-stage NLP relevance engine** (`product-relevance.js`) powered by the `natural` library. The same engine filters products at **scrape time** (before saving to the DB) and **search time** (when matching user queries against stored products).

### Scoring Algorithm (`scoreRelevance`):

Returns a 0.0–1.0 relevance score per product–query pair.

1. **Non-Grocery Rejection**: Products containing cosmetics, pet food, or household keywords (`testápoló`, `kutyaeledel`, `légfrissítő`, etc.) are auto-rejected (→ 0.02).
2. **Exact / Prefix Match**: Exact name match → 1.0. Clean prefix → 0.95.
3. **Modifier-Suffix Detection**: Recognizes HU grammatical suffixes (`-s`, `-os`, `-val`, `-vel`, `-ban`, `-nak`, etc.) and EN/DE space-separated modifiers (`flavored`, `seasoned`, `style`). Also detects HU spaced modifiers (`ízű`, `ízesítésű`, `ízesítéssel`). Modifier-only matches score low (0.15).
4. **Compound-Word Analysis**: Detects when the search term is a prefix of a larger compound word (e.g., `tojás` → `tojásfesték`) and checks if the continuation is a processed-food word → treated as modifier. Also handles root overlap for related compounds (`fűszerpaprika` ↔ `pirospaprika`).
5. **Multi-Word Coverage**: For multi-word searches like `tengeri só`, checks if all query words appear in the product name even when not adjacent (e.g., `tengeri finom só` → KEEP).
6. **Dice-Coefficient Fallback**: For products with no substring match, uses bigram similarity as a last resort.
7. **Penalties**:
   - **Processed-food words** in the product name (`ketchup`, `szósz`, `chips`, `csokoládé`, `snack`, etc.) apply a 0.35× penalty.
   - **Split-compound mismatch** (HU): Penalizes when the search is a compound word but the product has it split.

### Threshold:
- Default: **0.30** — products below this are discarded.

### Data Lifecycle:
1. **User Request**: User enters "tengeri só".
2. **Local Cache Check**: `BasketService` checks if `PriceRepository` has fresh data (<24h browser / <1h API).
3. **Just-In-Time Extraction**: If data is stale, the `direct-store-scraper` is triggered. Scraped results pass through `filterRelevantProducts()` — irrelevant items are discarded **before** writing to the DB.
4. **Search & Score**: `BasketService.searchProducts()` runs `scoreRelevance()` against all DB products for the region, keeping only those ≥ 0.30.
5. **Aggregation**: Results are sorted by relevance (DESC) then price (ASC), top 30 returned per term.
6. **Save**: Logged-in users can persist their selected "Winner" items for future reference.

---

## 🛠️ Tech Stack & Decisions

| Layer | Technology | Reason |
| :--- | :--- | :--- |
| **Language** | TypeScript (FE) / Node.js (BE) | Unified ecosystem and developer productivity. |
| **Framework** | Angular 21 | Modern Control Flow and Signals provide the most efficient change detection. |
| **State Management**| Signals | Granular reactivity without the overhead of Zone.js where possible. |
| **Styling** | SCSS | Powerful variables and nesting for maintainable modular styling. |
| **Linters** | ESLint / Stylelint | Enforces high code quality and strict standard compliance (TS, HTML, SCSS). |
| **Database** | SQLite | Serverless, extremely fast for read-heavy retail data, and easy to backup. |
| **Auth** | Passport.js + JWT | Industry standard for Google OAuth and stateless API security. |
| **NLP** | natural (Dice Coefficient) | Bigram-based fallback similarity for fuzzy matching in `product-relevance.js`. |
| **Scraping** | Playwright Stealth | Necessary to bypass Akamai/Cloudflare protections on modern supermarket sites. |
| **Security** | Helmet + Rate Limit | Hardens the application against common exploit vectors. |
| **Deployment** | Docker + PM2 | Standard containerization for predictable environments and process self-healing. |
