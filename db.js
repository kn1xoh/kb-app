// База данных. Два режима с одинаковым (асинхронным) интерфейсом:
// - на своём компьютере — файл data/kb.sqlite через встроенный в Node.js SQLite;
// - в интернете — облачная база Turso, если заданы TURSO_DATABASE_URL и TURSO_AUTH_TOKEN
//   (бесплатные хостинги стирают файлы при перезапуске, поэтому база живёт отдельно).
//
// Использование: await db.get(sql, ...args) → строка или undefined; db.all → массив строк;
// db.run → { changes, lastInsertRowid }; db.exec(sql) — несколько команд без параметров;
// db.tx(async () => { ... }) — транзакция: все вызовы db.* внутри неё идут в эту транзакцию.
const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');

const REMOTE_URL = process.env.TURSO_DATABASE_URL || '';
const txStore = new AsyncLocalStorage();

// Запросы к базе выполняются по очереди: транзакция растянута во времени (между запросами есть await),
// и чужие запросы не должны вклиниться в неё
let queue = Promise.resolve();
const exclusive = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

// ---------- файл на компьютере ----------
function localBackend() {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = require('node:sqlite'));
  } catch {
    console.error(`Нужен Node.js версии 22.13 или новее (сейчас ${process.version}). Скачайте LTS-версию с https://nodejs.org`);
    process.exit(1);
  }
  const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const conn = new DatabaseSync(path.join(dataDir, 'kb.sqlite'));
  // secure_delete: удалённое и перезаписанное затирается нулями — после шифрования старый открытый текст не остаётся в файле
  conn.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;');
  const runner = {
    all: async (sql, args) => conn.prepare(sql).all(...args),
    run: async (sql, args) => {
      const r = conn.prepare(sql).run(...args);
      return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
    },
    exec: async (sql) => { conn.exec(sql); },
  };
  return {
    remote: false,
    runner,
    async begin({ foreignKeys }) {
      if (!foreignKeys) conn.exec('PRAGMA foreign_keys = OFF');
      conn.exec('BEGIN');
      return {
        runner,
        commit: async () => { conn.exec('COMMIT'); if (!foreignKeys) conn.exec('PRAGMA foreign_keys = ON'); },
        rollback: async () => { conn.exec('ROLLBACK'); if (!foreignKeys) conn.exec('PRAGMA foreign_keys = ON'); },
      };
    },
    close: async () => conn.close(),
  };
}

// ---------- облачная база Turso ----------
function remoteBackend() {
  // web-версия клиента работает через обычные HTTP-запросы и не требует нативных модулей
  const { createClient } = require('@libsql/client/web');
  const client = createClient({
    url: REMOTE_URL.replace(/^libsql:\/\//, 'https://'),
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  const wrap = (target) => ({
    all: async (sql, args) => (await target.execute({ sql, args })).rows.map((r) => ({ ...r })),
    run: async (sql, args) => {
      const r = await target.execute({ sql, args });
      return { changes: r.rowsAffected, lastInsertRowid: Number(r.lastInsertRowid ?? 0) };
    },
    exec: async (sql) => { await target.executeMultiple(sql); },
  });
  return {
    remote: true,
    runner: wrap(client),
    // в Turso внешние ключи включены всегда; отключать их нужно только для старых локальных баз
    async begin() {
      const t = await client.transaction('write');
      return {
        runner: wrap(t),
        commit: async () => { try { await t.commit(); } finally { t.close(); } },
        rollback: async () => { try { await t.rollback(); } finally { t.close(); } },
      };
    },
    close: async () => client.close(),
  };
}

const backend = REMOTE_URL ? remoteBackend() : localBackend();

// В транзакции — её соединение, иначе — общее (по очереди)
const call = (method, sql, args) => {
  const tx = txStore.getStore();
  const clean = args.map((a) => (a === undefined ? null : a));
  return tx ? tx.runner[method](sql, clean) : exclusive(() => backend.runner[method](sql, clean));
};

const db = {
  remote: backend.remote,
  all: (sql, ...args) => call('all', sql, args),
  get: async (sql, ...args) => (await call('all', sql, args))[0],
  run: (sql, ...args) => call('run', sql, args),
  exec: (sql) => call('exec', sql, []),
  async tx(fn, { foreignKeys = true } = {}) {
    if (txStore.getStore()) return fn(); // вложенная — часть внешней
    return exclusive(async () => {
      const tx = await backend.begin({ foreignKeys });
      let result;
      try {
        result = await txStore.run(tx, fn);
      } catch (e) {
        await tx.rollback().catch(() => {});
        throw e;
      }
      await tx.commit();
      return result;
    });
  },
  close: () => backend.close(),
};

// ---------- схема и миграции ----------

const addColumn = async (table, column, type) => {
  if (!(await db.all(`PRAGMA table_info(${table})`)).some((c) => c.name === column)) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
};

db.init = async () => {
  await db.exec(`
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
  -- Встроенный todo удалить нельзя (в него уходят задачи удалённого статуса), но можно переименовать и перекрасить.
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
  await addColumn('pages', 'favorite_at', 'TEXT');
  await addColumn('tasks', 'favorite_at', 'TEXT');
  // Корзина заметок: deleted_at — когда удалена, deleted_batch — id заметки, которую удалил пользователь
  // (её подзаметки уходят в корзину вместе с ней и восстанавливаются тоже вместе)
  await addColumn('pages', 'deleted_at', 'TEXT');
  await addColumn('pages', 'deleted_batch', 'INTEGER');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_pages_trash ON pages(user_id, deleted_batch)');
  // Статус, в который попадают новые задачи (у пользователя максимум один; если не выбран — «Нужно сделать»)
  await addColumn('task_statuses', 'is_default', 'INTEGER NOT NULL DEFAULT 0');

  // Старые базы: в tasks было ограничение CHECK на три статуса — пересоздаём таблицу без него
  const tasksSql = (await db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")).sql;
  if (/CHECK\s*\(\s*status IN/i.test(tasksSql)) {
    const newSql = tasksSql.replace(/\s*CHECK\s*\(\s*status IN\s*\([^)]*\)\s*\)/i, '')
      .replace(/CREATE TABLE\s+("?tasks"?)/i, 'CREATE TABLE tasks_new');
    await db.tx(async () => {
      await db.exec(newSql);
      await db.exec('INSERT INTO tasks_new SELECT * FROM tasks');
      await db.exec('DROP TABLE tasks');
      await db.exec('ALTER TABLE tasks_new RENAME TO tasks');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, status, position)');
    }, { foreignKeys: false });
  }

  // Завершение задачи — отдельный признак (completed_at), а не статус: статус остаётся прежним,
  // и при «Вернуть в работу» задача встаёт туда, где была.
  await addColumn('tasks', 'completed_at', 'TEXT');
  // Корзина задач: удалённые хранятся 30 дней
  await addColumn('tasks', 'deleted_at', 'TEXT');
  // Старый встроенный статус «Готово» (done) убран: его задачи становятся завершёнными
  // и переходят в статус по умолчанию пользователя
  if (await db.get("SELECT 1 FROM task_statuses WHERE key = 'done' UNION SELECT 1 FROM tasks WHERE status = 'done' LIMIT 1")) {
    await db.tx(async () => {
      await db.exec(`UPDATE tasks SET completed_at = COALESCE(completed_at, updated_at),
        status = COALESCE((SELECT s.key FROM task_statuses s WHERE s.user_id = tasks.user_id AND s.is_default = 1 AND s.key != 'done'), 'todo')
        WHERE status = 'done'`);
      await db.exec("DELETE FROM task_statuses WHERE key = 'done'");
    });
  }

  // Шифрование в браузере. Сервер хранит только то, что не раскрывает данные:
  // kdf_salt — соль для пароля; wrapped_key — ключ данных, зашифрованный ключом из пароля;
  // rec_* — то же для кода восстановления. password_hash / rec_hash — bcrypt от «пароля для входа»,
  // который браузер выводит из пароля (кода) отдельно от ключа шифрования. Пустой kdf_salt — старый аккаунт
  // без шифрования: при первом входе браузер создаст ключи и зашифрует заметки и задачи.
  await addColumn('users', 'kdf_salt', 'TEXT');
  await addColumn('users', 'wrapped_key', 'TEXT');
  await addColumn('users', 'rec_salt', 'TEXT');
  await addColumn('users', 'rec_wrapped', 'TEXT');
  await addColumn('users', 'rec_hash', 'TEXT');

  await db.exec(`
  CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL DEFAULT '',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    used_at TEXT
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `);

  await db.run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
};

module.exports = db;
