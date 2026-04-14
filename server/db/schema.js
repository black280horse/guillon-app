const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH
  || (process.env.RAILWAY_ENVIRONMENT ? '/app/data/database.sqlite' : path.join(__dirname, '..', 'guillon.db'));
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Tablas base ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    business_name   TEXT,
    role            TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','rejected','suspended')),
    plan            TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','pro')),
    access_expires_at TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sales_data (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
    date        TEXT NOT NULL,
    revenue     REAL NOT NULL DEFAULT 0,
    investment  REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id       INTEGER REFERENCES products(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    description      TEXT,
    due_date         TEXT,
    priority         TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
    status           TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','overdue')),
    notified_24h     INTEGER NOT NULL DEFAULT 0,
    notified_overdue INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message    TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'info',
    read       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── Migraciones seguras (columnas nuevas sobre DB existente) ────────────────
const migrations = [
  'ALTER TABLE tasks ADD COLUMN notified_24h INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE tasks ADD COLUMN notified_overdue INTEGER NOT NULL DEFAULT 0',
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* columna ya existe → ignorar */ }
}

// ─── Migración: agregar status 'reviewing' al CHECK constraint ────────────────
try {
  const taskDdl = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get();
  if (taskDdl && !taskDdl.sql.includes("'reviewing'")) {
    db.pragma('foreign_keys = OFF');
    const migrate = db.transaction(() => {
      db.prepare(`
        CREATE TABLE tasks_new (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id       INTEGER REFERENCES products(id) ON DELETE SET NULL,
          title            TEXT NOT NULL,
          description      TEXT,
          due_date         TEXT,
          priority         TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
          status           TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','overdue','reviewing')),
          notified_24h     INTEGER NOT NULL DEFAULT 0,
          notified_overdue INTEGER NOT NULL DEFAULT 0,
          created_at       TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at     TEXT
        )
      `).run();
      db.prepare(`
        INSERT INTO tasks_new
          (id, user_id, product_id, title, description, due_date, priority, status,
           notified_24h, notified_overdue, created_at, completed_at)
        SELECT
          id, user_id, product_id, title, description, due_date, priority, status,
          notified_24h, notified_overdue, created_at, completed_at
        FROM tasks
      `).run();
      db.prepare('DROP TABLE tasks').run();
      db.prepare('ALTER TABLE tasks_new RENAME TO tasks').run();
    });
    migrate();
    db.pragma('foreign_keys = ON');
    console.log('✓ Migración: status reviewing agregado a tasks');
  }
} catch (e) {
  db.pragma('foreign_keys = ON');
  console.error('Error en migración reviewing:', e.message);
}

module.exports = db;
