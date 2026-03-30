const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DEFAULT_DB_PATH = path.join(__dirname, '../../data/cheapbasket.db');
const DB_PATH = process.env.DATABASE_PATH || DEFAULT_DB_PATH;

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Connected to SQLite database at ${DB_PATH}`);
        }
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DB Query] ${sql} | Params: ${JSON.stringify(params)}`);
    }
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DB Result] Found ${rows ? rows.length : 0} rows`);
          }
          resolve(rows);
        }
      });
    });
  }

  async initialize() {
    try {
      // Create Products table (no UNIQUE on name — same product can exist with prices per store)
      await this.run(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'General',
          image_url TEXT,
          dietary_tags TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migration: remove UNIQUE constraint from products.name (SQLite requires table recreation)
      try {
        const tableDef = await this.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'");
        if (tableDef && tableDef.sql && /name\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(tableDef.sql)) {
          console.log('Migration: removing UNIQUE constraint from products.name...');
          const rows = await this.all('SELECT * FROM products');
          await this.run('BEGIN TRANSACTION');
          await this.run(`
            CREATE TABLE products_new (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              category TEXT NOT NULL DEFAULT 'General',
              image_url TEXT,
              dietary_tags TEXT DEFAULT '[]',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          for (const row of rows) {
            await this.run(
              'INSERT OR IGNORE INTO products_new (id, name, category, image_url, dietary_tags, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [row.id, row.name, row.category || 'General', row.image_url || null, row.dietary_tags || '[]', row.created_at],
            );
          }
          await this.run('DROP TABLE products');
          await this.run('ALTER TABLE products_new RENAME TO products');
          await this.run('COMMIT');
          console.log(`Migration complete: ${rows.length} products copied, UNIQUE constraint removed.`);
        }
      } catch (err) {
        try { await this.run('ROLLBACK'); } catch (e) { /* ignore */ }
        console.error('Error during products table migration:', err);
      }

      // Ensure all columns exist (covers any remaining edge cases)
      try {
        const productCols = await this.all('PRAGMA table_info(products)');
        if (!productCols.some(col => col.name === 'image_url')) {
          await this.run('ALTER TABLE products ADD COLUMN image_url TEXT');
        }
        if (!productCols.some(col => col.name === 'dietary_tags')) {
          await this.run("ALTER TABLE products ADD COLUMN dietary_tags TEXT DEFAULT '[]'");
        }
      } catch (err) {
        console.error('Error ensuring product columns:', err);
      }

      // Create Stores table
      await this.run(`
        CREATE TABLE IF NOT EXISTS stores (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          region TEXT NOT NULL DEFAULT 'us',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migration: add region column to existing stores tables
      try {
        const storeCols = await this.all("PRAGMA table_info(stores)");
        if (!storeCols.some(col => col.name === 'region')) {
          await this.run("ALTER TABLE stores ADD COLUMN region TEXT NOT NULL DEFAULT 'us'");
          console.log('Migration: added region column to stores table');
        }
      } catch (err) {
        console.error('Error migrating stores table:', err);
      }

      // Create Prices table
      await this.run(`
        CREATE TABLE IF NOT EXISTS prices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id TEXT NOT NULL,
          store_id TEXT NOT NULL,
          price REAL NOT NULL,
          unit TEXT NOT NULL,
          url TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id),
          FOREIGN KEY (store_id) REFERENCES stores(id),
          UNIQUE(product_id, store_id)
        )
      `);

      // Create Users table
      await this.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          google_id TEXT UNIQUE,
          email TEXT UNIQUE NOT NULL,
          display_name TEXT,
          profile_pic TEXT,
          tier TEXT DEFAULT 'free', -- 'free', 'pro'
          region TEXT DEFAULT 'us',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migration: add region column to existing users tables
      try {
        const userCols = await this.all("PRAGMA table_info(users)");
        if (!userCols.some(col => col.name === 'region')) {
          await this.run("ALTER TABLE users ADD COLUMN region TEXT NOT NULL DEFAULT 'us'");
          console.log('Migration: added region column to users table');
        }
      } catch (err) {
        console.error('Error migrating users table:', err);
      }

      // Create User Lists table
      await this.run(`
        CREATE TABLE IF NOT EXISTS user_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          items TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Recipes table
      await this.run(`
        CREATE TABLE IF NOT EXISTS recipes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          category TEXT DEFAULT 'General',
          region TEXT NOT NULL DEFAULT 'us',
          servings INTEGER DEFAULT 4,
          ingredients TEXT NOT NULL, -- JSON array of strings/objects
          instructions TEXT, -- Optional markdown or plain text
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migration: add region column if missing
      try {
        await this.run(`ALTER TABLE recipes ADD COLUMN region TEXT NOT NULL DEFAULT 'us'`);
      } catch { /* column already exists */ }

      // Migration: add package_size and package_unit to prices
      try {
        await this.run(`ALTER TABLE prices ADD COLUMN package_size REAL`);
      } catch { /* column already exists */ }
      try {
        await this.run(`ALTER TABLE prices ADD COLUMN package_unit TEXT`);
      } catch { /* column already exists */ }

      console.log('Database tables initialized');
    } catch (err) {
      console.error('Error initializing database:', err);
    }
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = new Database();
