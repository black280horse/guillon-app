const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const VALID_STATUS   = ['pending','in_progress','completed','overdue','reviewing'];
const VALID_PRIORITY = ['high','medium','low'];

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const userId = req.user.id;
  const { status, date_from, date_to, product_id } = req.query;

  let where = 'WHERE t.user_id = ?';
  const params = [userId];

  if (status)     { where += ' AND t.status = ?';     params.push(status); }
  if (date_from)  { where += ' AND t.due_date >= ?';  params.push(date_from); }
  if (date_to)    { where += ' AND t.due_date <= ?';  params.push(date_to); }
  if (product_id === 'null') { where += ' AND t.product_id IS NULL'; }
  else if (product_id) { where += ' AND t.product_id = ?'; params.push(product_id); }

  const tasks = db.prepare(`
    SELECT t.*,
           p.name AS product_name
    FROM tasks t
    LEFT JOIN products p ON p.id = t.product_id
    ${where}
    ORDER BY
      CASE t.status WHEN 'overdue' THEN 0 WHEN 'pending' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
      CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
      t.due_date ASC,
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END
  `).all(...params);

  res.json(tasks);
});

// ─── GET /api/tasks/stats ─────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to, product_id } = req.query;

  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (date_from)  { where += ' AND (due_date >= ? OR completed_at >= ?)'; params.push(date_from, date_from); }
  if (date_to)    { where += ' AND (due_date <= ? OR completed_at <= ?)'; params.push(date_to, date_to); }
  if (product_id === 'null') { where += ' AND product_id IS NULL'; }
  else if (product_id) { where += ' AND product_id = ?'; params.push(product_id); }

  const total     = db.prepare(`SELECT COUNT(*) AS n FROM tasks ${where}`).get(...params).n;
  const completed = db.prepare(`SELECT COUNT(*) AS n FROM tasks ${where} AND status = 'completed'`).get(...params).n;
  const overdue   = db.prepare(`SELECT COUNT(*) AS n FROM tasks ${where} AND status = 'overdue'`).get(...params).n;
  const pending   = db.prepare(`SELECT COUNT(*) AS n FROM tasks ${where} AND status IN ('pending','in_progress')`).get(...params).n;

  // Datos semanales: tareas completadas agrupadas por semana ISO
  let weekWhere = 'WHERE user_id = ? AND status = \'completed\' AND completed_at IS NOT NULL';
  const weekParams = [userId];
  if (date_from) { weekWhere += ' AND completed_at >= ?'; weekParams.push(date_from); }
  if (date_to)   { weekWhere += ' AND completed_at <= ?'; weekParams.push(date_to); }
  if (product_id === 'null') { weekWhere += ' AND product_id IS NULL'; }
  else if (product_id) { weekWhere += ' AND product_id = ?'; weekParams.push(product_id); }

  const weekly = db.prepare(`
    SELECT
      strftime('%Y-W%W', completed_at) AS week,
      COUNT(*)                         AS completed
    FROM tasks
    ${weekWhere}
    GROUP BY week
    ORDER BY week ASC
  `).all(...weekParams);

  // Historial de completadas
  const completedList = db.prepare(`
    SELECT t.*, p.name AS product_name FROM tasks t
    LEFT JOIN products p ON p.id = t.product_id
    WHERE t.user_id = ? AND t.status = 'completed'
    ${date_from ? "AND t.completed_at >= '" + date_from + "'" : ''}
    ${date_to   ? "AND t.completed_at <= '" + date_to   + "'" : ''}
    ORDER BY t.completed_at DESC
    LIMIT 50
  `).all(userId);

  res.json({
    total, completed, overdue, pending,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    weekly,
    completedList,
  });
});

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const userId = req.user.id;
  const { title, description, due_date, priority, product_id } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'El título es requerido' });
  if (priority && !VALID_PRIORITY.includes(priority))
    return res.status(400).json({ error: 'Prioridad inválida' });

  const result = db.prepare(`
    INSERT INTO tasks (user_id, product_id, title, description, due_date, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(userId, product_id || null, title.trim(), description || null, due_date || null, priority || 'medium');

  const task = db.prepare(`
    SELECT t.*, p.name AS product_name FROM tasks t
    LEFT JOIN products p ON p.id = t.product_id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(task);
});

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  const userId = req.user.id;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

  const { title, description, due_date, priority, status, product_id } = req.body;

  if (status && !VALID_STATUS.includes(status))
    return res.status(400).json({ error: 'Status inválido' });
  if (priority && !VALID_PRIORITY.includes(priority))
    return res.status(400).json({ error: 'Prioridad inválida' });

  const newStatus = status ?? task.status;
  const completedAt = newStatus === 'completed' && task.status !== 'completed'
    ? new Date().toISOString().slice(0, 10)
    : (newStatus !== 'completed' ? null : task.completed_at);

  db.prepare(`
    UPDATE tasks SET
      title        = ?,
      description  = ?,
      due_date     = ?,
      priority     = ?,
      status       = ?,
      product_id   = ?,
      completed_at = ?
    WHERE id = ?
  `).run(
    title        ?? task.title,
    description  ?? task.description,
    due_date     !== undefined ? due_date : task.due_date,
    priority     ?? task.priority,
    newStatus,
    product_id   !== undefined ? (product_id || null) : task.product_id,
    completedAt,
    task.id
  );

  const updated = db.prepare(`
    SELECT t.*, p.name AS product_name FROM tasks t
    LEFT JOIN products p ON p.id = t.product_id
    WHERE t.id = ?
  `).get(task.id);

  res.json(updated);
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
  res.json({ message: 'Tarea eliminada' });
});

module.exports = router;
