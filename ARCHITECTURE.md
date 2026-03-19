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
  - modular `direct-store-scraper.js` that pulls configurations for multiple retailers (Tesco, Auchan, Lidl, Aldi).
- **src/db/database.js**: SQLite connection management and schema initializations.

### 🎨 Frontend (Angular 19)

Modern standalone component architecture using high-performance reactivity:

- **src/app/components/**: Logic-heavy UI components (Basket, Products, Profile).
- **src/app/services/**:
  - `ApiService`: Standard HTTP wrapper with JWT injection for authenticated requests.
  - `UiStore`: **Signal-based** global state for notifications and loading indicators.
- **src/app/app.routes.ts**: Lazy-loaded routes for optimized bundle sizes.

---

## 🔍 Core Search & Scoring Logic

The `BasketService.calculateCheapestBasket` logic is the primary differentiator of this engine. It uses the `natural` NLP library to rank offers.

### Scoring Algorithm:
1. **Normalization**: Hungarian accents are stripped (`á` -> `a`), and text is lowercase-normalized.
2. **Jaro-Winkler Similarity**: Measures the character-level similarity between input and product name.
3. **Exact Token Boost**: If the user's search term is present as a standalone whole word (e.g., "vaj"), the score is boosted by **+3.0**. This ensures "Vaj" ranked above "Vajaskifli".
4. **Category/Type Penalties**:
   - **Processed Foods**: If the name contains "szósz", "le", "ital" but the user didn't ask for it, a **-3.5 penalty** is applied (filtering out pasta sauces when looking for raw tomatoes).
   - **Snack/Pastry Penalty**: Detects items like "pogácsa" or "croissant" when searching for basic ingredients to prevent noise.
5. **Length Bonus**: Shorter, more precise matches are favored via a length ratio bonus.

---

## 🛠️ Tech Stack & Decisions

| Layer | Technology | Reason |
| :--- | :--- | :--- |
| **Language** | TypeScript (FE) / Node.js (BE) | Unified ecosystem and developer productivity. |
| **Framework** | Angular 19 | Signals provide the most efficient change detection for dynamic basket lists. |
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
