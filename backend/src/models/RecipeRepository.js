const BaseRepository = require('./BaseRepository');
const database = require('../db/database');

class RecipeRepository extends BaseRepository {
  constructor() {
    super('recipes');
  }

  /** Parse the JSON ingredients column on every row returned. */
  _parseRows(rows) {
    return rows.map(r => ({
      ...r,
      ingredients: (() => {
        try { return JSON.parse(r.ingredients || '[]'); }
        catch { return []; }
      })()
    }));
  }

  async getAll(region) {
    if (region) {
      const rows = await database.all(
        `SELECT * FROM ${this.tableName} WHERE region = ? ORDER BY created_at DESC`,
        [region]
      );
      return this._parseRows(rows);
    }
    const rows = await database.all(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
    );
    return this._parseRows(rows);
  }

  async getById(id) {
    const row = await database.get(
      `SELECT * FROM ${this.tableName} WHERE id = ?`, [id]
    );
    return row ? this._parseRows([row])[0] : null;
  }

  async getByCategory(category, region) {
    const conditions = ['category = ?'];
    const params = [category];
    if (region) {
      conditions.push('region = ?');
      params.push(region);
    }
    const rows = await database.all(
      `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    return this._parseRows(rows);
  }

  async create(recipe) {
    const { id, name, description, image_url, category, region, servings, ingredients, instructions } = recipe;
    await database.run(
      `INSERT INTO ${this.tableName} (id, name, description, image_url, category, region, servings, ingredients, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        description || null,
        image_url || null,
        category || 'General',
        region || 'us',
        servings || 4,
        JSON.stringify(ingredients),
        instructions || null
      ]
    );
    return await this.getById(id);
  }

  async upsert(recipe) {
    const { id, name, description, image_url, category, region, servings, ingredients, instructions } = recipe;
    await database.run(
      `INSERT INTO ${this.tableName} (id, name, description, image_url, category, region, servings, ingredients, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         image_url = excluded.image_url,
         category = excluded.category,
         region = excluded.region,
         servings = excluded.servings,
         ingredients = excluded.ingredients,
         instructions = excluded.instructions`,
      [
        id,
        name,
        description || null,
        image_url || null,
        category || 'General',
        region || 'us',
        servings || 4,
        JSON.stringify(ingredients),
        instructions || null
      ]
    );
  }

  async search(query, region) {
    const escaped = query.replace(/[%_]/g, '\\$&');
    const conditions = [`(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')`];
    const params = [`%${escaped}%`, `%${escaped}%`];
    if (region) {
      conditions.push('region = ?');
      params.push(region);
    }
    const rows = await database.all(
      `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`,
      params
    );
    return this._parseRows(rows);
  }
}

module.exports = new RecipeRepository();