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
      // Create Products table
      await this.run(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          category TEXT NOT NULL,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ensure products table has image_url column
      try {
        const productCols = await this.all("PRAGMA table_info(products)");
        if (!productCols.some(col => col.name === 'image_url')) {
          await this.run("ALTER TABLE products ADD COLUMN image_url TEXT");
          console.log('Added image_url column to products table');
        }
      } catch (err) {
        console.error('Error migrating products table:', err);
      }

      // Create Stores table
      await this.run(`
        CREATE TABLE IF NOT EXISTS stores (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

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
