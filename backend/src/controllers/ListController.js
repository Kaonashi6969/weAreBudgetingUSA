const ListRepository = require('../models/ListRepository');

class ListController {
  async saveList(req, res) {
    try {
      if (req.user?.tier !== 'pro') {
        return res.status(403).json({ 
          error: 'Pro account required', 
          message: 'Saving grocery lists is a Pro feature.' 
        });
      }

      const { name, items } = req.body;
      const userId = req.user?.id || 'guest';

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Missing or invalid items array' });
      }

      const listId = await ListRepository.create(userId, name || 'My Grocery List', items);

      res.status(201).json({ 
        success: true, 
        message: 'Grocery list saved successfully',
        id: listId 
      });
    } catch (err) {
      console.error('Error saving list:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getLists(req, res) {
    try {
      const userId = req.user?.id || 'guest';
      const lists = await ListRepository.getByUser(userId);
      
      // Parse JSON items back
      const parsedLists = lists.map(l => ({
        ...l,
        items: JSON.parse(l.items)
      }));

      res.json(parsedLists);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteList(req, res) {
    try {
      const userId = req.user?.id || 'guest';
      const listId = req.params.id;
      await ListRepository.delete(userId, listId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateList(req, res) {
    try {
      const userId = req.user?.id || 'guest';
      const listId = req.params.id;
      const { name, items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Missing or invalid items array' });
      }

      await ListRepository.update(userId, listId, name || 'My Grocery List', items);
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating list:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new ListController();
