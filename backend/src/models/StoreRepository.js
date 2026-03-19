const BaseRepository = require('./BaseRepository');

class StoreRepository extends BaseRepository {
  constructor() {
    super('stores');
  }
}

module.exports = new StoreRepository();
