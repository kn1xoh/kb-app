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
// Зашифрованное браузером поле: «e1:» + base64. Сервер его не читает и не меняет
const isEnc = (v) => typeof v === 'string' && v.startsWith('e1:');
const clean = (html) => (isEnc(html) ? html : sanitizeHtml(String(html || ''), SANITIZE));
const plain = (html) => (isEnc(html) ? '' : sanitizeHtml(String(html || '').replace(/<\/(p|div|h\d|li|pre|blockquote)>|<br\s*\/?>/gi, ' $&'),
  { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
const cutTitle = (v) => (isEnc(v) ? v.slice(0, 4000) : String(v ?? '').slice(0, 300));
// Поиск по зашифрованным данным делает браузер, на сервере для них search_text пустой
const searchText = (title, body) => (isEnc(title) || isEnc(body) ? '' : lower(`${title} ${plain(body)}`));
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

const publicUser = (u) => u && ({ id: u.id, email: u.email, name: u.name, is_admin: !!u.is_admin, encrypted: !!u.kdf_salt });

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
// Пароль и код восстановления на сервер не попадают: браузер выводит из них «пароль для входа» (auth)
// и отдельно ключ, которым шифрует данные. Сервер хранит bcrypt от auth и ключ данных в зашифрованном виде.

const attempts = new Map();
function tooManyAttempts(key) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < 15 * 60e3);
  attempts.set(key, list);
  return list.length >= 10;
}
const failAttempt = (key) => attempts.get(key).push(Date.now());

const normEmail = (e) => String(e || '').trim().toLowerCase();
const findUser = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(normEmail(email));

// Секрет сервера — для «соли» несуществующих email (чтобы по ответу нельзя было узнать, есть ли аккаунт)
const SERVER_SECRET = (() => {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'secret'").get();
  if (row) return row.value;
  const v = crypto.randomBytes(32).toString('hex');
  db.prepare("INSERT INTO meta (key, value) VALUES ('secret', ?)").run(v);
  return v;
})();
const fakeSalt = (email, kind) => crypto.createHmac('sha256', SERVER_SECRET).update(`${kind}|${normEmail(email)}`)
  .digest().subarray(0, 16).toString('base64');

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const HEX64 = /^[0-9a-f]{64}$/;
// Проверка набора ключей из браузера: группа пароля и/или группа кода восстановления
function readKeys(b, { password = true, recovery = true } = {}) {
  const out = {};
  if (password) {
    if (!HEX64.test(b?.auth || '') || !B64.test(b?.kdf_salt || '') || !B64.test(b?.wrapped_key || '')) return null;
    Object.assign(out, { auth: b.auth, kdf_salt: b.kdf_salt, wrapped_key: b.wrapped_key });
  }
  if (recovery) {
    if (!HEX64.test(b?.rec_auth || '') || !B64.test(b?.rec_salt || '') || !B64.test(b?.rec_wrapped || '')) return null;
    Object.assign(out, { rec_auth: b.rec_auth, rec_salt: b.rec_salt, rec_wrapped: b.rec_wrapped });
  }
  return out;
}
function saveKeys(userId, k) {
  if (k.auth) {
    db.prepare('UPDATE users SET password_hash = ?, kdf_salt = ?, wrapped_key = ? WHERE id = ?')
      .run(bcrypt.hashSync(k.auth, 10), k.kdf_salt, k.wrapped_key, userId);
  }
  if (k.rec_auth) {
    db.prepare('UPDATE users SET rec_hash = ?, rec_salt = ?, rec_wrapped = ? WHERE id = ?')
      .run(bcrypt.hashSync(k.rec_auth, 10), k.rec_salt, k.rec_wrapped, userId);
  }
}
const BAD_KEYS = 'Не удалось подготовить шифрование. Обновите страницу и попробуйте ещё раз';

function validateUserInput(email, name) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail(email))) return 'Укажите корректный email';
  if (!String(name || '').trim()) return 'Напишите, как вас зовут';
  if (findUser(email)) return 'Аккаунт с таким email уже есть';
  return null;
}
function createUser({ email, name, isAdmin }, keys) {
  const info = db.prepare("INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, '', ?)")
    .run(normEmail(email), String(name).trim().slice(0, 80), isAdmin ? 1 : 0);
  saveKeys(info.lastInsertRowid, keys);
  seedWelcome(info.lastInsertRowid);
  return info.lastInsertRowid;
}

app.get('/api/me', (req, res) => {
  const needsSetup = db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0;
  res.json({ user: publicUser(req.user), needsSetup });
});

// Первый шаг входа: соли, из которых браузер выводит ключи. legacy — старый аккаунт без шифрования
app.post('/api/prelogin', (req, res) => {
  const email = req.body?.email;
  const user = findUser(email);
  if (user && !user.kdf_salt) return res.json({ legacy: true });
  res.json({
    salt: user ? user.kdf_salt : fakeSalt(email, 'p'),
    rec_salt: user?.rec_salt || fakeSalt(email, 'r'),
  });
});

app.post('/api/setup', (req, res) => {
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) {
    return httpError(res, 400, 'Администратор уже создан');
  }
  const b = req.body || {};
  const err = validateUserInput(b.email, b.name);
  if (err) return httpError(res, 400, err);
  const keys = readKeys(b);
  if (!keys) return httpError(res, 400, BAD_KEYS);
  const id = createUser({ email: b.email, name: b.name, isAdmin: true }, keys);
  createSession(res, req, id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
});

app.post('/api/login', (req, res) => {
  const { email, auth, password } = req.body || {};
  const key = `${req.ip}|${normEmail(email)}`;
  if (tooManyAttempts(key)) return httpError(res, 429, 'Слишком много попыток. Попробуйте через 15 минут');
  const user = findUser(email);
  // старый аккаунт (до шифрования) входит по паролю, после входа браузер сразу создаёт ключи
  const secret = user && !user.kdf_salt ? password : auth;
  if (!user || !user.password_hash || !bcrypt.compareSync(String(secret || ''), user.password_hash)) {
    failAttempt(key);
    return httpError(res, 401, 'Неверный email или пароль');
  }
  attempts.delete(key);
  createSession(res, req, user.id);
  res.json({ user: publicUser(user), wrapped_key: user.wrapped_key });
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

// Новые ключи из браузера: смена пароля (на устройстве, где уже вошли, старый пароль не нужен),
// новый код восстановления или первое включение шифрования у старого аккаунта
app.post('/api/me/keys', auth, (req, res) => {
  const b = req.body || {};
  const hasPassword = b.auth !== undefined;
  const hasRecovery = b.rec_auth !== undefined;
  if (!req.user.kdf_salt && !(hasPassword && hasRecovery)) return httpError(res, 400, BAD_KEYS);
  const keys = readKeys(b, { password: hasPassword, recovery: hasRecovery });
  if (!keys || (!hasPassword && !hasRecovery)) return httpError(res, 400, BAD_KEYS);
  saveKeys(req.user.id, keys);
  // после смены пароля другие устройства выходят из аккаунта
  if (hasPassword && req.user.kdf_salt) {
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(req.user.id, req.cookies[COOKIE]);
  }
  res.json({ ok: true });
});

// ---------- восстановление пароля по коду (без участия администратора) ----------

function checkRecovery(req, res) {
  const { email, rec_auth } = req.body || {};
  const key = `rec|${req.ip}|${normEmail(email)}`;
  if (tooManyAttempts(key)) { httpError(res, 429, 'Слишком много попыток. Попробуйте через 15 минут'); return null; }
  const user = findUser(email);
  if (!user || !user.rec_hash || !bcrypt.compareSync(String(rec_auth || ''), user.rec_hash)) {
    failAttempt(key);
    httpError(res, 401, 'Неверный email или код восстановления');
    return null;
  }
  return user;
}

app.post('/api/recover/start', (req, res) => {
  const user = checkRecovery(req, res);
  if (user) res.json({ rec_wrapped: user.rec_wrapped });
});

app.post('/api/recover/finish', (req, res) => {
  const user = checkRecovery(req, res);
  if (!user) return;
  const keys = readKeys(req.body?.next);
  if (!keys) return httpError(res, 400, BAD_KEYS);
  saveKeys(user.id, keys);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  createSession(res, req, user.id);
  res.json({ user: publicUser(user) });
});

// ---------- приглашения ----------

const INVITE_DAYS = 7;
const liveInvite = (token) => db.prepare(`SELECT i.*, u.name AS inviter FROM invites i LEFT JOIN users u ON u.id = i.created_by
  WHERE i.token = ? AND i.used_at IS NULL AND i.expires_at > datetime('now')`).get(String(token || ''));

app.get('/api/invites/:token', (req, res) => {
  const inv = liveInvite(req.params.token);
  if (!inv) return httpError(res, 404, 'Приглашение не найдено: оно уже использовано или истёк срок. Попросите новое');
  res.json({ inviter: inv.inviter || '' });
});

app.post('/api/register', (req, res) => {
  const b = req.body || {};
  const inv = liveInvite(b.token);
  if (!inv) return httpError(res, 400, 'Приглашение не найдено: оно уже использовано или истёк срок. Попросите новое');
  const err = validateUserInput(b.email, b.name);
  if (err) return httpError(res, 400, err);
  const keys = readKeys(b);
  if (!keys) return httpError(res, 400, BAD_KEYS);
  const id = db.transaction(() => {
    const uid = createUser({ email: b.email, name: b.name, isAdmin: false }, keys);
    db.prepare("UPDATE invites SET used_by = ?, used_at = datetime('now') WHERE id = ?").run(uid, inv.id);
    return uid;
  })();
  createSession(res, req, id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
});

// ---------- admin: пользователи и приглашения ----------
// Администратор видит только список аккаунтов: ни паролей, ни заметок и задач других пользователей

app.get('/api/admin/users', auth, admin, (req, res) => {
  res.json(db.prepare('SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at').all()
    .map((u) => ({ ...u, is_admin: !!u.is_admin })));
});

app.delete('/api/admin/users/:id', auth, admin, (req, res) => {
  if (Number(req.params.id) === req.user.id) return httpError(res, 400, 'Нельзя удалить свой аккаунт');
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/invites', auth, admin, (req, res) => {
  db.prepare("DELETE FROM invites WHERE used_at IS NULL AND expires_at < datetime('now', '-30 days')").run();
  res.json(db.prepare(`SELECT id, token, label, created_at, expires_at, expires_at <= datetime('now') AS expired
    FROM invites WHERE used_at IS NULL ORDER BY created_at DESC`).all().map((i) => ({ ...i, expired: !!i.expired })));
});

app.post('/api/admin/invites', auth, admin, (req, res) => {
  const token = crypto.randomBytes(18).toString('base64url');
  const label = String(req.body?.label || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  db.prepare("INSERT INTO invites (token, label, created_by, expires_at) VALUES (?, ?, ?, datetime('now', ?))")
    .run(token, label, req.user.id, `+${INVITE_DAYS} days`);
  res.json({ token, days: INVITE_DAYS });
});

app.delete('/api/admin/invites/:id', auth, admin, (req, res) => {
  db.prepare('DELETE FROM invites WHERE id = ? AND used_at IS NULL').run(req.params.id);
  res.json({ ok: true });
});

// ---------- pages (notes tree) ----------

// getPage видит только живые заметки; удалённые (в корзине) для него как будто не существуют
const getPage = (userId, id) => db.prepare('SELECT * FROM pages WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);

app.get('/api/pages', auth, (req, res) => {
  // заметки без названия, брошенные больше получаса назад (например, закрыли вкладку на телефоне)
  db.prepare(`SELECT * FROM pages WHERE user_id = ? AND deleted_at IS NULL AND trim(title) = ''
    AND updated_at < datetime('now', '-30 minutes') ORDER BY id DESC`).all(req.user.id).forEach(finalizePage);
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
  const title = cutTitle(req.body?.title || '');
  const pos = db.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM pages
    WHERE user_id = ? AND parent_id IS ?`).get(req.user.id, parentId).p;
  const info = db.prepare('INSERT INTO pages (user_id, parent_id, title, position, search_text) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, parentId, title, pos, searchText(title, ''));
  res.json(getPage(req.user.id, info.lastInsertRowid));
});

function savePage(page, body) {
  const title = body?.title !== undefined ? cutTitle(body.title) : page.title;
  const content = body?.content !== undefined ? clean(body.content) : page.content;
  db.prepare(`UPDATE pages SET title = ?, content = ?, search_text = ?, updated_at = datetime('now')
    WHERE id = ?`).run(title, content, searchText(title, content), page.id);
  return getPage(page.user_id, page.id);
}

app.patch('/api/pages/:id', auth, (req, res) => {
  const page = getPage(req.user.id, req.params.id);
  if (!page) return httpError(res, 404, 'Заметка не найдена');
  const updated = savePage(page, req.body);
  res.json({ id: updated.id, title: updated.title, updated_at: updated.updated_at });
});

// Первая непустая строка текста заметки — для названия (не длиннее 80 символов, режем по слову)
function firstLine(html) {
  const text = sanitizeHtml(String(html || '').replace(/<\/(p|div|h\d|li|pre|blockquote)>|<br\s*\/?>/gi, '$&\n'),
    { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const line = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).find(Boolean) || '';
  if (line.length <= 80) return line;
  const cut = line.slice(0, 80);
  const space = cut.lastIndexOf(' ');
  return `${(space > 40 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?—–-]+$/, '')}…`;
}

// Заметка без названия не остаётся: с текстом — получает название из первой строки,
// совсем пустая и без подзаметок — удаляется насовсем (в корзину не попадает).
// Если текст зашифрован, название из первой строки присылает браузер, а пустой текст он присылает как ''.
function finalizePage(page) {
  if (page.title.trim()) return { title: page.title };
  if (isEnc(page.content)) return { title: '' };
  const line = firstLine(page.content);
  if (line) return { title: savePage(page, { title: line }).title };
  const kids = db.prepare('SELECT COUNT(*) AS n FROM pages WHERE parent_id = ? AND deleted_at IS NULL').get(page.id).n;
  if (kids) return { title: '' };
  db.transaction(() => {
    // подзаметки из корзины не должны пропасть вместе с родителем (ON DELETE CASCADE)
    db.prepare('UPDATE pages SET parent_id = NULL WHERE parent_id = ?').run(page.id);
    db.prepare('DELETE FROM pages WHERE id = ?').run(page.id);
  })();
  return { deleted: true };
}

// Вызывается, когда пользователь уходит с заметки; можно сразу передать несохранённые изменения
app.post('/api/pages/:id/finalize', auth, (req, res) => {
  let page = getPage(req.user.id, req.params.id);
  if (!page) return res.json({ deleted: true });
  if (req.body && (req.body.title !== undefined || req.body.content !== undefined)) page = savePage(page, req.body);
  res.json(finalizePage(page));
});

// Заметки без названия, оставшиеся с прошлых версий
{
  const untitled = db.prepare("SELECT * FROM pages WHERE deleted_at IS NULL AND trim(title) = '' ORDER BY id DESC").all();
  let fixed = 0;
  untitled.forEach((p) => { const r = finalizePage(p); if (r.deleted || r.title) fixed++; });
  if (fixed) console.log(`Заметки без названия: обработано ${fixed}`);
}

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
  const tasks = db.prepare("DELETE FROM tasks WHERE deleted_at < datetime('now', ?)").run(`-${TRASH_DAYS} days`).changes;
  if (tasks) console.log(`Корзина задач: окончательно удалены задачи старше ${TRASH_DAYS} дней (${tasks})`);
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
const DEFAULT_STATUSES = [['todo', 'Нужно сделать', 'gray'], ['in_progress', 'В работе', 'orange']];
const FIXED_STATUSES = ['todo'];
const MAX_STATUSES = 12;

function listStatuses(userId) {
  const sql = 'SELECT key, name, color, position, is_default FROM task_statuses WHERE user_id = ? ORDER BY position, id';
  let rows = db.prepare(sql).all(userId);
  if (!rows.length) {
    const ins = db.prepare('INSERT OR IGNORE INTO task_statuses (user_id, key, name, color, position) VALUES (?, ?, ?, ?, ?)');
    db.transaction(() => DEFAULT_STATUSES.forEach(([k, n, c], i) => ins.run(userId, k, n, c, i)))();
    rows = db.prepare(sql).all(userId);
  }
  // Статус по умолчанию: выбранный пользователем, иначе «Нужно сделать»
  const chosen = rows.find((r) => r.is_default);
  const defKey = chosen ? chosen.key : 'todo';
  return rows.map(({ is_default, ...r }) => ({ ...r, fixed: FIXED_STATUSES.includes(r.key), default: r.key === defKey }));
}
const defaultStatus = (userId) => (listStatuses(userId).find((s) => s.default) || { key: 'todo' }).key;
const statusExists = (userId, key) => listStatuses(userId).some((s) => s.key === key);
const cleanStatusName = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
const nameTaken = (userId, name, exceptKey) =>
  listStatuses(userId).some((s) => s.key !== exceptKey && s.name.toLowerCase() === name.toLowerCase());
const PRIORITIES = ['low', 'medium', 'high'];
// Живые задачи (не в корзине); завершённые тоже живые
const getTask = (userId, id) => db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);
const taskOut = (t) => { const { search_text, user_id, deleted_at, ...rest } = t; return rest; };
const validDate = (d) => d === null || d === '' || /^\d{4}-\d{2}-\d{2}$/.test(d);
const topPosition = (userId, status) => db.prepare(`SELECT COALESCE(MIN(position), 1) - 1 AS p FROM tasks
  WHERE user_id = ? AND status = ? AND deleted_at IS NULL AND completed_at IS NULL`).get(userId, status).p;
const idList = (ids) => (Array.isArray(ids) ? [...new Set(ids.map(Number).filter(Number.isInteger))] : []);

// Задача без названия не остаётся (как заметки): с текстом в описании — название из его первой строки,
// без текста — удаляется насовсем (в корзину не попадает)
function setTaskTitle(t, title) {
  db.prepare("UPDATE tasks SET title = ?, search_text = ?, updated_at = datetime('now') WHERE id = ?")
    .run(title, searchText(title, t.description), t.id);
}
function finalizeTask(t) {
  if (t.title.trim()) return { title: t.title };
  if (isEnc(t.description)) return { title: '' };
  const line = firstLine(t.description);
  if (!line) {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(t.id);
    return { deleted: true };
  }
  setTaskTitle(t, line);
  return { title: line };
}

app.get('/api/tasks', auth, (req, res) => {
  // задачи без названия, брошенные больше получаса назад (например, закрыли вкладку на телефоне)
  db.prepare(`SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NULL AND trim(title) = ''
    AND updated_at < datetime('now', '-30 minutes')`).all(req.user.id).forEach(finalizeTask);
  res.json(db.prepare('SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NULL ORDER BY position, id').all(req.user.id).map(taskOut));
});

app.post('/api/tasks', auth, (req, res) => {
  const b = req.body || {};
  // Название можно ввести уже в открытой карточке, поэтому задача создаётся и без него
  const title = isEnc(b.title) ? cutTitle(b.title) : String(b.title || '').trim().slice(0, 300);
  const status = b.status && statusExists(req.user.id, b.status) ? b.status : defaultStatus(req.user.id);
  const priority = PRIORITIES.includes(b.priority) ? b.priority : 'medium';
  const due = validDate(b.due_date) && b.due_date ? b.due_date : null;
  const info = db.prepare(`INSERT INTO tasks (user_id, title, status, priority, due_date, position, search_text)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.user.id, title, status, priority, due, topPosition(req.user.id, status), searchText(title, ''));
  res.json(taskOut(getTask(req.user.id, info.lastInsertRowid)));
});

app.patch('/api/tasks/:id', auth, (req, res) => {
  const t = getTask(req.user.id, req.params.id);
  if (!t) return httpError(res, 404, 'Задача не найдена');
  const b = req.body || {};
  const next = { ...t };
  if (b.title !== undefined) next.title = cutTitle(b.title);
  if (b.description !== undefined) next.description = clean(b.description);
  if (b.status !== undefined) {
    if (!statusExists(req.user.id, b.status)) return httpError(res, 400, 'Такого статуса нет. Обновите страницу');
    if (b.status !== t.status) next.position = topPosition(req.user.id, b.status);
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
      searchText(next.title, next.description), t.id);
  res.json(taskOut(getTask(req.user.id, t.id)));
});

// Вызывается при закрытии карточки задачи без названия; можно сразу передать несохранённое описание
app.post('/api/tasks/:id/finalize', auth, (req, res) => {
  const t = getTask(req.user.id, req.params.id);
  if (!t) return res.json({ deleted: true });
  const b = req.body || {};
  if (b.title !== undefined) t.title = isEnc(b.title) ? cutTitle(b.title) : String(b.title).trim().slice(0, 300);
  if (b.description !== undefined) t.description = clean(b.description);
  if (b.title !== undefined || b.description !== undefined) {
    db.prepare(`UPDATE tasks SET title = ?, description = ?, search_text = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(t.title, t.description, searchText(t.title, t.description), t.id);
  }
  res.json(finalizeTask(t));
});

// Задачи без названия, оставшиеся с прошлых версий
{
  const untitled = db.prepare("SELECT * FROM tasks WHERE trim(title) = ''").all();
  untitled.forEach((t) => {
    if (!t.deleted_at) return finalizeTask(t);
    if (isEnc(t.description)) return;
    const line = firstLine(t.description);
    if (line) setTaskTitle(t, line); else db.prepare('DELETE FROM tasks WHERE id = ?').run(t.id);
  });
  if (untitled.length) console.log(`Задачи без названия: обработано ${untitled.length}`);
}

// Завершить / вернуть в работу одну или несколько задач. Вернувшаяся задача встаёт первой в своём статусе
// (если статуса уже нет — в статус по умолчанию)
app.post('/api/tasks/complete', auth, (req, res) => {
  const ids = idList(req.body?.ids);
  if (!ids.length) return httpError(res, 400, 'Не выбраны задачи');
  const done = req.body?.completed !== false;
  const out = [];
  db.transaction(() => ids.forEach((id) => {
    const t = getTask(req.user.id, id);
    if (!t) return;
    if (done) {
      if (!t.completed_at) db.prepare("UPDATE tasks SET completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(t.id);
    } else if (t.completed_at) {
      const status = statusExists(req.user.id, t.status) ? t.status : defaultStatus(req.user.id);
      db.prepare("UPDATE tasks SET completed_at = NULL, status = ?, position = ?, updated_at = datetime('now') WHERE id = ?")
        .run(status, topPosition(req.user.id, status), t.id);
    }
    out.push(taskOut(getTask(req.user.id, t.id)));
  }))();
  res.json({ tasks: out });
});

app.post('/api/tasks/reorder', auth, (req, res) => {
  const { status, ids } = req.body || {};
  if (!statusExists(req.user.id, status) || !Array.isArray(ids)) return httpError(res, 400, 'Некорректные данные');
  const upd = db.prepare(`UPDATE tasks SET status = ?, position = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ? AND deleted_at IS NULL`);
  db.transaction(() => ids.forEach((id, i) => upd.run(status, i, id, req.user.id)))();
  res.json({ ok: true });
});

app.post('/api/tasks/:id/favorite', auth, (req, res) => {
  const t = getTask(req.user.id, req.params.id);
  if (!t) return httpError(res, 404, 'Задача не найдена');
  db.prepare(`UPDATE tasks SET favorite_at = ${req.body?.favorite ? "datetime('now')" : 'NULL'} WHERE id = ?`).run(t.id);
  res.json({ favorite_at: getTask(req.user.id, t.id).favorite_at });
});

// ---------- tasks trash («Недавно удалённые» задачи; у Заметок своя корзина) ----------

// Удалённые задачи уходят в корзину. Задача без названия сначала получает его из описания,
// а совсем пустую хранить незачем — удаляется сразу
function trashTasks(userId, ids) {
  const now = sqlNow();
  const trashed = [];
  db.transaction(() => ids.forEach((id) => {
    const t = getTask(userId, id);
    if (!t) return;
    if (finalizeTask(t).deleted) return;
    db.prepare('UPDATE tasks SET deleted_at = ? WHERE id = ?').run(now, t.id);
    trashed.push(t.id);
  }))();
  return trashed;
}

app.delete('/api/tasks/:id', auth, (req, res) => {
  if (!getTask(req.user.id, req.params.id)) return httpError(res, 404, 'Задача не найдена');
  res.json({ trashed: trashTasks(req.user.id, [Number(req.params.id)]) });
});

app.post('/api/tasks/delete', auth, (req, res) => {
  const ids = idList(req.body?.ids);
  if (!ids.length) return httpError(res, 400, 'Не выбраны задачи');
  res.json({ trashed: trashTasks(req.user.id, ids) });
});

app.get('/api/trash/tasks', auth, (req, res) => {
  const items = db.prepare(`SELECT id, title, status, completed_at, deleted_at FROM tasks
    WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC, id DESC`).all(req.user.id);
  res.json({ days: TRASH_DAYS, items });
});

// Восстановленная задача возвращается в свой статус (если его уже нет — в статус по умолчанию), первой в колонке
app.post('/api/trash/tasks/restore', auth, (req, res) => {
  const ids = idList(req.body?.ids);
  if (!ids.length) return httpError(res, 400, 'Не выбраны задачи');
  const restored = [];
  db.transaction(() => ids.forEach((id) => {
    const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL').get(id, req.user.id);
    if (!t) return;
    const status = statusExists(req.user.id, t.status) ? t.status : defaultStatus(req.user.id);
    db.prepare('UPDATE tasks SET deleted_at = NULL, status = ?, position = ? WHERE id = ?')
      .run(status, topPosition(req.user.id, status), t.id);
    restored.push(taskOut(getTask(req.user.id, t.id)));
  }))();
  res.json({ restored });
});

app.delete('/api/trash/tasks/:id', auth, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/trash/tasks', auth, (req, res) => {
  const { changes } = db.prepare('DELETE FROM tasks WHERE user_id = ? AND deleted_at IS NOT NULL').run(req.user.id);
  res.json({ ok: true, count: changes });
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
  const pos = list.length ? Math.max(...list.map((s) => s.position)) + 1 : 0;
  db.prepare('INSERT INTO task_statuses (user_id, key, name, color, position) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, key, name, color, pos);
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

// Удаление статуса: его задачи (в том числе завершённые и в корзине) переходят в «Нужно сделать»
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
// Данные зашифрованы, поэтому ищет браузер: сервер отдаёт все живые заметки и задачи (в зашифрованном виде)

app.get('/api/search-index', auth, (req, res) => {
  res.json({
    pages: db.prepare('SELECT id, title, content, updated_at FROM pages WHERE user_id = ? AND deleted_at IS NULL').all(req.user.id),
    tasks: db.prepare(`SELECT id, title, status, completed_at, description, updated_at FROM tasks
      WHERE user_id = ? AND deleted_at IS NULL`).all(req.user.id),
  });
});

// ---------- шифрование данных, записанных открытым текстом ----------
// Старые аккаунты и приветственные заметки нового аккаунта: браузер забирает открытый текст,
// шифрует и возвращает. Работает и для корзины.

const PLAIN = (col) => `(${col} != '' AND ${col} NOT LIKE 'e1:%')`;
app.get('/api/me/plain', auth, (req, res) => {
  res.json({
    pages: db.prepare(`SELECT id, title, content FROM pages WHERE user_id = ? AND (${PLAIN('title')} OR ${PLAIN('content')})`).all(req.user.id),
    tasks: db.prepare(`SELECT id, title, description FROM tasks WHERE user_id = ? AND (${PLAIN('title')} OR ${PLAIN('description')})`).all(req.user.id),
  });
});

app.post('/api/me/encrypt', auth, (req, res) => {
  const ok = (v) => v === '' || isEnc(v);
  const pages = Array.isArray(req.body?.pages) ? req.body.pages : [];
  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
  if (![...pages.map((p) => [p.title, p.content]), ...tasks.map((t) => [t.title, t.description])].flat().every(ok)) {
    return httpError(res, 400, BAD_KEYS);
  }
  const updPage = db.prepare("UPDATE pages SET title = ?, content = ?, search_text = '' WHERE id = ? AND user_id = ?");
  const updTask = db.prepare("UPDATE tasks SET title = ?, description = ?, search_text = '' WHERE id = ? AND user_id = ?");
  db.transaction(() => {
    pages.forEach((p) => updPage.run(p.title, p.content, Number(p.id), req.user.id));
    tasks.forEach((t) => updTask.run(t.title, t.description, Number(t.id), req.user.id));
  })();
  // старый открытый текст не должен остаться ни в свободных страницах файла базы, ни в журнале
  db.exec('VACUUM');
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  res.json({ ok: true });
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
