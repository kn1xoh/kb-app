const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const sanitizeHtml = require('sanitize-html');
const db = require('./db');
const push = require('./push');

const PORT = Number(process.env.PORT) || 3000;
const SESSION_DAYS = 30;
const COOKIE = 'kb_session';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Обработчики асинхронные (база может быть в облаке): ошибка в любом из них уходит
// в общий обработчик ошибок в конце файла, а не роняет сервер
for (const method of ['get', 'post', 'patch', 'delete', 'use']) {
  const orig = app[method].bind(app);
  app[method] = (...args) => orig(...args.map((fn) => (typeof fn === 'function' && fn.length < 4
    ? (req, res, next) => { try { Promise.resolve(fn(req, res, next)).catch(next); } catch (e) { next(e); } }
    : fn)));
}

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

async function createSession(res, req, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  await db.run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', token, userId, expires);
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

app.use('/api', async (req, res, next) => {
  const token = req.cookies[COOKIE];
  if (token) {
    const row = await db.get(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?`, token, Date.now());
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
const findUser = (email) => db.get('SELECT * FROM users WHERE email = ?', normEmail(email));

// Секрет сервера — для «соли» несуществующих email (чтобы по ответу нельзя было узнать, есть ли аккаунт).
// Хранится в базе, читается при запуске (см. main внизу)
let SERVER_SECRET = '';
async function loadServerSecret() {
  const row = await db.get("SELECT value FROM meta WHERE key = 'secret'");
  if (row) return row.value;
  const v = crypto.randomBytes(32).toString('hex');
  await db.run("INSERT OR IGNORE INTO meta (key, value) VALUES ('secret', ?)", v);
  return (await db.get("SELECT value FROM meta WHERE key = 'secret'")).value;
}
const fakeSalt = (email, kind) => crypto.createHmac('sha256', SERVER_SECRET).update(`${kind}|${normEmail(email)}`)
  .digest().subarray(0, 16).toString('base64');

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const B64U = /^[A-Za-z0-9_-]+={0,2}$/;
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
async function saveKeys(userId, k) {
  if (k.auth) {
    await db.run('UPDATE users SET password_hash = ?, kdf_salt = ?, wrapped_key = ? WHERE id = ?',
      bcrypt.hashSync(k.auth, 10), k.kdf_salt, k.wrapped_key, userId);
  }
  if (k.rec_auth) {
    await db.run('UPDATE users SET rec_hash = ?, rec_salt = ?, rec_wrapped = ? WHERE id = ?',
      bcrypt.hashSync(k.rec_auth, 10), k.rec_salt, k.rec_wrapped, userId);
  }
}
const BAD_KEYS = 'Не удалось подготовить шифрование. Обновите страницу и попробуйте ещё раз';

async function validateUserInput(email, name) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail(email))) return 'Укажите корректный email';
  if (!String(name || '').trim()) return 'Напишите, как вас зовут';
  if (await findUser(email)) return 'Аккаунт с таким email уже есть';
  return null;
}
async function createUser({ email, name, isAdmin }, keys) {
  const info = await db.run("INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, '', ?)",
    normEmail(email), String(name).trim().slice(0, 80), isAdmin ? 1 : 0);
  await saveKeys(info.lastInsertRowid, keys);
  await seedWelcome(info.lastInsertRowid);
  return info.lastInsertRowid;
}
const countUsers = async () => (await db.get('SELECT COUNT(*) AS n FROM users')).n;

app.get('/api/me', async (req, res) => {
  const needsSetup = (await countUsers()) === 0;
  res.json({ user: publicUser(req.user), needsSetup });
});

// Первый шаг входа: соли, из которых браузер выводит ключи. legacy — старый аккаунт без шифрования
app.post('/api/prelogin', async (req, res) => {
  const email = req.body?.email;
  const user = await findUser(email);
  if (user && !user.kdf_salt) return res.json({ legacy: true });
  res.json({
    salt: user ? user.kdf_salt : fakeSalt(email, 'p'),
    rec_salt: user?.rec_salt || fakeSalt(email, 'r'),
  });
});

app.post('/api/setup', async (req, res) => {
  if ((await countUsers()) > 0) {
    return httpError(res, 400, 'Администратор уже создан');
  }
  const b = req.body || {};
  const err = await validateUserInput(b.email, b.name);
  if (err) return httpError(res, 400, err);
  const keys = readKeys(b);
  if (!keys) return httpError(res, 400, BAD_KEYS);
  // проверка «администратора ещё нет» и создание — в одной транзакции, чтобы двое не успели одновременно
  const id = await db.tx(async () => {
    if ((await countUsers()) > 0) return null;
    return createUser({ email: b.email, name: b.name, isAdmin: true }, keys);
  });
  if (!id) return httpError(res, 400, 'Администратор уже создан');
  await createSession(res, req, id);
  res.json({ user: publicUser(await db.get('SELECT * FROM users WHERE id = ?', id)) });
});

app.post('/api/login', async (req, res) => {
  const { email, auth, password } = req.body || {};
  const key = `${req.ip}|${normEmail(email)}`;
  if (tooManyAttempts(key)) return httpError(res, 429, 'Слишком много попыток. Попробуйте через 15 минут');
  const user = await findUser(email);
  // старый аккаунт (до шифрования) входит по паролю, после входа браузер сразу создаёт ключи
  const secret = user && !user.kdf_salt ? password : auth;
  if (!user || !user.password_hash || !bcrypt.compareSync(String(secret || ''), user.password_hash)) {
    failAttempt(key);
    return httpError(res, 401, 'Неверный email или пароль');
  }
  attempts.delete(key);
  await createSession(res, req, user.id);
  res.json({ user: publicUser(user), wrapped_key: user.wrapped_key });
});

app.post('/api/logout', async (req, res) => {
  const token = req.cookies[COOKIE];
  if (token) await db.run('DELETE FROM sessions WHERE token = ?', token);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

// Новые ключи из браузера: смена пароля (на устройстве, где уже вошли, старый пароль не нужен),
// новый код восстановления или первое включение шифрования у старого аккаунта
app.post('/api/me/keys', auth, async (req, res) => {
  const b = req.body || {};
  const hasPassword = b.auth !== undefined;
  const hasRecovery = b.rec_auth !== undefined;
  if (!req.user.kdf_salt && !(hasPassword && hasRecovery)) return httpError(res, 400, BAD_KEYS);
  const keys = readKeys(b, { password: hasPassword, recovery: hasRecovery });
  if (!keys || (!hasPassword && !hasRecovery)) return httpError(res, 400, BAD_KEYS);
  await saveKeys(req.user.id, keys);
  // после смены пароля другие устройства выходят из аккаунта
  if (hasPassword && req.user.kdf_salt) {
    await db.run('DELETE FROM sessions WHERE user_id = ? AND token != ?', req.user.id, req.cookies[COOKIE]);
  }
  res.json({ ok: true });
});

// Имя и email (email — это логин). Имя меняется сразу; для смены email нужен текущий пароль —
// браузер присылает auth, выведенный из него, как при входе
app.patch('/api/me', auth, async (req, res) => {
  const b = req.body || {};
  const u = req.user;
  let name = u.name;
  let email = u.email;
  if (b.name !== undefined) {
    name = String(b.name).replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!name) return httpError(res, 400, 'Напишите, как вас зовут');
  }
  if (b.email !== undefined && normEmail(b.email) !== u.email) {
    email = normEmail(b.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return httpError(res, 400, 'Укажите корректный email');
    const key = `me|${u.id}`;
    if (tooManyAttempts(key)) return httpError(res, 429, 'Слишком много попыток. Попробуйте через 15 минут');
    if (!u.password_hash || !bcrypt.compareSync(String(b.auth || ''), u.password_hash)) {
      failAttempt(key);
      return httpError(res, 400, 'Неверный пароль');
    }
    attempts.delete(key);
    if (await findUser(email)) return httpError(res, 400, 'Аккаунт с таким email уже есть');
  }
  try {
    await db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', name, email, u.id);
  } catch (e) {
    if (/UNIQUE/i.test(String(e.message))) return httpError(res, 400, 'Аккаунт с таким email уже есть');
    throw e;
  }
  res.json({ user: publicUser({ ...u, name, email }) });
});

// ---------- восстановление пароля по коду (без участия администратора) ----------

async function checkRecovery(req, res) {
  const { email, rec_auth } = req.body || {};
  const key = `rec|${req.ip}|${normEmail(email)}`;
  if (tooManyAttempts(key)) { httpError(res, 429, 'Слишком много попыток. Попробуйте через 15 минут'); return null; }
  const user = await findUser(email);
  if (!user || !user.rec_hash || !bcrypt.compareSync(String(rec_auth || ''), user.rec_hash)) {
    failAttempt(key);
    httpError(res, 401, 'Неверный email или код восстановления');
    return null;
  }
  return user;
}

app.post('/api/recover/start', async (req, res) => {
  const user = await checkRecovery(req, res);
  if (user) res.json({ rec_wrapped: user.rec_wrapped });
});

app.post('/api/recover/finish', async (req, res) => {
  const user = await checkRecovery(req, res);
  if (!user) return;
  const keys = readKeys(req.body?.next);
  if (!keys) return httpError(res, 400, BAD_KEYS);
  await saveKeys(user.id, keys);
  await db.run('DELETE FROM sessions WHERE user_id = ?', user.id);
  await createSession(res, req, user.id);
  res.json({ user: publicUser(user) });
});

// ---------- приглашения ----------

const INVITE_DAYS = 7;
const liveInvite = (token) => db.get(`SELECT i.*, u.name AS inviter FROM invites i LEFT JOIN users u ON u.id = i.created_by
  WHERE i.token = ? AND i.used_at IS NULL AND i.expires_at > datetime('now')`, String(token || ''));

app.get('/api/invites/:token', async (req, res) => {
  const inv = await liveInvite(req.params.token);
  if (!inv) return httpError(res, 404, 'Приглашение не найдено: оно уже использовано или истёк срок. Попросите новое');
  res.json({ inviter: inv.inviter || '' });
});

app.post('/api/register', async (req, res) => {
  const b = req.body || {};
  const NO_INVITE = 'Приглашение не найдено: оно уже использовано или истёк срок. Попросите новое';
  if (!(await liveInvite(b.token))) return httpError(res, 400, NO_INVITE);
  const err = await validateUserInput(b.email, b.name);
  if (err) return httpError(res, 400, err);
  const keys = readKeys(b);
  if (!keys) return httpError(res, 400, BAD_KEYS);
  // приглашение одноразовое: проверяем его ещё раз внутри транзакции
  const id = await db.tx(async () => {
    const inv = await liveInvite(b.token);
    if (!inv) return null;
    const uid = await createUser({ email: b.email, name: b.name, isAdmin: false }, keys);
    await db.run("UPDATE invites SET used_by = ?, used_at = datetime('now') WHERE id = ?", uid, inv.id);
    return uid;
  });
  if (!id) return httpError(res, 400, NO_INVITE);
  await createSession(res, req, id);
  res.json({ user: publicUser(await db.get('SELECT * FROM users WHERE id = ?', id)) });
});

// ---------- admin: пользователи и приглашения ----------
// Администратор видит только список аккаунтов: ни паролей, ни заметок и задач других пользователей

app.get('/api/admin/users', auth, admin, async (req, res) => {
  res.json((await db.all('SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at'))
    .map((u) => ({ ...u, is_admin: !!u.is_admin })));
});

app.delete('/api/admin/users/:id', auth, admin, async (req, res) => {
  if (Number(req.params.id) === req.user.id) return httpError(res, 400, 'Нельзя удалить свой аккаунт');
  await db.run('DELETE FROM users WHERE id = ?', req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/invites', auth, admin, async (req, res) => {
  await db.run("DELETE FROM invites WHERE used_at IS NULL AND expires_at < datetime('now', '-30 days')");
  res.json((await db.all(`SELECT id, token, label, created_at, expires_at, expires_at <= datetime('now') AS expired
    FROM invites WHERE used_at IS NULL ORDER BY created_at DESC`)).map((i) => ({ ...i, expired: !!i.expired })));
});

app.post('/api/admin/invites', auth, admin, async (req, res) => {
  const token = crypto.randomBytes(18).toString('base64url');
  const label = String(req.body?.label || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  await db.run("INSERT INTO invites (token, label, created_by, expires_at) VALUES (?, ?, ?, datetime('now', ?))",
    token, label, req.user.id, `+${INVITE_DAYS} days`);
  res.json({ token, days: INVITE_DAYS });
});

app.delete('/api/admin/invites/:id', auth, admin, async (req, res) => {
  await db.run('DELETE FROM invites WHERE id = ? AND used_at IS NULL', req.params.id);
  res.json({ ok: true });
});

// ---------- pages (notes tree) ----------

// getPage видит только живые заметки; удалённые (в корзине) для него как будто не существуют
const getPage = (userId, id) => db.get('SELECT * FROM pages WHERE id = ? AND user_id = ? AND deleted_at IS NULL', id, userId);

app.get('/api/pages', auth, async (req, res) => {
  // заметки без названия, брошенные больше получаса назад (например, закрыли вкладку на телефоне)
  const stale = await db.all(`SELECT * FROM pages WHERE user_id = ? AND deleted_at IS NULL AND trim(title) = ''
    AND updated_at < datetime('now', '-30 minutes') ORDER BY id DESC`, req.user.id);
  for (const p of stale) await finalizePage(p);
  res.json(await db.all(`SELECT id, parent_id, title, position, updated_at, favorite_at FROM pages
    WHERE user_id = ? AND deleted_at IS NULL ORDER BY position, id`, req.user.id));
});

app.get('/api/pages/:id', auth, async (req, res) => {
  const page = await getPage(req.user.id, req.params.id);
  if (!page) return httpError(res, 404, 'Заметка не найдена');
  delete page.search_text;
  res.json(page);
});

app.post('/api/pages', auth, async (req, res) => {
  const parentId = req.body?.parent_id ?? null;
  if (parentId !== null && !(await getPage(req.user.id, parentId))) return httpError(res, 400, 'Заметка, в которую вы вкладываете, не найдена');
  const title = cutTitle(req.body?.title || '');
  const id = await db.tx(async () => {
    const pos = (await db.get(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM pages
      WHERE user_id = ? AND parent_id IS ?`, req.user.id, parentId)).p;
    return (await db.run('INSERT INTO pages (user_id, parent_id, title, position, search_text) VALUES (?, ?, ?, ?, ?)',
      req.user.id, parentId, title, pos, searchText(title, ''))).lastInsertRowid;
  });
  res.json(await getPage(req.user.id, id));
});

async function savePage(page, body) {
  const title = body?.title !== undefined ? cutTitle(body.title) : page.title;
  const content = body?.content !== undefined ? clean(body.content) : page.content;
  await db.run(`UPDATE pages SET title = ?, content = ?, search_text = ?, updated_at = datetime('now')
    WHERE id = ?`, title, content, searchText(title, content), page.id);
  return getPage(page.user_id, page.id);
}

app.patch('/api/pages/:id', auth, async (req, res) => {
  const page = await getPage(req.user.id, req.params.id);
  if (!page) return httpError(res, 404, 'Заметка не найдена');
  const updated = await savePage(page, req.body);
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
async function finalizePage(page) {
  if (page.title.trim()) return { title: page.title };
  if (isEnc(page.content)) return { title: '' };
  const line = firstLine(page.content);
  if (line) return { title: (await savePage(page, { title: line })).title };
  return db.tx(async () => {
    const kids = (await db.get('SELECT COUNT(*) AS n FROM pages WHERE parent_id = ? AND deleted_at IS NULL', page.id)).n;
    if (kids) return { title: '' };
    // подзаметки из корзины не должны пропасть вместе с родителем (ON DELETE CASCADE)
    await db.run('UPDATE pages SET parent_id = NULL WHERE parent_id = ?', page.id);
    await db.run('DELETE FROM pages WHERE id = ?', page.id);
    return { deleted: true };
  });
}

// Вызывается, когда пользователь уходит с заметки; можно сразу передать несохранённые изменения
app.post('/api/pages/:id/finalize', auth, async (req, res) => {
  let page = await getPage(req.user.id, req.params.id);
  if (!page) return res.json({ deleted: true });
  if (req.body && (req.body.title !== undefined || req.body.content !== undefined)) page = await savePage(page, req.body);
  res.json(await finalizePage(page));
});

app.post('/api/pages/:id/move', auth, async (req, res) => {
  const page = await getPage(req.user.id, req.params.id);
  if (!page) return httpError(res, 404, 'Заметка не найдена');
  const parentId = req.body?.parent_id ?? null;
  if (parentId !== null) {
    if (!(await getPage(req.user.id, parentId))) return httpError(res, 400, 'Заметка, в которую вы вкладываете, не найдена');
    // walk up from the new parent to make sure we don't move a page inside itself
    for (let cur = parentId; cur !== null; cur = (await getPage(req.user.id, cur)).parent_id) {
      if (cur === page.id) return httpError(res, 400, 'Нельзя вложить заметку саму в себя или в свою подзаметку');
    }
  }
  await db.tx(async () => {
    const siblings = (await db.all(`SELECT id FROM pages WHERE user_id = ? AND parent_id IS ? AND id != ?
      AND deleted_at IS NULL ORDER BY position, id`, req.user.id, parentId, page.id)).map((r) => r.id);
    const index = Math.max(0, Math.min(Number(req.body?.index ?? siblings.length), siblings.length));
    siblings.splice(index, 0, page.id);
    for (const [i, id] of siblings.entries()) {
      await db.run('UPDATE pages SET parent_id = ?, position = ? WHERE id = ?', parentId, i, id);
    }
  });
  res.json({ ok: true });
});

app.post('/api/pages/:id/favorite', auth, async (req, res) => {
  const page = await getPage(req.user.id, req.params.id);
  if (!page) return httpError(res, 404, 'Заметка не найдена');
  await db.run(`UPDATE pages SET favorite_at = ${req.body?.favorite ? "datetime('now')" : 'NULL'} WHERE id = ?`, page.id);
  res.json({ favorite_at: (await getPage(req.user.id, page.id)).favorite_at });
});

// Порядок избранного (и добавление перетаскиванием): клиент присылает весь список по порядку.
// Порядок хранится в favorite_at — проставляем возрастающее время, поэтому новые поля в базе не нужны.
app.post('/api/favorites/order', auth, async (req, res) => {
  const { kind, ids } = req.body || {};
  const table = kind === 'pages' ? 'pages' : kind === 'tasks' ? 'tasks' : null;
  if (!table || !Array.isArray(ids) || ids.length > 1000 || !ids.every(Number.isInteger)) {
    return httpError(res, 400, 'Некорректные данные');
  }
  const uniq = [...new Set(ids)];
  await db.tx(async () => {
    for (const [i, id] of uniq.entries()) {
      await db.run(`UPDATE ${table} SET favorite_at = datetime('now', ?)
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, `-${uniq.length - i} seconds`, id, req.user.id);
    }
  });
  const items = uniq.length
    ? await db.all(`SELECT id, favorite_at FROM ${table} WHERE user_id = ? AND deleted_at IS NULL AND id IN (${uniq.map(() => '?').join(',')})`, req.user.id, ...uniq)
    : [];
  res.json({ items });
});

// ---------- notes trash («Недавно удалённые») ----------

const TRASH_DAYS = 30;
const sqlNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

// Кладёт заметки в корзину вместе с подзаметками. Если выбраны и заметка, и её подзаметка —
// в корзину уходит одна запись (родитель), чтобы восстанавливать их вместе.
function trashPages(userId, ids) {
  return db.tx(async () => {
    const pages = [];
    for (const id of new Set(ids.map(Number))) {
      const p = await getPage(userId, id);
      if (p) pages.push(p);
    }
    const chosen = new Set(pages.map((p) => p.id));
    const hasChosenAncestor = async (p) => {
      for (let cur = p.parent_id; cur !== null; cur = (await getPage(userId, cur))?.parent_id ?? null) {
        if (chosen.has(cur)) return true;
      }
      return false;
    };
    const roots = [];
    for (const p of pages) if (!(await hasChosenAncestor(p))) roots.push(p.id);
    const now = sqlNow();
    for (const id of roots) {
      await db.run(`WITH RECURSIVE sub(id) AS (
          SELECT ? UNION ALL SELECT p.id FROM pages p JOIN sub ON p.parent_id = sub.id WHERE p.deleted_at IS NULL)
        UPDATE pages SET deleted_at = ?, deleted_batch = ? WHERE id IN (SELECT id FROM sub) AND user_id = ?`, id, now, id, userId);
    }
    return roots;
  });
}

// Возвращает заметку на прежнее место. Если родитель тоже удалён — к ближайшему живому предку
// (или на верхний уровень) и в конец списка.
function restorePages(userId, batchIds) {
  const anyPage = (id) => db.get('SELECT * FROM pages WHERE id = ? AND user_id = ?', id, userId);
  return db.tx(async () => {
    const restored = [];
    for (const id of batchIds.map(Number)) {
      const root = await anyPage(id);
      if (!root || root.deleted_batch !== root.id) continue;
      let target = root.parent_id;
      while (target !== null) {
        const parent = await anyPage(target);
        if (!parent) { target = null; break; }
        if (!parent.deleted_at) break;
        target = parent.parent_id;
      }
      if (target !== root.parent_id) {
        const pos = (await db.get(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM pages
          WHERE user_id = ? AND parent_id IS ? AND deleted_at IS NULL`, userId, target)).p;
        await db.run('UPDATE pages SET parent_id = ?, position = ? WHERE id = ?', target, pos, root.id);
      }
      await db.run('UPDATE pages SET deleted_at = NULL, deleted_batch = NULL WHERE deleted_batch = ? AND user_id = ?',
        root.id, userId);
      restored.push({ id: root.id, parent_id: target, moved: target !== root.parent_id });
    }
    return restored;
  });
}

function purgeBatch(userId, batchId) {
  return db.tx(async () => {
    // заметки, удалённые раньше отдельно, но лежавшие внутри — не теряем, а отвязываем от родителя
    await db.run(`UPDATE pages SET parent_id = NULL WHERE user_id = ? AND deleted_batch != ?
      AND parent_id IN (SELECT id FROM pages WHERE deleted_batch = ?)`, userId, batchId, batchId);
    await db.run('DELETE FROM pages WHERE deleted_batch = ? AND user_id = ?', batchId, userId);
  });
}

async function purgeExpired() {
  const old = await db.all(`SELECT id, user_id FROM pages WHERE deleted_batch = id
    AND deleted_at < datetime('now', ?)`, `-${TRASH_DAYS} days`);
  for (const r of old) await purgeBatch(r.user_id, r.id);
  if (old.length) console.log(`Корзина: окончательно удалены записи старше ${TRASH_DAYS} дней (${old.length})`);
  const tasks = (await db.run("DELETE FROM tasks WHERE deleted_at < datetime('now', ?)", `-${TRASH_DAYS} days`)).changes;
  if (tasks) console.log(`Корзина задач: окончательно удалены задачи старше ${TRASH_DAYS} дней (${tasks})`);
}

app.delete('/api/pages/:id', auth, async (req, res) => {
  if (!(await getPage(req.user.id, req.params.id))) return httpError(res, 404, 'Заметка не найдена');
  res.json({ trashed: await trashPages(req.user.id, [req.params.id]) });
});

app.post('/api/pages/delete', auth, async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length) return httpError(res, 400, 'Не выбраны заметки');
  res.json({ trashed: await trashPages(req.user.id, ids) });
});

app.get('/api/trash/pages', auth, async (req, res) => {
  const items = await db.all(`SELECT r.id, r.title, r.deleted_at,
      (SELECT COUNT(*) - 1 FROM pages s WHERE s.deleted_batch = r.id) AS sub_count,
      par.title AS parent_title, par.deleted_at IS NOT NULL AS parent_deleted
    FROM pages r LEFT JOIN pages par ON par.id = r.parent_id
    WHERE r.user_id = ? AND r.deleted_batch = r.id ORDER BY r.deleted_at DESC, r.id DESC`, req.user.id);
  res.json({ days: TRASH_DAYS, items: items.map((i) => ({ ...i, parent_deleted: !!i.parent_deleted })) });
});

app.post('/api/trash/pages/restore', auth, async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length) return httpError(res, 400, 'Не выбраны заметки');
  res.json({ restored: await restorePages(req.user.id, ids) });
});

app.delete('/api/trash/pages/:id', auth, async (req, res) => {
  await purgeBatch(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

app.delete('/api/trash/pages', auth, async (req, res) => {
  const ids = await db.all('SELECT id FROM pages WHERE user_id = ? AND deleted_batch = id', req.user.id);
  for (const r of ids) await purgeBatch(req.user.id, r.id);
  res.json({ ok: true, count: ids.length });
});

// ---------- tasks ----------

// Цвета статусов — ключи палитры; сами цвета заданы в app.css (--st-<ключ>) для светлой и тёмной темы
const STATUS_COLORS = ['gray', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'brown'];
const DEFAULT_STATUSES = [['todo', 'Нужно сделать', 'gray'], ['in_progress', 'В работе', 'orange']];
const FIXED_STATUSES = ['todo'];
const MAX_STATUSES = 12;

async function listStatuses(userId) {
  const sql = 'SELECT key, name, color, position, is_default FROM task_statuses WHERE user_id = ? ORDER BY position, id';
  let rows = await db.all(sql, userId);
  if (!rows.length) {
    await db.tx(async () => {
      for (const [i, [k, n, c]] of DEFAULT_STATUSES.entries()) {
        await db.run('INSERT OR IGNORE INTO task_statuses (user_id, key, name, color, position) VALUES (?, ?, ?, ?, ?)', userId, k, n, c, i);
      }
    });
    rows = await db.all(sql, userId);
  }
  // Статус по умолчанию: выбранный пользователем, иначе «Нужно сделать»
  const chosen = rows.find((r) => r.is_default);
  const defKey = chosen ? chosen.key : 'todo';
  return rows.map(({ is_default, ...r }) => ({ ...r, fixed: FIXED_STATUSES.includes(r.key), default: r.key === defKey }));
}
const defaultStatus = async (userId) => ((await listStatuses(userId)).find((s) => s.default) || { key: 'todo' }).key;
const statusExists = async (userId, key) => (await listStatuses(userId)).some((s) => s.key === key);
const cleanStatusName = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
const nameTaken = async (userId, name, exceptKey) =>
  (await listStatuses(userId)).some((s) => s.key !== exceptKey && s.name.toLowerCase() === name.toLowerCase());
const PRIORITIES = ['low', 'medium', 'high'];
// Живые задачи (не в корзине); завершённые тоже живые
const getTask = (userId, id) => db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL', id, userId);
const taskOut = (t) => { const { search_text, user_id, deleted_at, ...rest } = t; return rest; };
const validDate = (d) => d === null || d === '' || /^\d{4}-\d{2}-\d{2}$/.test(d);
const validTime = (v) => v === null || v === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
// Время напоминания приходит из браузера в ISO (с часовым поясом), в базе — UTC как у datetime('now')
const sqlTime = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 19).replace('T', ' ');
};
const topPosition = async (userId, status) => (await db.get(`SELECT COALESCE(MIN(position), 1) - 1 AS p FROM tasks
  WHERE user_id = ? AND status = ? AND deleted_at IS NULL AND completed_at IS NULL`, userId, status)).p;
const idList = (ids) => (Array.isArray(ids) ? [...new Set(ids.map(Number).filter(Number.isInteger))] : []);

// Задача без названия не остаётся (как заметки): с текстом в описании — название из его первой строки,
// без текста — удаляется насовсем (в корзину не попадает)
async function setTaskTitle(t, title) {
  await db.run("UPDATE tasks SET title = ?, search_text = ?, updated_at = datetime('now') WHERE id = ?",
    title, searchText(title, t.description), t.id);
}
async function finalizeTask(t) {
  if (t.title.trim()) return { title: t.title };
  if (isEnc(t.description)) return { title: '' };
  const line = firstLine(t.description);
  if (!line) {
    await db.run('DELETE FROM tasks WHERE id = ?', t.id);
    return { deleted: true };
  }
  await setTaskTitle(t, line);
  return { title: line };
}

app.get('/api/tasks', auth, async (req, res) => {
  // задачи без названия, брошенные больше получаса назад (например, закрыли вкладку на телефоне)
  const stale = await db.all(`SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NULL AND trim(title) = ''
    AND updated_at < datetime('now', '-30 minutes')`, req.user.id);
  for (const t of stale) await finalizeTask(t);
  res.json((await db.all('SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NULL ORDER BY position, id', req.user.id)).map(taskOut));
});

app.post('/api/tasks', auth, async (req, res) => {
  const b = req.body || {};
  // Название можно ввести уже в открытой карточке, поэтому задача создаётся и без него
  const title = isEnc(b.title) ? cutTitle(b.title) : String(b.title || '').trim().slice(0, 300);
  const status = b.status && (await statusExists(req.user.id, b.status)) ? b.status : await defaultStatus(req.user.id);
  const priority = PRIORITIES.includes(b.priority) ? b.priority : 'medium';
  const due = validDate(b.due_date) && b.due_date ? b.due_date : null;
  const id = await db.tx(async () => (await db.run(`INSERT INTO tasks (user_id, title, status, priority, due_date, position, search_text)
    VALUES (?, ?, ?, ?, ?, ?, ?)`, req.user.id, title, status, priority, due, await topPosition(req.user.id, status), searchText(title, '')))
    .lastInsertRowid);
  res.json(taskOut(await getTask(req.user.id, id)));
});

app.patch('/api/tasks/:id', auth, async (req, res) => {
  const t = await getTask(req.user.id, req.params.id);
  if (!t) return httpError(res, 404, 'Задача не найдена');
  const b = req.body || {};
  const next = { ...t };
  if (b.title !== undefined) next.title = cutTitle(b.title);
  if (b.description !== undefined) next.description = clean(b.description);
  if (b.status !== undefined) {
    if (!(await statusExists(req.user.id, b.status))) return httpError(res, 400, 'Такого статуса нет. Обновите страницу');
    if (b.status !== t.status) next.position = await topPosition(req.user.id, b.status);
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
  if (b.due_time !== undefined) {
    if (!validTime(b.due_time)) return httpError(res, 400, 'Время должно быть в формате ЧЧ:ММ');
    next.due_time = b.due_time || null;
  }
  if (!next.due_date) next.due_time = null;
  if (b.remind_at !== undefined) {
    const at = b.remind_at ? sqlTime(b.remind_at) : null;
    if (at === undefined) return httpError(res, 400, 'Неверное время напоминания');
    if (at !== t.remind_at) next.reminded_at = null; // новое время — напоминание снова ждёт отправки
    next.remind_at = at;
    const before = Number(b.remind_before);
    next.remind_before = at && b.remind_before != null && Number.isInteger(before) && before >= -1440 && before <= 60 * 24 * 31 ? before : null;
  }
  await db.run(`UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, due_time = ?, position = ?,
    remind_at = ?, remind_before = ?, reminded_at = ?, search_text = ?, updated_at = datetime('now') WHERE id = ?`,
  next.title, next.description, next.status, next.priority, next.due_date, next.due_time, next.position,
  next.remind_at, next.remind_before, next.reminded_at, searchText(next.title, next.description), t.id);
  res.json(taskOut(await getTask(req.user.id, t.id)));
});

// Вызывается при закрытии карточки задачи без названия; можно сразу передать несохранённое описание
app.post('/api/tasks/:id/finalize', auth, async (req, res) => {
  const t = await getTask(req.user.id, req.params.id);
  if (!t) return res.json({ deleted: true });
  const b = req.body || {};
  if (b.title !== undefined) t.title = isEnc(b.title) ? cutTitle(b.title) : String(b.title).trim().slice(0, 300);
  if (b.description !== undefined) t.description = clean(b.description);
  if (b.title !== undefined || b.description !== undefined) {
    await db.run(`UPDATE tasks SET title = ?, description = ?, search_text = ?, updated_at = datetime('now') WHERE id = ?`,
      t.title, t.description, searchText(t.title, t.description), t.id);
  }
  res.json(await finalizeTask(t));
});

// Завершить / вернуть в работу одну или несколько задач. Вернувшаяся задача встаёт первой в своём статусе
// (если статуса уже нет — в статус по умолчанию)
app.post('/api/tasks/complete', auth, async (req, res) => {
  const ids = idList(req.body?.ids);
  if (!ids.length) return httpError(res, 400, 'Не выбраны задачи');
  const done = req.body?.completed !== false;
  const out = await db.tx(async () => {
    const list = [];
    for (const id of ids) {
      const t = await getTask(req.user.id, id);
      if (!t) continue;
      if (done) {
        if (!t.completed_at) await db.run("UPDATE tasks SET completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", t.id);
      } else if (t.completed_at) {
        const status = (await statusExists(req.user.id, t.status)) ? t.status : await defaultStatus(req.user.id);
        await db.run("UPDATE tasks SET completed_at = NULL, status = ?, position = ?, updated_at = datetime('now') WHERE id = ?",
          status, await topPosition(req.user.id, status), t.id);
      }
      list.push(taskOut(await getTask(req.user.id, t.id)));
    }
    return list;
  });
  res.json({ tasks: out });
});

app.post('/api/tasks/reorder', auth, async (req, res) => {
  const { status, ids } = req.body || {};
  if (!(await statusExists(req.user.id, status)) || !Array.isArray(ids)) return httpError(res, 400, 'Некорректные данные');
  await db.tx(async () => {
    for (const [i, id] of ids.entries()) {
      await db.run(`UPDATE tasks SET status = ?, position = ?, updated_at = datetime('now')
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, status, i, id, req.user.id);
    }
  });
  res.json({ ok: true });
});

app.post('/api/tasks/:id/favorite', auth, async (req, res) => {
  const t = await getTask(req.user.id, req.params.id);
  if (!t) return httpError(res, 404, 'Задача не найдена');
  await db.run(`UPDATE tasks SET favorite_at = ${req.body?.favorite ? "datetime('now')" : 'NULL'} WHERE id = ?`, t.id);
  res.json({ favorite_at: (await getTask(req.user.id, t.id)).favorite_at });
});

// ---------- уведомления (напоминания о задачах) ----------
// Браузер подписывается на уведомления (у каждого устройства своя подписка), сервер раз в минуту
// ищет задачи, по которым пора напомнить, и отправляет уведомление на все устройства пользователя.
// Название задачи зашифровано — сервер отправляет его как есть, расшифровывает уже устройство (sw.js).

let VAPID = null;
async function loadVapid() {
  const row = await db.get("SELECT value FROM meta WHERE key = 'vapid'");
  if (row) return JSON.parse(row.value);
  await db.run("INSERT OR IGNORE INTO meta (key, value) VALUES ('vapid', ?)", JSON.stringify(push.createVapidKeys()));
  return JSON.parse((await db.get("SELECT value FROM meta WHERE key = 'vapid'")).value);
}
const siteOrigin = (req) => `${req.protocol}://${req.get('host')}`;

app.get('/api/push/key', auth, (req, res) => res.json({ publicKey: VAPID.publicKey }));

app.post('/api/push/subscribe', auth, async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!push.validEndpoint(endpoint) || !B64U.test(keys?.p256dh || '') || !B64U.test(keys?.auth || '')) {
    return httpError(res, 400, 'Браузер прислал неверную подписку на уведомления');
  }
  // Одно устройство — одна подписка; если на нём раньше входил другой пользователь, подписка переходит к новому
  await db.run(`INSERT INTO push_subs (user_id, endpoint, p256dh, auth, origin) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
    origin = excluded.origin`, req.user.id, endpoint, keys.p256dh, keys.auth, siteOrigin(req));
  res.json({ ok: true });
});

app.post('/api/push/unsubscribe', auth, async (req, res) => {
  await db.run('DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?', String(req.body?.endpoint || ''), req.user.id);
  res.json({ ok: true });
});

async function pushToSubs(subs, data) {
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    const r = await push.send(s, data, VAPID, s.origin.startsWith('https://') ? s.origin : 'mailto:silo@example.com');
    if (r === 'ok') sent++;
    if (r === 'gone') await db.run('DELETE FROM push_subs WHERE id = ?', s.id);
  }));
  return sent;
}

// Пробное уведомление на это устройство — из «Настроек задач»
app.post('/api/push/test', auth, async (req, res) => {
  const subs = await db.all('SELECT * FROM push_subs WHERE user_id = ? AND endpoint = ?', req.user.id, String(req.body?.endpoint || ''));
  if (!subs.length) return httpError(res, 400, 'Это устройство не подписано на уведомления');
  const sent = await pushToSubs(subs, { kind: 'test' });
  if (!sent) return httpError(res, 502, 'Служба уведомлений браузера не приняла уведомление. Попробуйте выключить и снова включить уведомления');
  res.json({ ok: true });
});

const REMIND_LATE_HOURS = 12; // если сервер был выключен дольше, старые напоминания не отправляем
let remindBusy = false;
async function sendReminders() {
  if (remindBusy) return;
  remindBusy = true;
  try {
    const due = await db.all(`SELECT id, user_id, title, due_date, due_time, remind_at FROM tasks
      WHERE reminded_at IS NULL AND remind_at IS NOT NULL AND remind_at <= datetime('now')
      AND deleted_at IS NULL AND completed_at IS NULL ORDER BY remind_at LIMIT 200`);
    if (!due.length) return;
    // Сначала отмечаем отправленными — чтобы при сбое сети одно напоминание не пришло несколько раз
    await db.tx(async () => {
      for (const t of due) await db.run("UPDATE tasks SET reminded_at = datetime('now') WHERE id = ?", t.id);
    });
    const late = Date.now() - REMIND_LATE_HOURS * 3600e3;
    for (const t of due) {
      if (new Date(t.remind_at.replace(' ', 'T') + 'Z').getTime() < late) continue;
      const subs = await db.all('SELECT * FROM push_subs WHERE user_id = ?', t.user_id);
      if (!subs.length) continue;
      await pushToSubs(subs, {
        kind: 'task', id: t.id, u: t.user_id,
        title: t.title.length <= 3000 ? t.title : '', // у уведомления ограничен размер
        due_date: t.due_date, due_time: t.due_time,
      });
    }
  } catch (e) {
    console.error('Напоминания:', e.message || e);
  } finally {
    remindBusy = false;
  }
}
// Проверка в начале каждой минуты
function startReminders() {
  const tick = () => {
    sendReminders();
    setTimeout(tick, 60e3 - (Date.now() % 60e3) + 500).unref();
  };
  tick();
}

// ---------- tasks trash («Недавно удалённые» задачи; у Заметок своя корзина) ----------

// Удалённые задачи уходят в корзину. Задача без названия сначала получает его из описания,
// а совсем пустую хранить незачем — удаляется сразу
function trashTasks(userId, ids) {
  const now = sqlNow();
  return db.tx(async () => {
    const trashed = [];
    for (const id of ids) {
      const t = await getTask(userId, id);
      if (!t) continue;
      if ((await finalizeTask(t)).deleted) continue;
      await db.run('UPDATE tasks SET deleted_at = ? WHERE id = ?', now, t.id);
      trashed.push(t.id);
    }
    return trashed;
  });
}

app.delete('/api/tasks/:id', auth, async (req, res) => {
  if (!(await getTask(req.user.id, req.params.id))) return httpError(res, 404, 'Задача не найдена');
  res.json({ trashed: await trashTasks(req.user.id, [Number(req.params.id)]) });
});

app.post('/api/tasks/delete', auth, async (req, res) => {
  const ids = idList(req.body?.ids);
  if (!ids.length) return httpError(res, 400, 'Не выбраны задачи');
  res.json({ trashed: await trashTasks(req.user.id, ids) });
});

app.get('/api/trash/tasks', auth, async (req, res) => {
  const items = await db.all(`SELECT id, title, status, completed_at, deleted_at FROM tasks
    WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC, id DESC`, req.user.id);
  res.json({ days: TRASH_DAYS, items });
});

// Восстановленная задача возвращается в свой статус (если его уже нет — в статус по умолчанию), первой в колонке
app.post('/api/trash/tasks/restore', auth, async (req, res) => {
  const ids = idList(req.body?.ids);
  if (!ids.length) return httpError(res, 400, 'Не выбраны задачи');
  const restored = await db.tx(async () => {
    const list = [];
    for (const id of ids) {
      const t = await db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL', id, req.user.id);
      if (!t) continue;
      const status = (await statusExists(req.user.id, t.status)) ? t.status : await defaultStatus(req.user.id);
      await db.run('UPDATE tasks SET deleted_at = NULL, status = ?, position = ? WHERE id = ?',
        status, await topPosition(req.user.id, status), t.id);
      list.push(taskOut(await getTask(req.user.id, t.id)));
    }
    return list;
  });
  res.json({ restored });
});

app.delete('/api/trash/tasks/:id', auth, async (req, res) => {
  await db.run('DELETE FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL', req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/trash/tasks', auth, async (req, res) => {
  const { changes } = await db.run('DELETE FROM tasks WHERE user_id = ? AND deleted_at IS NOT NULL', req.user.id);
  res.json({ ok: true, count: changes });
});

// ---------- task statuses ----------

app.get('/api/statuses', auth, async (req, res) => res.json(await listStatuses(req.user.id)));

app.post('/api/statuses', auth, async (req, res) => {
  const list = await listStatuses(req.user.id);
  if (list.length >= MAX_STATUSES) return httpError(res, 400, `Статусов может быть не больше ${MAX_STATUSES}`);
  const name = cleanStatusName(req.body?.name);
  if (!name) return httpError(res, 400, 'Напишите название статуса');
  if (await nameTaken(req.user.id, name)) return httpError(res, 400, 'Статус с таким названием уже есть');
  const color = STATUS_COLORS.includes(req.body?.color) ? req.body.color : 'blue';
  const key = 's_' + crypto.randomBytes(5).toString('hex');
  const pos = list.length ? Math.max(...list.map((s) => s.position)) + 1 : 0;
  await db.run('INSERT INTO task_statuses (user_id, key, name, color, position) VALUES (?, ?, ?, ?, ?)',
    req.user.id, key, name, color, pos);
  res.json(await listStatuses(req.user.id));
});

app.patch('/api/statuses/:key', auth, async (req, res) => {
  const s = (await listStatuses(req.user.id)).find((x) => x.key === req.params.key);
  if (!s) return httpError(res, 404, 'Статус не найден');
  const b = req.body || {};
  let { name, color } = s;
  if (b.name !== undefined) {
    name = cleanStatusName(b.name);
    if (!name) return httpError(res, 400, 'Название статуса не может быть пустым');
    if (await nameTaken(req.user.id, name, s.key)) return httpError(res, 400, 'Статус с таким названием уже есть');
  }
  if (b.color !== undefined) {
    if (!STATUS_COLORS.includes(b.color)) return httpError(res, 400, 'Неизвестный цвет');
    color = b.color;
  }
  if (b.default !== undefined && b.default !== true) return httpError(res, 400, 'Выберите другой статус по умолчанию');
  await db.tx(async () => {
    await db.run('UPDATE task_statuses SET name = ?, color = ? WHERE user_id = ? AND key = ?', name, color, req.user.id, s.key);
    if (b.default === true) {
      await db.run('UPDATE task_statuses SET is_default = (key = ?) WHERE user_id = ?', s.key, req.user.id);
    }
  });
  res.json(await listStatuses(req.user.id));
});

app.post('/api/statuses/reorder', auth, async (req, res) => {
  const keys = req.body?.keys;
  const current = (await listStatuses(req.user.id)).map((s) => s.key);
  if (!Array.isArray(keys) || keys.length !== current.length || !current.every((k) => keys.includes(k))) {
    return httpError(res, 400, 'Некорректные данные');
  }
  await db.tx(async () => {
    for (const [i, k] of keys.entries()) {
      await db.run('UPDATE task_statuses SET position = ? WHERE user_id = ? AND key = ?', i, req.user.id, k);
    }
  });
  res.json(await listStatuses(req.user.id));
});

// Удаление статуса: его задачи (в том числе завершённые и в корзине) переходят в «Нужно сделать»
app.delete('/api/statuses/:key', auth, async (req, res) => {
  const key = req.params.key;
  if (FIXED_STATUSES.includes(key)) return httpError(res, 400, 'Этот статус нельзя удалить, но можно переименовать');
  if (!(await statusExists(req.user.id, key))) return httpError(res, 404, 'Статус не найден');
  await db.tx(async () => {
    const start = (await db.get("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM tasks WHERE user_id = ? AND status = 'todo'", req.user.id)).p;
    const ids = await db.all('SELECT id FROM tasks WHERE user_id = ? AND status = ? ORDER BY position, id', req.user.id, key);
    for (const [i, r] of ids.entries()) {
      await db.run("UPDATE tasks SET status = 'todo', position = ?, updated_at = datetime('now') WHERE id = ?", start + i, r.id);
    }
    await db.run('DELETE FROM task_statuses WHERE user_id = ? AND key = ?', req.user.id, key);
  });
  res.json(await listStatuses(req.user.id));
});

// ---------- search ----------
// Данные зашифрованы, поэтому ищет браузер: сервер отдаёт все живые заметки и задачи (в зашифрованном виде)

app.get('/api/search-index', auth, async (req, res) => {
  res.json({
    pages: await db.all('SELECT id, title, content, updated_at FROM pages WHERE user_id = ? AND deleted_at IS NULL', req.user.id),
    tasks: await db.all(`SELECT id, title, status, completed_at, description, updated_at FROM tasks
      WHERE user_id = ? AND deleted_at IS NULL`, req.user.id),
  });
});

// ---------- шифрование данных, записанных открытым текстом ----------
// Старые аккаунты и приветственные заметки нового аккаунта: браузер забирает открытый текст,
// шифрует и возвращает. Работает и для корзины.

const PLAIN = (col) => `(${col} != '' AND ${col} NOT LIKE 'e1:%')`;
app.get('/api/me/plain', auth, async (req, res) => {
  res.json({
    pages: await db.all(`SELECT id, title, content FROM pages WHERE user_id = ? AND (${PLAIN('title')} OR ${PLAIN('content')})`, req.user.id),
    tasks: await db.all(`SELECT id, title, description FROM tasks WHERE user_id = ? AND (${PLAIN('title')} OR ${PLAIN('description')})`, req.user.id),
  });
});

app.post('/api/me/encrypt', auth, async (req, res) => {
  const ok = (v) => v === '' || isEnc(v);
  const pages = Array.isArray(req.body?.pages) ? req.body.pages : [];
  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
  if (![...pages.map((p) => [p.title, p.content]), ...tasks.map((t) => [t.title, t.description])].flat().every(ok)) {
    return httpError(res, 400, BAD_KEYS);
  }
  await db.tx(async () => {
    for (const p of pages) {
      await db.run("UPDATE pages SET title = ?, content = ?, search_text = '' WHERE id = ? AND user_id = ?", p.title, p.content, Number(p.id), req.user.id);
    }
    for (const t of tasks) {
      await db.run("UPDATE tasks SET title = ?, description = ?, search_text = '' WHERE id = ? AND user_id = ?", t.title, t.description, Number(t.id), req.user.id);
    }
  });
  // старый открытый текст не должен остаться ни в свободных страницах файла базы, ни в журнале
  // (в облачной базе файлом управляет Turso, там это не нужно)
  if (!db.remote) {
    await db.exec('VACUUM');
    await db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  }
  res.json({ ok: true });
});

// ---------- welcome content for new accounts ----------

async function seedWelcome(userId) {
  const add = async (parent, title, content, pos) => (await db.run(`INSERT INTO pages (user_id, parent_id, title, content, search_text, position)
    VALUES (?, ?, ?, ?, ?, ?)`, userId, parent, title, content, lower(`${title} ${plain(content)}`), pos)).lastInsertRowid;
  const root = await add(null, 'Как пользоваться базой',
    '<p>Это ваша личная база знаний. В разделе «Заметки» — содержание всей базы: у любой заметки могут быть подзаметки.</p>'
    + '<ul><li>Наведите на заметку в списке и нажмите <strong>+</strong>, чтобы создать подзаметку.</li>'
    + '<li>Перетаскивайте заметки мышкой, чтобы поменять порядок или вложить одну в другую.</li>'
    + '<li>Нажмите звёздочку вверху заметки, чтобы добавить её в избранное — оно всегда под рукой в левой панели.</li>'
    + '<li>Нажмите <strong>Ctrl + K</strong>, чтобы найти что угодно.</li></ul>'
    + '<h2>Форматирование</h2><p>Используйте панель над текстом: заголовки, списки, чек-листы, цитаты и код.</p>'
    + '<ul class="checklist"><li data-checked="true">Прочитать эту заметку</li><li data-checked="false">Создать свою первую заметку</li></ul>'
    + '<p>Всё сохраняется автоматически.</p>', 0);
  await add(root, 'Пример подзаметки', '<p>Эта заметка лежит внутри «Как пользоваться базой». Её можно удалить.</p>', 0);
  // Starter structure so a new user doesn't face an empty tree
  await add(null, 'Работа', '<p>Рабочие заметки, инструкции и договорённости. Добавляйте подзаметки через «+».</p>', 1);
  await add(null, 'Личное', '<p>Личные заметки, планы и идеи.</p>', 2);
  await add(null, 'Статьи и материалы', '<p>Полезные статьи, конспекты и ссылки.</p>', 3);
  for (const [i, [t, s, p]] of [['Разобрать заметки по разделам', 'todo', 'medium'], ['Попробовать доску задач', 'in_progress', 'low']].entries()) {
    await db.run(`INSERT INTO tasks (user_id, title, status, priority, position, search_text)
      VALUES (?, ?, ?, ?, ?, ?)`, userId, t, s, p, i, lower(t));
  }
}

// ---------- static ----------

app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));
app.use('/api', (req, res) => httpError(res, 404, 'Не найдено'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Любая ошибка в обработчике (например, база на минуту недоступна) — понятный ответ вместо падения сервера
app.use((err, req, res, next) => {
  if (err.status && err.status < 500) return res.status(err.status).json({ error: 'Некорректный запрос' });
  console.error(err);
  if (res.headersSent) return next(err);
  httpError(res, 500, 'Не получилось выполнить действие. Попробуйте ещё раз');
});

// ---------- запуск ----------

async function main() {
  await db.init();
  SERVER_SECRET = await loadServerSecret();
  VAPID = await loadVapid();

  // Заметки без названия, оставшиеся с прошлых версий
  {
    const untitled = await db.all("SELECT * FROM pages WHERE deleted_at IS NULL AND trim(title) = '' ORDER BY id DESC");
    let fixed = 0;
    for (const p of untitled) { const r = await finalizePage(p); if (r.deleted || r.title) fixed++; }
    if (fixed) console.log(`Заметки без названия: обработано ${fixed}`);
  }
  // Задачи без названия, оставшиеся с прошлых версий
  {
    const untitled = await db.all("SELECT * FROM tasks WHERE trim(title) = ''");
    for (const t of untitled) {
      if (!t.deleted_at) { await finalizeTask(t); continue; }
      if (isEnc(t.description)) continue;
      const line = firstLine(t.description);
      if (line) await setTaskTitle(t, line); else await db.run('DELETE FROM tasks WHERE id = ?', t.id);
    }
    if (untitled.length) console.log(`Задачи без названия: обработано ${untitled.length}`);
  }

  await purgeExpired();
  setInterval(() => purgeExpired().catch((e) => console.error(e)), 6 * 3600e3).unref();
  startReminders();

  app.listen(PORT, () => console.log(`Silo запущен: http://localhost:${PORT}${db.remote ? ' (база — Turso)' : ''}`));
}

main().catch((e) => {
  console.error('Не удалось запустить Silo:', e.message || e);
  process.exit(1);
});
