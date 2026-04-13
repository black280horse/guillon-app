const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');
const { analyzeProduct, chatStream } = require('../services/claude');

router.use(requireAuth);

// ─── POST /api/ai/analyze ─────────────────────────────────────────────────────
// Body: { product_id, date_from, date_to }
router.post('/analyze', async (req, res) => {
  const userId = req.user.id;
  const { product_id, date_from, date_to } = req.body;

  if (!product_id) return res.status(400).json({ error: 'product_id requerido' });

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(product_id, userId);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  // Serie del período
  let where = 'WHERE product_id = ? AND user_id = ?';
  const params = [product_id, userId];
  if (date_from) { where += ' AND date >= ?'; params.push(date_from); }
  if (date_to)   { where += ' AND date <= ?'; params.push(date_to); }

  const sales = db.prepare(`
    SELECT date,
           ROUND(revenue, 2)    AS revenue,
           ROUND(investment, 2) AS investment,
           ROUND(revenue - investment, 2) AS profit,
           CASE WHEN investment > 0 THEN ROUND(revenue / investment, 2) ELSE NULL END AS roas
    FROM sales_data ${where} ORDER BY date ASC
  `).all(...params);

  const totalRevenue    = sales.reduce((s, r) => s + r.revenue, 0);
  const totalInvestment = sales.reduce((s, r) => s + r.investment, 0);
  const kpis = {
    total_revenue:    parseFloat(totalRevenue.toFixed(2)),
    total_investment: parseFloat(totalInvestment.toFixed(2)),
    net_profit:       parseFloat((totalRevenue - totalInvestment).toFixed(2)),
    roas: totalInvestment > 0 ? parseFloat((totalRevenue / totalInvestment).toFixed(2)) : null,
    total_records: sales.length,
  };

  // Período anterior
  let prevKpis = null;
  if (date_from && date_to) {
    const from = new Date(date_from), to = new Date(date_to);
    const days = Math.round((to - from) / 86400000) + 1;
    const prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (days - 1));
    const ps = db.prepare(`
      SELECT revenue, investment FROM sales_data
      WHERE product_id = ? AND user_id = ? AND date >= ? AND date <= ?
    `).all(product_id, userId, prevFrom.toISOString().slice(0,10), prevTo.toISOString().slice(0,10));
    const pr = ps.reduce((s, r) => s + r.revenue, 0);
    const pi = ps.reduce((s, r) => s + r.investment, 0);
    prevKpis = { total_revenue: parseFloat(pr.toFixed(2)), total_investment: parseFloat(pi.toFixed(2)) };
  }

  const result = await analyzeProduct({
    productName: product.name,
    kpis,
    dailySeries: sales,
    prevKpis,
  });

  res.json(result);
});

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
// Body: { messages: [{role, content}] }
// Responde como SSE stream
router.post('/chat', async (req, res) => {
  const userId = req.user.id;
  const { messages } = req.body;

  if (!messages?.length) return res.status(400).json({ error: 'messages requerido' });

  // Construir contexto del negocio
  const user = db.prepare('SELECT name, business_name, plan FROM users WHERE id = ?').get(userId);

  const products = db.prepare(`
    SELECT p.name,
           ROUND(SUM(s.revenue), 2)    AS revenue,
           ROUND(SUM(s.investment), 2) AS investment,
           COUNT(s.id) AS records
    FROM products p
    LEFT JOIN sales_data s ON s.product_id = p.id AND s.user_id = p.user_id
    WHERE p.user_id = ?
    GROUP BY p.id ORDER BY revenue DESC LIMIT 10
  `).all(userId);

  // Últimos 30 días
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 29);
  const recentKpis = db.prepare(`
    SELECT ROUND(SUM(revenue), 2)    AS revenue,
           ROUND(SUM(investment), 2) AS investment,
           COUNT(*)                  AS records
    FROM sales_data
    WHERE user_id = ? AND date >= ?
  `).get(userId, thirtyAgo.toISOString().slice(0, 10));

  const businessContext = `
Negocio: ${user?.business_name || user?.name || 'Sin nombre'}
Plan: ${user?.plan || 'free'}

RESUMEN ÚLTIMOS 30 DÍAS:
- Ingresos: $${recentKpis?.revenue ?? 0}
- Inversión: $${recentKpis?.investment ?? 0}
- Ganancia neta: $${((recentKpis?.revenue ?? 0) - (recentKpis?.investment ?? 0)).toFixed(2)}
- ROAS global: ${recentKpis?.investment > 0 ? (recentKpis.revenue / recentKpis.investment).toFixed(2) + 'x' : 'N/A'}
- Registros de venta: ${recentKpis?.records ?? 0}

PRODUCTOS (todos los tiempos, ordenados por ingresos):
${products.map(p => {
  const profit = (p.revenue - p.investment).toFixed(2);
  const roas = p.investment > 0 ? (p.revenue / p.investment).toFixed(2) + 'x' : 'N/A';
  return `- ${p.name}: $${p.revenue} ingresos, $${p.investment} inversión, ganancia $${profit}, ROAS ${roas} (${p.records} registros)`;
}).join('\n')}
`.trim();

  // Headers para SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');

  await chatStream({ messages, businessContext, res });
});

module.exports = router;
