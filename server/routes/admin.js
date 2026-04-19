const router = require('express').Router();
const db = require('../db/schema');
const { requireAdmin } = require('../middleware/auth');
const { emailUsuarioAprobado, emailUsuarioRechazado } = require('../services/email');

router.use(requireAdmin);

// GET /api/admin/users
// access_expires_at is reserved for future plan management — not written by any endpoint yet
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, name, email, business_name, role, status, plan, access_expires_at, created_at
    FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

// PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'No podés modificar tu propia cuenta' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(user.id);
  emailUsuarioAprobado({ userEmail: user.email, userName: user.name })
    .catch(err => console.error('Error enviando email aprobación:', err));
  res.json({ message: `Usuario ${user.name} aprobado` });
});

// PATCH /api/admin/users/:id/reject
router.patch('/users/:id/reject', (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'No podés modificar tu propia cuenta' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  db.prepare("UPDATE users SET status = 'rejected' WHERE id = ?").run(user.id);
  emailUsuarioRechazado({ userEmail: user.email, userName: user.name })
    .catch(err => console.error('Error enviando email rechazo:', err));
  res.json({ message: `Usuario ${user.name} rechazado` });
});

// PATCH /api/admin/users/:id/suspend
router.patch('/users/:id/suspend', (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'No podés suspender tu propia cuenta' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(user.id);
  res.json({ message: `Usuario ${user.name} suspendido` });
});

module.exports = router;
