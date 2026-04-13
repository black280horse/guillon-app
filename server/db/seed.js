require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('./schema');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@guillonaap.com';
const ADMIN_PASS  = process.env.ADMIN_PASS  || 'admin1234';

const hash = bcrypt.hashSync(ADMIN_PASS, 12);

const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (existing) {
  db.prepare('UPDATE users SET email = ?, password_hash = ?, status = ?, plan = ? WHERE id = ?')
    .run(ADMIN_EMAIL, hash, 'active', 'pro', existing.id);
  console.log(`Admin actualizado: ${ADMIN_EMAIL}`);
} else {
  db.prepare(`
    INSERT INTO users (name, email, password_hash, business_name, role, status, plan)
    VALUES (?, ?, ?, 'Guillon AP', 'admin', 'active', 'pro')
  `).run('Admin', ADMIN_EMAIL, hash);
  console.log(`Admin creado: ${ADMIN_EMAIL}`);
}
