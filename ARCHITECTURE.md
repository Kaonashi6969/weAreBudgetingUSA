# 🏗️ We Are Budgeting - Technical Architecture

This document provides a deep dive into the technical design, architectural patterns, and core algorithms of the "We Are Budgeting" project.

## 🗄️ Project Structure

The project is split into a **Unified Repository** with a clear separation between `backend` and `frontend`.

### 🔙 Backend (Node.js + Express + SQLite)

A layered architecture focused on domain isolation and testability:

- **src/controllers/**: Maps HTTP requests to Service calls. Validates inputs via Zod/Validators.
- **src/services/**: The "Brain" of the app.
  - `BasketService.js`: Implements the NLP scoring logic and basket aggregation.
  - `BackupService.js`: Manages SQLite snapshots and filesystem integrity.
- **src/models/**: Implements the **Repository Pattern**. 
  - Abstracts SQL queries and logic (e.g., `ProductRepository`, `PriceRepository`).
  - Uses `BaseRepository` for shared logic.
- **src/scrapers/**: Automated data collection layer.
  - Uses **Playwright** with `playwright-extra-plugin-stealth`.
  - modular `direct-store-scraper.js` that pulls configurations for multiple retailers (Walmart, Kroger).
- **src/db/database.js**: SQLite connection management and schema initializations.

### 🎨 Frontend (Angular 21)

Modern standalone component architecture using high-performance reactivity and strict clean code principles:

- **src/app/components/**: A modular library of **8+ standalone components**:
  - `IconComponent`: Root SVG handling with `:host` flexbox logic for perfect alignment.
  - `ToastListComponent`: Global notification system driven by `UiStore`.
  - `BasketComponent` / `ProfileComponent`: Feature-level logic orchestrators.
  - `ProductResultCard` / `SavedListCard`: Reusable UI bricks for results and data visualization.
- **src/app/models/types.ts**: Central **Source of Truth** for all data interfaces, eliminating `any` and ensuring 100% type safety.
- **src/app/services/**:
  - `ApiService`: Standard HTTP wrapper with JWT injection for authenticated requests and typed Observables.
  - `UiStore`: **Signal-based** global state for notifications, user session, and active region configuration.
- **SCSS Styling**: Scoped styles using SCSS pre-processor for variables and logical nesting.
- **Angular Control Flow**: Migrated to `@if` and `@for` (Angular 17+ Modern Control Flow) for faster rendering and cleaner templates.

---

## 🔍 Core Search & Scoring Logic

The `BasketService.calculateCheapestBasket` logic is the primary differentiator of this engine. It uses the `natural` NLP library to rank offers.

### Scoring Algorithm:
1. **Normalization**: Text is stripped of unnecessary characters, diacritics, and lowercase-normalized.
2. **Tokenizer & Metaphone fallback**: Uses `natural.WordTokenizer` for word-level analysis and phonetic checks.
3. **Exact Token & Position Boost**: If the user's search term is present as a standalone word or at the start of the product name, the score is significantly boosted (up to **99.0** for absolute matches).
4. **Category/Type Penalties**:
   - **Processed Foods**: If the name contains "sauce", "juice", "drink" but the user didn't ask for it, a **heavy penalty** is applied.
   - **Snack/Pastry Penalty**: Detects items like "cookie" or "croissant" when searching for basic ingredients to prevent noise.
5. **Brand Weighting**: Support for brand-specific weights via [regions.js](backend/src/config/regions.js) to favor or penalize certain brands in search results.
6. **Selection UX**: Manual selection of search results ensures the user picks exactly what they need, avoiding accidental increments and "double-adding".
7. **External Deep-Linking**: Saved items now include direct breadcrumb links to the original retailer's product page for immediate purchase.

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
| **Scraping** | Playwright Stealth | Necessary to bypass Akamai/Cloudflare protections on modern supermarket sites. |
| **Security** | Helmet + Rate Limit | Hardens the application against common exploit vectors. |
| **Deployment** | Docker + PM2 | Standard containerization for predictable environments and process self-healing. |

## 📦 Data Lifecycle

1. **User Request**: User enters "csirke".
2. **Local Cache Check**: `BasketService` checks if `PriceRepository` has fresh data (<24h).
3. **Just-In-Time Extraction**: If data is stale, the `direct-store-scraper` is triggered in the background.
4. **Aggregation**: Results from all active stores are scored, ranked, and returned.
5. **Save**: Logged-in users can persist their selected "Winner" items for future reference in their profile.
