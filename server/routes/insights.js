const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/insights/comparator?products=1,2,3&date_from=&date_to=
router.get('/comparator', (req, res) => {
  const userId = req.user.id;
  const { products, date_from, date_to } = req.query;
  if (!products) return res.json([]);

  const ids = products.split(',').map(Number).filter(Boolean);
  if (!ids.length) return res.json([]);

  const placeholders = ids.map(() => '?').join(',');
  let where = `WHERE s.user_id = ? AND s.product_id IN (${placeholders})`;
  const params = [userId, ...ids];
  if (date_from) { where += ' AND s.date >= ?'; params.push(date_from); }
  if (date_to)   { where += ' AND s.date <= ?'; params.push(date_to); }

  const kpis = db.prepare(`
    SELECT
      p.id, p.name,
      ROUND(SUM(s.revenue), 2)    AS revenue,
      ROUND(SUM(s.investment), 2) AS investment,
      ROUND(SUM(s.revenue) - SUM(s.investment), 2) AS profit,
      CASE WHEN SUM(s.investment) > 0
           THEN ROUND(SUM(s.revenue) / SUM(s.investment), 2) ELSE NULL END AS roas,
      COUNT(s.id) AS records
    FROM sales_data s
    JOIN products p ON s.product_id = p.id
    ${where}
    GROUP BY p.id
    ORDER BY revenue DESC
  `).all(...params);

  const series = db.prepare(`
    SELECT s.product_id, s.date,
      ROUND(SUM(s.revenue), 2)    AS revenue,
      ROUND(SUM(s.investment), 2) AS investment,
      ROUND(SUM(s.revenue) - SUM(s.investment), 2) AS profit
    FROM sales_data s
    ${where}
    GROUP BY s.product_id, s.date
    ORDER BY s.date ASC
  `).all(...params);

  const seriesMap = {};
  for (const row of series) {
    if (!seriesMap[row.product_id]) seriesMap[row.product_id] = [];
    seriesMap[row.product_id].push(row);
  }

  res.json(kpis.map(k => ({ ...k, series: seriesMap[k.id] || [] })));
});

// GET /api/insights/patterns?date_from=&date_to=
router.get('/patterns', (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to } = req.query;

  let where = 'WHERE s.user_id = ?';
  const params = [userId];
  if (date_from) { where += ' AND s.date >= ?'; params.push(date_from); }
  if (date_to)   { where += ' AND s.date <= ?'; params.push(date_to); }

  // Análisis por día de la semana (0=domingo ... 6=sábado)
  const byDow = db.prepare(`
    SELECT
      CAST(strftime('%w', s.date) AS INTEGER) AS dow,
      ROUND(AVG(s.revenue), 2)    AS avg_revenue,
      ROUND(AVG(s.investment), 2) AS avg_investment,
      ROUND(AVG(CASE WHEN s.investment > 0 THEN s.revenue / s.investment ELSE NULL END), 2) AS avg_roas,
      COUNT(s.id) AS records
    FROM sales_data s
    ${where}
    GROUP BY dow
    ORDER BY dow ASC
  `).all(...params);

  // Rango de inversión óptimo (cuartiles)
  const invRows = db.prepare(`
    SELECT s.investment,
      ROUND(s.revenue / NULLIF(s.investment, 0), 2) AS roas
    FROM sales_data s
    ${where}
    ORDER BY s.investment ASC
  `).all(...params);

  // Separar en 4 cuartiles y calcular ROAS promedio de cada uno
  const n = invRows.length;
  let ranges = [];
  if (n >= 4) {
    const q = Math.floor(n / 4);
    for (let i = 0; i < 4; i++) {
      const slice = invRows.slice(i * q, i === 3 ? n : (i + 1) * q);
      const avgRoas = slice.reduce((s, r) => s + (r.roas || 0), 0) / slice.length;
      ranges.push({
        range: `$${slice[0].investment.toFixed(0)} – $${slice[slice.length - 1].investment.toFixed(0)}`,
        avg_roas: parseFloat(avgRoas.toFixed(2)),
        count: slice.length,
      });
    }
  }

  // Top 5 días con mejor ROAS
  const bestDays = db.prepare(`
    SELECT s.date,
      ROUND(SUM(s.revenue), 2)    AS revenue,
      ROUND(SUM(s.investment), 2) AS investment,
      ROUND(SUM(s.revenue) / NULLIF(SUM(s.investment), 0), 2) AS roas
    FROM sales_data s
    ${where}
    GROUP BY s.date
    HAVING SUM(s.investment) > 0
    ORDER BY roas DESC
    LIMIT 5
  `).all(...params);

  res.json({ by_dow: byDow, investment_ranges: ranges, best_days: bestDays });
});

// GET /api/insights/projection?product_id=&days=7&date_from=&date_to=
router.get('/projection', (req, res) => {
  const userId = req.user.id;
  const { product_id, days = 7, date_from, date_to } = req.query;

  let where = 'WHERE s.user_id = ?';
  const params = [userId];
  if (product_id) { where += ' AND s.product_id = ?'; params.push(Number(product_id)); }
  if (date_from)  { where += ' AND s.date >= ?'; params.push(date_from); }
  if (date_to)    { where += ' AND s.date <= ?'; params.push(date_to); }

  const series = db.prepare(`
    SELECT s.date,
      ROUND(SUM(s.revenue), 2)    AS revenue,
      ROUND(SUM(s.investment), 2) AS investment
    FROM sales_data s
    ${where}
    GROUP BY s.date
    ORDER BY s.date ASC
  `).all(...params);

  // Promedio móvil de los últimos 7 días para la proyección
  const last7 = series.slice(-7);
  const avgRevenue = last7.length
    ? last7.reduce((a, r) => a + r.revenue, 0) / last7.length
    : 0;
  const avgInvestment = last7.length
    ? last7.reduce((a, r) => a + r.investment, 0) / last7.length
    : 0;

  const projected = [];
  const lastDate = series.length ? new Date(series[series.length - 1].date) : new Date();
  for (let i = 1; i <= Number(days); i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i);
    projected.push({
      date: d.toISOString().slice(0, 10),
      revenue: parseFloat(avgRevenue.toFixed(2)),
      investment: parseFloat(avgInvestment.toFixed(2)),
      projected: true,
    });
  }

  res.json({ series, projected });
});

// GET /api/insights/budget?target_revenue=&date_from=&date_to=
router.get('/budget', (req, res) => {
  const userId = req.user.id;
  const { target_revenue, date_from, date_to } = req.query;

  let where = 'WHERE s.user_id = ?';
  const params = [userId];
  if (date_from) { where += ' AND s.date >= ?'; params.push(date_from); }
  if (date_to)   { where += ' AND s.date <= ?'; params.push(date_to); }

  const kpis = db.prepare(`
    SELECT
      ROUND(AVG(CASE WHEN s.investment > 0 THEN s.revenue / s.investment ELSE NULL END), 2) AS avg_roas,
      ROUND(MIN(CASE WHEN s.investment > 0 THEN s.revenue / s.investment ELSE NULL END), 2) AS min_roas,
      ROUND(MAX(CASE WHEN s.investment > 0 THEN s.revenue / s.investment ELSE NULL END), 2) AS max_roas,
      COUNT(s.id) AS records
    FROM sales_data s
    ${where}
  `).get(...params);

  // Por producto
  const byProduct = db.prepare(`
    SELECT p.id, p.name,
      ROUND(SUM(s.revenue) / NULLIF(SUM(s.investment), 0), 2) AS roas,
      ROUND(SUM(s.investment), 2) AS total_investment,
      ROUND(SUM(s.revenue), 2) AS total_revenue
    FROM sales_data s
    JOIN products p ON s.product_id = p.id
    ${where}
    GROUP BY p.id
    HAVING SUM(s.investment) > 0
    ORDER BY roas DESC
  `).all(...params);

  const target = parseFloat(target_revenue) || 0;
  const avgRoas = kpis.avg_roas || 1;

  res.json({
    avg_roas: kpis.avg_roas,
    min_roas: kpis.min_roas,
    max_roas: kpis.max_roas,
    records: kpis.records,
    target_revenue: target,
    estimated_investment: target > 0 ? parseFloat((target / avgRoas).toFixed(2)) : null,
    optimistic_investment: target > 0 && kpis.max_roas
      ? parseFloat((target / kpis.max_roas).toFixed(2)) : null,
    conservative_investment: target > 0 && kpis.min_roas && kpis.min_roas > 0
      ? parseFloat((target / kpis.min_roas).toFixed(2)) : null,
    by_product: byProduct,
  });
});

module.exports = router;
