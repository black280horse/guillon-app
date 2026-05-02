const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES = ['general', 'publicidad', 'empleados', 'logistica', 'oficina', 'servicios', 'impuestos', 'otros'];

function validateDate(d) { return DATE_RE.test(d) && !isNaN(Date.parse(d)); }

// GET /api/expenses?date_from=&date_to=&category=
router.get('/', (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to, category } = req.query;
  let q = 'SELECT * FROM expenses WHERE user_id = ?';
  const p = [userId];
  if (date_from) { q += ' AND date >= ?'; p.push(date_from); }
  if (date_to)   { q += ' AND date <= ?'; p.push(date_to); }
  if (category)  { q += ' AND category = ?'; p.push(category); }
  q += ' ORDER BY date DESC, id DESC';
  res.json(db.prepare(q).all(...p));
});

// GET /api/expenses/summary?date_from=&date_to=
router.get('/summary', (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to } = req.query;
  let where = 'WHERE user_id = ?';
  const p = [userId];
  if (date_from) { where += ' AND date >= ?'; p.push(date_from); }
  if (date_to)   { where += ' AND date <= ?'; p.push(date_to); }

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(amount), 0) AS total_expenses,
      COUNT(id)                AS total_records
    FROM expenses ${where}
  `).get(...p);

  const byCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) AS total
    FROM expenses ${where}
    GROUP BY category ORDER BY total DESC
  `).all(...p);

  res.json({ ...totals, by_category: byCategory });
});

// POST /api/expenses
router.post('/', (req, res) => {
  const userId = req.user.id;
  const { date, category = 'general', amount, description } = req.body;
  if (!date || amount == null)
    return res.status(400).json({ error: 'date y amount son requeridos' });
  if (!validateDate(date))
    return res.status(400).json({ error: 'date debe tener formato YYYY-MM-DD' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < 0)
    return res.status(400).json({ error: 'amount debe ser un número positivo' });

  const r = db.prepare(
    'INSERT INTO expenses (user_id, date, category, amount, description) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, date, category, amt, description?.trim() || null);

  res.status(201).json({ id: r.lastInsertRowid, date, category, amount: amt, description: description?.trim() || null });
});

// POST /api/expenses/bulk
router.post('/bulk', (req, res) => {
  const userId = req.user.id;
  const { entries } = req.body;
  if (!Array.isArray(entries) || !entries.length)
    return res.status(400).json({ error: 'entries debe ser un array no vacío' });

  const results = [], errors = [];
  const insert = db.transaction(() => {
    for (const e of entries) {
      if (!e.date || !validateDate(e.date)) { errors.push({ entry: e, error: 'date inválido' }); continue; }
      const amt = parseFloat(e.amount);
      if (isNaN(amt)) { errors.push({ entry: e, error: 'amount inválido' }); continue; }
      const r = db.prepare(
        'INSERT INTO expenses (user_id, date, category, amount, description) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, e.date, e.category || 'general', amt, e.description?.trim() || null);
      results.push({ id: r.lastInsertRowid, ...e, amount: amt });
    }
  });
  insert();
  res.status(201).json({ created: results.length, errors, results });
});

// PATCH /api/expenses/:id
router.patch('/:id', (req, res) => {
  const userId = req.user.id;
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' });

  const { date, category, amount, description } = req.body;
  const updates = {};
  if (date !== undefined) {
    if (!validateDate(date)) return res.status(400).json({ error: 'date inválido' });
    updates.date = date;
  }
  if (category !== undefined) updates.category = category;
  if (amount !== undefined) {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) return res.status(400).json({ error: 'amount inválido' });
    updates.amount = amt;
  }
  if (description !== undefined) updates.description = description?.trim() || null;
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nada para actualizar' });

  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE expenses SET ${fields} WHERE id = ? AND user_id = ?`)
    .run(...Object.values(updates), id, userId);

  res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(id));
});

// DELETE /api/expenses/:id
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT id FROM expenses WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' });
  db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(id, userId);
  res.json({ message: 'Gasto eliminado' });
});

module.exports = router;
