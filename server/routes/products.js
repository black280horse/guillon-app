const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/products
router.get('/', (req, res) => {
  const userId = req.user.id;

  const products = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.created_at,
      COALESCE(SUM(s.revenue), 0)    AS total_revenue,
      COALESCE(SUM(s.investment), 0) AS total_investment,
      COUNT(s.id)                    AS sales_count
    FROM products p
    LEFT JOIN sales_data s ON s.product_id = p.id AND s.user_id = p.user_id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY total_revenue DESC
  `).all(userId);

  res.json(products);
});

// GET /api/products/:id  — detalle histórico completo (sin filtro)
router.get('/:id', (req, res) => {
  const userId = req.user.id;
  const productId = req.params.id;

  const product = db.prepare(
    'SELECT * FROM products WHERE id = ? AND user_id = ?'
  ).get(productId, userId);

  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  const sales = db.prepare(`
    SELECT date, revenue, investment,
           (revenue - investment) AS profit,
           CASE WHEN investment > 0 THEN ROUND(revenue / investment, 2) ELSE NULL END AS roas
    FROM sales_data
    WHERE product_id = ? AND user_id = ?
    ORDER BY date ASC
  `).all(productId, userId);

  res.json({ product, sales });
});

// GET /api/products/:id/detail?date_from=&date_to= — detalle con filtro de período
router.get('/:id/detail', (req, res) => {
  const userId = req.user.id;
  const productId = req.params.id;
  const { date_from, date_to } = req.query;

  const product = db.prepare(
    'SELECT * FROM products WHERE id = ? AND user_id = ?'
  ).get(productId, userId);

  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  // Construir WHERE dinámico
  let where = 'WHERE product_id = ? AND user_id = ?';
  const params = [productId, userId];
  if (date_from) { where += ' AND date >= ?'; params.push(date_from); }
  if (date_to)   { where += ' AND date <= ?'; params.push(date_to); }

  const sales = db.prepare(`
    SELECT date,
           ROUND(revenue, 2)    AS revenue,
           ROUND(investment, 2) AS investment,
           ROUND(revenue - investment, 2) AS profit,
           CASE WHEN investment > 0 THEN ROUND(revenue / investment, 2) ELSE NULL END AS roas
    FROM sales_data
    ${where}
    ORDER BY date ASC
  `).all(...params);

  // KPIs del período
  const kpis = {
    total_revenue:    parseFloat(sales.reduce((s, r) => s + r.revenue, 0).toFixed(2)),
    total_investment: parseFloat(sales.reduce((s, r) => s + r.investment, 0).toFixed(2)),
    net_profit:       parseFloat(sales.reduce((s, r) => s + r.profit, 0).toFixed(2)),
    total_records:    sales.length,
    roas: null,
  };
  if (kpis.total_investment > 0) {
    kpis.roas = parseFloat((kpis.total_revenue / kpis.total_investment).toFixed(2));
  }

  // KPIs del período anterior (misma duración, hacia atrás)
  let prevKpis = null;
  if (date_from && date_to) {
    const from = new Date(date_from);
    const to   = new Date(date_to);
    const days = Math.round((to - from) / 86400000) + 1;
    const prevTo   = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (days - 1));
    const pf = prevFrom.toISOString().slice(0, 10);
    const pt = prevTo.toISOString().slice(0, 10);

    const prevSales = db.prepare(`
      SELECT revenue, investment FROM sales_data
      WHERE product_id = ? AND user_id = ? AND date >= ? AND date <= ?
    `).all(productId, userId, pf, pt);

    const pr = prevSales.reduce((s, r) => s + r.revenue, 0);
    const pi = prevSales.reduce((s, r) => s + r.investment, 0);
    prevKpis = {
      total_revenue:    parseFloat(pr.toFixed(2)),
      total_investment: parseFloat(pi.toFixed(2)),
      net_profit:       parseFloat((pr - pi).toFixed(2)),
      roas: pi > 0 ? parseFloat((pr / pi).toFixed(2)) : null,
    };
  }

  res.json({ product, sales, kpis, prevKpis });
});

module.exports = router;
