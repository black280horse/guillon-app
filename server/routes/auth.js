const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');
const { emailNuevoRegistro } = require('../services/email');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, business_name } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

  const password_hash = await bcrypt.hash(password, 12);

  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, business_name, role, status, plan)
    VALUES (?, ?, ?, ?, 'user', 'pending', 'free')
  `).run(name, email, password_hash, business_name || null);

  // Notificar al admin por email
  const admin = db.prepare("SELECT email FROM users WHERE role = 'admin' LIMIT 1").get();
  if (admin) {
    emailNuevoRegistro({
      adminEmail: admin.email,
      userName: name,
      userEmail: email,
      businessName: business_name,
    }).catch(err => console.error('Error enviando email al admin:', err));
  }

  res.status(201).json({ message: 'Registro exitoso. Tu cuenta está pendiente de aprobación.' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

  if (user.status === 'pending') {
    return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación', code: 'PENDING' });
  }
  if (user.status === 'rejected') {
    return res.status(403).json({ error: 'Tu cuenta fue rechazada', code: 'REJECTED' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Tu cuenta está suspendida', code: 'SUSPENDED' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json(safeUser);
});

module.exports = router;
