const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const sanitizeHtml = require('sanitize-html');
const db = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const SESSION_DAYS = 30;
const COOKIE = 'kb_session';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
  });
  next();
});

// ---------- helpers ----------

const SANITIZE = {
  allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'hr', 'div', 'span'],
  allowedAttributes: { a: ['href', 'target', 'rel'], ul: ['class'], li: ['data-checked'] },
  allowedClasses: { ul: ['checklist'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
};
const clean = (html) => sanitizeHtml(String(html || ''), SANITIZE);
const plain = (html) => sanitizeHtml(String(html || '').replace(/<\/(p|div|h\d|li|pre|blockquote)>|<br\s*\/?>/gi, ' $&'),
  { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const lower = (s) => String(s || '').toLowerCase();

function httpError(res, status, message) {
  return res.status(status).json({ error: message });
}

function createSession(res, req, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: SESSION_DAYS * 864e5,
  });
}

const publicUser = (u) => u && ({ id: u.id, email: u.email, name: u.name, is_admin: !!u.is_admin });

// Custom header blocks cross-site form posts (browsers can't set it without CORS preflight)
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'kb') {
    return httpError(res, 403, 'Запрос отклонён');
  }
  next();
});

app.use('/api', (req, res, next) => {
  const token = req.cookies[COOKIE];
  if (token) {
    const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?`).get(token, Date.now());
    if (row) req.user = row;
  }
  next();
});

const auth = (req, res, next) => (req.user ? next() : httpError(res, 401, 'Нужно войти в аккаунт'));
const admin = (req, res, next) => (req.user?.is_admin ? next() : httpError(res, 403, 'Доступно только администратору'));

// ---------- auth ----------

const attempts = new Map();
function tooManyAttempts(key) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < 15 * 60e3);
  attempts.set(key, list);
  return list.length >= 10;
}

app.get('/api/me', (req, res) => {
  const needsSetup = db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0;
  res.json({ user: publicUser(req.user), needsSetup });
});

app.post('/api/setup', (req, res) => {
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) {
    return httpError(res, 400, 'Администратор уже создан');
  }
  const { email, name, password } = req.body || {};
  const err = validateUserInput(email, password);
  if (err) return httpError(res, 400, err);
  const info = db.prepare('INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, ?, 1)')
    .run(email.trim(), String(name || '').trim(), bcrypt.hashSync(password, 10));
  seedWelcome(info.lastInsertRowid);
  createSession(res, req, info.lastInsertRowid);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)) });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const key = `${req.ip}|${lower(email)}`;
  if (tooManyAttempts(key)) return httpError(res, 429, 'Слишком много попыток. Попробуйте через 15 минут');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim());
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    attempts.get(key).push(Date.now());
    return httpError(res, 401, 'Неверный email или пароль');
  }
  attempts.delete(key);
  createSession(res, req, user.id);
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.post('/api/me/password', auth, (req, res) => {
  const { current, next: newPassword } = req.body || {};
  if (!bcrypt.compareSync(String(current || ''), req.user.password_hash)) {
    return httpError(res, 400, 'Текущий пароль указан неверно');
  }
  if (String(newPassword || '').length < 8) return httpError(res, 400, 'Новый пароль должен быть не короче 8 символов');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(req.user.id, req.cookies[COOKIE]);
  res.json({ ok: true });
});

function validateUserInput(email, password, passwordOptional = false) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) return 'Укажите корректный email';
  if (!(passwordOptional && !password) && String(password || '').length < 8) return 'Пароль должен быть не короче 8 символов';
  return null;
}

// ---------- admin: users ----------

app.get('/api/admin/users', auth, admin, (req, res) => {
  res.json(db.prepare(`SELECT u.id, u.email, u.name, u.is_admin, u.created_at,
    (SELECT COUNT(*) FROM pages p WHERE p.user_id = u.id AND p.deleted_at IS NULL) AS pages,
    (SELECT COUNT(*) FROM tasks t WHERE t.user_id = u.id) AS tasks
    FROM users u ORDER BY u.created_at`).all().map((u) => ({ ...u, is_admin: !!u.is_admin })));
});

app.post('/api/admin/users', auth, admin, (req, res) => {
  const { email, name, password, is_admin } = req.body || {};
  const err = validateUserInput(email, password);
  if (err) return httpError(res, 400, err);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.trim())) {
    return httpError(res, 400, 'Пользователь с таким email уже есть');
  }
  const info = db.prepare('INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, ?, ?)')
    .run(email.trim(), String(name || '').trim(), bcrypt.hashSync(password, 10), is_admin ? 1 : 0);
  seedWelcome(info.lastInsertRowid);
  res.json({ id: info.lastInsertRowid });
});

app.patch('/api/admin/users/:id', auth, admin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return httpError(res, 404, 'Пользователь не найден');
  const { name, password, is_admin } = req.body || {};
  if (password !== undefined) {
    if (String(password).length < 8) return httpError(res, 400, 'Пароль должен быть не короче 8 символов');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  }
  if (name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(name).trim(), user.id);
  if (is_admin !== undefined) {
    if (user.id === req.user.id && !is_admin) return httpError(res, 400, 'Нельзя снять права администратора с самого себя');
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(is_admin ? 1 : 0, user.id);
  }
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', auth, admin, (req, res) => {
  if (Number(req.params.id) === req.user.id) return httpError(res, 400, 'Нельзя удалить свой аккаунт');
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- pages (notes tree) ----------

// getPage видит только живые заметки; удалённые (в корзине) для него как будто не существуют
const getPage = (userId, id) => db.prepare('SELECT * FROM pages WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);

app.get('/api/pages', auth, (req, res) => {
  res.json(db.prepare(`SELECT id, parent_id, title, position, updated_at, favorite_at FROM pages
    WHERE user_id = ? AND deleted_at IS NULL ORDER BY position, id`).all(req.user.id));
});

app.get('/api/pages/:id', auth, (req, res) => {
  const page = getPage(req.user.id, req.params.id);
  if (!page) return httpError(res, 404, 'Заметка не найдена');
  delete page.search_text;
  res.json(page);
});

app.post('/api/pages', auth, (req, res) => {
  const parentId = req.body?.parent_id ?? null;
  if (parentId !== null && !getPage(req.user.id, parentId)) return httpError(res, 400, 'Заметка, в которую вы вкладываете, не найдена');
  const title = String(req.body?.title || '').slice(0, 300);
  const pos = db.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM pages
    WHERE user_id = ? AND parent_id IS ?`).get(req.user.id, parentId).p;
  const info = db.prepare('INSERT INTO pages (user_id, parent_id, title, position, search_text) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, parentId, title, pos, lower(title));
  res.json(getPage(req.user.id, info.lastInsertRowid));
});

app.patch('/api/pages/:id', auth, (req, res) => {
  const page = getPage(req.user.id, req.params.id);
  if (!page) return httpError(res, 404, 'Заметка не найдена');
  const title = req.body.title !== undefined ? String(req.body.title).slice(0, 300) : page.title;
  const content = req.body.content !== undefined ? clean(req.body.content) : page.content;
  db.prepare(`UPDATE pages SET title = ?, content = ?, search_text = ?, updated_at = datetime('now')
    WHERE id = ?`).run(title, content, lower(`${title} ${plain(content)}`), page.id);
  const updated = getPage(req.user.id, page.id);
  res.json({ id: updated.id, title: updated.title, updated_at: updated.updated_at });
});

app.post('/api/pages/:id/move', auth, (req, res) => {
  const page = getPage(req.user.id, req.params.id);
  if (!page) return httpError(res, 404, 'Заметка не найдена');
  const parentId = req.body?.parent_id ?? null;
  if (parentId !== null) {
    if (!getPage(req.user.id, parentId)) return httpError(res, 400, 'Заметка, в которую вы вкладываете, не найдена');
    // walk up from the new parent to make sure we don't move a page inside itself
    for (let cur = parentId; cur !== null; cur = getPage(req.user.id, cur).parent_id) {
      if (cur === page.id) return httpError(res, 400, 'Нельзя вложить заметку саму в себя или в свою подзаметку');
    }
  }
  const siblings = db.prepare(`SELECT id FROM pages WHERE user_id = ? AND parent_id IS ? AND id != ?
    AND deleted_at IS NULL ORDER BY position, id`).all(req.user.id, parentId, page.id).map((r) => r.id);
  const index = Math.max(0, Math.min(Number(req.body?.index ?? siblings.length), siblings.length));
  siblings.splice(index, 0, page.id);
  const upd = db.prepare('UPDATE pages SET parent_id = ?, position = ? WHERE id = ?');
  db.transaction(() => siblings.forEach((id, i) => upd.run(parentId, i, id)))();
  res.json({ ok: true });
});

app.post('/api/pages/:id/favorite', auth, (req, res) => {
  const page = getPage(req.user.id, req.params.id);
  if (!page) return httpError(res, 404, 'Заметка не найдена');
  db.prepare(`UPDATE pages SET favorite_at = ${req.body?.favorite ? "datetime('now')" : 'NULL'} WHERE id = ?`).run(page.id);
  res.json({ favorite_at: getPage(req.user.id, page.id).favorite_at });
});

// ---------- notes trash («Недавно удалённые») ----------

const TRASH_DAYS = 30;
const sqlNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

// Кладёт заметки в корзину вместе с подзаметками. Если выбраны и заметка, и её подзаметка —
// в корзину уходит одна запись (родитель), чтобы восстанавливать их вместе.
function trashPages(userId, ids) {
  const pages = [...new Set(ids.map(Number))].map((id) => getPage(userId, id)).filter(Boolean);
  const chosen = new Set(pages.map((p) => p.id));
  const hasChosenAncestor = (p) => {
    for (let cur = p.parent_id; cur !== null; cur = getPage(userId, cur)?.parent_id ?? null) {
      if (chosen.has(cur)) return true;
    }
    return false;
  };
  const roots = pages.filter((p) => !hasChosenAncestor(p)).map((p) => p.id);
  const now = sqlNow();
  const mark = db.prepare(`WITH RECURSIVE sub(id) AS (
      SELECT ? UNION ALL SELECT p.id FROM pages p JOIN sub ON p.parent_id = sub.id WHERE p.deleted_at IS NULL)
    UPDATE pages SET deleted_at = ?, deleted_batch = ? WHERE id IN (SELECT id FROM sub) AND user_id = ?`);
  db.transaction(() => roots.forEach((id) => mark.run(id, now, id, userId)))();
  return roots;
}

// Возвращает заметку на прежнее место. Если родитель тоже удалён — к ближайшему живому предку
// (или на верхний уровень) и в конец списка.
function restorePages(userId, batchIds) {
  const anyPage = db.prepare('SELECT * FROM pages WHERE id = ? AND user_id = ?');
  const restored = [];
  db.transaction(() => batchIds.map(Number).forEach((id) => {
    const root = anyPage.get(id, userId);
    if (!root || root.deleted_batch !== root.id) return;
    let target = root.parent_id;
    while (target !== null) {
      const parent = anyPage.get(target, userId);
      if (!parent) { target = null; break; }
      if (!parent.deleted_at) break;
      target = parent.parent_id;
    }
    if (target !== root.parent_id) {
      const pos = db.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM pages
        WHERE user_id = ? AND parent_id IS ? AND deleted_at IS NULL`).get(userId, target).p;
      db.prepare('UPDATE pages SET parent_id = ?, position = ? WHERE id = ?').run(target, pos, root.id);
    }
    db.prepare('UPDATE pages SET deleted_at = NULL, deleted_batch = NULL WHERE deleted_batch = ? AND user_id = ?')
      .run(root.id, userId);
    restored.push({ id: root.id, parent_id: target, moved: target !== root.parent_id });
  }))();
  return restored;
}

function purgeBatch(userId, batchId) {
  db.transaction(() => {
    // заметки, удалённые раньше отдельно, но лежавшие внутри — не теряем, а отвязываем от родителя
    db.prepare(`UPDATE pages SET parent_id = NULL WHERE user_id = ? AND deleted_batch != ?
      AND parent_id IN (SELECT id FROM pages WHERE deleted_batch = ?)`).run(userId, batchId, batchId);
    db.prepare('DELETE FROM pages WHERE deleted_batch = ? AND user_id = ?').run(batchId, userId);
  })();
}

function purgeExpired() {
  const old = db.prepare(`SELECT id, user_id FROM pages WHERE deleted_batch = id
    AND deleted_at < datetime('now', ?)`).all(`-${TRASH_DAYS} days`);
  old.forEach((r) => purgeBatch(r.user_id, r.id));
  if (old.length) console.log(`Корзина: окончательно удалены записи старше ${TRASH_DAYS} дней (${old.length})`);
}
purgeExpired();
setInterval(purgeExpired, 6 * 3600e3).unref();

app.delete('/api/pages/:id', auth, (req, res) => {
  if (!getPage(req.user.id, req.params.id)) return httpError(res, 404, 'Заметка не найдена');
  res.json({ trashed: trashPages(req.user.id, [req.params.id]) });
});

app.post('/api/pages/delete', auth, (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length) return httpError(res, 400, 'Не выбраны заметки');
  res.json({ trashed: trashPages(req.user.id, ids) });
});

app.get('/api/trash/pages', auth, (req, res) => {
  const items = db.prepare(`SELECT r.id, r.title, r.deleted_at,
      (SELECT COUNT(*) - 1 FROM pages s WHERE s.deleted_batch = r.id) AS sub_count,
      par.title AS parent_title, par.deleted_at IS NOT NULL AS parent_deleted
    FROM pages r LEFT JOIN pages par ON par.id = r.parent_id
    WHERE r.user_id = ? AND r.deleted_batch = r.id ORDER BY r.deleted_at DESC, r.id DESC`).all(req.user.id);
  res.json({ days: TRASH_DAYS, items: items.map((i) => ({ ...i, parent_deleted: !!i.parent_deleted })) });
});

app.post('/api/trash/pages/restore', auth, (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length) return httpError(res, 400, 'Не выбраны заметки');
  res.json({ restored: restorePages(req.user.id, ids) });
});

app.delete('/api/trash/pages/:id', auth, (req, res) => {
  purgeBatch(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

app.delete('/api/trash/pages', auth, (req, res) => {
  const ids = db.prepare('SELECT id FROM pages WHERE user_id = ? AND deleted_batch = id').all(req.user.id);
  ids.forEach((r) => purgeBatch(req.user.id, r.id));
  res.json({ ok: true, count: ids.length });
});

// ---------- tasks ----------

// Цвета статусов — ключи палитры; сами цвета заданы в app.css (--st-<ключ>) для светлой и тёмной темы
const STATUS_COLORS = ['gray', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'brown'];
const DEFAULT_STATUSES = [['todo', 'Нужно сделать', 'gray'], ['in_progress', 'В работе', 'orange'], ['done', 'Готово', 'green']];
const FIXED_STATUSES = ['todo', 'done'];
const MAX_STATUSES = 12;

function listStatuses(userId) {
  const sql = 'SELECT key, name, color, position, is_default FROM task_statuses WHERE user_id = ? ORDER BY position, id';
  let rows = db.prepare(sql).all(userId);
  if (!rows.length) {
    const ins = db.prepare('INSERT OR IGNORE INTO task_statuses (user_id, key, name, color, position) VALUES (?, ?, ?, ?, ?)');
    db.transaction(() => DEFAULT_STATUSES.forEach(([k, n, c], i) => ins.run(userId, k, n, c, i)))();
    rows = db.prepare(sql).all(userId);
  }
  // Статус по умолчанию: выбранный пользователем, иначе «Нужно сделать». «Готово» им быть не может
  const chosen = rows.find((r) => r.is_default && r.key !== 'done');
  const defKey = chosen ? chosen.key : 'todo';
  return rows.map(({ is_default, ...r }) => ({ ...r, fixed: FIXED_STATUSES.includes(r.key), default: r.key === defKey }));
}
const defaultStatus = (userId) => (listStatuses(userId).find((s) => s.default) || { key: 'todo' }).key;
const statusExists = (userId, key) => listStatuses(userId).some((s) => s.key === key);
const cleanStatusName = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
const nameTaken = (userId, name, exceptKey) =>
  listStatuses(userId).some((s) => s.key !== exceptKey && s.name.toLowerCase() === name.toLowerCase());
const PRIORITIES = ['low', 'medium', 'high'];
const getTask = (userId, id) => db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
const taskOut = (t) => { const { search_text, user_id, ...rest } = t; return rest; };
const validDate = (d) => d === null || d === '' || /^\d{4}-\d{2}-\d{2}$/.test(d);

app.get('/api/tasks', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY position, id').all(req.user.id).map(taskOut));
});

app.post('/api/tasks', auth, (req, res) => {
  const b = req.body || {};
  // Название можно ввести уже в открытой карточке, поэтому задача создаётся и без него
  const title = String(b.title || '').trim().slice(0, 300);
  const status = b.status && statusExists(req.user.id, b.status) ? b.status : defaultStatus(req.user.id);
  const priority = PRIORITIES.includes(b.priority) ? b.priority : 'medium';
  const due = validDate(b.due_date) && b.due_date ? b.due_date : null;
  const pos = db.prepare('SELECT COALESCE(MIN(position), 1) - 1 AS p FROM tasks WHERE user_id = ? AND status = ?')
    .get(req.user.id, status).p;
  const info = db.prepare(`INSERT INTO tasks (user_id, title, status, priority, due_date, position, search_text)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.user.id, title, status, priority, due, pos, lower(title));
  res.json(taskOut(getTask(req.user.id, info.lastInsertRowid)));
});

app.patch('/api/tasks/:id', auth, (req, res) => {
  const t = getTask(req.user.id, req.params.id);
  if (!t) return httpError(res, 404, 'Задача не найдена');
  const b = req.body || {};
  const next = { ...t };
  if (b.title !== undefined) next.title = String(b.title).slice(0, 300);
  if (b.description !== undefined) next.description = clean(b.description);
  if (b.status !== undefined) {
    if (!statusExists(req.user.id, b.status)) return httpError(res, 400, 'Такого статуса нет. Обновите страницу');
    if (b.status !== t.status) {
      next.position = db.prepare('SELECT COALESCE(MIN(position), 1) - 1 AS p FROM tasks WHERE user_id = ? AND status = ?')
        .get(req.user.id, b.status).p;
    }
    next.status = b.status;
  }
  if (b.priority !== undefined) {
    if (!PRIORITIES.includes(b.priority)) return httpError(res, 400, 'Неизвестный приоритет');
    next.priority = b.priority;
  }
  if (b.due_date !== undefined) {
    if (!validDate(b.due_date)) return httpError(res, 400, 'Дата должна быть в формате ГГГГ-ММ-ДД');
    next.due_date = b.due_date || null;
  }
  db.prepare(`UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, position = ?,
    search_text = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(next.title, next.description, next.status, next.priority, next.due_date, next.position,
      lower(`${next.title} ${plain(next.description)}`), t.id);
  res.json(taskOut(getTask(req.user.id, t.id)));
});

app.post('/api/tasks/reorder', auth, (req, res) => {
  const { status, ids } = req.body || {};
  if (!statusExists(req.user.id, status) || !Array.isArray(ids)) return httpError(res, 400, 'Некорректные данные');
  const upd = db.prepare(`UPDATE tasks SET status = ?, position = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?`);
  db.transaction(() => ids.forEach((id, i) => upd.run(status, i, id, req.user.id)))();
  res.json({ ok: true });
});

app.post('/api/tasks/:id/favorite', auth, (req, res) => {
  const t = getTask(req.user.id, req.params.id);
  if (!t) return httpError(res, 404, 'Задача не найдена');
  db.prepare(`UPDATE tasks SET favorite_at = ${req.body?.favorite ? "datetime('now')" : 'NULL'} WHERE id = ?`).run(t.id);
  res.json({ favorite_at: getTask(req.user.id, t.id).favorite_at });
});

app.delete('/api/tasks/:id', auth, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---------- task statuses ----------

app.get('/api/statuses', auth, (req, res) => res.json(listStatuses(req.user.id)));

app.post('/api/statuses', auth, (req, res) => {
  const list = listStatuses(req.user.id);
  if (list.length >= MAX_STATUSES) return httpError(res, 400, `Статусов может быть не больше ${MAX_STATUSES}`);
  const name = cleanStatusName(req.body?.name);
  if (!name) return httpError(res, 400, 'Напишите название статуса');
  if (nameTaken(req.user.id, name)) return httpError(res, 400, 'Статус с таким названием уже есть');
  const color = STATUS_COLORS.includes(req.body?.color) ? req.body.color : 'blue';
  const key = 's_' + crypto.randomBytes(5).toString('hex');
  // Новый статус встаёт перед «Готово», чтобы «Готово» оставалось последним
  const done = list.find((s) => s.key === 'done');
  const pos = done ? done.position : list.length;
  db.transaction(() => {
    db.prepare('UPDATE task_statuses SET position = position + 1 WHERE user_id = ? AND position >= ?').run(req.user.id, pos);
    db.prepare('INSERT INTO task_statuses (user_id, key, name, color, position) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, key, name, color, pos);
  })();
  res.json(listStatuses(req.user.id));
});

app.patch('/api/statuses/:key', auth, (req, res) => {
  const s = listStatuses(req.user.id).find((x) => x.key === req.params.key);
  if (!s) return httpError(res, 404, 'Статус не найден');
  const b = req.body || {};
  let { name, color } = s;
  if (b.name !== undefined) {
    name = cleanStatusName(b.name);
    if (!name) return httpError(res, 400, 'Название статуса не может быть пустым');
    if (nameTaken(req.user.id, name, s.key)) return httpError(res, 400, 'Статус с таким названием уже есть');
  }
  if (b.color !== undefined) {
    if (!STATUS_COLORS.includes(b.color)) return httpError(res, 400, 'Неизвестный цвет');
    color = b.color;
  }
  if (b.default !== undefined && b.default !== true) return httpError(res, 400, 'Выберите другой статус по умолчанию');
  if (b.default === true && s.key === 'done') return httpError(res, 400, 'Новые задачи не могут сразу попадать в «Готово»');
  db.transaction(() => {
    db.prepare('UPDATE task_statuses SET name = ?, color = ? WHERE user_id = ? AND key = ?').run(name, color, req.user.id, s.key);
    if (b.default === true) {
      db.prepare('UPDATE task_statuses SET is_default = (key = ?) WHERE user_id = ?').run(s.key, req.user.id);
    }
  })();
  res.json(listStatuses(req.user.id));
});

app.post('/api/statuses/reorder', auth, (req, res) => {
  const keys = req.body?.keys;
  const current = listStatuses(req.user.id).map((s) => s.key);
  if (!Array.isArray(keys) || keys.length !== current.length || !current.every((k) => keys.includes(k))) {
    return httpError(res, 400, 'Некорректные данные');
  }
  const upd = db.prepare('UPDATE task_statuses SET position = ? WHERE user_id = ? AND key = ?');
  db.transaction(() => keys.forEach((k, i) => upd.run(i, req.user.id, k)))();
  res.json(listStatuses(req.user.id));
});

// Удаление статуса: его задачи переходят в «Нужно сделать»
app.delete('/api/statuses/:key', auth, (req, res) => {
  const key = req.params.key;
  if (FIXED_STATUSES.includes(key)) return httpError(res, 400, 'Этот статус нельзя удалить, но можно переименовать');
  if (!statusExists(req.user.id, key)) return httpError(res, 404, 'Статус не найден');
  db.transaction(() => {
    const start = db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM tasks WHERE user_id = ? AND status = 'todo'").get(req.user.id).p;
    const ids = db.prepare('SELECT id FROM tasks WHERE user_id = ? AND status = ? ORDER BY position, id').all(req.user.id, key);
    const upd = db.prepare("UPDATE tasks SET status = 'todo', position = ?, updated_at = datetime('now') WHERE id = ?");
    ids.forEach((r, i) => upd.run(start + i, r.id));
    db.prepare('DELETE FROM task_statuses WHERE user_id = ? AND key = ?').run(req.user.id, key);
  })();
  res.json(listStatuses(req.user.id));
});

// ---------- search ----------

function snippet(text, q) {
  const i = text.indexOf(q);
  if (i < 0) return text.slice(0, 120);
  const start = Math.max(0, i - 50);
  return (start > 0 ? '…' : '') + text.slice(start, i + q.length + 70) + (i + q.length + 70 < text.length ? '…' : '');
}

app.get('/api/search', auth, (req, res) => {
  const q = lower(req.query.q).trim();
  if (!q) return res.json({ pages: [], tasks: [] });
  const like = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
  const pages = db.prepare(`SELECT id, title, content FROM pages WHERE user_id = ? AND deleted_at IS NULL AND search_text LIKE ? ESCAPE '\\'
    ORDER BY updated_at DESC LIMIT 20`).all(req.user.id, like)
    .map((p) => ({ id: p.id, title: p.title, snippet: snippet(plain(p.content), q) }));
  const tasks = db.prepare(`SELECT id, title, status, description FROM tasks WHERE user_id = ? AND search_text LIKE ? ESCAPE '\\'
    ORDER BY updated_at DESC LIMIT 20`).all(req.user.id, like)
    .map((t) => ({ id: t.id, title: t.title, status: t.status, snippet: snippet(plain(t.description), q) }));
  res.json({ pages, tasks });
});

// ---------- welcome content for new accounts ----------

function seedWelcome(userId) {
  const insPage = db.prepare(`INSERT INTO pages (user_id, parent_id, title, content, search_text, position)
    VALUES (?, ?, ?, ?, ?, ?)`);
  const add = (parent, title, content, pos) =>
    insPage.run(userId, parent, title, content, lower(`${title} ${plain(content)}`), pos).lastInsertRowid;
  const root = add(null, 'Как пользоваться базой',
    '<p>Это ваша личная база знаний. В разделе «Заметки» — содержание всей базы: у любой заметки могут быть подзаметки.</p>'
    + '<ul><li>Наведите на заметку в списке и нажмите <strong>+</strong>, чтобы создать подзаметку.</li>'
    + '<li>Перетаскивайте заметки мышкой, чтобы поменять порядок или вложить одну в другую.</li>'
    + '<li>Нажмите звёздочку вверху заметки, чтобы добавить её в избранное — оно всегда под рукой в левой панели.</li>'
    + '<li>Нажмите <strong>Ctrl + K</strong>, чтобы найти что угодно.</li></ul>'
    + '<h2>Форматирование</h2><p>Используйте панель над текстом: заголовки, списки, чек-листы, цитаты и код.</p>'
    + '<ul class="checklist"><li data-checked="true">Прочитать эту заметку</li><li data-checked="false">Создать свою первую заметку</li></ul>'
    + '<p>Всё сохраняется автоматически.</p>', 0);
  add(root, 'Пример подзаметки', '<p>Эта заметка лежит внутри «Как пользоваться базой». Её можно удалить.</p>', 0);
  // Starter structure so a new user doesn't face an empty tree
  add(null, 'Работа', '<p>Рабочие заметки, инструкции и договорённости. Добавляйте подзаметки через «+».</p>', 1);
  add(null, 'Личное', '<p>Личные заметки, планы и идеи.</p>', 2);
  add(null, 'Статьи и материалы', '<p>Полезные статьи, конспекты и ссылки.</p>', 3);
  const insTask = db.prepare(`INSERT INTO tasks (user_id, title, status, priority, position, search_text)
    VALUES (?, ?, ?, ?, ?, ?)`);
  [['Разобрать заметки по разделам', 'todo', 'medium'], ['Попробовать доску задач', 'in_progress', 'low']]
    .forEach(([t, s, p], i) => insTask.run(userId, t, s, p, i, lower(t)));
}

// ---------- static ----------

app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));
app.use('/api', (req, res) => httpError(res, 404, 'Не найдено'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Silo запущен: http://localhost:${PORT}`));
