const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const VALID_SCOPES = new Set(['accounting', 'tasks', 'all']);

function deleteUnusedProducts(userId) {
  return db.prepare(`
    DELETE FROM products
    WHERE user_id = ?
      AND id NOT IN (
        SELECT product_id
        FROM sales_data
        WHERE user_id = ? AND product_id IS NOT NULL
      )
      AND id NOT IN (
        SELECT product_id
        FROM tasks
        WHERE user_id = ? AND product_id IS NOT NULL
      )
  `).run(userId, userId, userId).changes;
}

router.delete('/data', (req, res) => {
  const scope = req.query.scope;
  const userId = req.user.id;

  if (!VALID_SCOPES.has(scope)) {
    return res.status(400).json({ error: 'Scope invalido' });
  }

  const deleted = db.transaction(() => {
    const result = {
      accounting: 0,
      tasks: 0,
      products: 0,
    };

    if (scope === 'accounting' || scope === 'all') {
      result.accounting = db.prepare('DELETE FROM sales_data WHERE user_id = ?').run(userId).changes;
      result.products += deleteUnusedProducts(userId);
    }

    if (scope === 'tasks' || scope === 'all') {
      result.tasks = db.prepare('DELETE FROM tasks WHERE user_id = ?').run(userId).changes;
      result.products += deleteUnusedProducts(userId);
    }

    return result;
  })();

  const messages = {
    accounting: 'Datos contables eliminados correctamente',
    tasks: 'Tareas eliminadas correctamente',
    all: 'Datos contables y tareas eliminados correctamente',
  };

  res.json({
    message: messages[scope],
    deleted,
  });
});

module.exports = router;
