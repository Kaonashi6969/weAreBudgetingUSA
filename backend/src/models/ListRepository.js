const BaseRepository = require('./BaseRepository');
const database = require('../db/database');

class ListRepository extends BaseRepository {
  constructor() {
    super('user_lists');
  }

  async create(userId, name, items) {
    const result = await database.run(
      `INSERT INTO user_lists (user_id, name, items, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, name, JSON.stringify(items)]
    );
    return result.lastID;
  }

  async getByUser(userId) {
    return await database.all(
      `SELECT * FROM user_lists WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
  }

  async delete(userId, listId) {
    return await database.run(
      `DELETE FROM user_lists WHERE id = ? AND user_id = ?`,
      [listId, userId]
    );
  }

  async update(userId, listId, name, items) {
    return await database.run(
      `UPDATE user_lists SET name = ?, items = ? WHERE id = ? AND user_id = ?`,
      [name, JSON.stringify(items), listId, userId]
    );
  }
}

module.exports = new ListRepository();
