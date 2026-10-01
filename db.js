const path = require('path');
const fs = require('fs');
let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.error(`Нужен Node.js версии 22.13 или новее (сейчас ${process.version}). Скачайте LTS-версию с https://nodejs.org`);
  process.exit(1);
}

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'kb.sqlite'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.transaction = (fn) => (...args) => {
  db.exec('BEGIN');
  try {
    const result = fn(...args);
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
};

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  search_text TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pages_user ON pages(user_id, parent_id, position);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date TEXT,
  search_text TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, status, position);

-- Статусы задач: у каждого пользователя свои. key хранится в tasks.status.
-- Встроенные todo / done удалить нельзя (в них попадают новые и выполненные задачи), но можно переименовать и перекрасить.
CREATE TABLE IF NOT EXISTS task_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, key)
);
`);

// Migrations for databases created by earlier versions
const addColumn = (table, column, type) => {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
};
addColumn('pages', 'favorite_at', 'TEXT');
addColumn('tasks', 'favorite_at', 'TEXT');
// Корзина заметок: deleted_at — когда удалена, deleted_batch — id заметки, которую удалил пользователь
// (её подзаметки уходят в корзину вместе с ней и восстанавливаются тоже вместе)
addColumn('pages', 'deleted_at', 'TEXT');
addColumn('pages', 'deleted_batch', 'INTEGER');
db.exec('CREATE INDEX IF NOT EXISTS idx_pages_trash ON pages(user_id, deleted_batch)');
// Статус, в который попадают новые задачи (у пользователя максимум один; если не выбран — «Нужно сделать»)
addColumn('task_statuses', 'is_default', 'INTEGER NOT NULL DEFAULT 0');

// Старые базы: в tasks было ограничение CHECK на три статуса — пересоздаём таблицу без него
const tasksSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'").get().sql;
if (/CHECK\s*\(\s*status IN/i.test(tasksSql)) {
  const newSql = tasksSql.replace(/\s*CHECK\s*\(\s*status IN\s*\([^)]*\)\s*\)/i, '')
    .replace(/CREATE TABLE\s+("?tasks"?)/i, 'CREATE TABLE tasks_new');
  db.exec('PRAGMA foreign_keys = OFF');
  db.transaction(() => {
    db.exec(newSql);
    db.exec('INSERT INTO tasks_new SELECT * FROM tasks');
    db.exec('DROP TABLE tasks');
    db.exec('ALTER TABLE tasks_new RENAME TO tasks');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, status, position)');
  })();
  db.exec('PRAGMA foreign_keys = ON');
}

db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

module.exports = db;
