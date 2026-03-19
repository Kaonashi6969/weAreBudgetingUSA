# 🛒 Cheapest Grocery Basket Finder - USA Edition

A professional grocery search engine and price comparison tool for USA retailers (Walmart, Kroger, etc.). Built with a modern **Angular frontend** and a scalable **layered Node.js backend**.

## ✨ Features

- **Store Filtering**: Select specific retailers (Walmart, Kroger, etc.) to search in.
- **Top 5 Offers**: See the best 5 prices for every product, ranked by relevance and value.
- **Just-In-Time Scraper**: Automatically fetches fresh prices using Playwright if data is missing or older than 24h.
- **NLP Matching**: Advanced scoring algorithm using `natural` (Jaro-Winkler + Exact Token Boost) that handles product names and category penalties (e.g., distinguishing between "Tomato" and "Tomato Sauce").
- **Google OAuth 2.0**: Secure authentication for saving shopping lists and profiles.
- **Profile & Lists**: Authenticated users can save, name, and retrieve their favorite shopping baskets.
- **Modern Frontend**: Built with **Angular 21** (2026 Edition) using **Signals** for reactive state management and **Modern Control Flow** (`@if`, `@for`).
- **Strict Quality Control**: Integrated **ESLint**, **Stylelint**, and **Prettier** for consistent code standards.

## 🏗️ Technical Architecture

### Backend (Node.js + Express + SQLite)
The backend follows a **Layered/Clean Architecture**:
- **Controllers** (backend/src/controllers/): Handle API requests.
- **Services** (backend/src/services/): Core business logic (basket calculation, stale data detection).
- **Repositories** (backend/src/models/): Abstracted database access using the Repository Pattern.
- **Scrapers** (backend/src/scrapers/): Playwright-based bots with modular store configurations.

### Frontend (Angular 21)
- **Standalone Component Library**: Highly modular architecture with reusable components:
  - `IconComponent`: Unified SVG renderer with flexbox centering.
  - `StoreSelector` / `RegionSelector`: Modularized selection logic.
  - `ProductResultCard`: Encapsulated matching and selection UI.
  - `SavedListCard`: Reusable list preview for profile management.
- **SCSS Styling**: Modern styling pipeline with component-scoped SCSS and global utility variables.
- **RxJS & Signals**: Efficient state management and change detection using Granular Signals.
- **Strict Typing**: Full TypeScript coverage with a central [types.ts](frontend/src/app/models/types.ts) library.
- **Proxy Configuration**: Seamless development with proxy.conf.json for live-reloading.

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
- **Compression**: Gzip enabled for faster asset delivery.

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

**Request Body:**
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
