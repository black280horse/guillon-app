const jwt = require('jsonwebtoken');
const db = require('../db/schema');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, business_name, role, status, plan, access_expires_at, created_at FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Cuenta no activa' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
