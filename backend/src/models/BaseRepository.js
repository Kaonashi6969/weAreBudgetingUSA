const database = require('../db/database');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async getAll() {
    return await database.all(`SELECT * FROM ${this.tableName}`);
  }

  async getById(id) {
    return await database.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
  }
}

module.exports = BaseRepository;
