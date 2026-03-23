# 🛒 Cheapest Grocery Basket Finder - Multi-Region Edition

A professional grocery search engine and price comparison tool for global retailers. Built with a modular **Region Plugin System**, a modern **Angular frontend**, and a scalable **layered Node.js backend**.

## ✨ Features

- **Multi-Region Support**: Easily toggle between markets (USA, Hungary, etc.). Each region is a standalone plugin.
- **Store Filtering**: Select specific retailers (Walmart, Kroger, Tesco, Auchan, Lidl, Aldi) to search in.
- **Top 5 Offers**: See the best 5 prices for every product, ranked by relevance and value.
- **Just-In-Time Scraper**: Automatically fetches fresh prices using Playwright if data is missing or older than 24h. Supports DOM scraping and API-based fetchers.
- **Advanced NLP Matching**: Multi-language scoring engine using `natural` (Tokenizer + Jaro-Winkler) that handles exact word matches, brand weighting, and category penalties tailored per region.
- **I18n Localisation**: Full internationalization support (EN, HU, ES, DE, UK) using **Transloco**.
- **Google OAuth 2.0**: Secure authentication for saving shopping lists and profiles.
- **Saved Inventories**: Dedicated page for users to save, name, and retrieve their favorite shopping baskets. Items in saved lists link directly to the retailer's product page.
- **Modern Frontend**: Built with **Angular 21** (2026 Edition) using **Signals** for reactive state management and **Modern Control Flow** (`@if`, `@for`).
- **Basket State Persistence**: Shopping list inputs, selected stores, and search results are stored in the global `UIStore` — navigating to Profile and back preserves your basket exactly as you left it.

## 🏗️ Technical Architecture

### Backend (Node.js + Express + SQLite)
The backend follows a **Layered/Clean Architecture** with a **Plugin-Based Config**:
- **Region Plugins** (backend/src/config/regions/): Modular `.js` files that define how each market behaves and looks.
- **Controllers** (backend/src/controllers/): Handle API requests.
- **Services** (backend/src/services/): Core business logic (basket calculation, stale data detection).
- **Repositories** (backend/src/models/): Abstracted database access using the Repository Pattern.
- **Scrapers** (backend/src/scrapers/): Playwright-based bots and API fetchers.

### Frontend (Angular 21)
- **Standalone Component Library**: Highly modular architecture:
  - `IconComponent`: Unified SVG renderer.
  - `StoreSelector` / `RegionSelector`: Modularized selection and branding logic.
  - `ProductResultCard`: Encapsulated matching and selection UI.
  - `SavedListCard`: Reusable list preview.
- **Internationalization**: Managed via `Transloco` with support for dynamic language switching.
- **Route Guards & Lazy Loading**: `/profile` and `/saved-lists` are lazy-loaded and protected by `AuthGuard`.
- **RxJS & Signals**: Efficient state management and change detection.
- **Strict Typing**: Full TypeScript coverage with a central [types.ts](frontend/src/app/models/types.ts) library.

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** 18+
- **Angular CLI** (npm install -g @angular/cli)

### 2. Installation
```powershell
# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 3. Development Mode
Start both services for live-reloading:

**Terminal 1 (Backend):**
```powershell
cd backend
npm start
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
ng serve
```
The app will be available at [http://localhost:4200](http://localhost:4200).

---

## 🏗️ Production Readiness & Deployment

This project has been hardened for production environments with several professional features:

### 🔒 Security & Performance
- **Helmet.js & Rate Limiting**: Added to protect against common web vulnerabilities and brute-force attacks.
- **SSL/HTTPS**: Ready for deployment behind Nginx (template provided in [nginx/nginx.conf.template](nginx/nginx.conf.template)).
- **Auth Tiering**: Supports **Google OAuth 2.0** with **JWT** tokens.
- **Environment Management**: Dual configuration via `.env.development` and `.env.production`.
- **Nginx**: Domain-parameterised via `${DOMAIN}` environment variable (`envsubst` at deploy time). Includes gzip compression and `Cache-Control: immutable` headers for fingerprinted Angular assets.

### 💾 Backup & Process Management
- **Automated Backups**: [backend/src/services/BackupService.js](backend/src/services/BackupService.js) handles database consistency checks and 7-day retention of SQLite snapshots.
- **Process Clustering**: Managed by **PM2** (see [backend/ecosystem.config.js](backend/ecosystem.config.js)) for high availability and automatic restarts.
- **Docker Ready**: Multi-stage [Dockerfile](Dockerfile) included for building an optimized production image (Angular + Node.js).

---

## 🛡️ Authentication & Tiers

The app supports a dual-tier model (**Free** vs **Pro**):
- **Free**: Includes advertisements and basic search capabilities.
  - *ADS_ENABLED=true* in production.
- **Pro**: Ad-free experience with advanced scraping features.
  - Subscription management architecture is ready for Stripe integration.

---

## 🔗 API Reference

### GET /api/regions
Returns all supported regions with their currency info.

**Response:**
```json
[
  { "id": "us", "name": "United States", "currency": { "code": "USD", "symbol": "$" } },
  { "id": "uk", "name": "United Kingdom", "currency": { "code": "GBP", "symbol": "£" } }
]
```

### GET /api/stores?region=us
Returns the list of supported retailers for a given region.

### POST /api/basket
Calculate the cheapest basket for a list of items in a region.

**Request Body** (validated by Zod — all fields type-checked on the server):
```json
{
  "items": ["chicken breast", "milk"],
  "selectedStores": ["walmart", "kroger"],
  "region": "us"
}
```

**Response:**
```json
[
  {
    "userInput": "milk",
    "isFresh": false,
    "matches": [
      {
        "name": "Great Value Whole Milk 1 Gallon",
        "price": 3.98,
        "store": "Walmart",
        "url": "..."
      }
    ]
  }
]
```

### GET /api/products
Returns all items currently in the local database.

---

## 📜 Maintenance
- **JIT Scraping**: Triggered automatically when a requested item is data is older than 24h.
- **Scheduler**: The background task (scheduler.js) performs bulk updates daily.
