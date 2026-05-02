const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/dashboard/summary?date_from=&date_to=
router.get('/summary', (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to } = req.query;

  let where = 'WHERE s.user_id = ?';
  const params = [userId];
  if (date_from) { where += ' AND s.date >= ?'; params.push(date_from); }
  if (date_to)   { where += ' AND s.date <= ?'; params.push(date_to); }

  // Gastos del período
  let expWhere = 'WHERE e.user_id = ?';
  const expParams = [userId];
  if (date_from) { expWhere += ' AND e.date >= ?'; expParams.push(date_from); }
  if (date_to)   { expWhere += ' AND e.date <= ?'; expParams.push(date_to); }

  const expKpis = db.prepare('SELECT COALESCE(SUM(e.amount), 0) AS total_expenses FROM expenses e ' + expWhere).get(...expParams);

  // KPIs globales — net_profit = facturación - inversión - gastos
  const kpis = db.prepare(`
    SELECT
      COALESCE(SUM(s.revenue), 0)                                         AS total_revenue,
      COALESCE(SUM(s.investment), 0)                                      AS total_investment,
      CASE WHEN SUM(s.investment) > 0
           THEN ROUND(SUM(s.revenue) / SUM(s.investment), 2)
           ELSE NULL END                                                   AS roas,
      COUNT(s.id)                                                         AS total_records
    FROM sales_data s
    ${where}
  `).get(...params);

  const netProfit = parseFloat(kpis.total_revenue) - parseFloat(kpis.total_investment) - parseFloat(expKpis.total_expenses);

  // Serie diaria (para el gráfico de línea)
  const dailySeries = db.prepare(`
    SELECT
      s.date,
      ROUND(SUM(s.revenue), 2)    AS revenue,
      ROUND(SUM(s.investment), 2) AS investment,
      ROUND(SUM(s.revenue) - SUM(s.investment), 2) AS profit
    FROM sales_data s
    ${where}
    GROUP BY s.date
    ORDER BY s.date ASC
  `).all(...params);

  // Top productos en el período
  const topProducts = db.prepare(`
    SELECT
      p.id,
      p.name,
      ROUND(SUM(s.revenue), 2)    AS revenue,
      ROUND(SUM(s.investment), 2) AS investment,
      ROUND(SUM(s.revenue) - SUM(s.investment), 2) AS profit,
      CASE WHEN SUM(s.investment) > 0
           THEN ROUND(SUM(s.revenue) / SUM(s.investment), 2)
           ELSE NULL END AS roas,
      COUNT(s.id) AS records
    FROM sales_data s
    JOIN products p ON s.product_id = p.id
    ${where}
    GROUP BY p.id
    ORDER BY revenue DESC
  `).all(...params);

  // Mini gráfico de últimos 7 días por producto (independiente del filtro de fechas)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysStr = sevenDaysAgo.toISOString().slice(0, 10);

  const sparklines = db.prepare(`
    SELECT
      s.product_id,
      s.date,
      ROUND(SUM(s.revenue), 2) AS revenue
    FROM sales_data s
    WHERE s.user_id = ? AND s.date >= ?
    GROUP BY s.product_id, s.date
    ORDER BY s.date ASC
  `).all(userId, sevenDaysStr);

  // Agrupar sparklines por producto
  const sparklineMap = {};
  for (const row of sparklines) {
    if (!sparklineMap[row.product_id]) sparklineMap[row.product_id] = [];
    sparklineMap[row.product_id].push({ date: row.date, revenue: row.revenue });
  }

  const productsWithSparkline = topProducts.map(p => ({
    ...p,
    sparkline: sparklineMap[p.id] || [],
  }));

  res.json({
    kpis: {
      total_revenue:    parseFloat(kpis.total_revenue.toFixed(2)),
      total_investment: parseFloat(kpis.total_investment.toFixed(2)),
      total_expenses:   parseFloat(expKpis.total_expenses.toFixed(2)),
      net_profit:       parseFloat(netProfit.toFixed(2)),
      roas:             kpis.roas,
      total_records:    kpis.total_records,
    },
    daily_series: dailySeries,
    products: productsWithSparkline,
  });
});

module.exports = router;
