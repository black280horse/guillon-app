const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(date) {
  return DATE_RE.test(date) && !isNaN(Date.parse(date));
}

// POST /api/sales
router.post('/', (req, res) => {
  const { product_name, date, revenue, investment } = req.body;
  const userId = req.user.id;

  if (!product_name || !date || revenue == null || investment == null)
    return res.status(400).json({ error: 'product_name, date, revenue e investment son requeridos' });
  if (!validateDate(date))
    return res.status(400).json({ error: 'date debe tener formato YYYY-MM-DD' });

  const rev = parseFloat(revenue);
  const inv = parseFloat(investment);
  if (isNaN(rev) || isNaN(inv) || rev < 0 || inv < 0)
    return res.status(400).json({ error: 'revenue e investment deben ser números positivos' });

  let product = db.prepare(
    'SELECT id, name FROM products WHERE user_id = ? AND LOWER(name) = LOWER(?)'
  ).get(userId, product_name.trim());

  if (!product) {
    const r = db.prepare('INSERT INTO products (user_id, name) VALUES (?, ?)').run(userId, product_name.trim());
    product = { id: r.lastInsertRowid, name: product_name.trim() };
  }

  const sale = db.prepare(`
    INSERT INTO sales_data (user_id, product_id, date, revenue, investment)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, product.id, date, rev, inv);

  res.status(201).json({
    id: sale.lastInsertRowid,
    product_id: product.id,
    product_name: product.name,
    date, revenue: rev, investment: inv,
    profit: rev - inv,
    roas: inv > 0 ? parseFloat((rev / inv).toFixed(2)) : null,
  });
});

// GET /api/sales
router.get('/', (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to, product_id } = req.query;

  let query = `
    SELECT s.id, s.date, s.revenue, s.investment,
           (s.revenue - s.investment) AS profit,
           CASE WHEN s.investment > 0 THEN ROUND(s.revenue / s.investment, 2) ELSE NULL END AS roas,
           p.id AS product_id, p.name AS product_name
    FROM sales_data s
    LEFT JOIN products p ON s.product_id = p.id
    WHERE s.user_id = ?
  `;
  const params = [userId];
  if (date_from) { query += ' AND s.date >= ?'; params.push(date_from); }
  if (date_to)   { query += ' AND s.date <= ?'; params.push(date_to); }
  if (product_id){ query += ' AND s.product_id = ?'; params.push(product_id); }
  query += ' ORDER BY s.date DESC, s.id DESC';

  res.json(db.prepare(query).all(...params));
});

// PATCH /api/sales/:id
router.patch('/:id', (req, res) => {
  const userId = req.user.id;
  const saleId = parseInt(req.params.id);

  const existing = db.prepare('SELECT * FROM sales_data WHERE id = ? AND user_id = ?').get(saleId, userId);
  if (!existing) return res.status(404).json({ error: 'Registro no encontrado' });

  const { date, revenue, investment } = req.body;
  const updates = {};

  if (date !== undefined) {
    if (!validateDate(date)) return res.status(400).json({ error: 'date debe tener formato YYYY-MM-DD' });
    updates.date = date;
  }
  if (revenue !== undefined) {
    const rev = parseFloat(revenue);
    if (isNaN(rev) || rev < 0) return res.status(400).json({ error: 'revenue debe ser un número positivo' });
    updates.revenue = rev;
  }
  if (investment !== undefined) {
    const inv = parseFloat(investment);
    if (isNaN(inv) || inv < 0) return res.status(400).json({ error: 'investment debe ser un número positivo' });
    updates.investment = inv;
  }

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: 'Nada para actualizar' });

  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE sales_data SET ${fields} WHERE id = ? AND user_id = ?`)
    .run(...Object.values(updates), saleId, userId);

  const updated = db.prepare('SELECT * FROM sales_data WHERE id = ?').get(saleId);
  res.json({
    ...updated,
    profit: updated.revenue - updated.investment,
    roas: updated.investment > 0 ? parseFloat((updated.revenue / updated.investment).toFixed(2)) : null,
  });
});

// POST /api/sales/bulk — [{product_name, date, revenue, investment}]
router.post('/bulk', (req, res) => {
  const userId = req.user.id;
  const { entries } = req.body;

  if (!Array.isArray(entries) || entries.length === 0)
    return res.status(400).json({ error: 'entries debe ser un array no vacío' });

  const results = [];
  const errors = [];

  const bulkInsert = db.transaction(() => {
    for (const entry of entries) {
      const { product_name, date, revenue, investment } = entry;
      if (!product_name || !date) { errors.push({ entry, error: 'product_name y date requeridos' }); continue; }
      if (!validateDate(date)) { errors.push({ entry, error: 'date inválido' }); continue; }

      const rev = parseFloat(revenue) || 0;
      const inv = parseFloat(investment) || 0;

      let product = db.prepare(
        'SELECT id, name FROM products WHERE user_id = ? AND LOWER(name) = LOWER(?)'
      ).get(userId, product_name.trim());

      if (!product) {
        const r = db.prepare('INSERT INTO products (user_id, name) VALUES (?, ?)').run(userId, product_name.trim());
        product = { id: r.lastInsertRowid, name: product_name.trim() };
      }

      const sale = db.prepare(
        'INSERT INTO sales_data (user_id, product_id, date, revenue, investment) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, product.id, date, rev, inv);

      results.push({
        id: sale.lastInsertRowid,
        product_id: product.id,
        product_name: product.name,
        date, revenue: rev, investment: inv,
        profit: rev - inv,
        roas: inv > 0 ? parseFloat((rev / inv).toFixed(2)) : null,
      });
    }
  });

  bulkInsert();
  res.status(201).json({ created: results.length, errors, results });
});

// DELETE /api/sales/:id
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const saleId = parseInt(req.params.id);

  const existing = db.prepare('SELECT id FROM sales_data WHERE id = ? AND user_id = ?').get(saleId, userId);
  if (!existing) return res.status(404).json({ error: 'Registro no encontrado' });

  db.prepare('DELETE FROM sales_data WHERE id = ? AND user_id = ?').run(saleId, userId);
  res.json({ message: 'Registro eliminado' });
});

module.exports = router;
