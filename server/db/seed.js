require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('./schema');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@guillonaap.com';
const ADMIN_PASS  = 'admin1234'; // cambiá esto en producción

const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (existing) {
  console.log('Admin ya existe, nada que hacer.');
  process.exit(0);
}

const hash = bcrypt.hashSync(ADMIN_PASS, 12);
db.prepare(`
  INSERT INTO users (name, email, password_hash, business_name, role, status, plan)
  VALUES (?, ?, ?, 'Guillon AP', 'admin', 'active', 'pro')
`).run('Admin', ADMIN_EMAIL, hash);

console.log(`Admin creado:`);
console.log(`  Email: ${ADMIN_EMAIL}`);
console.log(`  Password: ${ADMIN_PASS}`);
console.log(`  ⚠ Cambiá la contraseña en producción.`);
