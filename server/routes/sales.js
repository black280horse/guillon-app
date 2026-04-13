const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ─── POST /api/sales ──────────────────────────────────────────────────────────
// Body: { product_name, date, revenue, investment }
// Si el producto no existe para este user, lo crea automáticamente.
router.post('/', (req, res) => {
  const { product_name, date, revenue, investment } = req.body;
  const userId = req.user.id;

  if (!product_name || !date || revenue == null || investment == null) {
    return res.status(400).json({ error: 'product_name, date, revenue e investment son requeridos' });
  }

  const rev = parseFloat(revenue);
  const inv = parseFloat(investment);
  if (isNaN(rev) || isNaN(inv) || rev < 0 || inv < 0) {
    return res.status(400).json({ error: 'revenue e investment deben ser números positivos' });
  }

  // Buscar o crear el producto
  let product = db.prepare(
    'SELECT id, name FROM products WHERE user_id = ? AND LOWER(name) = LOWER(?)'
  ).get(userId, product_name.trim());

  if (!product) {
    const r = db.prepare(
      'INSERT INTO products (user_id, name) VALUES (?, ?)'
    ).run(userId, product_name.trim());
    product = { id: r.lastInsertRowid, name: product_name.trim() };
  }

  // Insertar el registro de venta
  const sale = db.prepare(`
    INSERT INTO sales_data (user_id, product_id, date, revenue, investment)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, product.id, date, rev, inv);

  res.status(201).json({
    id: sale.lastInsertRowid,
    product_id: product.id,
    product_name: product.name,
    date,
    revenue: rev,
    investment: inv,
    profit: rev - inv,
    roas: inv > 0 ? parseFloat((rev / inv).toFixed(2)) : null,
  });
});

// ─── GET /api/sales ───────────────────────────────────────────────────────────
// Query: date_from, date_to, product_id
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

  const sales = db.prepare(query).all(...params);
  res.json(sales);
});

module.exports = router;
