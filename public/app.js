'use strict';

/* =========================================================
   Разделы приложения. Чтобы добавить новый раздел в будущем:
   добавьте объект сюда и функцию отрисовки в render<Имя>().
   ========================================================= */
const SECTIONS = [
  { id: 'notes', title: 'Заметки', icon: 'book', hint: 'Заметки с текстом, вложенные друг в друга' },
  { id: 'tasks', title: 'Задачи', icon: 'tasks', hint: 'Список дел и доска' },
];

// Палитра цветов статусов: ключ хранится на сервере, цвет берётся из CSS-переменной --st-<ключ> (своя для тёмной темы)
const STATUS_COLORS = {
  gray: 'Серый', green: 'Зелёный', teal: 'Бирюзовый', blue: 'Синий', indigo: 'Индиго', purple: 'Фиолетовый',
  pink: 'Розовый', red: 'Красный', orange: 'Оранжевый', yellow: 'Жёлтый', brown: 'Коричневый',
};
// Статусы задач пользователя (S.statuses). todo — встроенный: в него уходят задачи удалённого статуса
const statusOf = (key) => S.statuses.find((s) => s.key === key) || { key, name: 'Без статуса', color: 'gray' };
const statusColor = (key) => `var(--st-${statusOf(key).color})`;
const PRIORITY = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };

// ---------- icons ----------
const ICONS = {
  book: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 1h13v-3M8 7h7',
  tasks: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
  // заметка — лист с текстом; заметка с подзаметками — стопка листов
  note: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  notes: 'M4 10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM7.5 13h5M7.5 17h3M8 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  more: 'M4.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M10.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M16.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0',
  chevron: 'M9 6l6 6-6 6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  menu: 'M4 6h16M4 12h16M4 18h16',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  logout: 'M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1',
  key: 'M14.5 4a5.5 5.5 0 1 1-4.9 8L4 17.6V20h3v-2h2v-2h2l.6-.6A5.5 5.5 0 0 1 14.5 4zM16 8h.01',
  users: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  board: 'M4 4h4v16H4zM10 4h4v11h-4zM16 4h4v7h-4z',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 2v4M16 2v4',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  ol: 'M10 6h10M10 12h10M10 18h10M4 4.5l1.5-.5v4.5M3.8 13.2a1.4 1.4 0 1 1 2.2 1.3L4 17h2.5',
  checklist: 'M3.5 5h4v4h-4zM3.5 15.5l1.8 1.8 2.9-3.5M11 7h9M11 16h9',
  quote: 'M6 8h4v4c0 2.5-1.2 4.2-3.5 5M14 8h4v4c0 2.5-1.2 4.2-3.5 5',
  code: 'M9 8l-4 4 4 4M15 8l4 4-4 4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  hr: 'M4 12h16',
  clear: 'M5 6V4h13v2M11 4 8 20M6 20h5M15 14l5 5M20 14l-5 5',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  move: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  gear: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  bold: 'M7 5h5.5a3.5 3.5 0 0 1 0 7H7zM7 12h6.5a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M10 5h8M6 19h8M14.5 5l-5 14',
  underline: 'M7 4v7a5 5 0 0 0 10 0V4M5 20h14',
  strike: 'M4 12h16M16.5 7c-.6-1.6-2.2-2.5-4.4-2.5-2.6 0-4.6 1.3-4.6 3.3 0 1.4.9 2.4 2.6 3M8 16.3c.6 2 2.3 3.2 4.6 3.2 2.7 0 4.6-1.3 4.6-3.4 0-.8-.2-1.4-.7-1.9',
  text: 'M5 7V5h14v2M12 5v14M9 19h6',
  chevronDown: 'M7 10l5 5 5-5',
  filter: 'M4 7h16M7 12h10M10 17h4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  bell: 'M6 8.5a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15 6 8.5zM10 20.5a2.2 2.2 0 0 0 4 0',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.75 1-5.8L3.5 9.7l5.9-.9z',
};
// Логотип Silo: вид сверху в шахту силоса — стена и винтовая лестница, уходящая вглубь
const LOGO = `<svg class="logo-mark" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M17.72 8.70A6.6 6.6 0 1 1 12.00 5.40" stroke-width="1.9" opacity=".85"/><path d="M12.00 15.30A3.3 3.3 0 1 1 15.30 12.00" stroke-width="1.9" opacity=".6"/></svg>`;
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

// ---------- utils ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.cancel = () => clearTimeout(t); return d; };
// старые ключи: раньше запоминали, развёрнуты ли «Недавно удалённые» и «Завершённые»
try { ['kb-trash-open', 'kb-task-trash-open', 'kb-done-open'].forEach((k) => localStorage.removeItem(k)); } catch { /* storage unavailable */ }
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const toDate = (s) => new Date(s.replace(' ', 'T') + 'Z');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function ago(s) {
  const diff = (Date.now() - toDate(s)) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  const d = toDate(s);
  const opts = { day: 'numeric', month: 'long' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('ru-RU', opts);
}
function dueLabel(d) {
  const t = todayStr();
  const day = 864e5;
  const diff = Math.round((new Date(d) - new Date(t)) / day);
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  if (diff === -1) return 'вчера';
  const opts = { day: 'numeric', month: 'short' };
  if (d.slice(0, 4) !== t.slice(0, 4)) opts.year = 'numeric';
  return new Date(d + 'T00:00').toLocaleDateString('ru-RU', opts).replace('.', '');
}

// «1 октября 2026, 14:30» — по местному времени (в базе время хранится в UTC)
function fullDateTime(s) {
  const d = toDate(s);
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(' г.', '');
  return `${date}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}
// «Сегодня, 1 окт» / «пт, 9 окт» / «пт, 9 окт 2027»
function dueLong(d) {
  const dt = new Date(d + 'T00:00');
  const opts = { day: 'numeric', month: 'short' };
  if (d.slice(0, 4) !== todayStr().slice(0, 4)) opts.year = 'numeric';
  const date = dt.toLocaleDateString('ru-RU', opts).replace('.', '').replace(' г.', '');
  const rel = dueLabel(d);
  if (['сегодня', 'завтра', 'вчера'].includes(rel)) return `${rel[0].toUpperCase()}${rel.slice(1)}, ${date}`;
  return `${dt.toLocaleDateString('ru-RU', { weekday: 'short' })}, ${date}`;
}
// Срок со временем: due_time — 'ЧЧ:ММ' по местному времени или null (срок на весь день)
const dueAt = (t) => (t.due_date ? new Date(`${t.due_date}T${t.due_time || '00:00'}`) : null);
const isOverdue = (t) => !!t.due_date && (t.due_time ? dueAt(t) < new Date() : t.due_date < todayStr());
const withTime = (label, time) => (time ? `${label}, ${time}` : label);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Названия и тексты заметок и задач шифруются в браузере: api() шифрует поля title / content / description
// перед отправкой и расшифровывает всё, что пришло зашифрованным. Пустая строка остаётся пустой —
// по ней сервер понимает, что названия или текста нет.
const SECRET_FIELDS = new Set(['title', 'content', 'description']);
async function sealBody(v) {
  if (Array.isArray(v)) return Promise.all(v.map(sealBody));
  if (!v || typeof v !== 'object') return v;
  const out = {};
  await Promise.all(Object.entries(v).map(async ([k, x]) => {
    out[k] = SECRET_FIELDS.has(k) && typeof x === 'string' && x && !Vault.isSealed(x) ? await Vault.encrypt(x) : await sealBody(x);
  }));
  return out;
}
async function openBody(v, k = '') {
  if (Vault.isSealed(v)) {
    const text = await Vault.decrypt(v);
    return k === 'content' || k === 'description' ? cleanHtml(text) : text;
  }
  if (Array.isArray(v)) return Promise.all(v.map((x) => openBody(x, k)));
  if (!v || typeof v !== 'object') return v;
  const out = {};
  await Promise.all(Object.entries(v).map(async ([key, x]) => { out[key] = await openBody(x, key); }));
  return out;
}

async function api(method, url, body, { fresh = false } = {}) {
  const plain = body;
  if (body !== undefined && Vault.ready()) body = await sealBody(body);
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'kb' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  }).catch(() => { throw new Error('Нет связи с сервером — проверьте интернет'); });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && S.user) { S.user = null; renderAuth(); }
  if (!res.ok) throw Object.assign(new Error(data.error || 'Что-то пошло не так. Попробуйте ещё раз'), { status: res.status });
  const out = Vault.ready() ? await openBody(data) : data;
  trackServer(method, url, plain, out);
  if (method === 'GET' && !fresh) Unsaved.overlay(url, out);
  return out;
}

// Запросы при закрытии вкладки уходят синхронно, а шифрование асинхронное. Поэтому тексты шифруются
// заранее, пока человек печатает (preseal), а при закрытии берётся уже готовый шифр.
const presealed = new Map();
function preseal(...texts) {
  if (!Vault.ready()) return;
  texts.forEach((t) => {
    if (!t || presealed.has(t)) return;
    Vault.encrypt(t).then((c) => {
      presealed.set(t, c);
      while (presealed.size > 40) presealed.delete(presealed.keys().next().value);
    });
  });
}
function sealNow(body) {
  const out = {};
  for (const [k, v] of Object.entries(body)) {
    if (SECRET_FIELDS.has(k) && typeof v === 'string' && v) {
      if (!presealed.has(v)) return null;
      out[k] = presealed.get(v);
    } else out[k] = v;
  }
  return out;
}

// ---------- HTML и текст заметок ----------
// Сервер больше не видит текст, поэтому чистит HTML браузер (те же правила, что были на сервере)
const HTML_TAGS = new Set(['P', 'BR', 'H1', 'H2', 'H3', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'A', 'HR', 'DIV', 'SPAN']);
const HTML_DROP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'SVG', 'MATH']);
function cleanHtml(html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (el) => [...el.childNodes].forEach((n) => {
    if (n.nodeType === 3) return;
    if (n.nodeType !== 1) { n.remove(); return; }
    if (HTML_DROP.has(n.tagName)) { n.remove(); return; }
    walk(n);
    if (!HTML_TAGS.has(n.tagName)) { n.replaceWith(...n.childNodes); return; }
    [...n.attributes].forEach((a) => {
      const keep = (n.tagName === 'A' && a.name === 'href') || (n.tagName === 'UL' && a.name === 'class')
        || (n.tagName === 'LI' && a.name === 'data-checked');
      if (!keep) n.removeAttribute(a.name);
    });
    if (n.tagName === 'A') {
      const href = n.getAttribute('href') || '';
      if (href && !/^(https?:|mailto:|tel:)/i.test(href.trim())) n.removeAttribute('href');
      n.setAttribute('target', '_blank');
      n.setAttribute('rel', 'noopener noreferrer');
    }
    if (n.tagName === 'UL' && n.getAttribute('class') && n.getAttribute('class') !== 'checklist') n.removeAttribute('class');
  });
  walk(doc.body);
  return doc.body.innerHTML;
}
// Текст без разметки; строки — по блокам
function htmlText(html) {
  const doc = new DOMParser().parseFromString(String(html || '').replace(/<\/(p|div|h\d|li|pre|blockquote)>|<br\s*\/?>/gi, '$&\n'), 'text/html');
  return doc.body.textContent.replace(/\u00a0/g, ' ');
}
// Первая непустая строка — для названия (не длиннее 80 символов, режем по слову)
function firstLine(html) {
  const line = htmlText(html).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).find(Boolean) || '';
  if (line.length <= 80) return line;
  const cut = line.slice(0, 80);
  const space = cut.lastIndexOf(' ');
  return `${(space > 40 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?—–-]+$/, '')}…`;
}

// action: { label, fn } — кнопка в уведомлении (например «Отменить»); такое уведомление висит дольше
function toast(text, type = '', action = null) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = text;
  if (action) {
    const b = document.createElement('button');
    b.className = 'toast-action';
    b.textContent = action.label;
    b.onclick = () => { el.remove(); action.fn(); };
    el.append(b);
  }
  $('#toasts').append(el);
  setTimeout(() => el.remove(), action ? 7000 : 3200);
}
const fail = (e) => toast(e.message, 'error');

// Отметка «Сохранено» в строке-счётчике под заголовком раздела после выхода из заметки/задачи.
// state: 'saving' → 'ok' (гаснет через несколько секунд) или 'fail'. Ставится только по ответу сервера.
const SAVED_SHOW_MS = 4000;
let savedMarkTimer = 0;
function setSavedMark(kind, state) {
  clearTimeout(savedMarkTimer);
  S.savedMark = { kind, state, at: Date.now() };
  if (state === 'ok') savedMarkTimer = setTimeout(() => { S.savedMark = null; paintSavedMark(); }, SAVED_SHOW_MS + 600);
  paintSavedMark();
}
function paintSavedMark() {
  $$('.saved-mark').forEach((el) => el.remove());
  const m = S.savedMark;
  if (!m) return;
  const left = m.state === 'ok' ? SAVED_SHOW_MS - (Date.now() - m.at) : 0;
  if (m.state === 'ok' && left <= 0) return;
  const sub = m.kind === 'task' ? $('#tasks-sub') : $('.notes-home .home-sub');
  if (!sub) return;
  const local = m.state === 'fail' && Unsaved.items.size && Unsaved.stored; // правки ждут отправки, но они на устройстве
  sub.insertAdjacentHTML('beforeend', m.state === 'saving' ? '<span class="saved-mark saving">Сохранение…</span>'
    : local ? `<span class="saved-mark local">${icon('check')}Сохранено на устройстве</span>`
    : m.state === 'fail' ? '<span class="saved-mark fail">Не сохранено</span>'
    : `<span class="saved-mark ok">${icon('check')}Сохранено</span>`);
  // при перерисовке раздела отметка не начинает гаснуть заново
  if (m.state === 'ok') sub.lastElementChild.style.setProperty('--fade-in', `${Math.max(0, left - 500)}ms`);
}

// ---------- несохранённые изменения ----------
// Если запрос на сохранение не прошёл (нет сети, сервер недоступен), правки не теряются: они ждут здесь
// и сразу записываются на это устройство (в IndexedDB, зашифрованными тем же ключом, что и данные).
// Закрыли вкладку без связи — при следующем открытии Silo они отправятся на сервер.
// Повтор — по кнопке, сам раз в 20 секунд, при появлении сети и после любого удачного сохранения.

// Что сейчас лежит на сервере: последние известные название и текст каждой заметки/задачи.
// По ним при отправке отложенных правок видно, не изменили ли тот же текст на другом устройстве.
const Known = new Map(); // 'page:5' → { title, content } / 'task:7' → { title, description }
const TEXT_FIELDS = ['title', 'content', 'description'];
const normText = (f, v) => (f === 'title' ? String(v ?? '') : cleanHtml(String(v ?? '')));
function rememberServer(kind, id, obj) {
  if (!obj || !Number.isInteger(Number(id))) return;
  const key = `${kind}:${Number(id)}`;
  const k = Known.get(key) || {};
  TEXT_FIELDS.forEach((f) => { if (typeof obj[f] === 'string' && !Vault.isSealed(obj[f])) k[f] = normText(f, obj[f]); });
  Known.set(key, k);
}
const itemUrl = (url) => url.match(/^\/api\/(pages|tasks)(?:\/(\d+))?(\/finalize)?$/);
function trackServer(method, url, sent, got) {
  const m = itemUrl(url);
  if (!m) return;
  const kind = m[1] === 'pages' ? 'page' : 'task';
  if (Array.isArray(got)) { got.forEach((x) => rememberServer(kind, x.id, x)); return; }
  if (m[2] && method !== 'GET' && sent && !got?.deleted) rememberServer(kind, m[2], sent);
  if (got?.id != null) rememberServer(kind, got.id, got);
}

// Хранилище на устройстве: одна запись на пользователя — вся очередь одним зашифрованным текстом
const Outbox = {
  open: () => new Promise((resolve, reject) => {
    const r = indexedDB.open('silo-outbox', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('q');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }),
  async run(mode, fn) {
    const d = await this.open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction('q', mode);
      const req = fn(tx.objectStore('q'));
      tx.oncomplete = () => { d.close(); resolve(req?.result); };
      tx.onerror = () => { d.close(); reject(tx.error); };
    });
  },
};

const Unsaved = {
  items: new Map(), // 'page:5' / 'task:7' → { url, data, name, base } (base — текст на сервере до этих правок)
  busy: false,
  timer: null,
  stored: true, // удаётся ли записывать на устройство (в приватном режиме может не получиться)
  chain: Promise.resolve(),
  doneTimer: 0,
  add(key, url, data, name) {
    const old = this.items.get(key);
    const base = { ...(old?.base || {}) };
    const known = Known.get(key) || {};
    Object.keys(data).forEach((f) => { if (TEXT_FIELDS.includes(f) && !(f in base) && f in known) base[f] = known[f]; });
    this.items.set(key, { url, data: { ...(old?.data || {}), ...data }, name: name || old?.name || '', base });
    preseal(...Object.values(data).filter((v) => typeof v === 'string'));
    if (!this.timer) this.timer = setInterval(() => this.retry(true), 20000);
    this.store();
    this.paint();
  },
  // Удачное сохранение: отправленные поля новее тех, что ждали, — их больше не повторяем
  saved(key, data) {
    const it = this.items.get(key);
    if (it) {
      Object.keys(data).forEach((k) => { delete it.data[k]; delete it.base[k]; });
      if (!Object.keys(it.data).length) this.items.delete(key);
      this.store();
      if (!this.items.size) this.finished([key]);
      this.paint();
    }
    if (this.items.size) setTimeout(() => this.retry(true), 0);
  },
  // Как назвать состояние «правки ждут отправки»
  label() { return this.stored ? 'Сохранено на устройстве' : 'Не сохранено'; },

  store() {
    const uid = S.user?.id;
    if (!uid) return;
    const list = [...this.items];
    this.chain = this.chain.then(async () => {
      if (!list.length) await Outbox.run('readwrite', (s) => s.delete(`u${uid}`));
      else {
        const blob = await Vault.encrypt(JSON.stringify(list));
        await Outbox.run('readwrite', (s) => s.put(blob, `u${uid}`));
      }
      if (!this.stored) { this.stored = true; this.paint(); }
    }).catch(() => { this.stored = false; this.paint(); });
    return this.chain;
  },
  async load(uid) {
    try {
      const blob = await Outbox.run('readonly', (s) => s.get(`u${uid}`));
      if (!blob) return;
      const list = JSON.parse(await Vault.decrypt(blob));
      list.forEach(([key, it]) => { if (!this.items.has(key)) this.items.set(key, { base: {}, ...it }); });
      if (this.items.size && !this.timer) this.timer = setInterval(() => this.retry(true), 20000);
    } catch { /* нечитаемая запись — пропускаем */ }
  },
  // Пока правки не отправлены, на экране показываем их, а не старую версию с сервера
  overlay(url, got) {
    const m = itemUrl(url);
    if (!m || !this.items.size || !got) return;
    const kind = m[1] === 'pages' ? 'page' : 'task';
    const apply = (x, onlyPresent) => {
      const it = x && this.items.get(`${kind}:${x.id}`);
      if (it) Object.entries(it.data).forEach(([k, v]) => { if (!onlyPresent || k in x) x[k] = v; });
    };
    if (Array.isArray(got)) got.forEach((x) => apply(x, true));
    else if (m[2]) apply(got, false);
  },

  async retry(quiet = false) {
    if (this.busy || !this.items.size || !S.user) return;
    this.busy = true;
    this.paint();
    let lastError = null;
    const sent = [];
    for (const [key, it] of [...this.items]) {
      try { if (await this.send(key, it)) sent.push(key); } catch (e) { lastError = e; }
    }
    this.busy = false;
    await this.store();
    if (!this.items.size) this.finished(sent);
    this.paint();
    if (!quiet && lastError) toast(`Снова не получилось. ${lastError.message}`, 'error');
  },
  // Отправка одной записи. Сначала смотрим, что сейчас на сервере: если тот же текст за это время
  // изменили на другом устройстве — не затираем его, а сохраняем нашу версию отдельной копией
  async send(key, it) {
    const [kind, idStr] = key.split(':');
    const id = Number(idStr);
    const snap = { ...it.data };
    const data = { ...snap };
    const texts = TEXT_FIELDS.filter((f) => f in data);
    let rescued = false;
    if (texts.length) {
      let cur = null;
      try {
        cur = kind === 'page' ? await api('GET', it.url, undefined, { fresh: true })
          : (await api('GET', '/api/tasks', undefined, { fresh: true })).find((x) => x.id === id) || null;
      } catch (e) { if (e.status !== 404) throw e; }
      if (!cur) { // удалили на другом устройстве (или сервер убрал пустую) — текст не теряем
        await this.rescue(kind, id, it, null);
        this.items.delete(key);
        return true;
      }
      let conflict = false;
      texts.forEach((f) => {
        const c = normText(f, cur[f]);
        if (c === normText(f, data[f])) { delete data[f]; return; } // это уже на сервере
        if (f in it.base && c !== it.base[f]) conflict = true;
      });
      if (conflict) {
        await this.rescue(kind, id, it, cur);
        texts.forEach((f) => delete data[f]);
        rescued = true;
      }
    }
    let r = null;
    if (Object.keys(data).length) {
      try { r = await api('PATCH', it.url, data); } catch (e) {
        if (e.status !== 404) throw e;
        this.items.delete(key); // удалили, а текста среди правок нет — сохранять некуда
        return false;
      }
    }
    const now = this.items.get(key);
    if (now) {
      Object.keys(snap).forEach((k) => { if (now.data[k] === snap[k]) { delete now.data[k]; delete now.base[k]; } });
      // за время отправки дописали ещё — сравнивать будем уже с тем, что сейчас на сервере
      Object.keys(now.data).forEach((k) => { const kn = Known.get(key); if (kn && k in kn) now.base[k] = kn[k]; });
      if (!Object.keys(now.data).length) this.items.delete(key);
    }
    this.applied(key, r, rescued);
    return true;
  },
  // Наша версия — в новую заметку/задачу рядом
  async rescue(kind, id, it, cur) {
    const d = it.data;
    const body = kind === 'page' ? d.content ?? cur?.content ?? '' : d.description ?? cur?.description ?? '';
    const title = (d.title ?? cur?.title ?? '').trim() || firstLine(body);
    if (!title && !firstLine(body)) return; // ни названия, ни текста — сохранять нечего
    const copyTitle = cur ? `${title || 'Без названия'} (копия)` : title;
    if (kind === 'page') {
      const parent = cur ? cur.parent_id : (pageById(id)?.parent_id ?? null);
      const p = await api('POST', '/api/pages', { parent_id: parent, title: copyTitle })
        .catch((e) => (e.status === 400 ? api('POST', '/api/pages', { parent_id: null, title: copyTitle }) : Promise.reject(e)));
      if (body) await api('PATCH', `/api/pages/${p.id}`, { content: body });
      if (S.pages) { S.pages = await api('GET', '/api/pages'); if ($('#main')) { renderTree(); updateCounts(); } }
      toast(cur
        ? `Заметку ${quoted(cur.title, '')} за это время изменили на другом устройстве. Ваша версия сохранена рядом — ${quoted(copyTitle, '')}`
        : `Заметку ${quoted(title, '')} удалили на другом устройстве. Ваши изменения сохранены в новой заметке`);
    } else {
      const t = cur || S.tasks?.find((x) => x.id === id) || {};
      const n = await api('POST', '/api/tasks', { title: copyTitle, status: t.status, priority: t.priority, due_date: t.due_date || null });
      if (body || t.due_time) await api('PATCH', `/api/tasks/${n.id}`, { ...(body ? { description: body } : {}), ...(t.due_time ? { due_time: t.due_time } : {}) });
      if (S.tasks) { S.tasks = await api('GET', '/api/tasks'); if ($('#tasks-body')) renderTasksBody(); }
      toast(cur
        ? `Задачу ${quoted(cur.title, '')} за это время изменили на другом устройстве. Ваша версия сохранена отдельной задачей — ${quoted(copyTitle, '')}`
        : `Задачу ${quoted(title, '')} удалили на другом устройстве. Ваши изменения сохранены в новой задаче`);
    }
  },
  // Ответ сервера после повтора — обновляем то, что на экране
  applied(key, r, reload) {
    const [kind, idStr] = key.split(':');
    const id = Number(idStr);
    if (kind === 'page') {
      const p = pageById(id);
      if (p && r?.updated_at) p.updated_at = r.updated_at;
      if (S.page?.id === id) {
        // текст изменили на другом устройстве — показываем то, что теперь на сервере
        if (reload && !pendingSave) { S.page = null; route(); return; }
        if (!pendingSave && !this.items.has(key)) setSaveState('Сохранено');
      }
    } else {
      const t = S.tasks?.find((x) => x.id === id);
      if (t && r) { Object.assign(t, r); if ($('#tasks-body')) renderTasksBody(); }
      const panelSave = $('.panel .tp-save');
      if (panelSave && $('#tp-fav')?.dataset.id === idStr && !this.items.has(key)) { panelSave.textContent = 'Сохранено'; panelSave.classList.remove('unsaved', 'local'); }
    }
  },
  // Всё дошло до сервера: на месте панели на пару секунд — «Сохранено на сервере», в разделе — «✓ Сохранено»
  finished(keys) {
    clearInterval(this.timer);
    this.timer = null;
    const kinds = new Set(keys.map((k) => k.split(':')[0]));
    kinds.forEach((k) => setSavedMark(k, 'ok'));
    if (!$('#unsaved-bar')) return;
    this.doneAt = Date.now();
    clearTimeout(this.doneTimer);
    this.doneTimer = setTimeout(() => { this.doneAt = 0; this.paint(); }, 3000);
  },
  paint() {
    let bar = $('#unsaved-bar');
    const done = !this.items.size && this.doneAt;
    if (!this.items.size && !done) { bar?.remove(); return; }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'unsaved-bar';
      bar.setAttribute('role', 'status');
      bar.innerHTML = '<span class="ub-text"><b></b><span></span></span><button class="toast-action" type="button"></button>';
      $('button', bar).onclick = () => this.retry();
      $('#toasts').prepend(bar);
    }
    bar.className = `toast unsaved-bar ${done ? 'done' : this.stored ? 'local' : 'error'}`;
    const btn = $('button', bar);
    btn.hidden = !!done;
    if (done) {
      $('.ub-text b', bar).innerHTML = `${icon('check')}Сохранено на сервере`;
      $('.ub-text span', bar).textContent = '';
      return;
    }
    const list = [...this.items.values()];
    const what = list.length === 1 ? (list[0].name || '1 изменение') : `${list.length} ${plural(list.length, 'изменение', 'изменения', 'изменений')}`;
    $('.ub-text b', bar).textContent = this.busy ? 'Сохранение…' : this.label();
    $('.ub-text span', bar).textContent = this.busy ? '' : this.stored ? `${what} · отправим, когда будет связь` : what;
    btn.textContent = 'Повторить';
    btn.disabled = this.busy;
  },
  // Выход из аккаунта: очередь этого пользователя удаляется и с устройства
  clear(uid) {
    this.items.clear();
    clearInterval(this.timer);
    this.timer = null;
    this.doneAt = 0;
    if (uid) this.chain = this.chain.then(() => Outbox.run('readwrite', (s) => s.delete(`u${uid}`))).catch(() => {});
    this.paint();
  },
};
window.addEventListener('online', () => Unsaved.retry(true));
const quoted = (s, def) => (s && s.trim() ? `«${s.trim().length > 40 ? `${s.trim().slice(0, 40)}…` : s.trim()}»` : def);

// ---------- state ----------
const S = {
  user: null,
  pages: [],
  tasks: [],
  statuses: [],
  expanded: new Set(store.get('kb-expanded', [])),
  taskView: store.get('kb-task-view', 'list'),
  taskFilter: { due: 'all', status: [], prio: [] },
  page: null, // currently open page with content
  numbering: store.get('kb-numbering', false),
  selectMode: false, // bulk selection on the notes home
  selected: new Set(),
  trash: null, // «Недавно удалённые» заметки: { days, items }, null — ещё не загружено
  // свёрнутые блоки при каждом заходе в раздел скрыты (см. route), состояние не запоминается
  trashOpen: false,
  taskSelect: false, // режим «Выбрать» в Задачах
  taskSelected: new Set(),
  taskTrash: null, // «Недавно удалённые» задачи: { days, items }
  taskTrashOpen: false,
  doneOpen: false, // блок «Завершённые» развёрнут
  doneAll: false,
};
const saveExpanded = () => store.set('kb-expanded', [...S.expanded]);

// ---------- theme ----------
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  store.set('kb-theme-choice', t);
  try { if (t === 'system') localStorage.removeItem('kb-theme'); else localStorage.setItem('kb-theme', t); } catch { /* ignore */ }
  window.syncThemeColor?.();
}
const themeChoice = () => store.get('kb-theme-choice', 'system');

/* =========================================================
   Auth
   ========================================================= */
async function boot() {
  if (!window.crypto?.subtle) {
    return authScreen('Нужен защищённый адрес', 'Silo шифрует заметки прямо в браузере, а браузер разрешает это только на сайтах с https:// (и на localhost). Откройте Silo по адресу, который начинается с https://.', '');
  }
  try {
    const invite = location.hash.match(/^#\/invite\/([\w-]+)/)?.[1];
    const { user, needsSetup } = await api('GET', '/api/me');
    if (user?.encrypted && await Vault.load(user.id)) {
      if (invite) {
        history.replaceState(null, '', '/');
        toast('Вы уже вошли в Silo. Чтобы зарегистрироваться по приглашению, сначала выйдите из аккаунта');
      }
      S.user = user;
      return startApp();
    }
    // Вошли, но ключа шифрования на этом устройстве нет (или аккаунт ещё без шифрования) — нужен пароль
    if (user) await api('POST', '/api/logout').catch(() => {});
    if (invite) return renderInvite(invite);
    renderAuth(needsSetup);
  } catch (e) {
    $('#app').innerHTML = `<div class="auth"><div class="auth-card"><h1>Сервер недоступен</h1><p>${esc(e.message)}</p></div></div>`;
  }
}

function authScreen(title, sub, body) {
  closeOverlays();
  $('#app').innerHTML = `
    <main class="auth">
      <div class="auth-card">
        <div class="auth-brand"><div class="logo">${LOGO}</div><b class="brand-name">Silo</b></div>
        <div style="display:grid;gap:6px"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
        ${body}
      </div>
    </main>`;
  passToggle($('#app'));
}

// Глазик «Показать пароль» в полях пароля. Пока пароль скрыт, iPhone даёт только системную
// клавиатуру (защита iOS); показанный пароль — обычное поле, работает любая клавиатура
function passToggle(root) {
  const fields = $$('input[type=password]', root);
  if (!fields.length) return;
  for (const f of fields) { f.autocapitalize = 'off'; f.spellcheck = false; f.setAttribute('autocorrect', 'off'); }
  // при переключении фокус остаётся в поле, а клавиатура телефона меняется на нужную
  const setShown = (f, show, refocus) => {
    f.type = show ? 'text' : 'password';
    if (refocus) { const n = f.value.length; f.blur(); f.focus(); f.setSelectionRange(n, n); }
  };
  for (const f of fields) {
    const wrap = document.createElement('span');
    wrap.className = 'pass-wrap';
    f.replaceWith(wrap);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn pass-eye';
    const sync = () => {
      const shown = f.type === 'text';
      b.innerHTML = icon(shown ? 'eyeOff' : 'eye');
      b.title = shown ? 'Скрыть пароль' : 'Показать пароль';
      b.setAttribute('aria-label', b.title);
      b.setAttribute('aria-pressed', shown);
    };
    let had = false;
    b.addEventListener('pointerdown', () => { had = document.activeElement === f; });
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.onclick = (e) => { e.preventDefault(); setShown(f, f.type === 'password', had); sync(); };
    wrap.append(f, b);
    f.hidePass = () => { f.type = 'password'; sync(); };
    sync();
  }
}
const hidePasswords = (root) => $$('.pass-wrap .input', root).forEach((f) => f.hidePass());
const authField = (id, label, type = 'text', auto = 'off', extra = '') =>
  `<label class="field"><span>${label}</span><input class="input" id="${id}" type="${type}" autocomplete="${auto}" ${extra}></label>`;
const MIN_PASSWORD = 8;

// Общая отправка формы: кнопка выключена, пока идёт запрос; ошибка — под полями
function authSubmit(run) {
  const form = $('#auth-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    const text = btn.textContent;
    btn.disabled = true;
    $('#a-err').textContent = '';
    try { await run(btn); } catch (err) {
      $('#a-err').textContent = err.message;
      btn.disabled = false;
      btn.textContent = text;
    }
  });
}
function checkNewPassword(p1, p2) {
  if (p1.length < MIN_PASSWORD) throw new Error(`Пароль должен быть не короче ${MIN_PASSWORD} символов`);
  if (p1 !== p2) throw new Error('Пароли не совпадают');
}

function renderAuth(setup = false) {
  if (setup) return renderNewAccount({ setup: true });
  authScreen('Вход в аккаунт', 'Нет аккаунта? Попросите приглашение у администратора.', `
    <form id="auth-form" novalidate>
      ${authField('a-email', 'Email', 'email', 'username')}
      <label class="field"><span class="field-head">Пароль<button type="button" class="link-btn" id="a-forgot">Забыли пароль?</button></span>
        <input class="input" id="a-pass" type="password" autocomplete="current-password"></label>
      <p class="error-text" id="a-err"></p>
      <button class="btn primary" type="submit">Войти</button>
    </form>`);
  $('#a-email').focus();
  $('#a-forgot').onclick = () => renderForgot($('#a-email').value);
  authSubmit(async (btn) => {
    const email = $('#a-email').value.trim();
    const password = $('#a-pass').value;
    if (!email || !password) throw new Error('Введите email и пароль');
    btn.textContent = 'Вход…';
    const pre = await api('POST', '/api/prelogin', { email });
    if (pre.legacy) {
      // Аккаунт создан до шифрования: входим по паролю и сразу включаем шифрование
      const { user } = await api('POST', '/api/login', { email, password });
      await Vault.create();
      const code = Vault.newCode();
      await api('POST', '/api/me/keys', { ...await Vault.passwordKeys(password), ...await Vault.recoveryKeys(code) });
      await Vault.save(user.id);
      return renderCodeScreen(code, user.email, () => enterApp({ ...user, encrypted: true }),
        'Теперь ваши заметки и задачи шифруются — их видите только вы. Если забудете пароль, по этому коду вы сможете задать новый. Без кода и пароля восстановить заметки не сможет никто — даже администратор.');
    }
    const key = await Vault.login(password, pre.salt);
    const r = await api('POST', '/api/login', { email, auth: key.auth });
    await key.open(r.wrapped_key);
    await Vault.save(r.user.id);
    enterApp(r.user);
  });
}

function enterApp(user) {
  S.user = user;
  history.replaceState(null, '', '/');
  startApp();
}

// Регистрация по приглашению или первый запуск (аккаунт администратора)
function renderNewAccount({ setup = false, token = '', inviter = '' }) {
  const sub = setup
    ? 'Это первый запуск. Остальных вы пригласите по ссылке — пароли они придумают сами.'
    : `${inviter ? `Вас пригласил ${esc(inviter)}. ` : ''}Придумайте пароль — его будете знать только вы.`;
  authScreen(setup ? 'Создайте аккаунт администратора' : 'Добро пожаловать в Silo', sub, `
    <form id="auth-form" novalidate>
      ${authField('a-email', 'Email', 'email', 'username')}
      ${authField('a-name', 'Имя', 'text', 'name')}
      ${authField('a-pass', `Пароль (не короче ${MIN_PASSWORD} символов)`, 'password', 'new-password')}
      ${authField('a-pass2', 'Повторите пароль', 'password', 'new-password')}
      <p class="error-text" id="a-err"></p>
      <button class="btn primary" type="submit">Продолжить</button>
    </form>`);
  $('#a-email').focus();
  authSubmit(async (btn) => {
    const email = $('#a-email').value.trim();
    const name = $('#a-name').value.trim();
    const password = $('#a-pass').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Укажите корректный email');
    if (!name) throw new Error('Напишите, как вас зовут');
    checkNewPassword(password, $('#a-pass2').value);
    btn.textContent = 'Создаём аккаунт…';
    await Vault.create();
    const code = Vault.newCode();
    const keys = { ...await Vault.passwordKeys(password), ...await Vault.recoveryKeys(code) };
    const { user } = await api('POST', setup ? '/api/setup' : '/api/register', { token, email, name, ...keys });
    await Vault.save(user.id);
    renderCodeScreen(code, user.email, () => enterApp(user));
  });
}

async function renderInvite(token) {
  try {
    const { inviter } = await api('GET', `/api/invites/${encodeURIComponent(token)}`);
    renderNewAccount({ token, inviter });
  } catch (e) {
    authScreen('Приглашение не работает', esc(e.message), '<button class="btn primary" id="a-login">Ко входу</button>');
    $('#a-login').onclick = () => { history.replaceState(null, '', '/'); renderAuth(); };
  }
}

function renderForgot(email = '') {
  authScreen('Новый пароль', 'Введите email и код восстановления, который вы сохранили при регистрации.', `
    <form id="auth-form" novalidate>
      ${authField('a-email', 'Email', 'email', 'username')}
      ${authField('a-code', 'Код восстановления', 'text', 'off', 'spellcheck="false" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"')}
      ${authField('a-pass', `Новый пароль (не короче ${MIN_PASSWORD} символов)`, 'password', 'new-password')}
      ${authField('a-pass2', 'Повторите пароль', 'password', 'new-password')}
      <p class="error-text" id="a-err"></p>
      <button class="btn primary" type="submit">Сохранить и войти</button>
      <button type="button" class="link-btn center" id="a-back">Вернуться ко входу</button>
    </form>
    <p class="auth-note">Потеряли и код? Если вы где-то ещё вошли в Silo — смените пароль там, в меню. Иначе данные восстановить нельзя.</p>`);
  $('#a-email').value = email;
  (email ? $('#a-code') : $('#a-email')).focus();
  $('#a-back').onclick = () => renderAuth();
  authSubmit(async (btn) => {
    const em = $('#a-email').value.trim();
    const code = $('#a-code').value;
    const password = $('#a-pass').value;
    if (!em || !code.trim()) throw new Error('Введите email и код восстановления');
    checkNewPassword(password, $('#a-pass2').value);
    btn.textContent = 'Проверяем код…';
    const pre = await api('POST', '/api/prelogin', { email: em });
    if (pre.legacy) throw new Error('Для этого аккаунта код восстановления ещё не создан. Войдите по паролю — код появится после входа');
    const rec = await Vault.recovery(code, pre.rec_salt);
    const { rec_wrapped } = await api('POST', '/api/recover/start', { email: em, rec_auth: rec.auth });
    await rec.open(rec_wrapped);
    const next = Vault.newCode();
    const keys = { ...await Vault.passwordKeys(password), ...await Vault.recoveryKeys(next) };
    const { user } = await api('POST', '/api/recover/finish', { email: em, rec_auth: rec.auth, next: keys });
    await Vault.save(user.id);
    renderCodeScreen(next, user.email, () => enterApp(user),
      'Пароль изменён. Старый код больше не работает — сохраните новый. Без кода и пароля восстановить заметки не сможет никто — даже администратор.');
  });
}

// Блок с кодом восстановления: код, «Скопировать», «Скачать файлом»
function codeBlock(code, email) {
  return `<div class="code-block">
    <div class="codebox" id="rc-code">${esc(code)}</div>
    <div class="code-actions"><button type="button" class="btn" id="rc-copy">Скопировать</button><button type="button" class="btn" id="rc-file">Скачать файлом</button></div>
  </div>`;
}
function bindCodeBlock(root, code, email) {
  $('#rc-copy', root).onclick = async () => {
    try { await navigator.clipboard.writeText(code); toast('Код скопирован'); } catch {
      getSelection().selectAllChildren($('#rc-code', root));
      toast('Не удалось скопировать — код выделен, скопируйте его вручную');
    }
  };
  $('#rc-file', root).onclick = () => {
    const text = `Silo — код восстановления\r\n\r\nEmail: ${email}\r\nКод: ${code}\r\nСоздан: ${fullDateTime(new Date().toISOString())}\r\n\r\n`
      + 'По этому коду можно задать новый пароль, если вы его забудете. Храните код в надёжном месте и никому не показывайте.\r\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    a.download = 'Silo — код восстановления.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
}

function renderCodeScreen(code, email, done, text) {
  authScreen('Сохраните код восстановления', text
    || 'Если забудете пароль, по этому коду вы сможете задать новый. Без кода и пароля восстановить заметки не сможет никто — даже администратор.', `
    ${codeBlock(code, email)}
    <label class="ack"><input type="checkbox" id="rc-ack">Я сохранил код в надёжном месте</label>
    <button class="btn primary" id="rc-done" disabled>Готово, войти</button>`);
  bindCodeBlock($('#app'), code, email);
  $('#rc-ack').onchange = (e) => { $('#rc-done').disabled = !e.target.checked; };
  $('#rc-done').onclick = done;
}

async function startApp() {
  // правки, которые в прошлый раз не успели уйти на сервер, — отправляем до того, как показать данные
  await Unsaved.load(S.user.id);
  if (Unsaved.items.size) await Promise.race([Unsaved.retry(true), new Promise((r) => setTimeout(r, 8000))]);
  await encryptLeftovers();
  [S.pages, S.tasks, S.statuses] = await Promise.all([api('GET', '/api/pages'), api('GET', '/api/tasks'), api('GET', '/api/statuses')]);
  renderShell();
  // без адреса (открыли заново, иконка «На экран Домой») — в раздел, который был открыт последним
  if (!location.hash) location.hash = `#/${lastSection()}`;
  else route();
  fixUntitled();
  Push.register();
  Push.sync();
}
// Нажали на уведомление, а Silo уже открыт — sw.js просит открыть задачу
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (S.user && e.data?.openTask) location.hash = `#/tasks/${Number(e.data.openTask)}`;
});

// Открытый текст, который ещё лежит на сервере (старый аккаунт, приветственные заметки), — шифруем
async function encryptLeftovers() {
  try {
    const plain = await api('GET', '/api/me/plain');
    if (plain.pages.length || plain.tasks.length) await api('POST', '/api/me/encrypt', plain);
  } catch (e) { fail(e); }
}

// Заметки и задачи без названия, брошенные больше получаса назад (например, закрыли вкладку):
// название из первой строки текста, пустые удаляются. Текст зашифрован, поэтому это делает браузер.
async function fixUntitled() {
  const stale = (s) => Date.now() - toDate(s) > 30 * 60e3;
  let changed = false;
  const waiting = (kind, id) => Unsaved.items.has(`${kind}:${id}`); // правки ещё не на сервере — не трогаем
  for (const p of S.pages.filter((x) => !x.title.trim() && stale(x.updated_at) && x.id !== S.page?.id && !waiting('page', x.id))) {
    await finalizePage(p.id);
    changed = true;
  }
  for (const t of S.tasks.filter((x) => !x.title.trim() && stale(x.updated_at) && !waiting('task', x.id))) {
    if ($('.panel')) break;
    const line = firstLine(t.description);
    try {
      const r = await api('POST', `/api/tasks/${t.id}/finalize`, line ? { title: line } : { description: '' });
      if (r.deleted) S.tasks = S.tasks.filter((x) => x !== t);
      else if (r.title) t.title = r.title;
      changed = true;
    } catch { /* попробуем в следующий раз */ }
  }
  if (changed && S.user) { updateCounts(); if (S.section === 'tasks') refreshTasks(); }
}

/* =========================================================
   Shell: sidebar + main
   ========================================================= */
function renderShell() {
  const u = S.user;
  const initial = (u.name || u.email).trim()[0]?.toUpperCase() || '?';
  $('#app').innerHTML = `
    <div class="shell" id="shell">
      <aside class="sidebar" id="sidebar">
        <div class="side-head">
          <div class="logo">${LOGO}</div>
          <span class="name brand-name">Silo</span>
        </div>
        <button class="search-trigger" id="open-search">${icon('search')}<span>Поиск</span><span class="kbd">Ctrl K</span></button>
        <nav class="nav" id="nav">
          ${SECTIONS.map((s) => `<a href="#/${s.id}" data-section="${s.id}" title="${esc(s.hint)}">${icon(s.icon)}<span>${s.title}</span><span class="count" id="count-${s.id}"></span></a>`).join('')}
        </nav>
        <div class="side-section"><h2 id="fav-title">Избранные заметки</h2>${icon('star', 'filled side-star')}</div>
        <div class="tree" id="tree"></div>
        <div class="side-foot">
          <button class="user-btn" id="user-btn">
            <span class="avatar">${esc(initial)}</span>
            <span class="who"><b>${esc(u.name || u.email)}</b><small>${esc(u.email)}</small></span>
            ${icon('more')}
          </button>
        </div>
      </aside>
      <div class="scrim" id="scrim"></div>
      <main class="main" id="main"></main>
      <button class="fab" id="fab" hidden></button>
    </div>`;
  renderTree();
  updateCounts();
  $('#open-search').onclick = openSearch;
  $('#user-btn').onclick = (e) => openUserMenu(e.currentTarget);
  $('#scrim').onclick = closeNav;
  $('#fab').onclick = () => (S.section === 'tasks' ? createTask() : createPage(null));
}

// Кнопка «+» на телефоне: видна в любом месте раздела Заметки или Задачи
function updateFab() {
  const fab = $('#fab');
  if (!fab) return;
  const label = S.section === 'tasks' ? 'Новая задача' : 'Новая заметка';
  fab.innerHTML = icon('plus');
  fab.setAttribute('aria-label', label);
  fab.title = label;
  fab.hidden = (S.section === 'notes' && S.selectMode) || (S.section === 'tasks' && S.taskSelect);
}

function closeNav() { $('#shell')?.classList.remove('nav-open'); }
const topbar = (inner, cls = '') => `<div class="topbar ${cls}"><button class="icon-btn menu-toggle" data-act="nav" aria-label="Меню">${icon('menu')}</button>${inner}</div>`;

function updateCounts() {
  const open = S.tasks.filter((t) => !isDone(t)).length;
  const el = $('#count-tasks');
  if (el) el.textContent = open || '';
  const n = $('#count-notes');
  if (n) n.textContent = S.pages.length || '';
}

function setActiveNav(section) {
  S.section = section;
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.section === section));
  updateFab();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-act="nav"]')) $('#shell').classList.toggle('nav-open');
  if (e.target.closest('#nav a, .fav-row')) closeNav();
});

/* =========================================================
   Routing
   ========================================================= */
window.addEventListener('hashchange', route);
const LAST_SECTION_KEY = 'kb-last-section';
const lastSection = () => {
  const id = store.get(LAST_SECTION_KEY, 'notes');
  return SECTIONS.some((s) => s.id === id) ? id : 'notes';
};
async function route() {
  if (!S.user) return;
  const [, section, id] = location.hash.split('/');
  if (SECTIONS.some((s) => s.id === section)) store.set(LAST_SECTION_KEY, section);
  const leaving = S.page && !(section === 'notes' && Number(id) === S.page.id) ? S.page : null;
  await flushPageSave();
  if (leaving) {
    const r = await finalizePage(leaving.id);
    // заметку меняли — показываем в списке, что она сохранилась (пустая удалена — отмечать нечего)
    if (leaving.touched && r !== 'deleted') {
      const ok = r !== 'fail' && !pageSaveFailed.has(leaving.id);
      setSavedMark('page', ok ? 'ok' : 'fail');
    }
    pageSaveFailed.delete(leaving.id);
  }
  closeOverlays(true);
  if (section !== 'notes' || id) { S.selectMode = false; S.selected.clear(); }
  S.taskSelect = false;
  S.taskSelected.clear();
  S.trashOpen = S.taskTrashOpen = S.doneOpen = S.doneAll = false;
  if (section === 'tasks') {
    // #/tasks/ID — ссылка из уведомления: открываем задачу, адрес возвращаем к разделу
    if (id) {
      S.openTaskAfterRoute = Number(id);
      history.replaceState(null, '', '#/tasks');
    }
    renderTasks();
    // задачу из поиска открываем, когда раздел уже на экране (уход с заметки может занять время)
    const open = S.openTaskAfterRoute;
    S.openTaskAfterRoute = null;
    if (open) openTaskPanel(open);
    return;
  }
  S.openTaskAfterRoute = null;
  if (section === 'notes' && id) return openPage(Number(id));
  return renderNotesHome();
}

/* =========================================================
   Page tree
   ========================================================= */
const childrenOf = (pid) => S.pages.filter((p) => p.parent_id === pid).sort((a, b) => a.position - b.position || a.id - b.id);
const pageById = (id) => S.pages.find((p) => p.id === id);
function ancestors(id) {
  const out = [];
  for (let p = pageById(id); p && p.parent_id; p = pageById(p.parent_id)) out.unshift(pageById(p.parent_id));
  return out.filter(Boolean);
}
function descendants(id) {
  const out = [];
  const walk = (pid) => childrenOf(pid).forEach((c) => { out.push(c.id); walk(c.id); });
  walk(id);
  return out;
}
const titleOf = (p) => p?.title?.trim() || 'Без названия';

// Outline numbers like in a book's table of contents: 1, 1.1, 1.2, 2…
function pageNumbers() {
  const map = new Map();
  const walk = (pid, prefix) => childrenOf(pid).forEach((p, i) => {
    const n = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
    map.set(p.id, n);
    walk(p.id, n);
  });
  walk(null, '');
  return map;
}
const noteIcon = (id, cls = '') => (childrenOf(id).length ? icon('notes', `note-ic has-kids ${cls}`) : icon('note', `note-ic ${cls}`));
const numOrIcon = (nums, id, cls) => (S.numbering ? `<span class="${cls}">${nums.get(id)}</span>` : noteIcon(id, cls === 'tree-num' ? 'doc' : ''));

// Sidebar "Избранное": favourite notes in the Notes section, favourite tasks in the Tasks section
function renderTree() {
  const box = $('#tree');
  if (!box) return;
  const tasksMode = S.section === 'tasks';
  $('#fav-title').textContent = tasksMode ? 'Избранные задачи' : 'Избранные заметки';
  const byAdded = (a, b) => toDate(a.favorite_at) - toDate(b.favorite_at);
  const unfav = `<button class="icon-btn fav-remove" data-unfav title="Убрать из избранного" aria-label="Убрать из избранного">${icon('x')}</button>`;
  if (tasksMode) {
    const favs = S.tasks.filter((t) => t.favorite_at).sort(byAdded);
    box.innerHTML = favs.map((t) => `
      <div class="fav-row ${isDone(t) ? 'done' : ''}" data-fav-task="${t.id}" role="button" tabindex="0">
        <span class="fav-dot" style="background:${statusColor(t.status)}" title="${esc(statusOf(t.status).name)}"></span>
        <span class="fav-title">${esc(taskTitle(t))}</span>${unfav}
      </div>`).join('')
      || `<div class="tree-empty">Откройте задачу и нажмите ${icon('star', 'inline-star')} — она появится здесь.</div>`;
  } else {
    const nums = pageNumbers();
    const favs = S.pages.filter((p) => p.favorite_at).sort(byAdded);
    box.innerHTML = favs.map((p) => `
      <a class="fav-row ${p.id === S.page?.id ? 'active' : ''}" href="#/notes/${p.id}" data-fav-page="${p.id}">
        ${numOrIcon(nums, p.id, 'tree-num')}
        <span class="fav-title ${p.title.trim() ? '' : 'untitled'}">${esc(titleOf(p))}</span>${unfav}
      </a>`).join('')
      || `<div class="tree-empty">Откройте заметку и нажмите ${icon('star', 'inline-star')} вверху — она появится здесь.</div>`;
  }
}

$('#app').addEventListener('click', (e) => {
  const row = e.target.closest('.fav-row');
  if (!row) return;
  if (e.target.closest('[data-unfav]')) {
    e.preventDefault();
    if (row.dataset.favPage) setPageFavorite(pageById(Number(row.dataset.favPage)), false);
    else setTaskFavorite(S.tasks.find((t) => t.id === Number(row.dataset.favTask)), false);
    return;
  }
  if (row.dataset.favTask) openTaskPanel(Number(row.dataset.favTask));
});
$('#app').addEventListener('keydown', (e) => {
  const row = e.target.closest?.('.fav-row[data-fav-task]');
  if (row && e.key === 'Enter') openTaskPanel(Number(row.dataset.favTask));
});

async function setPageFavorite(p, on) {
  if (!p) return;
  try {
    const { favorite_at } = await api('POST', `/api/pages/${p.id}/favorite`, { favorite: on });
    p.favorite_at = favorite_at;
    if (S.page?.id === p.id) { S.page.favorite_at = favorite_at; updatePageFavButton(); }
    renderTree();
    if (!S.page && S.section === 'notes') renderNotesHome();
    toast(on ? 'Добавлено в избранное' : 'Убрано из избранного');
  } catch (err) { fail(err); }
}

async function setTaskFavorite(t, on) {
  if (!t) return;
  try {
    const { favorite_at } = await api('POST', `/api/tasks/${t.id}/favorite`, { favorite: on });
    t.favorite_at = favorite_at;
    renderTree();
    renderTasksBody();
    const btn = $('#tp-fav');
    if (btn && Number(btn.dataset.id) === t.id) setStarButton(btn, !!favorite_at);
    toast(on ? 'Добавлено в избранное' : 'Убрано из избранного');
  } catch (err) { fail(err); }
}

function setStarButton(btn, on) {
  btn.classList.toggle('on', on);
  btn.innerHTML = icon('star', on ? 'filled' : '');
  btn.title = on ? 'Убрать из избранного' : 'Добавить в избранное';
  btn.setAttribute('aria-label', btn.title);
  btn.setAttribute('aria-pressed', String(on));
}
function updatePageFavButton() {
  const btn = $('#page-fav');
  if (btn && S.page) setStarButton(btn, !!S.page.favorite_at);
}

$('#app').addEventListener('click', (e) => {
  const row = e.target.closest('.tree-row');
  if (!row) return;
  const id = Number(row.dataset.id);
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'toggle') {
    e.preventDefault();
    S.expanded.has(id) ? S.expanded.delete(id) : S.expanded.add(id);
    saveExpanded();
    renderTree();
  } else if (act === 'add') {
    e.preventDefault();
    createPage(id);
  } else if (act === 'more') {
    e.preventDefault();
    openPageMenu(e.target.closest('[data-act]'), id);
  } else if (!e.target.closest('a')) {
    location.hash = `#/notes/${id}`;
    closeNav();
  }
});

async function createPage(parentId) {
  try {
    const page = await api('POST', '/api/pages', { parent_id: parentId, title: '' });
    S.pages.push({ id: page.id, parent_id: page.parent_id, title: '', position: page.position, updated_at: page.updated_at });
    if (parentId) { S.expanded.add(parentId); saveExpanded(); }
    updateCounts();
    location.hash = `#/notes/${page.id}`;
    closeNav();
  } catch (e) { fail(e); }
}

function openPageMenu(anchor, id) {
  const p = pageById(id);
  showMenu(anchor, `
    <button data-m="add">${icon('plus')}Добавить подзаметку</button>
    <button data-m="move">${icon('move')}Переместить…</button>
    <hr>
    <button data-m="delete" class="danger">${icon('trash')}Удалить</button>`, (m) => {
    if (m === 'add') createPage(id);
    if (m === 'move') openMoveDialog(id);
    if (m === 'delete') deletePage(p);
  });
}

// Удаление не спрашивает подтверждения: заметка уходит в «Недавно удалённые», её можно вернуть
async function deletePage(p) {
  try {
    const removed = new Set([p.id, ...descendants(p.id)]);
    const { trashed } = await api('DELETE', `/api/pages/${p.id}`);
    S.pages = S.pages.filter((x) => !removed.has(x.id));
    S.trash = null;
    updateCounts();
    toast(removed.size > 1 ? `Заметка и подзаметки (${removed.size - 1}) удалены` : 'Заметка удалена', '',
      { label: 'Отменить', fn: () => restorePages(trashed, { undo: true }) });
    if (S.page && removed.has(S.page.id)) {
      S.page = null;
      pageSave.cancel();
      location.hash = p.parent_id ? `#/notes/${p.parent_id}` : '#/notes';
    } else {
      renderTree();
      if (!S.page) renderNotesHome();
    }
  } catch (e) { fail(e); }
}

async function movePage(id, parentId, index) {
  try {
    await api('POST', `/api/pages/${id}/move`, { parent_id: parentId, index });
    S.pages = await api('GET', '/api/pages');
    if (parentId) { S.expanded.add(parentId); saveExpanded(); }
    renderTree();
    if (S.page) { renderCrumbs(); renderSubpages(); }
    else if (location.hash.startsWith('#/notes')) renderNotesHome();
  } catch (e) { fail(e); }
}

function openMoveDialog(id) {
  const banned = new Set([id, ...descendants(id)]);
  const opts = ['<option value="">Верхний уровень</option>'];
  const walk = (pid, depth) => childrenOf(pid).forEach((p) => {
    if (banned.has(p.id)) return;
    opts.push(`<option value="${p.id}">${'   '.repeat(depth)}${esc(titleOf(p))}</option>`);
    walk(p.id, depth + 1);
  });
  walk(null, 0);
  const cur = pageById(id);
  const m = openModal(`
    <h2>Переместить заметку</h2>
    <p>Куда положить «${esc(titleOf(cur))}»? Заметка окажется в конце списка подзаметок.</p>
    <form id="move-form">
      <label class="field"><span>Внутрь заметки</span><select class="input" id="move-target">${opts.join('')}</select></label>
      <div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button class="btn primary">Переместить</button></div>
    </form>`);
  $('#move-target', m).value = cur.parent_id ?? '';
  $('#move-form', m).onsubmit = (e) => {
    e.preventDefault();
    const v = $('#move-target', m).value;
    const pid = v ? Number(v) : null;
    closeModal(m);
    movePage(id, pid, childrenOf(pid).filter((c) => c.id !== id).length);
  };
}

const setupTreeDnD = () => enablePageDnD($('#tree'), '.tree-row', { axis: 'y', dropOnEmptyToRoot: true });

// Drag pages to reorder or nest them. Edges of an item = put before/after, middle = put inside.
// axis 'x' is for cards laid out in a row (notes home), 'y' for vertical lists (tree, contents).
function enablePageDnD(container, itemSel, { axis = 'y', dropOnEmptyToRoot = false } = {}) {
  let dragId = null;
  const clear = () => $$(itemSel, container).forEach((r) => r.classList.remove('drop-before', 'drop-after', 'drop-inside'));
  const zone = (el, e) => {
    const r = el.getBoundingClientRect();
    const f = axis === 'x' ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
    return f < 0.28 ? 'before' : f > 0.72 ? 'after' : 'inside';
  };
  const invalid = (id) => id === dragId || descendants(dragId).includes(id);
  container.addEventListener('dragstart', (e) => {
    const el = e.target.closest(itemSel);
    if (!el) return;
    dragId = Number(el.dataset.id);
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragId));
  });
  container.addEventListener('dragend', () => {
    dragId = null;
    clear();
    $$('.dragging', container).forEach((r) => r.classList.remove('dragging'));
  });
  container.addEventListener('dragover', (e) => {
    if (!dragId) return;
    const el = e.target.closest(itemSel);
    if (!el && !dropOnEmptyToRoot) return;
    e.preventDefault();
    clear();
    if (!el) return;
    if (invalid(Number(el.dataset.id))) { e.dataTransfer.dropEffect = 'none'; return; }
    el.classList.add(`drop-${zone(el, e)}`);
  });
  container.addEventListener('drop', (e) => {
    if (!dragId) return;
    const el = e.target.closest(itemSel);
    if (!el && !dropOnEmptyToRoot) return;
    e.preventDefault();
    const moving = dragId;
    clear();
    if (!el) return movePage(moving, null, childrenOf(null).filter((c) => c.id !== moving).length);
    const target = pageById(Number(el.dataset.id));
    if (!target || invalid(target.id)) return;
    const z = zone(el, e);
    if (z === 'inside') return movePage(moving, target.id, childrenOf(target.id).filter((c) => c.id !== moving).length);
    const sibs = childrenOf(target.parent_id).filter((c) => c.id !== moving);
    const idx = sibs.findIndex((c) => c.id === target.id) + (z === 'after' ? 1 : 0);
    movePage(moving, target.parent_id, idx);
  });
}

/* =========================================================
   Notes: section home
   ========================================================= */
// Sub-pages on the notes home are hidden until the user opens a section
const homeExpanded = new Set(store.get('kb-home-expanded', []));
const saveHomeExpanded = () => store.set('kb-home-expanded', [...homeExpanded]);

function renderNotesHome() {
  S.page = null;
  setActiveNav('notes');
  renderTree();
  const nums = pageNumbers();
  const recent = [...S.pages].sort((a, b) => toDate(b.updated_at) - toDate(a.updated_at)).slice(0, 4);
  const rows = [];
  const anyOpen = S.pages.some((p) => homeExpanded.has(p.id) && childrenOf(p.id).length);
  const sel = S.selectMode ? selectionInfo() : null;
  const walk = (pid, depth) => childrenOf(pid).forEach((p) => {
    const kids = childrenOf(p.id).length;
    const closed = !homeExpanded.has(p.id);
    const inside = kids ? descendants(p.id).length : 0;
    const state = !sel ? '' : S.selected.has(p.id) ? 'on' : sel.all.has(p.id) ? 'on implied' : '';
    rows.push(`<li><a class="outline-row depth-${Math.min(depth, 3)} ${state ? 'selected' : ''}" href="#/notes/${p.id}" ${S.selectMode ? '' : 'draggable="true"'} data-id="${p.id}" style="padding-left:${12 + depth * 26}px;--depth:${depth}">
      ${S.selectMode ? `<span class="sel-box ${state}" role="checkbox" aria-checked="${!!state}" aria-label="Выбрать"></span>` : ''}
      ${kids ? `<button class="twisty ${closed ? '' : 'open'}" data-home="toggle" aria-label="${closed ? 'Развернуть' : 'Свернуть'}">${icon('chevron')}</button>` : '<span class="twisty"></span>'}
      ${numOrIcon(nums, p.id, 'toc-num')}
      <span class="toc-title ${p.title.trim() ? '' : 'untitled'}"><span class="tt">${esc(titleOf(p))}</span>${p.favorite_at ? icon('star', 'filled mini-star') : ''}${inside ? `<span class="kids-n" title="${inside} ${plural(inside, 'подзаметка', 'подзаметки', 'подзаметок')} внутри">${inside}</span>` : ''}</span>
      <span class="toc-meta">${ago(p.updated_at)}</span>
      <button class="icon-btn row-add" data-home="add" title="Добавить подзаметку" aria-label="Добавить подзаметку">${icon('plus')}</button>
    </a></li>`);
    if (kids && !closed) walk(p.id, depth + 1);
  });
  walk(null, 0);
  const path = (p) => ancestors(p.id).map(titleOf).join(' / ');
  const total = S.pages.length;
  $('#main').innerHTML = `
    ${topbar('', 'bare')}
    <div class="notes-home">
      <div class="tasks-head home-head">
        <div class="home-title">
          <div class="title-row">
            <h1>Заметки</h1>
            <button class="icon-btn head-gear" id="notes-settings" title="Настройки заметок" aria-label="Настройки заметок">${icon('gear')}</button>
          </div>
          ${total ? `<p class="home-sub">${total} ${plural(total, 'заметка', 'заметки', 'заметок')}</p>` : ''}
        </div>
        <button class="btn primary" id="home-new">${icon('plus')}Новая заметка</button>
      </div>
      ${total ? `
      <section class="recent">
        <div class="toc-head"><h3>Недавно изменённые</h3></div>
        <div class="recent-cards">${recent.map((p) => `<a class="recent-card" href="#/notes/${p.id}">
          <span class="rc-top">${noteIcon(p.id)}<span class="rc-time">${ago(p.updated_at)}</span></span>
          <span class="rc-title ${p.title.trim() ? '' : 'untitled'}">${esc(titleOf(p))}</span>
          <span class="rc-path">${path(p) ? esc(path(p)) : 'Верхний уровень'}</span>
        </a>`).join('')}</div>
      </section>
      <section class="all-notes">
      <div class="toc-head">
        <h3>Все заметки</h3>
        <span class="outline-tools">
          ${S.pages.some((p) => p.parent_id) ? `<button class="btn ghost" id="toggle-all">${anyOpen ? 'Свернуть всё' : 'Развернуть всё'}</button>` : ''}
          <button class="btn ghost ${S.selectMode ? 'on' : ''}" id="select-mode">${S.selectMode ? 'Готово' : 'Выбрать'}</button>
        </span>
      </div>
      <ol class="toc outline ${S.selectMode ? 'selecting' : ''} ${S.numbering ? 'numbered' : ''}" id="outline">${rows.join('')}</ol>
      ${S.selectMode ? `
      <div class="bulk-bar" role="region" aria-label="Выбранные заметки">
        <span class="bulk-count">${sel.total
          ? `Выбрано: <b>${sel.total}</b>${sel.total > S.selected.size ? ` <span class="muted">(с подзаметками)</span>` : ''}`
          : 'Отметьте заметки, которые нужно удалить'}</span>
        <button class="btn ghost" id="sel-all">${sel.total === S.pages.length ? 'Снять выделение' : 'Выбрать все'}</button>
        <button class="btn danger solid" id="sel-delete" ${sel.total ? '' : 'disabled'}>${icon('trash')}Удалить</button>
      </div>` : ''}
      </section>` : `
      <div class="empty">
        <h2>Здесь будут ваши заметки</h2>
        <p>Создайте первую заметку. Внутрь любой заметки можно добавлять подзаметки — так получится структура базы.</p>
      </div>`}
      ${trashSection()}
    </div>`;
  $('#home-new').onclick = () => createPage(null);
  $('#notes-settings').onclick = () => openNotesSettings();
  updateFab();
  paintSavedMark();
  bindTrash();
  if (S.trash === null) loadTrash();
  const outline = $('#outline');
  if (!outline) return;
  if (!S.selectMode) enablePageDnD(outline, '.outline-row', { axis: 'y' });
  outline.addEventListener('click', (e) => {
    const row = e.target.closest('.outline-row');
    if (!row) return;
    const id = Number(row.dataset.id);
    const b = e.target.closest('[data-home]');
    if (b?.dataset.home === 'toggle') {
      e.preventDefault();
      homeExpanded.has(id) ? homeExpanded.delete(id) : homeExpanded.add(id);
      saveHomeExpanded();
      return renderNotesHome();
    }
    if (S.selectMode) {
      e.preventDefault();
      if (!S.selected.has(id) && ancestors(id).some((a) => S.selected.has(a.id))) {
        return toast('Эта заметка уже выбрана вместе с родительской');
      }
      S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id);
      return renderNotesHome();
    }
    if (b?.dataset.home === 'add') { e.preventDefault(); createPage(id); }
  });
  $('#select-mode').onclick = () => {
    S.selectMode = !S.selectMode;
    S.selected.clear();
    renderNotesHome();
  };
  if (S.selectMode) {
    $('#sel-all').onclick = () => {
      const allSelected = selectionInfo().total === S.pages.length;
      S.selected = new Set(allSelected ? [] : childrenOf(null).map((p) => p.id));
      renderNotesHome();
    };
    $('#sel-delete').onclick = bulkDelete;
  }
  if ($('#toggle-all')) $('#toggle-all').onclick = () => {
    if (anyOpen) homeExpanded.clear();
    else S.pages.forEach((p) => { if (childrenOf(p.id).length) homeExpanded.add(p.id); });
    saveHomeExpanded();
    renderNotesHome();
  };
}
// Selected notes plus everything nested in them; "roots" are the ones to send DELETE for
function selectionInfo() {
  const roots = [...S.selected].filter((id) => pageById(id) && !ancestors(id).some((a) => S.selected.has(a.id)));
  const all = new Set();
  roots.forEach((id) => { all.add(id); descendants(id).forEach((d) => all.add(d)); });
  return { roots, all, total: all.size };
}

async function bulkDelete() {
  const { roots, all, total } = selectionInfo();
  if (!total) return;
  const sub = total > roots.length ? ' вместе с подзаметками' : '';
  const ok = await confirmBulkDelete(total, {
    title: `Удалить ${total} ${plural(total, 'заметку', 'заметки', 'заметок')}?`,
    text: `Выбранные заметки${sub} попадут в «Недавно удалённые» — их можно будет восстановить в течение 30 дней.`,
  });
  if (!ok) return;
  try {
    const { trashed } = await api('POST', '/api/pages/delete', { ids: roots });
    S.pages = S.pages.filter((p) => !all.has(p.id));
    S.trash = null;
    toast(`Удалено: ${total} ${plural(total, 'заметка', 'заметки', 'заметок')}`, '',
      { label: 'Отменить', fn: () => restorePages(trashed, { undo: true }) });
  } catch (err) {
    S.pages = await api('GET', '/api/pages').catch(() => S.pages);
    fail(err);
  }
  S.selectMode = false;
  S.selected.clear();
  updateCounts();
  renderNotesHome();
}

/* =========================================================
   Notes: «Недавно удалённые» (корзина только для заметок)
   ========================================================= */
const onNotesHome = () => !S.page && (location.hash === '#/notes' || location.hash === '' || location.hash === '#/');

async function loadTrash() {
  try { S.trash = await api('GET', '/api/trash/pages'); } catch (e) { S.trash = { days: 30, items: [] }; fail(e); }
  if (onNotesHome()) renderNotesHome();
}

// Сколько дней осталось до окончательного удаления
function trashDaysLeft(item, days) {
  return Math.ceil((toDate(item.deleted_at).getTime() + days * 864e5 - Date.now()) / 864e5);
}

function trashSection() {
  const t = S.trash;
  const n = t ? t.items.length : 0;
  const head = `
    <div class="toc-head">
      <h3><button class="trash-toggle ${S.trashOpen ? 'open' : ''}" id="trash-toggle" aria-expanded="${S.trashOpen}">
        ${icon('chevron')}<span>Недавно удалённые</span>${n ? `<span class="trash-n">${n}</span>` : ''}</button></h3>
      ${S.trashOpen && n ? '<button class="btn ghost" id="trash-clear">Очистить</button>' : ''}
    </div>`;
  if (!S.trashOpen) return `<section class="trash">${head}</section>`;
  if (!t) return `<section class="trash">${head}<p class="toc-empty">Загрузка…</p></section>`;
  if (!n) return `<section class="trash">${head}<p class="toc-empty">Здесь пусто. Удалённые заметки хранятся ${t.days} дней, потом удаляются навсегда.</p></section>`;
  const rows = t.items.map((it) => {
    const left = trashDaysLeft(it, t.days);
    const where = it.parent_title !== null && it.parent_title !== undefined
      ? `была в «${esc(it.parent_title.trim() || 'Без названия')}»` : '';
    const sub = it.sub_count ? `+ ${it.sub_count} ${plural(it.sub_count, 'подзаметка', 'подзаметки', 'подзаметок')}` : '';
    return `<li class="trash-row" data-id="${it.id}">
      ${icon(it.sub_count ? 'notes' : 'note')}
      <span class="trash-main">
        <span class="toc-title">${esc(it.title.trim() || 'Без названия')}</span>
        ${sub || where ? `<span class="trash-sub">${[sub, where].filter(Boolean).join(' · ')}</span>` : ''}
      </span>
      <span class="trash-meta ${left <= 3 ? 'soon' : ''}">удалена ${ago(it.deleted_at)} · ${left <= 1 ? 'удалится сегодня' : `осталось ${left} дн.`}</span>
      <button class="btn ghost" data-trash="restore">Восстановить</button>
      <button class="icon-btn" data-trash="purge" title="Удалить навсегда" aria-label="Удалить навсегда">${icon('trash')}</button>
    </li>`;
  }).join('');
  return `<section class="trash">${head}
    <p class="hint">Удалённые заметки хранятся ${t.days} дней, потом удаляются навсегда.</p>
    <ol class="toc trash-list">${rows}</ol></section>`;
}

function bindTrash() {
  $('#trash-toggle').onclick = () => {
    S.trashOpen = !S.trashOpen;
    renderNotesHome();
  };
  $('#trash-clear')?.addEventListener('click', async () => {
    const n = S.trash.items.length;
    const ok = await confirmDialog({
      title: 'Очистить «Недавно удалённые»?',
      text: `${n} ${plural(n, 'запись будет удалена', 'записи будут удалены', 'записей будут удалены')} навсегда вместе с подзаметками. Вернуть их будет нельзя.`,
      okText: 'Удалить навсегда',
      danger: true,
    });
    if (!ok) return;
    try { await api('DELETE', '/api/trash/pages'); toast('Корзина очищена'); } catch (e) { fail(e); }
    loadTrash();
  });
  $('.trash-list')?.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-trash]');
    if (!b) return;
    const id = Number(b.closest('.trash-row').dataset.id);
    const it = S.trash.items.find((x) => x.id === id);
    if (b.dataset.trash === 'restore') return restorePages([id]);
    const ok = await confirmDialog({
      title: `Удалить «${it.title.trim() || 'Без названия'}» навсегда?`,
      text: it.sub_count ? `Вместе с подзаметками (${it.sub_count}). Вернуть будет нельзя.` : 'Вернуть заметку будет нельзя.',
      okText: 'Удалить навсегда',
      danger: true,
    });
    if (!ok) return;
    try { await api('DELETE', `/api/trash/pages/${id}`); toast('Удалено навсегда'); } catch (err) { fail(err); }
    loadTrash();
  });
}

async function restorePages(ids, { undo = false } = {}) {
  try {
    const { restored } = await api('POST', '/api/trash/pages/restore', { ids });
    S.pages = await api('GET', '/api/pages');
    S.trash = null;
    updateCounts();
    if (undo) toast('Удаление отменено');
    else if (restored.length === 1) {
      const r = restored[0];
      const title = titleOf(pageById(r.id));
      toast(!r.moved ? `«${title}» восстановлена`
        : r.parent_id ? `«${title}» восстановлена в «${titleOf(pageById(r.parent_id))}»`
          : `«${title}» восстановлена на верхний уровень`);
    }
    if (S.page) { renderTree(); renderSubpages(); } else if (onNotesHome()) renderNotesHome(); else renderTree();
  } catch (e) { fail(e); }
}

const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

/* =========================================================
   Notes: page editor
   ========================================================= */
let pendingSave = null;
const pageSaveFailed = new Set(); // заметки, у которых сохранение не прошло (для отметки в списке)
const pageSave = debounce(() => flushPageSave(), 700);

async function flushPageSave() {
  pageSave.cancel();
  if (!pendingSave) return;
  const { id, data } = pendingSave;
  pendingSave = null;
  setSaveState('Сохранение…');
  try {
    const r = await api('PATCH', `/api/pages/${id}`, data);
    const p = pageById(id);
    if (p) { p.updated_at = r.updated_at; }
    if (S.page?.id === id) { const meta = $('#page-changed'); if (meta) meta.textContent = `Изменено ${ago(r.updated_at)}`; }
    Unsaved.saved(`page:${id}`, data);
    setSaveState(Unsaved.items.has(`page:${id}`) ? Unsaved.label() : 'Сохранено');
  } catch (e) {
    if (e.status === 404 || e.status === 401) { setSaveState(''); if (e.status === 404) fail(e); return; }
    pageSaveFailed.add(id);
    // правки не теряем: они сохраняются на устройстве и уйдут на сервер, когда будет связь
    Unsaved.add(`page:${id}`, `/api/pages/${id}`, data, `заметка ${quoted(pageById(id)?.title, 'без названия')}`);
    setSaveState(Unsaved.label());
  }
}
function queuePageSave(data) {
  if (!S.page) return;
  S.page.touched = true;
  pendingSave = { id: S.page.id, data: { ...(pendingSave?.id === S.page.id ? pendingSave.data : {}), ...data } };
  if (data.content !== undefined) S.page.content = data.content;
  presealPage();
  setSaveState('Изменено');
  pageSave();
}
// Готовим шифр для запроса при закрытии вкладки (см. preseal)
function presealPage() {
  if (!S.page) return;
  const d = pendingSave?.id === S.page.id ? pendingSave.data : {};
  const untitled = !pageById(S.page.id)?.title.trim();
  preseal(d.title, d.content, untitled ? firstLine(S.page.content || '') : '');
}
// На узком телефоне в шапке мало места: «Сохранено на устройстве» → «На устройстве»
const shortSave = (t) => (t === 'Сохранено на устройстве' && matchMedia('(max-width: 600px)').matches ? 'На устройстве' : t);
function setSaveState(t) {
  const el = $('#save-state');
  if (!el) return;
  el.textContent = shortSave(t);
  el.classList.toggle('unsaved', t === 'Не сохранено');
  el.classList.toggle('local', t === 'Сохранено на устройстве');
}

// Заметка без названия не сохраняется: при уходе с неё название берётся из первой строки текста,
// а совсем пустая удаляется. Текст зашифрован, поэтому первую строку находит браузер.
const finalizeBody = (html) => { const line = firstLine(html || ''); return line ? { title: line } : { content: '' }; };
async function finalizePage(id) {
  const p = pageById(id);
  if (!p || p.title.trim()) return '';
  try {
    const content = S.page?.id === id ? S.page.content : (await api('GET', `/api/pages/${id}`)).content;
    const r = await api('POST', `/api/pages/${id}/finalize`, finalizeBody(content));
    if (r.deleted) {
      S.pages = S.pages.filter((x) => x.id !== id);
      S.expanded.delete(id);
      updateCounts();
    } else if (r.title) p.title = r.title;
    renderTree();
    return r.deleted ? 'deleted' : '';
  } catch { return 'fail'; /* не мешаем уйти со страницы */ }
}

window.addEventListener('beforeunload', () => {
  $('.panel')?.unloadFn?.();
  const data = pendingSave?.data || {};
  // заметка без названия — один запрос, который и сохраняет, и даёт название (или удаляет пустую)
  if (S.page && !pageById(S.page.id)?.title.trim()) sendNow('POST', `/api/pages/${S.page.id}/finalize`, { ...data, ...finalizeBody(S.page.content) });
  else if (pendingSave) sendNow('PATCH', `/api/pages/${pendingSave.id}`, data);
});
// Есть неотправленное — последняя попытка отправить. Предупреждение браузера «Покинуть сайт?» — только если
// правки могут пропасть: на устройство записать не удаётся или последние буквы ещё не попали в очередь без связи
window.addEventListener('beforeunload', (e) => {
  Unsaved.items.forEach((it) => sendNow('PATCH', it.url, it.data));
  const offline = !navigator.onLine || Unsaved.items.size;
  if ((Unsaved.items.size && !Unsaved.stored) || (offline && (pendingSave || $('.panel')?.dirtyFn?.()))) {
    flushPageSave();
    $('.panel')?.flushFn?.();
    e.preventDefault();
    e.returnValue = '';
  }
});
// Телефон: свернули Silo или переключились на другое приложение — сразу сохраняем напечатанное
// (без связи оно попадёт в очередь на устройстве, а не останется только в памяти вкладки)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' || !S.user) return;
  flushPageSave();
  $('.panel')?.flushFn?.();
});
function sendNow(method, url, body) {
  const sealed = Vault.ready() ? sealNow(body) : body;
  if (!sealed) return; // шифр ещё не готов — недописанное название подхватится при следующем входе
  fetch(url, {
    method, keepalive: true, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'kb' },
    body: JSON.stringify(sealed),
  });
}

async function openPage(id) {
  setActiveNav('notes');
  let page;
  try { page = await api('GET', `/api/pages/${id}`); } catch (e) {
    fail(e);
    location.hash = '#/notes';
    return;
  }
  S.page = page;
  ancestors(id).forEach((a) => S.expanded.add(a.id));
  saveExpanded();
  renderTree();
  $('#main').innerHTML = `
    ${topbar('<nav class="crumbs" id="crumbs"></nav><span class="save-state" id="save-state"></span><button class="icon-btn fav-btn" id="page-fav"></button><button class="icon-btn" id="page-more" aria-label="Действия с заметкой">' + icon('more') + '</button><button class="done-btn" id="page-done" title="Закрыть заметку">Готово</button>')}
    <article class="page">
      <textarea class="page-title" id="page-title" rows="1" placeholder="Без названия" maxlength="300">${esc(page.title)}</textarea>
      <div class="page-meta"><span id="page-num"></span><span id="page-changed">Изменено ${ago(page.updated_at)}</span></div>
      <div id="toolbar-slot"></div>
      <div class="editor" id="editor" contenteditable="true" data-placeholder="Начните писать…">${page.content}</div>
      <section class="subpages" id="subpages"></section>
    </article>`;
  renderCrumbs();
  renderSubpages();
  const title = $('#page-title');
  const grow = () => { title.style.height = 'auto'; title.style.height = title.scrollHeight + 'px'; };
  grow();
  title.addEventListener('input', () => {
    grow();
    const p = pageById(id);
    if (p) p.title = title.value;
    queuePageSave({ title: title.value });
    preseal(title.value);
    renderTree();
    renderCrumbs();
  });
  title.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); placeCaretStart($('#editor')); }
  });
  const editor = $('#editor');
  $('#toolbar-slot').replaceWith(makeEditor(editor, () => queuePageSave({ content: serializeEditor(editor) })));
  $('#page-more').onclick = (e) => openPageMenu(e.currentTarget, id);
  // «Готово» — на уровень выше: к родительской заметке или к списку заметок
  $('#page-done').onclick = () => {
    const parent = (pageById(id) || S.page).parent_id;
    location.hash = parent && pageById(parent) ? `#/notes/${parent}` : '#/notes';
  };
  updatePageFavButton();
  $('#page-fav').onclick = () => setPageFavorite(pageById(id) || S.page, !S.page.favorite_at);
  presealPage();
  if (!page.title && !page.content) title.focus();
}

// «Крошки»: если путь не помещается, средние уровни прячутся в «…» (по клику — список скрытых).
// Скрываем по порядку: сначала самые старшие предки, потом родителя, потом «Заметки». Текущая заметка видна всегда.
let crumbsRO = null;
function renderCrumbs() {
  const el = $('#crumbs');
  if (!el || !S.page) return;
  const num = $('#page-num');
  if (num) num.textContent = S.numbering ? `Заметка ${pageNumbers().get(S.page.id)} · ` : '';
  const items = [{ href: '#/notes', title: 'Заметки', root: true },
    ...[...ancestors(S.page.id), pageById(S.page.id)].filter(Boolean).map((p) => ({ href: `#/notes/${p.id}`, title: titleOf(p), id: p.id }))];
  const last = items.length - 1;
  const order = [];
  for (let i = 1; i < last - 1; i++) order.push(i);
  if (last >= 2) order.push(last - 1);
  if (last >= 1) order.push(0);
  const link = (it, i) => `<a href="${it.href}" title="${esc(it.title)}"${i === last ? ' class="cur" aria-current="page"' : ''}>${esc(it.title)}</a>`;
  const draw = (hidden) => {
    const parts = [];
    let more = false;
    items.forEach((it, i) => {
      if (hidden.has(i)) {
        if (!more) parts.push('<button class="crumb-more" type="button" aria-label="Показать весь путь" title="Показать весь путь">…</button>');
        more = true;
      } else { parts.push(link(it, i)); more = false; }
    });
    el.innerHTML = parts.join('<span class="sep">/</span>');
  };
  const hidden = new Set();
  el.classList.add('measure');
  draw(hidden);
  for (const i of order) {
    if (el.scrollWidth <= el.clientWidth + 1) break;
    hidden.add(i);
    draw(hidden);
  }
  el.classList.remove('measure');
  const btn = $('.crumb-more', el);
  if (btn) btn.onclick = () => showMenu(btn, items.filter((_, i) => hidden.has(i)).map((it) =>
    `<button data-m="${esc(it.href)}">${it.root ? icon('book') : noteIcon(it.id)}<span class="crumb-item">${esc(it.title)}</span></button>`).join(''),
    (href) => { location.hash = href.slice(1); });
  if (!crumbsRO) {
    let w = 0, raf = 0;
    crumbsRO = new ResizeObserver(([e]) => {
      const nw = Math.round(e.contentRect.width);
      if (nw === w) return;
      w = nw;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(renderCrumbs);
    });
  }
  if (crumbsRO.el !== el) { crumbsRO.disconnect(); crumbsRO.observe(el); crumbsRO.el = el; }
}

function renderSubpages() {
  const el = $('#subpages');
  if (!el || !S.page) return;
  const nums = pageNumbers();
  const rows = [];
  const walk = (pid, depth) => childrenOf(pid).forEach((k) => {
    rows.push({ k, depth });
    if (depth < 1) walk(k.id, depth + 1);
  });
  walk(S.page.id, 0);
  el.innerHTML = `
    <div class="toc-head">
      <h3>Подзаметки</h3>
      <button class="btn ghost" id="add-sub">${icon('plus')}Добавить подзаметку</button>
    </div>
    ${rows.length ? `<ol class="toc">${rows.map(({ k, depth }) => {
      const hidden = depth === 1 ? descendants(k.id).length : 0;
      return `<li><a class="toc-row depth-${depth}" href="#/notes/${k.id}" draggable="true" data-id="${k.id}">
        ${numOrIcon(nums, k.id, 'toc-num')}
        <span class="toc-title ${k.title.trim() ? '' : 'untitled'}">${esc(titleOf(k))}</span>
        <span class="toc-meta">${hidden ? `ещё ${hidden} внутри · ` : ''}${ago(k.updated_at)}</span>
      </a></li>`;
    }).join('')}</ol>`
    : '<p class="toc-empty">Подзаметок пока нет. Они помогают разбить большую тему на части.</p>'}`;
  $('#add-sub').onclick = () => createPage(S.page.id);
  const toc = $('.toc', el);
  if (toc) enablePageDnD(toc, '.toc-row', { axis: 'y' });
}

function placeCaretStart(el) {
  el.focus();
  const target = el.firstElementChild && el.classList.contains('editor') ? el.firstElementChild : el;
  const r = document.createRange();
  r.selectNodeContents(target);
  r.collapse(true);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

/* =========================================================
   Visual editor (contenteditable + toolbar)
   ========================================================= */
document.execCommand('defaultParagraphSeparator', false, 'p');

function makeEditor(editor, onChange) {
  const bar = document.createElement('div');
  bar.className = 'toolbar';
  bar.setAttribute('role', 'toolbar');
  bar.innerHTML = `
    <button type="button" class="tb-block" data-block-btn title="Тип текста" aria-haspopup="menu">
      <span data-block-label>Текст</span>${icon('chevronDown')}
    </button>
    <span class="sep"></span>
    <button class="icon-btn" data-cmd="bold" title="Жирный (Ctrl+B)" aria-label="Жирный">${icon('bold', 'b')}</button>
    <button class="icon-btn" data-cmd="italic" title="Курсив (Ctrl+I)" aria-label="Курсив">${icon('italic')}</button>
    <button class="icon-btn" data-cmd="underline" title="Подчёркнутый (Ctrl+U)" aria-label="Подчёркнутый">${icon('underline')}</button>
    <button class="icon-btn" data-cmd="strikeThrough" title="Зачёркнутый" aria-label="Зачёркнутый">${icon('strike')}</button>
    <div class="tb-hist"><i class="tb-sep"></i><button class="icon-btn off" data-hist="-1" title="Отменить (Ctrl+Z)" aria-label="Отменить" aria-disabled="true">${icon('undo')}</button><button class="icon-btn off" data-hist="1" title="Вернуть (Ctrl+Shift+Z)" aria-label="Вернуть" aria-disabled="true">${icon('redo')}</button></div>
    <span class="sep"></span>
    <button class="icon-btn" data-cmd="insertUnorderedList" title="Маркированный список" aria-label="Маркированный список">${icon('list')}</button>
    <button class="icon-btn" data-cmd="insertOrderedList" title="Нумерованный список" aria-label="Нумерованный список">${icon('ol')}</button>
    <button class="icon-btn" data-cmd="checklist" title="Чек-лист" aria-label="Чек-лист">${icon('checklist')}</button>
    <span class="sep"></span>
    <button class="icon-btn" data-cmd="quote" title="Цитата (выйти — Enter на пустой строке)" aria-label="Цитата">${icon('quote')}</button>
    <button class="icon-btn" data-cmd="code" title="Блок кода (выйти — Enter на пустой строке)" aria-label="Блок кода">${icon('code')}</button>
    <button class="icon-btn" data-cmd="link" title="Ссылка (Ctrl+K)" aria-label="Ссылка">${icon('link')}</button>
    <button class="icon-btn" data-cmd="insertHorizontalRule" title="Разделитель" aria-label="Разделитель">${icon('hr')}</button>
    <button class="icon-btn" data-cmd="clear" title="Очистить форматирование" aria-label="Очистить форматирование">${icon('clear')}</button>`;
  const BLOCKS = { p: 'Текст', h1: 'Заголовок 1', h2: 'Заголовок 2', h3: 'Заголовок 3' };
  // на узком экране в первой строке ещё «Отменить / Вернуть» — подпись заголовка короче
  const BLOCKS_SHORT = { p: 'Текст', h1: 'Заг. 1', h2: 'Заг. 2', h3: 'Заг. 3' };
  const narrow = matchMedia('(max-width: 600px)');
  let curBlock = 'p';

  const changed = () => { markEmpty(); record(); onChange(); };
  const blockOf = () => {
    const sel = getSelection();
    if (!sel.rangeCount || !editor.contains(sel.anchorNode)) return null;
    let n = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    return n.closest('h1,h2,h3,p,blockquote,pre,li');
  };

  const refresh = () => {
    if (!bar.isConnected && !editor.isConnected) { document.removeEventListener('selectionchange', refresh); return; }
    if (!editor.contains(getSelection().anchorNode)) return;
    ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].forEach((c) => {
      const b = $(`[data-cmd="${c}"]`, bar);
      let on = false;
      try { on = document.queryCommandState(c); } catch { /* unsupported */ }
      b.classList.toggle('on', on);
    });
    const blk = blockOf();
    const inCode = !!blk?.closest('pre');
    // в блоке кода — только обычный текст: остальные кнопки неактивны
    $$('[data-cmd], [data-block-btn]', bar).forEach((b) => {
      const off = inCode && b.dataset.cmd !== 'code';
      b.classList.toggle('off', off);
      b.setAttribute('aria-disabled', off ? 'true' : 'false');
      if (off) b.classList.remove('on');
    });
    if (inCode) { $('[data-cmd="code"]', bar).classList.add('on'); $('[data-block-label]', bar).textContent = 'Код'; return; }
    const inChecklist = !!blk?.closest('ul.checklist');
    $('[data-cmd="insertUnorderedList"]', bar).classList.toggle('on', !!blk?.closest('ul') && !inChecklist);
    $('[data-cmd="checklist"]', bar).classList.toggle('on', inChecklist);
    $('[data-cmd="quote"]', bar).classList.toggle('on', !!blk?.closest('blockquote'));
    $('[data-cmd="code"]', bar).classList.toggle('on', !!blk?.closest('pre'));
    curBlock = blk?.closest('h1,h2,h3')?.tagName.toLowerCase() || 'p';
    $('[data-block-label]', bar).textContent = (narrow.matches ? BLOCKS_SHORT : BLOCKS)[curBlock];
  };
  document.addEventListener('selectionchange', refresh);

  bar.addEventListener('mousedown', (e) => e.preventDefault());
  const blockBtn = $('[data-block-btn]', bar);
  blockBtn.addEventListener('click', () => {
    if (blockBtn.classList.contains('off')) return;
    if (!editor.contains(getSelection().anchorNode)) placeCaretEnd(editor);
    const sel = getSelection();
    const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const menu = showMenu(blockBtn, Object.entries(BLOCKS).map(([k, v]) =>
      `<button data-m="${k}" class="bm bm-${k} ${k === curBlock ? 'on' : ''}"><span>${v}</span>${k === curBlock ? icon('check') : ''}</button>`).join(''), (k) => {
      editor.focus();
      if (range) { sel.removeAllRanges(); sel.addRange(range); }
      document.execCommand('formatBlock', false, `<${k}>`);
      changed();
      refresh();
    });
    menu.classList.add('block-menu');
    $('.on', menu)?.focus();
  });

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmd]');
    if (!b || b.classList.contains('off')) return;
    const cmd = b.dataset.cmd;
    if (!editor.contains(getSelection().anchorNode)) placeCaretEnd(editor);
    const blk = blockOf();
    if (cmd === 'checklist') toggleChecklist(editor, blk);
    else if (cmd === 'quote') document.execCommand('formatBlock', false, blk?.closest('blockquote') ? '<p>' : '<blockquote>');
    else if (cmd === 'code') toggleCode(editor, blk);
    else if (cmd === 'link') return askLink(editor, changed);
    else if (cmd === 'clear') { document.execCommand('removeFormat'); document.execCommand('unlink'); }
    else if (cmd === 'insertHorizontalRule') {
      document.execCommand(cmd);
      const r = getSelection().getRangeAt(0);
      const hr = $$('hr', editor).filter((h) => r.comparePoint(h, 0) <= 0).pop();
      if (hr) {
        // Chrome оставляет курсор «голым» текстом после линии — переносим его в абзац
        const next = hr.nextSibling;
        if (next && next.nodeType === 3 && !next.data.trim()) next.remove();
        paraNear(hr, 'after');
      }
    }
    else document.execCommand(cmd);
    changed();
    refresh();
  });

  $$('pre', editor).forEach(flattenCode);
  mergeQuotes(editor);

  function isEmpty() { return !editor.textContent.trim() && !editor.querySelector('li, hr, pre, h1, h2, h3, blockquote'); }
  function markEmpty() { editor.classList.toggle('is-empty', isEmpty()); }
  markEmpty();
  editor.addEventListener('focus', () => {
    if (!editor.innerHTML.trim() || editor.innerHTML === '<br>') {
      editor.innerHTML = '<p><br></p>';
      const r = document.createRange();
      r.setStart(editor.firstChild, 0);
      r.collapse(true);
      getSelection().removeAllRanges();
      getSelection().addRange(r);
    }
  });
  /* ---------- своя история правок: «Отменить» / «Вернуть» ----------
     Штатная отмена браузера теряется после наших правок DOM (Enter в цитате, коде и т.п.), поэтому храним
     снимки HTML + курсор. Набор текста — шаг на слово (или до паузы 1 с), удаление подряд — один шаг. */
  const H = { stack: [], i: -1, kind: '', at: 0, wordEnd: false, next: null };
  const histBtns = $$('[data-hist]', bar);
  const snap = () => ({ html: editor.innerHTML, sel: selPath() });
  function selPath() {
    const sel = getSelection();
    if (!sel.rangeCount || !editor.contains(sel.anchorNode) || !editor.contains(sel.focusNode)) return null;
    return { a: nodePath(editor, sel.anchorNode), ao: sel.anchorOffset, f: nodePath(editor, sel.focusNode), fo: sel.focusOffset };
  }
  function paintHist() {
    histBtns.forEach((b) => {
      const off = b.dataset.hist === '-1' ? H.i <= 0 : H.i >= H.stack.length - 1;
      b.classList.toggle('off', off);
      b.setAttribute('aria-disabled', off ? 'true' : 'false');
    });
  }
  function record() {
    const next = H.next || { kind: 'other', data: '' };
    H.next = null;
    const html = editor.innerHTML;
    if (H.i < 0) { H.stack = [snap()]; H.i = 0; }
    if (html === H.stack[H.i].html) return;
    const now = Date.now();
    const merge = H.i > 0 && next.kind !== 'other' && next.kind === H.kind && now - H.at < 1000
      && !(next.kind === 'type' && H.wordEnd && !/^\s/.test(next.data));
    H.stack.length = H.i + 1;
    if (merge) H.stack[H.i] = snap();
    else { H.stack.push(snap()); H.i++; }
    if (H.stack.length > 101) { H.stack.shift(); H.i--; }
    H.kind = next.kind;
    H.at = now;
    H.wordEnd = next.kind === 'type' && /[\s.,!?;:)»]$/.test(next.data);
    paintHist();
  }
  function goHist(d) {
    const j = H.i + d;
    if (j < 0 || j >= H.stack.length) return;
    H.i = j;
    H.kind = '';
    const s = H.stack[j];
    const active = document.activeElement === editor;
    editor.innerHTML = s.html;
    markEmpty();
    if (active && s.sel) {
      const a = nodeAt(editor, s.sel.a);
      const f = nodeAt(editor, s.sel.f);
      if (a && f) {
        try { getSelection().setBaseAndExtent(a, Math.min(s.sel.ao, nodeLen(a)), f, Math.min(s.sel.fo, nodeLen(f))); } catch { /* ignore */ }
      } else placeCaretEnd(editor);
      keepCaretVisible();
    }
    paintHist();
    refresh();
    onChange();
  }
  H.stack = [snap()]; H.i = 0;
  histBtns.forEach((b) => b.addEventListener('click', () => { if (!b.classList.contains('off')) goHist(Number(b.dataset.hist)); }));
  // пустое поле при фокусе получает <p><br></p> — это ещё не правка
  editor.addEventListener('focus', () => { if (H.i === 0 && H.stack.length === 1) H.stack[0] = snap(); });
  // курсор у текущего шага — чтобы отмена удаления вернула его туда, где начали стирать
  document.addEventListener('selectionchange', () => {
    if (!editor.isConnected || H.i < 0 || !editor.contains(getSelection().anchorNode)) return;
    if (editor.innerHTML === H.stack[H.i].html) H.stack[H.i].sel = selPath();
  });
  editor.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') { e.preventDefault(); goHist(e.inputType === 'historyUndo' ? -1 : 1); return; }
    const collapsed = getSelection().isCollapsed;
    const t = e.inputType;
    const kind = !collapsed ? 'other'
      : (t === 'insertText' || t === 'insertCompositionText' || t === 'insertReplacementText') ? 'type'
      : t.startsWith('delete') ? 'del' : 'other';
    H.next = { kind, data: e.data || '' };
  });
  editor.addEventListener('keydown', (e) => {
    H.next = null;
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (e.code === 'KeyZ' || e.code === 'KeyY') {
      e.preventDefault();
      goHist(e.code === 'KeyY' || e.shiftKey ? 1 : -1);
    }
  });

  editor.addEventListener('input', (e) => {
    // жирный/курсив/ссылка не переносятся на новую пустую строку
    if (e.inputType === 'insertParagraph') {
      const nb = blockOf();
      if (nb && !nb.textContent && !nb.closest('pre, blockquote')) {
        if (nb.querySelector('b, strong, i, em, u, s, strike, a, span, font, code')) { nb.innerHTML = '<br>'; caretTo(nb, 0); }
        ['bold', 'italic', 'underline', 'strikeThrough'].forEach((c) => {
          try { if (document.queryCommandState(c)) document.execCommand(c); } catch { /* unsupported */ }
        });
      }
    }
    $$('ul.checklist > li:not([data-checked])', editor).forEach((li) => li.setAttribute('data-checked', 'false'));
    markEmpty();
    changed();
  });

  editor.addEventListener('keydown', (e) => {
    const pre = blockOf()?.closest('pre');
    if (pre) {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(k)) { e.preventDefault(); return; }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        codeEnter(editor, pre, e.shiftKey);
        changed();
        refresh();
        return;
      }
      if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); return; }
      if (e.key === 'Backspace' && getSelection().isCollapsed && caretOffsetIn(pre) === 0) {
        e.preventDefault(); toggleCode(editor, pre); changed(); refresh(); return;
      }
    }
    const blk = blockOf();
    const bq = !pre && blk?.closest('blockquote');
    const plainKey = !e.ctrlKey && !e.metaKey && !e.altKey;
    if (bq && e.key === 'Enter' && plainKey && !blk.closest('li')) {
      e.preventDefault();
      quoteEnter(bq, e.shiftKey);
      changed();
      refresh();
      return;
    }
    // Backspace в начале цитаты или заголовка — превращает их в обычный текст
    const head = !pre && blk?.closest('h1, h2, h3, blockquote');
    if (head && e.key === 'Backspace' && plainKey && getSelection().isCollapsed && !splitAtCaret(head).before.toString().length
        && lastNodeOf(splitAtCaret(head).before.cloneContents())?.nodeName !== 'BR') {
      e.preventDefault();
      if (head.tagName === 'BLOCKQUOTE') {
        const ps = [];
        let cur = document.createElement('p');
        [...head.childNodes].forEach((n) => { if (n.nodeName === 'BR') { ps.push(cur); cur = document.createElement('p'); } else cur.append(n); });
        ps.push(cur);
        ps.forEach((p) => { if (!p.childNodes.length) p.innerHTML = '<br>'; });
        head.replaceWith(...ps);
        caretTo(ps[0], 0);
      } else document.execCommand('formatBlock', false, '<p>');
      changed();
      refresh();
      return;
    }
    // стрелка вниз/вверх из последнего/первого блока (цитата, код, список, заголовок) — в новый абзац
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && plainKey && !e.shiftKey && getSelection().isCollapsed) {
      const down = e.key === 'ArrowDown';
      const top = topBlock(editor, getSelection().anchorNode);
      const edgeBlock = top && (down ? !top.nextElementSibling : !top.previousElementSibling);
      if (edgeBlock && !isPlainPara(top)) {
        const onEdge = pre ? (down ? caretOnLastLine(pre) : !pre.textContent.slice(0, caretOffsetIn(pre)).includes('\n'))
          : caretOnEdgeLine(top, down ? 'last' : 'first');
        if (onEdge) { e.preventDefault(); paraNear(top, down ? 'after' : 'before'); changed(); refresh(); return; }
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && blockOf()?.closest('ul.checklist')) {
      setTimeout(() => { const li = blockOf(); if (li?.tagName === 'LI') li.setAttribute('data-checked', 'false'); }, 0);
    }
    if (e.key === 'Tab' && blockOf()?.closest('li')) {
      e.preventDefault();
      document.execCommand(e.shiftKey ? 'outdent' : 'indent');
      changed();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      e.stopPropagation();
      if (!pre) askLink(editor, changed);
    }
  });

  editor.addEventListener('click', (e) => {
    // клик в пустое место под цитатой/кодом/списком в конце — новый абзац
    const last = editor.lastElementChild;
    if (e.target === editor && last && !isPlainPara(last) && e.clientY > last.getBoundingClientRect().bottom) {
      paraNear(last, 'after');
      changed();
      refresh();
      return;
    }
    const li = e.target.closest('ul.checklist > li');
    if (li && e.target === li && e.clientX - li.getBoundingClientRect().left < parseFloat(getComputedStyle(li).paddingLeft)) {
      li.setAttribute('data-checked', li.getAttribute('data-checked') === 'true' ? 'false' : 'true');
      changed();
    }
    const a = e.target.closest('a');
    if (a && (e.ctrlKey || e.metaKey)) window.open(a.href, '_blank', 'noopener');
  });

  editor.addEventListener('paste', (e) => {
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    e.preventDefault();
    if (blockOf()?.closest('pre')) document.execCommand('insertText', false, text);
    else if (html) document.execCommand('insertHTML', false, cleanHTML(html));
    else document.execCommand('insertText', false, text);
    changed();
  });

  return bar;
}

// Chrome sometimes nests block elements inside <p> while editing; flatten that before saving
function serializeEditor(editor) {
  const clone = editor.cloneNode(true);
  $$('p', clone).forEach((p) => {
    if (p.querySelector('ul, ol, pre, blockquote, h1, h2, h3, p, hr')) p.replaceWith(...p.childNodes);
  });
  $$('p', clone).forEach((p) => { if (!p.textContent.trim() && !p.querySelector('br') ) p.remove(); });
  const html = clone.innerHTML.trim();
  return html === '<p><br></p>' ? '' : html;
}

// путь к узлу внутри редактора (номера детей) — чтобы вернуть курсор после замены HTML
function nodePath(root, node) {
  const path = [];
  while (node && node !== root) { path.unshift([...node.parentNode.childNodes].indexOf(node)); node = node.parentNode; }
  return node === root ? path : null;
}
function nodeAt(root, path) {
  let n = root;
  for (const i of path || []) { n = n?.childNodes[i]; if (!n) return null; }
  return path ? n : null;
}
const nodeLen = (n) => (n.nodeType === 3 ? n.data.length : n.childNodes.length);

function placeCaretEnd(el) {
  el.focus();
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

/* ---------- блок кода: внутри только обычный текст ---------- */
function codeText(pre) {
  const c = pre.cloneNode(true);
  $$('br', c).forEach((br) => br.replaceWith('\n'));
  $$('li, p, div, h1, h2, h3, blockquote', c).forEach((el) => { if (el.nextElementSibling || el.nextSibling) el.append('\n'); });
  return c.textContent.replace(/\u00a0/g, ' ');
}
// убирает любое форматирование внутри <pre>; в конце — служебный перенос, чтобы пустая последняя строка была видна
function flattenCode(pre) {
  pre.textContent = codeText(pre).replace(/\n$/, '') + '\n';
}
function caretOffsetIn(pre) {
  const sel = getSelection();
  const r = document.createRange();
  r.selectNodeContents(pre);
  r.setEnd(sel.anchorNode, sel.anchorOffset);
  return r.toString().length;
}
function setCaretIn(pre, offset) {
  const node = pre.firstChild || pre.appendChild(document.createTextNode('\n'));
  const r = document.createRange();
  r.setStart(node, Math.min(offset, node.length));
  r.collapse(true);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
}
function caretOnLastLine(pre) {
  const t = pre.textContent.replace(/\n$/, '');
  return !t.slice(caretOffsetIn(pre)).includes('\n');
}
function exitCode(pre, removeEmptyLastLine = false) {
  if (removeEmptyLastLine) { pre.textContent = pre.textContent.replace(/\n\n$/, '\n'); }
  paraNear(pre, 'after');
}

/* ---------- выход из блоков: цитата, код, списки, заголовки, разделитель ---------- */
function caretTo(node, offset = 0) {
  const r = document.createRange();
  r.setStart(node, offset);
  r.collapse(true);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
}
// ставит курсор в пустой абзац рядом с блоком (берёт соседний пустой, если он уже есть)
function paraNear(block, where) {
  let p = where === 'after' ? block.nextElementSibling : block.previousElementSibling;
  if (!p || p.tagName !== 'P' || p.textContent.trim() || p.querySelector('ul, ol, pre, blockquote, hr')) {
    p = document.createElement('p');
    p.innerHTML = '<br>';
    block[where](p);
  }
  caretTo(p, 0);
  return p;
}
function toParagraph(block) {
  const p = document.createElement('p');
  p.innerHTML = '<br>';
  block.replaceWith(p);
  caretTo(p, 0);
}
// текст/узлы от начала элемента до курсора и от курсора до конца
function splitAtCaret(el) {
  const sel = getSelection();
  const before = document.createRange();
  before.selectNodeContents(el);
  before.setEnd(sel.anchorNode, sel.anchorOffset);
  const after = document.createRange();
  after.selectNodeContents(el);
  after.setStart(sel.anchorNode, sel.anchorOffset);
  return { before, after };
}
function lastNodeOf(frag) {
  const w = document.createTreeWalker(frag, NodeFilter.SHOW_ALL);
  let last = null;
  while (w.nextNode()) {
    const n = w.currentNode;
    if (n.nodeType === 3 && !n.data.length) continue;
    last = n;
  }
  return last;
}
function trimTrailingBreaks(el) {
  for (;;) {
    let n = el.lastChild;
    while (n && n.nodeType === 1 && n.tagName !== 'BR' && n.lastChild) n = n.lastChild;
    if (!n) return;
    if ((n.nodeType === 3 && !n.data.trim()) || n.nodeName === 'BR') {
      const parent = n.parentNode;
      n.remove();
      if (parent !== el && !parent.childNodes.length) parent.remove();
    } else return;
  }
}
// Enter в цитате: новая строка внутри той же цитаты; Enter на пустой последней строке (или Shift+Enter) — выход
function quoteEnter(bq, exit) {
  const { before, after } = splitAtCaret(bq);
  const atEnd = !after.toString().length && !after.cloneContents().querySelector?.('hr, img');
  const pre = before.cloneContents();
  const lastIsBreak = !before.toString().length || lastNodeOf(pre)?.nodeName === 'BR';
  if (exit || (atEnd && lastIsBreak)) {
    if (!exit || atEnd) trimTrailingBreaks(bq);
    if (!bq.textContent.trim()) return toParagraph(bq);
    return paraNear(bq, 'after');
  }
  document.execCommand('insertLineBreak');
}
// соседние цитаты (так Chrome делал раньше на каждый Enter) склеиваем в одну
function mergeQuotes(editor) {
  $$(':scope > blockquote', editor).forEach((bq) => {
    const prev = bq.previousElementSibling;
    if (prev?.tagName === 'BLOCKQUOTE' && !prev.querySelector('p, ul, ol, pre') && !bq.querySelector('p, ul, ol, pre')) {
      if (bq.textContent.trim()) prev.append(document.createElement('br'), ...bq.childNodes);
      bq.remove();
    }
  });
}
function caretRect() {
  const sel = getSelection();
  if (!sel.rangeCount) return null;
  const r = sel.getRangeAt(0).cloneRange();
  r.collapse(true);
  let rect = r.getBoundingClientRect();
  if (!rect.height) {
    const n = r.startContainer.nodeType === 1 ? r.startContainer.childNodes[r.startOffset] || r.startContainer : r.startContainer.parentElement;
    if (n?.getBoundingClientRect) rect = n.getBoundingClientRect();
  }
  return rect.height ? rect : null;
}
// курсор на первой/последней строке блока (по положению на экране)
function caretOnEdgeLine(block, edge) {
  const cr = caretRect();
  if (!cr) return true;
  const br = block.getBoundingClientRect();
  const cs = getComputedStyle(block);
  const lh = parseFloat(getComputedStyle(getSelection().anchorNode.parentElement || block).lineHeight) || 24;
  if (edge === 'last') return br.bottom - parseFloat(cs.paddingBottom) - cr.bottom < lh * 0.75;
  return cr.top - (br.top + parseFloat(cs.paddingTop)) < lh * 0.75;
}
function topBlock(editor, node) {
  let n = node?.nodeType === 1 ? node : node?.parentElement;
  while (n && n.parentElement !== editor) n = n.parentElement;
  return n && editor.contains(n) ? n : null;
}
const isPlainPara = (el) => el?.tagName === 'P' && !el.querySelector('ul, ol, pre, blockquote, hr');
// Enter — новая строка кода; Enter на пустой последней строке (или Shift+Enter) — выйти из блока
function codeEnter(editor, pre, exit) {
  const o = caretOffsetIn(pre);
  flattenCode(pre);                         // теперь в pre один текстовый узел со служебным \n в конце
  const body = pre.textContent.slice(0, -1);
  const pos = Math.min(o, body.length);
  const atEnd = pos >= body.length;
  if (exit) return exitCode(pre);
  if (atEnd && body === '') {               // Enter в пустом блоке — он становится обычным абзацем
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    pre.replaceWith(p);
    const r = document.createRange();
    r.setStart(p, 0);
    r.collapse(true);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    return;
  }
  if (atEnd && body.endsWith('\n')) return exitCode(pre, true);
  pre.textContent = body.slice(0, pos) + '\n' + body.slice(pos) + '\n';
  setCaretIn(pre, pos + 1);
}
function toggleCode(editor, blk) {
  const pre = blk?.closest('pre');
  if (pre) {
    // снять «код»: каждая строка становится обычным абзацем
    const lines = pre.textContent.replace(/\n$/, '').split('\n');
    const ps = lines.map((l) => { const p = document.createElement('p'); if (l) p.textContent = l; else p.innerHTML = '<br>'; return p; });
    pre.replaceWith(...ps);
    const r = document.createRange();
    r.setStart(ps[0], 0);
    r.collapse(true);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    return;
  }
  // в коде не бывает списков и цитат — сначала снимаем их
  const ul = blk?.closest('ul, ol');
  if (ul) document.execCommand(ul.tagName === 'OL' ? 'insertOrderedList' : 'insertUnorderedList');
  if (blk?.closest('blockquote')) document.execCommand('formatBlock', false, '<p>');
  document.execCommand('formatBlock', false, '<pre>');
  const sel = getSelection();
  const node = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
  const nu = node?.closest('pre');
  if (nu && editor.contains(nu)) {
    const o = caretOffsetIn(nu);
    flattenCode(nu);
    setCaretIn(nu, o);
  }
}

function toggleChecklist(editor, blk) {
  const ul = blk?.closest('ul');
  if (ul?.classList.contains('checklist')) {
    document.execCommand('insertUnorderedList'); // removes the list
    return;
  }
  if (!ul) document.execCommand('insertUnorderedList');
  const sel = getSelection();
  const node = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
  const list = node?.closest('ul');
  if (list && editor.contains(list)) {
    list.classList.add('checklist');
    $$(':scope > li', list).forEach((li) => li.hasAttribute('data-checked') || li.setAttribute('data-checked', 'false'));
  }
}

function askLink(editor, changed) {
  const sel = getSelection();
  const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  const existing = range && (range.startContainer.parentElement?.closest('a'));
  const m = openModal(`
    <h2>Ссылка</h2>
    <form id="link-form">
      <label class="field"><span>Адрес</span><input class="input" id="link-url" placeholder="https://" value="${esc(existing?.getAttribute('href') || '')}"></label>
      <div class="modal-actions">
        ${existing ? '<button type="button" class="btn danger" id="link-remove">Убрать ссылку</button>' : ''}
        <button type="button" class="btn" data-close>Отмена</button><button class="btn primary">Готово</button>
      </div>
    </form>`);
  const restore = () => { editor.focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); } };
  $('#link-url', m).focus();
  $('#link-remove', m)?.addEventListener('click', () => {
    closeModal(m);
    restore();
    if (existing) { const r = document.createRange(); r.selectNode(existing); sel.removeAllRanges(); sel.addRange(r); }
    document.execCommand('unlink');
    changed();
  });
  $('#link-form', m).onsubmit = (e) => {
    e.preventDefault();
    let url = $('#link-url', m).value.trim();
    closeModal(m);
    restore();
    if (!url) return;
    if (!/^(https?:|mailto:|tel:)/i.test(url)) url = 'https://' + url;
    if (range && !range.collapsed) document.execCommand('createLink', false, url);
    else document.execCommand('insertHTML', false, `<a href="${esc(url)}">${esc(url)}</a>&nbsp;`);
    changed();
  };
}

// Keeps only the formatting the editor supports when pasting from other sites/Word
function cleanHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const KEEP = new Set(['P', 'BR', 'H1', 'H2', 'H3', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'A', 'HR']);
  const DROP = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'IMG', 'IFRAME', 'SVG', 'OBJECT', 'VIDEO', 'AUDIO', 'NOSCRIPT', 'BUTTON', 'INPUT']);
  const RENAME = { H4: 'h3', H5: 'h3', H6: 'h3', DIV: 'p', TR: 'p' };
  const walk = (node) => {
    [...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 8) return ch.remove();
      if (ch.nodeType !== 1) return;
      if (DROP.has(ch.tagName)) return ch.remove();
      walk(ch);
      if (RENAME[ch.tagName]) {
        const n = doc.createElement(RENAME[ch.tagName]);
        n.append(...ch.childNodes);
        ch.replaceWith(n);
        return;
      }
      if (!KEEP.has(ch.tagName)) { ch.replaceWith(...ch.childNodes, ch.tagName === 'TD' ? ' ' : ''); return; }
      [...ch.attributes].forEach((a) => {
        const keep = (ch.tagName === 'A' && a.name === 'href' && /^(https?:|mailto:)/i.test(a.value));
        if (!keep) ch.removeAttribute(a.name);
      });
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

/* =========================================================
   Tasks
   ========================================================= */
// Завершённая задача — отдельный признак completed_at, а не статус: статус сохраняется, чтобы вернуть задачу на место
const isDone = (t) => !!t.completed_at;
const taskById = (id) => S.tasks.find((t) => t.id === id);
// Фильтры задач — одна кнопка «Фильтр»: срок (один вариант), статусы и приоритеты (несколько; внутри группы — «или», между группами — «и»)
const DUE_FILTERS = [
  { id: 'all', title: 'Любой срок', test: () => true },
  { id: 'today', title: 'На сегодня', test: (t) => t.due_date && t.due_date <= todayStr() },
  { id: 'overdue', title: 'Просроченные', test: isOverdue },
];
const tf = () => {
  const f = S.taskFilter;
  // статус могли удалить — такой выбор просто не учитываем
  f.status = f.status.filter((k) => S.statuses.some((x) => x.key === k));
  return f;
};
const filterCount = () => { const f = tf(); return (f.due !== 'all') + (f.status.length ? 1 : 0) + (f.prio.length ? 1 : 0); };
// skip — группа, которую не учитывать (для счётчиков в меню фильтра)
function matchTask(t, skip) {
  const f = tf();
  if (skip !== 'due' && !DUE_FILTERS.find((d) => d.id === f.due).test(t)) return false;
  if (skip !== 'status' && f.status.length && !f.status.includes(t.status)) return false;
  if (skip !== 'prio' && f.prio.length && !f.prio.includes(t.priority)) return false;
  return true;
}
function setTaskFilter(fn) {
  fn(S.taskFilter);
  S.taskSelected.clear();
  renderTasksBody();
}
function filterMenuHtml() {
  const f = tf();
  const active = S.tasks.filter((t) => !isDone(t));
  const n = (group, test) => active.filter((t) => matchTask(t, group) && test(t)).length;
  const row = (m, on, label, count, kind) => `<button data-m="${m}" data-keep="1" role="${kind}" aria-checked="${on}" class="${on ? 'on' : ''}">
    <span class="fm-mark ${kind}">${on ? icon('check') : ''}</span>${label}<span class="fm-n">${count}</span></button>`;
  return `<div class="menu-label">Срок</div>
    ${DUE_FILTERS.map((d) => row(`due:${d.id}`, f.due === d.id, d.title, n('due', d.test), 'radio')).join('')}
    <hr><div class="menu-label">Статус</div>
    ${S.statuses.map((st) => row(`status:${st.key}`, f.status.includes(st.key),
      `<span class="dot" style="background:${statusColor(st.key)}"></span>${esc(st.name)}`, n('status', (t) => t.status === st.key), 'checkbox')).join('')}
    <hr><div class="menu-label">Приоритет</div>
    ${Object.entries(PRIORITY).map(([k, v]) => row(`prio:${k}`, f.prio.includes(k),
      `<span class="prio-dot ${k}"></span>${v}`, n('prio', (t) => t.priority === k), 'checkbox')).join('')}
    ${filterCount() ? `<hr><button data-m="reset" data-keep="1" class="fm-reset">${icon('x')}Сбросить фильтры</button>` : ''}`;
}
function openFilterMenu(anchor) {
  const menu = showMenu(anchor, filterMenuHtml(), (m) => {
    const [group, val] = m.split(':');
    setTaskFilter((f) => {
      if (group === 'reset') { f.due = 'all'; f.status = []; f.prio = []; }
      else if (group === 'due') f.due = val;
      else f[group] = f[group].includes(val) ? f[group].filter((x) => x !== val) : [...f[group], val];
    });
    const focused = document.activeElement?.dataset?.m;
    menu.innerHTML = filterMenuHtml();
    ($(`[data-m="${focused}"]`, menu) || $('button', menu))?.focus();
  });
  menu.classList.add('filter-menu');
}

function renderTasks() {
  S.page = null;
  setActiveNav('tasks');
  renderTree();
  $('#main').innerHTML = `
    ${topbar('', 'bare')}
    <div class="tasks-wrap ${S.taskView === 'board' ? 'wide' : ''}">
      <div class="tasks-head home-head">
        <div class="home-title">
          <div class="title-row">
            <h1>Задачи</h1>
            <button class="icon-btn head-gear" id="task-settings" title="Настройки задач" aria-label="Настройки задач">${icon('gear')}</button>
          </div>
          <p class="home-sub" id="tasks-sub"></p>
        </div>
        <div class="segmented" role="tablist">
          <button data-view="list" class="${S.taskView === 'list' ? 'on' : ''}">${icon('list')}Список</button>
          <button data-view="board" class="${S.taskView === 'board' ? 'on' : ''}">${icon('board')}Доска</button>
        </div>
        <button class="btn primary head-new" id="task-new">${icon('plus')}Новая задача</button>
      </div>
      <div class="filters-row">
        <div class="filters" id="filters"></div>
        <button class="btn ghost" id="task-select"></button>
      </div>
      <div id="tasks-body"></div>
    </div>`;
  $$('[data-view]').forEach((b) => b.onclick = () => {
    S.taskView = b.dataset.view;
    store.set('kb-task-view', S.taskView);
    $$('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
    $('.tasks-wrap').classList.toggle('wide', S.taskView === 'board');
    renderTasksBody();
  });
  $('#task-settings').onclick = () => openStatusesDialog();
  $('#task-new').onclick = createTask;
  $('#task-select').onclick = () => {
    S.taskSelect = !S.taskSelect;
    S.taskSelected.clear();
    renderTasksBody();
  };
  bindTasksBody($('#tasks-body'));
  renderTasksBody();
}

// Новая задача создаётся пустой и сразу открывается — название пишется в карточке
let creatingTask = false;
async function createTask() {
  if (creatingTask) return;
  creatingTask = true;
  // новая задача сразу попадает под выбранный фильтр
  const f = tf(), extra = {};
  if (f.due !== 'all') extra.due_date = todayStr();
  if (f.prio.length === 1) extra.priority = f.prio[0];
  if (f.status.length === 1) extra.status = f.status[0];
  try {
    const t = await api('POST', '/api/tasks', { title: '', ...extra });
    S.tasks.push(t);
    if (!location.hash.startsWith('#/tasks')) {
      location.hash = '#/tasks';
      await new Promise((r) => setTimeout(r, 0));
    }
    S.taskSelect = false;
    S.taskSelected.clear();
    renderTasksBody();
    updateCounts();
    openTaskPanel(t.id, { justCreated: true });
  } catch (err) { fail(err); } finally { creatingTask = false; }
}
const taskTitle = (t) => t.title.trim() || 'Без названия';
const refreshTasks = () => { renderTasksBody(); renderTree(); updateCounts(); };

const DONE_PAGE = 20; // сколько завершённых показывать, пока не нажали «Показать все»

function renderTasksBody() {
  const body = $('#tasks-body');
  if (!body) return;
  updateFab();
  const total = S.tasks.length;
  const doneN = S.tasks.filter(isDone).length;
  $('#tasks-sub').textContent = total
    ? `${total} ${plural(total, 'задача', 'задачи', 'задач')}${doneN ? ` · ${doneN} ${plural(doneN, 'завершена', 'завершены', 'завершено')}` : ''}` : '';
  renderFilterBar();
  const selBtn = $('#task-select');
  selBtn.textContent = S.taskSelect ? 'Готово' : 'Выбрать';
  selBtn.classList.toggle('on', S.taskSelect);
  selBtn.hidden = !total;

  if (!total) {
    S.taskSelect = false;
    body.innerHTML = `<div class="empty" style="margin-top:6vh"><h2>Задач пока нет</h2><p>Нажмите «Новая задача», чтобы добавить первую.</p></div>${taskTrashSection()}`;
    if (S.taskTrash === null && S.taskTrashOpen) loadTaskTrash();
    return;
  }

  const f = tf();
  const filtered = filterCount() > 0;
  const list = S.tasks.filter((t) => !isDone(t) && matchTask(t));
  const columns = f.status.length ? S.statuses.filter((x) => f.status.includes(x.key)) : S.statuses;
  const byStatus = (s) => list.filter((t) => t.status === s).sort((a, b) => a.position - b.position || b.id - a.id);
  let main;
  if (S.taskView === 'board') {
    main = `<div class="board ${S.taskSelect ? 'selecting' : ''}" style="--cols:${columns.length}">${columns.map(({ key: s }) => {
      const items = byStatus(s);
      return `<section class="column" data-status="${s}">
        <div class="column-head"><span class="dot" style="background:${statusColor(s)}"></span><span class="col-name">${esc(statusOf(s).name)}</span><span class="kids-n">${items.length}</span></div>
        ${items.map(taskCard).join('') || '<div class="col-empty">Перетащите сюда задачу</div>'}
      </section>`;
    }).join('')}</div>`;
  } else {
    // Группы списка идут в том же порядке, что и колонки доски (порядок из настроек задач)
    const order = S.statuses.map((x) => x.key);
    // Задачи со статусом, которого уже нет (удалён в другой вкладке), не должны пропасть из списка
    list.forEach((t) => { if (!order.includes(t.status)) order.push(t.status); });
    const groups = order.map((s) => ({ s, items: byStatus(s) })).filter((g) => g.items.length);
    main = groups.length ? groups.map((g) => `
      <section class="task-group">
        <h3><span class="dot" style="background:${statusColor(g.s)}"></span>${esc(statusOf(g.s).name)}<span class="kids-n">${g.items.length}</span></h3>
        <div class="task-list">${g.items.map(taskRow).join('')}</div>
      </section>`).join('')
      : `<p class="muted">${filtered ? 'Под этот фильтр задач нет.' : 'Все задачи завершены.'}</p>`;
  }
  // завершённые фильтруются по статусу и приоритету; при фильтре по сроку блок не нужен
  body.innerHTML = main + (f.due === 'all' ? doneSection() : '') + taskTrashSection() + taskBulkBar();
  const allBtn = $('[data-bulk="all"]', body);
  if (allBtn) {
    const visible = $$('[data-task]', body).length;
    allBtn.textContent = S.taskSelected.size && S.taskSelected.size >= visible ? 'Снять выделение' : 'Выбрать все';
  }
  if (S.taskView === 'board') setupBoardDnD(body);
  if (S.taskTrash === null && S.taskTrashOpen) loadTaskTrash();
  paintSavedMark();
}

// Кнопка «Фильтр»: подсвечена и показывает число групп, если что-то выбрано
function renderFilterBar() {
  const box = $('#filters');
  const n = filterCount();
  const html = `<button class="btn ghost filter-btn ${n ? 'on' : ''}" id="task-filter" aria-haspopup="true">${icon('filter')}Фильтр${n ? `<span class="fb-n">${n}</span>` : ''}</button>`;
  box.innerHTML = html;
  $('#task-filter', box).onclick = (e) => openFilterMenu(e.currentTarget);
}

// «Завершённые» — свёрнутый блок под задачами, свежие сверху
function doneSection() {
  const done = S.tasks.filter((t) => isDone(t) && matchTask(t)).sort((a, b) => toDate(b.completed_at) - toDate(a.completed_at) || b.id - a.id);
  if (!done.length) return '';
  const shown = S.doneAll ? done : done.slice(0, DONE_PAGE);
  return `<section class="task-group fold done-group">
    <div class="toc-head"><h3><button class="trash-toggle ${S.doneOpen ? 'open' : ''}" data-fold="done" aria-expanded="${S.doneOpen}">
      ${icon('chevron')}<span>Завершённые</span><span class="trash-n">${done.length}</span></button></h3></div>
    ${S.doneOpen ? `<div class="task-list">${shown.map(taskRow).join('')}</div>
      ${shown.length < done.length ? `<button class="btn ghost more-btn" data-done-all>Показать все (${done.length})</button>` : ''}` : ''}
  </section>`;
}

function taskMeta(t) {
  if (isDone(t)) return `<span class="t-meta"><span class="done-at">${icon('check')}${ago(t.completed_at)}</span></span>`;
  const parts = [];
  if (t.due_date) {
    const cls = isOverdue(t) ? 'overdue' : t.due_date === todayStr() ? 'today' : '';
    parts.push(`<span class="due ${cls}">${icon('calendar')}${withTime(dueLabel(t.due_date), t.due_time)}</span>`);
  }
  if (remindPending(t)) parts.push(`<span class="remind" title="Напоминание: ${esc(remindWhen(t))}">${icon('bell')}</span>`);
  parts.push(`<span class="prio ${t.priority}">${PRIORITY[t.priority]}</span>`);
  return `<span class="t-meta">${parts.join('')}</span>`;
}
const favMark = (t) => (t.favorite_at ? icon('star', 'filled mini-star') : '');
const selBox = (t) => {
  if (!S.taskSelect) return '';
  const on = S.taskSelected.has(t.id);
  return `<span class="sel-box ${on ? 'on' : ''}" role="checkbox" aria-checked="${on}" aria-label="Выбрать"></span>`;
};
const rowCls = (t) => `${isDone(t) ? 'done' : ''} ${S.taskSelect ? 'sel' : ''} ${S.taskSelected.has(t.id) ? 'selected' : ''}`;
const taskRow = (t) => `<div class="task-row ${rowCls(t)}" data-task="${t.id}">${selBox(t)}<span class="t-title ${t.title.trim() ? '' : 'untitled'}">${esc(taskTitle(t))}${favMark(t)}</span>${taskMeta(t)}</div>`;
const taskCard = (t) => `<div class="card ${rowCls(t)}" ${S.taskSelect ? '' : 'draggable="true"'} data-task="${t.id}">${selBox(t)}<div class="c-title ${t.title.trim() ? '' : 'untitled'}">${esc(taskTitle(t))}${favMark(t)}</div>${taskMeta(t)}</div>`;

function taskBulkBar() {
  if (!S.taskSelect) return '';
  const sel = [...S.taskSelected].map(taskById).filter(Boolean);
  const n = sel.length;
  const anyActive = sel.some((t) => !isDone(t));
  return `<div class="bulk-bar" role="region" aria-label="Выбранные задачи">
    <span class="bulk-count">${n ? `Выбрано: <b>${n}</b>` : 'Отметьте задачи'}</span>
    <button class="btn ghost" data-bulk="all">Выбрать все</button>
    ${n && !anyActive
      ? `<button class="btn" data-bulk="reopen">${icon('arrowUp')}Вернуть в работу</button>`
      : `<button class="btn primary" data-bulk="complete" ${n ? '' : 'disabled'}>${icon('check')}Завершить</button>`}
    <button class="btn danger solid" data-bulk="delete" ${n ? '' : 'disabled'}>${icon('trash')}Удалить</button>
  </div>`;
}

// #tasks-body не пересоздаётся при перерисовке — обработчики вешаем один раз
function bindTasksBody(body) {
  if (body.dataset.bound) return;
  body.dataset.bound = '1';
  body.addEventListener('click', async (e) => {
    const fold = e.target.closest('[data-fold]');
    if (fold) {
      if (fold.dataset.fold === 'done') S.doneOpen = !S.doneOpen;
      else S.taskTrashOpen = !S.taskTrashOpen;
      return renderTasksBody();
    }
    if (e.target.closest('[data-done-all]')) { S.doneAll = true; return renderTasksBody(); }
    const bulk = e.target.closest('[data-bulk]');
    if (bulk) return taskBulkAction(bulk.dataset.bulk);
    const tr = e.target.closest('[data-ttrash]');
    if (tr) return taskTrashAction(tr);
    const row = e.target.closest('[data-task]');
    if (!row || row.classList.contains('dragging')) return;
    const id = Number(row.dataset.task);
    if (S.taskSelect) {
      S.taskSelected.has(id) ? S.taskSelected.delete(id) : S.taskSelected.add(id);
      return renderTasksBody();
    }
    openTaskPanel(id);
  });
}

async function taskBulkAction(kind) {
  const ids = [...S.taskSelected].filter(taskById);
  if (kind === 'all') {
    const visible = $$('#tasks-body [data-task]').map((el) => Number(el.dataset.task));
    S.taskSelected = new Set(ids.length >= visible.length ? [] : visible);
    return renderTasksBody();
  }
  if (!ids.length) return;
  if (kind === 'delete') {
    const n = ids.length;
    const ok = await confirmBulkDelete(n, {
      title: `Удалить ${n} ${plural(n, 'задачу', 'задачи', 'задач')}?`,
      text: 'Выбранные задачи попадут в «Недавно удалённые» — их можно будет восстановить в течение 30 дней.',
    });
    if (!ok) return;
  }
  S.taskSelect = false;
  S.taskSelected.clear();
  if (kind === 'complete') return setCompleted(ids.filter((id) => !isDone(taskById(id))), true);
  if (kind === 'reopen') return setCompleted(ids, false);
  if (kind === 'delete') return deleteTasks(ids);
}

// Завершить или вернуть в работу; в уведомлении — «Отменить»
async function setCompleted(ids, completed, { undoable = true } = {}) {
  if (!ids.length) return renderTasksBody();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  ids.forEach((id) => { const t = taskById(id); if (t) t.completed_at = completed ? t.completed_at || now : null; });
  refreshTasks();
  try {
    const { tasks } = await api('POST', '/api/tasks/complete', { ids, completed });
    tasks.forEach((nt) => { const t = taskById(nt.id); if (t) Object.assign(t, nt); });
    refreshTasks();
    if (!undoable) return;
    const n = ids.length;
    const text = completed
      ? (n === 1 ? 'Задача завершена' : `Завершено: ${n} ${plural(n, 'задача', 'задачи', 'задач')}`)
      : (n === 1 ? 'Задача возвращена в работу' : `Возвращено в работу: ${n} ${plural(n, 'задача', 'задачи', 'задач')}`);
    toast(text, '', { label: 'Отменить', fn: () => setCompleted(ids, !completed, { undoable: false }) });
  } catch (err) {
    S.tasks = await api('GET', '/api/tasks').catch(() => S.tasks);
    refreshTasks();
    fail(err);
  }
}

async function deleteTasks(ids) {
  const set = new Set(ids);
  S.tasks = S.tasks.filter((t) => !set.has(t.id));
  refreshTasks();
  try {
    const { trashed } = await api('POST', '/api/tasks/delete', { ids });
    S.taskTrash = null;
    refreshTasks();
    const n = ids.length;
    toast(n === 1 ? 'Задача удалена' : `Удалено: ${n} ${plural(n, 'задача', 'задачи', 'задач')}`, '',
      trashed.length ? { label: 'Отменить', fn: () => restoreTasks(trashed, { undo: true }) } : null);
  } catch (err) {
    S.tasks = await api('GET', '/api/tasks').catch(() => S.tasks);
    refreshTasks();
    fail(err);
  }
}

/* ---------- Задачи: «Недавно удалённые» (своя корзина, не общая с Заметками) ---------- */
async function loadTaskTrash() {
  S.taskTrash = { loading: true, days: 30, items: [] };
  try { S.taskTrash = await api('GET', '/api/trash/tasks'); } catch (e) { S.taskTrash = { days: 30, items: [] }; fail(e); }
  if (S.section === 'tasks') renderTasksBody();
}

function taskTrashSection() {
  const t = S.taskTrash;
  const n = t && !t.loading ? t.items.length : 0;
  const head = `
    <div class="toc-head">
      <h3><button class="trash-toggle ${S.taskTrashOpen ? 'open' : ''}" data-fold="trash" aria-expanded="${S.taskTrashOpen}">
        ${icon('chevron')}<span>Недавно удалённые</span>${n ? `<span class="trash-n">${n}</span>` : ''}</button></h3>
      ${S.taskTrashOpen && n ? '<button class="btn ghost" data-ttrash="clear">Очистить</button>' : ''}
    </div>`;
  const wrap = (inner) => `<section class="task-group fold trash">${head}${inner}</section>`;
  if (!S.taskTrashOpen) return wrap('');
  if (!t || t.loading) return wrap('<p class="toc-empty">Загрузка…</p>');
  if (!n) return wrap(`<p class="toc-empty">Здесь пусто. Удалённые задачи хранятся ${t.days} дней, потом удаляются навсегда.</p>`);
  const rows = t.items.map((it) => {
    const left = trashDaysLeft(it, t.days);
    const was = it.completed_at ? 'была завершена' : `была в «${esc(statusOf(it.status).name)}»`;
    return `<li class="trash-row" data-id="${it.id}">
      ${icon('tasks')}
      <span class="trash-main">
        <span class="toc-title ${it.title.trim() ? '' : 'untitled'}">${esc(it.title.trim() || 'Без названия')}</span>
        <span class="trash-sub">${was}</span>
      </span>
      <span class="trash-meta ${left <= 3 ? 'soon' : ''}">удалена ${ago(it.deleted_at)} · ${left <= 1 ? 'удалится сегодня' : `осталось ${left} дн.`}</span>
      <button class="btn ghost" data-ttrash="restore">Восстановить</button>
      <button class="icon-btn" data-ttrash="purge" title="Удалить навсегда" aria-label="Удалить навсегда">${icon('trash')}</button>
    </li>`;
  }).join('');
  return wrap(`<p class="hint">Удалённые задачи хранятся ${t.days} дней, потом удаляются навсегда.</p>
    <ol class="toc trash-list">${rows}</ol>`);
}

async function taskTrashAction(btn) {
  const kind = btn.dataset.ttrash;
  if (kind === 'clear') {
    const n = S.taskTrash.items.length;
    const ok = await confirmDialog({
      title: 'Очистить «Недавно удалённые»?',
      text: `${n} ${plural(n, 'задача будет удалена', 'задачи будут удалены', 'задач будут удалены')} навсегда. Вернуть их будет нельзя.`,
      okText: 'Удалить навсегда', danger: true,
    });
    if (!ok) return;
    try { await api('DELETE', '/api/trash/tasks'); toast('Корзина очищена'); } catch (e) { fail(e); }
    return loadTaskTrash();
  }
  const id = Number(btn.closest('.trash-row').dataset.id);
  if (kind === 'restore') return restoreTasks([id]);
  const it = S.taskTrash.items.find((x) => x.id === id);
  const ok = await confirmDialog({
    title: `Удалить «${it.title.trim() || 'Без названия'}» навсегда?`, text: 'Вернуть задачу будет нельзя.',
    okText: 'Удалить навсегда', danger: true,
  });
  if (!ok) return;
  try { await api('DELETE', `/api/trash/tasks/${id}`); toast('Удалено навсегда'); } catch (err) { fail(err); }
  loadTaskTrash();
}

async function restoreTasks(ids, { undo = false } = {}) {
  try {
    const { restored } = await api('POST', '/api/trash/tasks/restore', { ids });
    restored.forEach((t) => { if (!taskById(t.id)) S.tasks.push(t); });
    S.taskTrash = null;
    refreshTasks();
    if (undo) toast('Удаление отменено');
    else if (restored.length === 1) toast(`«${taskTitle(restored[0])}» восстановлена`);
  } catch (e) { fail(e); }
}

/* ---------- уведомления на этом устройстве ---------- */
// Подписка — у каждого браузера своя. Сервер шлёт напоминание через службу уведомлений браузера,
// а sw.js показывает его, даже когда Silo закрыт. На iPhone это работает только в приложении с экрана «Домой».
const Push = {
  isIos: () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  standalone: () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  supported: () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  // Почему уведомления недоступны (или '' — доступны)
  problem() {
    if (!this.supported()) {
      if (this.isIos() && !this.standalone()) return 'На iPhone уведомления приходят только в приложении: в Safari нажмите «Поделиться» → «На экран Домой» и откройте Silo оттуда.';
      return 'Этот браузер не умеет показывать уведомления.';
    }
    if (Notification.permission === 'denied') return 'Уведомления для Silo запрещены в настройках браузера. Разрешите их там и включите снова.';
    return '';
  },
  register() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  },
  async subscription() {
    if (!this.supported()) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? reg.pushManager.getSubscription() : null;
  },
  async on() { return Notification.permission === 'granted' && !!(await this.subscription()); },
  // Включить: спросить разрешение (должно идти сразу по нажатию), подписаться, отправить подписку на сервер
  async enable() {
    if (this.problem()) throw new Error(this.problem());
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (perm !== 'granted') throw new Error(perm === 'denied' ? this.problem() : 'Вы не разрешили уведомления');
    this.register();
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { publicKey } = await api('GET', '/api/push/key');
      const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
      // если служба уведомлений браузера недоступна (сеть, VPN), подписка может зависнуть — ждём не дольше 20 с
      sub = await Promise.race([
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }),
        new Promise((_, no) => setTimeout(() => no(new Error('Служба уведомлений браузера не отвечает. Проверьте интернет и попробуйте ещё раз')), 20000)),
      ]);
    }
    await api('POST', '/api/push/subscribe', sub.toJSON());
    return sub;
  },
  async disable() {
    const sub = await this.subscription();
    if (!sub) return;
    await api('POST', '/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  },
  // При установке напоминания: если уведомления на этом устройстве ещё не включены — включаем,
  // а если нельзя — объясняем, почему напоминание не придёт сюда
  ensure() {
    if (this.supported() && Notification.permission === 'granted') {
      this.subscription().then((s) => s || this.enable()).catch(() => {});
      return;
    }
    const why = this.problem();
    if (why) { toast(`Напоминание сохранено, но на это устройство не придёт. ${why}`, 'error'); return; }
    this.enable()
      .then(() => toast('Уведомления включены — напоминание придёт на это устройство'))
      .catch((e) => toast(`Напоминание сохранено, но уведомления не включены. ${e.message}`, 'error'));
  },
  // После входа: подписка этого устройства (если есть) привязывается к вошедшему пользователю
  async sync() {
    try {
      if (!(await this.on())) return;
      await api('POST', '/api/push/subscribe', (await this.subscription()).toJSON());
    } catch { /* не страшно — повторим при следующем входе */ }
  },
};

/* ---------- напоминания ---------- */
// remind_at — UTC (из базы 'ГГГГ-ММ-ДД ЧЧ:ММ:СС', после правки — ISO), remind_before — минут до срока
// (у срока без времени отсчёт от начала дня: −540 — «в день срока, 9:00», 900 — «накануне, 9:00»)
const REMIND_PRESETS = [
  { before: 0, label: 'В момент срока', timed: true },
  { before: 15, label: 'За 15 минут', timed: true },
  { before: 60, label: 'За 1 час', timed: true },
  { before: 1440, label: 'За 1 день', timed: true },
  { before: -540, label: 'В день срока, 9:00', timed: false },
  { before: 900, label: 'Накануне, 9:00', timed: false },
];
const parseUtc = (s) => new Date(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z');
const remindDate = (t) => (t.remind_at ? parseUtc(t.remind_at) : null);
const remindPending = (t) => !!t.remind_at && !isDone(t) && remindDate(t) > new Date();
const presetOf = (t) => (t.remind_before == null ? null
  : REMIND_PRESETS.find((p) => p.before === t.remind_before && p.timed === !!t.due_time) || null);
const remindFrom = (t, before) => new Date(dueAt(t).getTime() - before * 60e3);
// «Сегодня, 2 окт, 14:30»
const remindWhen = (t) => { const d = remindDate(t); return d ? withTime(dueLong(ymd(d)), d.toTimeString().slice(0, 5)) : ''; };
const remindLabel = (t) => presetOf(t)?.label || remindWhen(t);

// Срок изменился: напоминание «за N до срока» переезжает вместе со сроком; если вариант к новому сроку
// не подходит (убрали срок или время) — остаётся в прежнее время
function duePatch(t, date, time) {
  const patch = { due_date: date || null, due_time: date ? time || null : null };
  if (t.remind_at && t.remind_before != null) {
    const p = presetOf(t);
    const next = { ...t, ...patch };
    if (p && next.due_date && p.timed === !!next.due_time) Object.assign(patch, { remind_at: remindFrom(next, p.before).toISOString(), remind_before: p.before });
    else { patch.remind_at = remindDate(t).toISOString(); patch.remind_before = null; }
  }
  return patch;
}

function openRemindMenu(anchor, t, onSet) {
  const now = new Date();
  const opts = [];
  if (t.due_date) {
    for (const p of REMIND_PRESETS) {
      if (p.timed !== !!t.due_time) continue;
      const at = remindFrom(t, p.before);
      if (at > now) opts.push({ label: p.label, at, before: p.before });
    }
  }
  if (!opts.length) {
    const evening = new Date(); evening.setHours(18, 0, 0, 0);
    const morning = addDays(new Date(), 1); morning.setHours(9, 0, 0, 0);
    if (evening - now > 15 * 60e3) opts.push({ label: 'Сегодня, 18:00', at: evening });
    opts.push({ label: 'Завтра, 9:00', at: morning });
  }
  const cur = remindDate(t)?.getTime();
  const item = (o, i) => `<button data-m="${i}" class="${cur === o.at.getTime() ? 'on' : ''}">${icon('bell')}<span>${o.label}</span>
    <small>${esc(withTime(dueLong(ymd(o.at)), o.at.toTimeString().slice(0, 5)))}</small></button>`;
  showMenu(anchor, `<div class="remind-menu">${opts.map(item).join('')}
    <button data-m="custom">${icon('calendar')}<span>Выбрать дату и время…</span></button>
    ${t.remind_at ? `<hr><button data-m="off">${icon('x')}<span>Не напоминать</span></button>` : ''}</div>`, (m) => {
    if (m === 'off') return onSet({ remind_at: null });
    if (m === 'custom') {
      const d = remindDate(t) || (t.due_date ? dueAt(t) : null);
      return openDatePicker(anchor, d ? ymd(d) : null, (date, time) => {
        if (!date) return onSet({ remind_at: null });
        const at = new Date(`${date}T${time || '09:00'}`);
        if (at <= new Date()) return toast('Это время уже прошло — выберите время позже', 'error');
        Push.ensure();
        onSet({ remind_at: at.toISOString(), remind_before: null });
      }, { withTime: true, needTime: true, time: d ? d.toTimeString().slice(0, 5) : '09:00', clearLabel: 'Не напоминать', label: 'Время напоминания', live: false });
    }
    const o = opts[Number(m)];
    Push.ensure(); // разрешение на уведомления спрашиваем прямо по нажатию — иначе iPhone не покажет запрос
    onSet({ remind_at: o.at.toISOString(), remind_before: o.before ?? null });
  });
}

async function updateTask(t, patch) {
  Object.assign(t, patch);
  refreshTasks();
  try {
    Object.assign(t, await api('PATCH', `/api/tasks/${t.id}`, patch));
    renderTasksBody();
    Unsaved.saved(`task:${t.id}`, patch);
    return !Unsaved.items.has(`task:${t.id}`);
  } catch (e) { taskSaveFailed(t, patch, e); return false; }
}
// Не сохранилось — правки ждут повтора (панель «Не сохранено … Повторить»)
function taskSaveFailed(t, patch, e) {
  if (e.status === 404 || e.status === 401) { if (e.status === 404) fail(e); return; }
  Unsaved.add(`task:${t.id}`, `/api/tasks/${t.id}`, patch, `задача ${quoted(patch.title || t.title, 'без названия')}`);
}

function setupBoardDnD(root) {
  // #tasks-body не пересоздаётся при перерисовке доски — обработчики вешаем один раз,
  // иначе после каждого перемещения их становится больше и полоски-вставки множатся
  if (root.dataset.dnd) return;
  root.dataset.dnd = '1';
  let dragId = null;
  const ph = document.createElement('div');
  ph.className = 'card-placeholder';
  root.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card');
    if (!card || S.taskSelect) return;
    dragId = Number(card.dataset.task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragId));
    requestAnimationFrame(() => card.classList.add('dragging'));
  });
  root.addEventListener('dragend', () => {
    dragId = null;
    ph.remove();
    $$('.dragging, .column.drop', root).forEach((el) => el.classList.remove('dragging', 'drop'));
  });
  root.addEventListener('dragover', (e) => {
    const col = e.target.closest('.column');
    if (!dragId || !col) return;
    e.preventDefault();
    $$('.column.drop', root).forEach((c) => c !== col && c.classList.remove('drop'));
    col.classList.add('drop');
    const cards = $$('.card:not(.dragging)', col);
    const after = cards.find((c) => { const r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
    if (after) col.insertBefore(ph, after);
    else col.appendChild(ph);
  });
  root.addEventListener('drop', async (e) => {
    const col = e.target.closest('.column');
    if (!dragId || !col) return;
    e.preventDefault();
    const status = col.dataset.status;
    const ids = [];
    [...col.children].forEach((el) => {
      if (el === ph) ids.push(dragId);
      else if (el.classList?.contains('card') && Number(el.dataset.task) !== dragId) ids.push(Number(el.dataset.task));
    });
    ph.remove();
    ids.forEach((id, i) => { const t = taskById(id); t.status = status; t.position = i; });
    renderTasksBody();
    updateCounts();
    try { await api('POST', '/api/tasks/reorder', { status, ids }); } catch (err) { fail(err); }
  });
}

function openTaskPanel(id, { justCreated = false } = {}) {
  const t = taskById(id);
  if (!t) return;
  closeOverlays();
  const done = isDone(t);
  const ov = document.createElement('div');
  ov.className = 'overlay';
  const panel = document.createElement('aside');
  panel.className = `panel ${done ? 'is-done' : ''}`;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Задача');
  const completeBtn = done
    ? `<button class="btn tp-complete reopen" id="tp-complete">${icon('arrowUp')}Вернуть в работу</button>`
    : `<button class="btn tp-complete" id="tp-complete">${icon('check')}Завершить задачу</button>`;
  panel.innerHTML = `
    <div class="panel-body">
      <div class="tp-head">
        <textarea class="page-title" id="tp-title" rows="1" maxlength="300" placeholder="Название задачи">${esc(t.title)}</textarea>
        <div class="tp-actions">
          <span class="save-state tp-save" aria-live="polite"></span>
          <button class="icon-btn fav-btn" id="tp-fav" data-id="${t.id}"></button>
          <button class="icon-btn" id="tp-delete" title="Удалить задачу" aria-label="Удалить задачу">${icon('trash')}</button>
          <button class="done-btn" id="tp-close" title="Закрыть (Esc)">Готово</button>
        </div>
      </div>
      <div class="props">
        <span>Статус</span>
        ${done
          ? `<span class="prop-text done-state" title="${esc(ago(t.completed_at))}">${icon('check')}Завершена<span class="muted"><span class="ds-sep">· </span>${esc(fullDateTime(t.completed_at))}</span></span>`
          : `<select id="tp-status">${S.statuses.map((st) => `<option value="${st.key}" ${t.status === st.key ? 'selected' : ''}>${esc(st.name)}</option>`).join('')}</select>`}
        <span>Приоритет</span>
        <select id="tp-prio">${Object.entries(PRIORITY).map(([k, v]) => `<option value="${k}" ${t.priority === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <span>Срок</span>
        <button type="button" class="date-btn" id="tp-due"></button>
        <span>Напомнить</span>
        <button type="button" class="date-btn" id="tp-remind"></button>
        <span>Создана</span>
        <span class="prop-text" title="${esc(ago(t.created_at))}">${esc(fullDateTime(t.created_at))}</span>
      </div>
      <div class="tp-complete-row">${completeBtn}</div>
      <div class="editor-box">
        <div id="tp-toolbar"></div>
        <div class="editor" id="tp-desc" contenteditable="true" data-placeholder="Описание, заметки, чек-лист…">${t.description}</div>
      </div>
    </div>`;
  document.body.append(ov, panel);
  // Индикатор сохранения, как у заметок: «Изменено» → «Сохранение…» → «Сохранено» / «Не сохранено»
  const saveEl = $('.tp-save', panel);
  let saving = 0, saveFailed = false;
  // для отметки «Сохранено» в списке после закрытия: меняли ли задачу, что ещё отправляется, была ли ошибка
  let touched = justCreated, anyFailed = false;
  const inflight = new Set();
  const markDirty = () => { touched = true; saveEl.textContent = 'Изменено'; };
  const track = (run) => {
    touched = true;
    const p = (async () => {
      saving++;
      saveEl.textContent = 'Сохранение…';
      const ok = await run();
      if (!ok) { saveFailed = true; anyFailed = true; }
      if (--saving === 0) {
        const label = saveFailed ? Unsaved.label() : 'Сохранено';
        saveEl.textContent = shortSave(label);
        saveEl.classList.toggle('unsaved', label === 'Не сохранено');
        saveEl.classList.toggle('local', label === 'Сохранено на устройстве');
        saveFailed = false;
      }
      return ok;
    })();
    inflight.add(p);
    p.finally(() => inflight.delete(p));
    return p;
  };
  const update = (patch) => track(() => updateTask(t, patch));
  let closed = null;
  const close = () => {
    if (closed) return closed;
    ov.remove(); panel.remove(); document.removeEventListener('keydown', onKey);
    if (title.value.trim() || t.title.trim()) {
      saveTitleNow();
      saveDesc.flush();
      if (touched && S.tasks.includes(t)) {
        const pending = [...inflight];
        if (pending.length) setSavedMark('task', 'saving');
        Promise.all(pending).then(() => setSavedMark('task', anyFailed ? 'fail' : 'ok'));
      }
      return (closed = Promise.resolve());
    }
    return (closed = finalizeTask());
  };
  // Задача без названия не остаётся (как заметки): название — из первой строки описания,
  // без текста задача удаляется насовсем. Несохранённое описание уходит тем же запросом.
  const finalBody = () => {
    const html = serializeEditor(desc);
    const line = firstLine(html);
    const body = descDirty ? { description: html } : {};
    return line ? { ...body, title: line } : { ...body, description: '' };
  };
  const finalizeTask = async () => {
    saveTitle.cancel();
    saveDesc.cancel();
    if (!S.tasks.includes(t)) return;
    const body = finalBody();
    descDirty = false;
    const hasText = !!desc.textContent.trim();
    if (!hasText) { S.tasks = S.tasks.filter((x) => x !== t); refreshTasks(); updateCounts(); }
    else setSavedMark('task', 'saving');
    try {
      const r = await api('POST', `/api/tasks/${t.id}/finalize`, body);
      if (r.deleted) {
        if (S.tasks.includes(t)) { S.tasks = S.tasks.filter((x) => x !== t); refreshTasks(); updateCounts(); }
      } else if (r.title) {
        if (body.description !== undefined) t.description = body.description;
        t.title = r.title;
        refreshTasks();
        setSavedMark('task', anyFailed ? 'fail' : 'ok');
      }
    } catch (e) {
      // текст не теряем: сохраним его обычным запросом при повторе (название — первая строка)
      if (body.title) { t.title = body.title; refreshTasks(); taskSaveFailed(t, body, e); } else fail(e);
      if (hasText) setSavedMark('task', 'fail');
    }
  };
  // Закрытие вкладки с открытой карточкой: один keepalive-запрос (название из описания или сохранение описания)
  panel.unloadFn = () => {
    if (!S.tasks.includes(t)) return;
    const body = descDirty ? { description: serializeEditor(desc) } : {};
    const v = title.value.trim();
    if (v && v !== t.title) body.title = v;
    if (!v && !t.title.trim()) sendNow('POST', `/api/tasks/${t.id}/finalize`, finalBody());
    else if (Object.keys(body).length) sendNow('PATCH', `/api/tasks/${t.id}`, body);
  };
  // Перед завершением или удалением дожидаемся сохранения, чтобы не потерять последние правки
  const saveAll = async () => {
    saveTitle.cancel();
    saveDesc.cancel();
    const v = title.value.trim();
    const patch = {};
    if (v && v !== t.title) patch.title = v;
    if (descDirty) { patch.description = serializeEditor(desc); descDirty = false; }
    if (!Object.keys(patch).length) return;
    try { Object.assign(t, await api('PATCH', `/api/tasks/${t.id}`, patch)); Unsaved.saved(`task:${t.id}`, patch); } catch (e) { taskSaveFailed(t, patch, e); }
  };
  const onKey = (e) => { if (e.key === 'Escape' && !$('.modal')) close(); };
  document.addEventListener('keydown', onKey);
  ov.onclick = close;
  $('#tp-close', panel).onclick = close;
  panel.closeFn = close;
  const favBtn = $('#tp-fav', panel);
  setStarButton(favBtn, !!t.favorite_at);
  favBtn.onclick = () => setTaskFavorite(t, !t.favorite_at);

  const title = $('#tp-title', panel);
  const grow = () => { title.style.height = 'auto'; title.style.height = title.scrollHeight + 'px'; };
  grow();
  const saveTitleNow = () => {
    saveTitle.cancel();
    const v = title.value.trim();
    if (v && v !== t.title && S.tasks.includes(t)) update({ title: v });
  };
  const saveTitle = debounce(saveTitleNow, 500);
  title.oninput = () => { grow(); if (title.value.trim()) markDirty(); saveTitle(); preseal(title.value.trim()); };
  // Enter в названии — переход к описанию
  title.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitleNow(); desc.focus(); } };
  const statusSel = $('#tp-status', panel);
  if (statusSel) statusSel.onchange = (e) => update({ status: e.target.value });
  $('#tp-prio', panel).onchange = (e) => update({ priority: e.target.value });
  const dueBtn = $('#tp-due', panel);
  const remindBtn = $('#tp-remind', panel);
  const paintDue = () => {
    const overdue = !isDone(t) && isOverdue(t);
    dueBtn.className = `date-btn ${t.due_date ? '' : 'no-date'} ${overdue ? 'overdue' : ''}`;
    dueBtn.innerHTML = `${icon('calendar')}<span>${t.due_date ? withTime(dueLong(t.due_date), t.due_time) : 'Без срока'}</span>`;
    const pending = remindPending(t);
    remindBtn.className = `date-btn ${t.remind_at ? '' : 'no-date'} ${t.remind_at && !pending ? 'past' : ''}`;
    remindBtn.innerHTML = `${icon('bell')}<span>${t.remind_at ? esc(remindLabel(t)) : 'Не напоминать'}</span>`;
    remindBtn.title = t.remind_at ? `${pending ? 'Напомню' : 'Напоминание было'}: ${remindWhen(t)}` : '';
  };
  paintDue();
  const setDue = async (date, time) => {
    if (date === (t.due_date || null) && (time || null) === (t.due_time || null)) return;
    await update(duePatch(t, date, time));
    paintDue();
  };
  dueBtn.onclick = () => openDatePicker(dueBtn, t.due_date, setDue, { withTime: true, time: t.due_time });
  remindBtn.onclick = () => openRemindMenu(remindBtn, t, async (patch) => { await update(patch); paintDue(); });

  const desc = $('#tp-desc', panel);
  let descDirty = false;
  const saveDescNow = async () => {
    if (!descDirty) return;
    descDirty = false;
    await track(async () => {
      const patch = { description: serializeEditor(desc) };
      try {
        Object.assign(t, await api('PATCH', `/api/tasks/${t.id}`, patch));
        Unsaved.saved(`task:${t.id}`, patch);
        return !Unsaved.items.has(`task:${t.id}`);
      } catch (e) { taskSaveFailed(t, patch, e); return false; }
    });
  };
  const saveDesc = debounce(saveDescNow, 700);
  saveDesc.flush = () => { saveDesc.cancel(); saveDescNow(); };
  // свернули Silo / закрывают вкладку без связи — напечатанное сразу в очередь (см. visibilitychange)
  panel.flushFn = () => { if (title.value.trim() && title.value.trim() !== t.title) saveTitleNow(); saveDesc.flush(); };
  panel.dirtyFn = () => descDirty || (!!title.value.trim() && title.value.trim() !== t.title);
  // шифр для запроса при закрытии вкладки готовим заранее (см. preseal)
  const presealDesc = () => { const h = serializeEditor(desc); preseal(h, firstLine(h)); };
  $('#tp-toolbar', panel).replaceWith(makeEditor(desc, () => { descDirty = true; markDirty(); saveDesc(); presealDesc(); }));
  presealDesc();

  // Завершить — карточка закрывается, в уведомлении «Отменить». Вернуть в работу — карточка остаётся открытой
  $('#tp-complete', panel).onclick = async () => {
    await saveAll();
    justCreated = false;
    if (done) {
      await setCompleted([t.id], false);
      openTaskPanel(t.id);
    } else {
      await close();
      if (S.tasks.includes(t)) setCompleted([t.id], true);
    }
  };
  // Удаление — в «Недавно удалённые», без подтверждения; в уведомлении «Отменить»
  $('#tp-delete', panel).onclick = async () => {
    await saveAll();
    await close();
    if (S.tasks.includes(t)) deleteTasks([t.id]);
  };
  // Только что созданная задача — курсор сразу в название
  // на телефоне курсор ставим только в новую задачу — иначе при каждом открытии выезжает клавиатура
  const touch = matchMedia('(pointer: coarse)').matches;
  if (justCreated || (!touch && !t.description)) setTimeout(() => title.focus(), 50);
}

/* =========================================================
   Search (Ctrl+K)
   ========================================================= */
function openSearch() {
  closeOverlays();
  closeNav();
  const m = openModal(`
    <div class="palette-input">${icon('search')}<input id="q" placeholder="Поиск по заметкам и задачам" autocomplete="off"><span class="kbd">Esc</span></div>
    <div class="palette-results" id="results"></div>`, 'palette');
  const input = $('#q', m);
  const results = $('#results', m);
  let items = [];
  let sel = 0;
  const hl = (text, q) => {
    const safe = esc(text);
    if (!q) return safe;
    const re = new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return safe.replace(re, (x) => `<mark>${x}</mark>`);
  };
  const draw = (q, data) => {
    items = [];
    let html = '';
    if (data.pages.length) {
      html += '<h4>Заметки</h4>' + data.pages.map((p) => {
        items.push(`#/notes/${p.id}`);
        return `<div class="result" data-i="${items.length - 1}">${noteIcon(p.id)}<b>${hl(p.title || 'Без названия', q)}</b><small>${hl(p.snippet || '', q)}</small></div>`;
      }).join('');
    }
    if (data.tasks.length) {
      html += '<h4>Задачи</h4>' + data.tasks.map((t) => {
        items.push({ task: t.id });
        return `<div class="result" data-i="${items.length - 1}">${icon('tasks')}<b>${hl(taskTitle(t), q)}</b><small>${t.completed ? 'Завершена' : esc(statusOf(t.status).name)}${t.snippet ? ' · ' + hl(t.snippet, q) : ''}</small></div>`;
      }).join('');
    }
    results.innerHTML = html || `<div class="palette-empty">${q ? 'Ничего не найдено' : 'Начните вводить запрос'}</div>`;
    sel = 0;
    mark();
  };
  const mark = () => $$('.result', results).forEach((r) => r.classList.toggle('sel', Number(r.dataset.i) === sel));
  const go = (i) => {
    const it = items[i];
    if (!it) return;
    closeModal(m);
    if (typeof it === 'string') location.hash = it;
    else if (location.hash.startsWith('#/tasks')) openTaskPanel(it.task);
    else {
      S.openTaskAfterRoute = it.task;
      location.hash = '#/tasks';
    }
  };
  const recent = () => {
    const pages = [...S.pages].sort((a, b) => toDate(b.updated_at) - toDate(a.updated_at)).slice(0, 6)
      .map((p) => ({ id: p.id, title: p.title, snippet: 'Недавно изменена' }));
    draw('', { pages, tasks: [] });
  };
  // Заметки и задачи зашифрованы, поэтому ищем в браузере: при открытии поиска загружаем всё один раз
  let index = null;
  const loadIndex = async () => {
    if (index) return index;
    const data = await api('GET', '/api/search-index');
    const flat = (h) => htmlText(h).replace(/\s+/g, ' ').trim();
    data.pages.forEach((p) => { p.text = flat(p.content); });
    data.tasks.forEach((t) => { t.text = flat(t.description); });
    return (index = data);
  };
  const search = debounce(async () => {
    const q = input.value.trim();
    if (!q) return recent();
    try {
      const data = await loadIndex();
      if (input.value.trim() === q) draw(q, searchIndex(data, q));
    } catch (e) { fail(e); }
  }, 160);
  input.oninput = search;
  input.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); mark(); $('.result.sel', results)?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); $('.result.sel', results)?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter') { e.preventDefault(); go(sel); }
  };
  results.onclick = (e) => { const r = e.target.closest('.result'); if (r) go(Number(r.dataset.i)); };
  results.onmousemove = (e) => { const r = e.target.closest('.result'); if (r && Number(r.dataset.i) !== sel) { sel = Number(r.dataset.i); mark(); } };
  recent();
  input.focus();
}

document.addEventListener('keydown', (e) => {
  if (!S.user) return;
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
    e.preventDefault();
    openSearch();
  }
});

/* =========================================================
   Menus, modals, dialogs
   ========================================================= */
function showMenu(anchor, html, onPick) {
  closeMenus();
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.innerHTML = html;
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = Math.min(r.left, innerWidth - mw - 8);
  let top = r.bottom + 4;
  if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh - 4);
  menu.style.left = Math.max(8, left) + 'px';
  menu.style.top = top + 'px';
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    if (!b.dataset.keep) closeMenus();
    onPick(b.dataset.m, b);
  });
  setTimeout(() => menu.isConnected && document.addEventListener('mousedown', outside), 0);
  function outside(e) { if (!menu.contains(e.target)) closeMenus(); }
  // при закрытии меню снимаем и слушатель — иначе он закрывал бы окно, открытое из этого меню (календарь напоминания)
  menu.cleanup = () => { menu.remove(); document.removeEventListener('mousedown', outside); };
  $('button', menu)?.focus();
  return menu;
}
function closeMenus() { $$('.menu').forEach((m) => (m.cleanup ? m.cleanup() : m.remove())); }
// Свой выбор даты: быстрые варианты + календарь. onPick(дата, время): дата 'ГГГГ-ММ-ДД' или null (без срока).
// opts.withTime — внизу строка «Время» (время 'ЧЧ:ММ' или null); изменение времени при выбранной дате
// сохраняется сразу, календарь не закрывается. opts.needTime — без времени нельзя (напоминание);
// opts.clearLabel — подпись кнопки «Убрать …»; opts.label — подпись окна для экранного диктора
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
function openDatePicker(anchor, value, onPick, opts = {}) {
  const { withTime = false, needTime = false, clearLabel = 'Убрать срок', label = 'Выбор срока' } = opts;
  // со временем календарь не закрывается при выборе даты — закрывает кнопка «Готово» (или Enter в поле времени).
  // live: дата и время сохраняются сразу (срок задачи); иначе — только по «Готово» (напоминание)
  const stay = withTime;
  const live = opts.live ?? true;
  let time = opts.time || null;
  closeMenus();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tStr = ymd(today);
  const dow = (today.getDay() + 6) % 7; // 0 = понедельник
  const quick = [
    ['Сегодня', today],
    ['Завтра', addDays(today, 1)],
    ['В понедельник', addDays(today, 7 - dow)],
    ['Через неделю', addDays(today, 7)],
  ].filter(([l, d], i, all) => l !== 'В понедельник' || !all.some(([, x], j) => j !== i && ymd(x) === ymd(d))); // в вс и пн «В понедельник» совпадает с «Завтра» / «Через неделю»
  const base = value ? new Date(value + 'T00:00') : today;
  let year = base.getFullYear(), month = base.getMonth();
  let focusDay = value || tStr;

  const box = document.createElement('div');
  box.className = 'menu datepicker';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', label);
  document.body.append(box);

  const done = (v) => {
    const tv = $('#dp-time-in', box)?.value;
    if (tv) time = tv;
    cleanup();
    onPick(v, v ? time : null);
  };
  const finish = () => {
    const tv = $('#dp-time-in', box)?.value;
    if (tv && tv !== time) { time = tv; if (live && value) onPick(value, time); }
    cleanup();
    anchor.focus({ preventScroll: true });
    if (!live && value) onPick(value, time);
  };
  const pickDay = (d) => {
    if (!stay) return done(d);
    value = d; focusDay = d;
    const dt = new Date(d + 'T00:00');
    year = dt.getFullYear(); month = dt.getMonth();
    if (live) onPick(value, time);
    render();
    place(); // появилась строка «Убрать срок» — окно стало выше
    $(`.dp-day[data-d="${d}"]`, box)?.focus({ preventScroll: true });
  };
  function render() {
    const first = new Date(year, month, 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      const k = ymd(d);
      const cls = [d.getMonth() !== month && 'out', k === tStr && 'today', k === value && 'sel', i % 7 > 4 && 'we'].filter(Boolean).join(' ');
      cells += `<button type="button" class="dp-day ${cls}" data-d="${k}" tabindex="${k === focusDay ? 0 : -1}" aria-label="${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}">${d.getDate()}</button>`;
    }
    box.innerHTML = `
      <div class="dp-quick">${quick.map(([l, d]) => `<button type="button" data-d="${ymd(d)}" class="${ymd(d) === value ? 'on' : ''}"><span>${l}</span><small>${d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')}</small></button>`).join('')}</div>
      <div class="dp-head">
        <button type="button" class="icon-btn dp-nav" data-nav="-1" aria-label="Предыдущий месяц">${icon('chevron', 'flip')}</button>
        <span class="dp-title">${MONTHS[month]} ${year}</span>
        <button type="button" class="icon-btn dp-nav" data-nav="1" aria-label="Следующий месяц">${icon('chevron')}</button>
      </div>
      <div class="dp-grid">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((w) => `<span class="dp-wd">${w}</span>`).join('')}${cells}</div>
      ${withTime ? `<div class="dp-time">${icon('clock')}<label for="dp-time-in">Время</label>
        <input type="time" id="dp-time-in" class="input" value="${time || ''}" ${needTime ? 'required' : ''}>
        ${time && !needTime ? `<button type="button" class="icon-btn dp-time-x" data-notime title="Без времени" aria-label="Без времени">${icon('x')}</button>` : ''}</div>` : ''}
      ${stay ? `<div class="dp-foot"><button type="button" class="btn primary dp-done" data-done>Готово</button>
        ${value ? `<button type="button" class="dp-clear" data-clear>${icon('x')}${clearLabel}</button>` : ''}</div>`
        : value ? `<button type="button" class="dp-clear" data-clear>${icon('x')}${clearLabel}</button>` : ''}`;
    const ti = $('#dp-time-in', box);
    if (!ti) return;
    // время меняется на месте: если дата уже выбрана — сохраняем сразу (в режиме live), календарь остаётся открытым
    const setTime = (v) => {
      if ((v || null) === time || (needTime && !v)) return;
      time = v || null;
      if (live && value) onPick(value, time);
      const x = $('[data-notime]', box);
      if (!time && x) x.remove();
      else if (time && !x && !needTime) {
        ti.insertAdjacentHTML('afterend', `<button type="button" class="icon-btn dp-time-x" data-notime title="Без времени" aria-label="Без времени">${icon('x')}</button>`);
      }
    };
    ti.addEventListener('change', () => setTime(ti.value));
    ti.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); setTime(ti.value); if (value) finish(); } });
  }
  function place() {
    const r = anchor.getBoundingClientRect();
    const w = box.offsetWidth, h = box.offsetHeight;
    let top = r.bottom + 4;
    if (top + h > innerHeight - 8) top = r.top - h - 4 >= 8 ? r.top - h - 4 : Math.max(8, innerHeight - h - 8);
    box.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
    box.style.top = top + 'px';
  }
  const focusCell = () => $(`.dp-day[data-d="${focusDay}"]`, box)?.focus();
  function moveFocus(n) {
    const d = addDays(new Date(focusDay + 'T00:00'), n);
    focusDay = ymd(d);
    if (d.getMonth() !== month || d.getFullYear() !== year) { year = d.getFullYear(); month = d.getMonth(); render(); }
    else $$('.dp-day', box).forEach((b) => { b.tabIndex = b.dataset.d === focusDay ? 0 : -1; });
    focusCell();
  }

  box.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      month += Number(nav.dataset.nav);
      if (month < 0) { month = 11; year--; }
      if (month > 11) { month = 0; year++; }
      render();
      $(`[data-nav="${nav.dataset.nav}"]`, box).focus();
      return;
    }
    if (e.target.closest('[data-clear]')) return done(null);
    if (e.target.closest('[data-done]')) return finish();
    if (e.target.closest('[data-notime]')) {
      time = null;
      if (live && value) onPick(value, null);
      render();
      $('#dp-time-in', box)?.focus();
      return;
    }
    const day = e.target.closest('[data-d]');
    if (day) pickDay(day.dataset.d);
  });
  box.addEventListener('keydown', (e) => {
    if (!e.target.classList.contains('dp-day')) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) { e.preventDefault(); moveFocus(step); }
  });
  // Esc закрывает только календарь, а не всю карточку задачи
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); cleanup(); anchor.focus(); } };
  const outside = (e) => { if (!box.contains(e.target) && !anchor.contains(e.target)) cleanup(); };
  function cleanup() {
    box.remove();
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('mousedown', outside);
    window.removeEventListener('resize', cleanup);
  }
  box.cleanup = cleanup;
  window.addEventListener('keydown', onKey, true);
  setTimeout(() => document.addEventListener('mousedown', outside), 0);
  window.addEventListener('resize', cleanup);

  render();
  place();
  focusCell();
}

function searchIndex(data, q) {
  const ql = q.toLowerCase();
  const snip = (text) => {
    const i = text.toLowerCase().indexOf(ql);
    if (i < 0) return text.slice(0, 120);
    const start = Math.max(0, i - 50);
    const end = i + q.length + 70;
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  };
  const hit = (x) => `${x.title} ${x.text}`.toLowerCase().includes(ql);
  const newer = (a, b) => toDate(b.updated_at) - toDate(a.updated_at);
  return {
    pages: data.pages.filter(hit).sort(newer).slice(0, 20).map((p) => ({ id: p.id, title: p.title, snippet: snip(p.text) })),
    tasks: data.tasks.filter(hit).sort((a, b) => !!a.completed_at - !!b.completed_at || newer(a, b)).slice(0, 20)
      .map((t) => ({ id: t.id, title: t.title, status: t.status, completed: !!t.completed_at, snippet: snip(t.text) })),
  };
}

function openUserMenu(anchor) {
  const cur = themeChoice();
  const seg = (v, t) => `<button data-m="theme-${v}" data-keep="1" class="${cur === v ? 'on' : ''}">${t}</button>`;
  showMenu(anchor, `
    <div class="menu-label">Тема</div>
    <div class="seg">${seg('system', 'Как в системе')}${seg('light', 'Светлая')}${seg('dark', 'Тёмная')}</div>
    <hr>
    <button data-m="account">${icon('user')}Аккаунт</button>
    ${S.user.is_admin ? `<button data-m="users">${icon('users')}Пользователи</button>` : ''}
    <hr>
    <button data-m="logout">${icon('logout')}Выйти</button>`, async (m, btn) => {
    if (m.startsWith('theme-')) {
      applyTheme(m.slice(6));
      $$('.seg button', btn.closest('.menu')).forEach((b) => b.classList.toggle('on', b === btn));
    }
    if (m === 'account') openAccountDialog();
    if (m === 'users') openUsersDialog();
    if (m === 'logout') {
      await flushPageSave();
      if (Unsaved.items.size) await Unsaved.retry(true);
      if (Unsaved.items.size) {
        const n = Unsaved.items.size;
        const ok = await confirmDialog({
          title: 'Есть неотправленные изменения',
          text: `${n} ${plural(n, 'изменение', 'изменения', 'изменений')} пока только на этом устройстве — нет связи с сервером. Если выйти из аккаунта, ${n === 1 ? 'оно пропадёт' : 'они пропадут'}.`,
          okText: 'Выйти всё равно', danger: true,
        });
        if (!ok) return;
      }
      if (S.page) await finalizePage(S.page.id);
      // после выхода напоминания на это устройство не приходят; подписка браузера остаётся — при следующем входе
      // она привяжется к тому, кто вошёл
      const sub = await Push.subscription().catch(() => null);
      if (sub) await api('POST', '/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await api('POST', '/api/logout').catch(() => {});
      Unsaved.clear(S.user.id);
      await Unsaved.chain;
      await Vault.forget(S.user.id);
      S.user = null;
      S.page = null;
      history.replaceState(null, '', '/');
      renderAuth();
    }
  });
}

function openModal(html, cls = '') {
  closeMenus();
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.style.zIndex = 44;
  const m = document.createElement('div');
  m.className = `modal ${cls}`;
  m.setAttribute('role', 'dialog');
  m.innerHTML = html;
  m.overlay = ov;
  document.body.append(ov, m);
  ov.onclick = () => closeModal(m);
  m.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(m); });
  m.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeModal(m); } });
  // фокус внутрь окна, чтобы Esc и Tab работали сразу (окно может открыться из меню, когда фокус где-то снаружи)
  m.tabIndex = -1;
  requestAnimationFrame(() => { if (m.isConnected && !m.contains(document.activeElement)) m.focus({ preventScroll: true }); });
  return m;
}
function closeModal(m) { m.overlay?.remove(); m.remove(); m.onclose?.(); }
// Esc закрывает верхнее окно, даже если фокус остался снаружи (например, на кнопке, которая его открыла)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  const top = $$('.modal').pop();
  if (top && !top.contains(e.target)) { e.stopPropagation(); closeModal(top); }
}, true);
function closeOverlays(keepNothing) {
  closeMenus();
  $$('.modal').forEach(closeModal);
  $$('.panel').forEach((p) => p.closeFn ? p.closeFn() : p.remove());
  $$('.overlay').forEach((o) => o.remove());
  void keepNothing;
}

function confirmDialog({ title, text, okText = 'Ок', danger = false }) {
  return new Promise((resolve) => {
    const m = openModal(`
      <h2>${esc(title)}</h2><p>${esc(text)}</p>
      <div class="modal-actions"><button class="btn" data-close>Отмена</button><button class="btn ${danger ? 'danger solid' : 'primary'}" id="ok">${esc(okText)}</button></div>`);
    let done = false;
    m.onclose = () => { if (!done) resolve(false); };
    $('#ok', m).onclick = () => { done = true; closeModal(m); resolve(true); };
    $('#ok', m).focus();
  });
}

// Подтверждение массового удаления: кнопка включается, только когда введено слово заглавными буквами
const CONFIRM_WORD = 'УДАЛИТЬ';
const CONFIRM_WORD_FROM = 5; // слово просим, если удаляется столько штук или больше; меньше — обычное «Удалить / Отмена»
const confirmBulkDelete = (n, opts) => (n >= CONFIRM_WORD_FROM ? confirmTyped(opts) : confirmDialog({ ...opts, okText: 'Удалить', danger: true }));
function confirmTyped({ title, text, okText = 'Удалить' }) {
  return new Promise((resolve) => {
    const m = openModal(`
      <h2>${esc(title)}</h2><p>${esc(text)}</p>
      <label class="field confirm-word">
        <span>Чтобы подтвердить, введите <b>${CONFIRM_WORD}</b> заглавными буквами</span>
        <input class="input" id="cw-input" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="cw-hint">
        <small class="cw-hint" id="cw-hint"></small>
      </label>
      <div class="modal-actions"><button class="btn" data-close>Отмена</button><button class="btn danger solid" id="ok" disabled>${icon('trash')}${esc(okText)}</button></div>`);
    let done = false;
    m.onclose = () => { if (!done) resolve(false); };
    const input = $('#cw-input', m);
    const ok = $('#ok', m);
    const hint = $('#cw-hint', m);
    const check = () => {
      const v = input.value.trim();
      ok.disabled = v !== CONFIRM_WORD;
      // Слово верное, но не заглавными — подсказываем, а не молчим
      hint.textContent = v && v !== CONFIRM_WORD && v.toUpperCase() === CONFIRM_WORD ? 'Нужно заглавными буквами — включите Caps Lock' : '';
    };
    const confirm = () => { if (ok.disabled) return; done = true; closeModal(m); resolve(true); };
    input.oninput = check;
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } };
    ok.onclick = confirm;
    input.focus();
  });
}

/* =========================================================
   Статусы задач: добавить, переименовать, перекрасить, поменять порядок, удалить
   ========================================================= */
function openNotesSettings() {
  const m = openModal(`
    <h2>Настройки заметок</h2>
    <h3 class="set-caption">Вид</h3>
    <label class="set-row">
      <span class="set-text"><b>Нумерация заметок</b><span>Номера 1, 1.1, 1.1.1 вместо значков в списке и левой панели</span></span>
      <input type="checkbox" class="switch" id="set-numbering" role="switch" ${S.numbering ? 'checked' : ''}>
    </label>
    <div class="modal-actions">
      <button type="button" class="btn primary" data-close>Готово</button>
    </div>`, 'settings');
  $('#set-numbering', m).onchange = (e) => {
    S.numbering = e.target.checked;
    store.set('kb-numbering', S.numbering);
    renderTree();
    if (S.page) { renderCrumbs(); renderSubpages(); }
    else if (!location.hash.startsWith('#/tasks')) renderNotesHome();
  };
}

// Переключатель «Напоминания на этом устройстве» в «Настройках задач»
function bindPushSetting(m) {
  const sw = $('#set-push', m);
  const text = $('#push-text', m);
  const paint = async () => {
    const why = Push.problem();
    const on = !why && (await Push.on());
    sw.checked = on;
    sw.disabled = !!why;
    text.innerHTML = why ? esc(why)
      : on ? 'Напоминания о задачах придут сюда, даже когда Silo закрыт. <button type="button" class="link-btn" id="push-test">Проверить</button>'
        : 'Включите, чтобы получать напоминания о задачах на этот телефон или компьютер';
  };
  paint();
  sw.onchange = async () => {
    sw.disabled = true;
    try {
      if (sw.checked) await Push.enable(); else await Push.disable();
    } catch (e) { fail(e); }
    await paint();
  };
  text.addEventListener('click', async (e) => {
    if (!e.target.closest('#push-test')) return;
    e.preventDefault();
    try {
      const sub = await Push.subscription();
      await api('POST', '/api/push/test', { endpoint: sub?.endpoint });
      toast('Пробное уведомление отправлено');
    } catch (err) { fail(err); }
  });
}

function openStatusesDialog({ focus = null } = {}) {
  const m = openModal(`
    <h2>Настройки задач</h2>
    <h3 class="set-caption">Статусы</h3>
    <p>Статусы — это колонки на доске и группы в списке. «${esc(statusOf('todo').name)}» нельзя удалить — в него переходят задачи удалённого статуса, — но можно переименовать и перекрасить. Готовую задачу завершают кнопкой в её карточке, она попадает в блок «Завершённые».</p>
    <div class="st-list" id="st-list"></div>
    <div class="st-add-row"><button type="button" class="btn ghost" id="st-add">${icon('plus')}Добавить статус</button></div>
    <div class="st-default">
      <label for="st-default">Новые задачи попадают в</label>
      <select id="st-default"></select>
    </div>
    <h3 class="set-caption">Уведомления</h3>
    <label class="set-row">
      <span class="set-text"><b>Напоминания на этом устройстве</b><span id="push-text"></span></span>
      <input type="checkbox" class="switch" id="set-push" role="switch">
    </label>
    <div class="modal-actions">
      <button type="button" class="btn primary" data-close>Готово</button>
    </div>`, 'statuses');
  const list = $('#st-list', m);
  let openPalette = null;
  bindPushSetting(m);

  const refreshOutside = () => { renderTasksBody(); renderTree(); updateCounts(); };
  const apply = (statuses) => { S.statuses = statuses; draw(); refreshOutside(); };

  function draw() {
    list.innerHTML = S.statuses.map((st, i) => {
      const n = S.tasks.filter((t) => t.status === st.key && !isDone(t)).length;
      return `<div class="st-item" data-key="${st.key}">
        <div class="st-row">
          <button type="button" class="st-swatch" data-swatch style="background:var(--st-${st.color})"
            title="Выбрать цвет" aria-label="Цвет: ${STATUS_COLORS[st.color] || st.color}. Выбрать другой" aria-expanded="${openPalette === st.key}"></button>
          <input class="input st-name" value="${esc(st.name)}" maxlength="40" aria-label="Название статуса" autocomplete="off">
          <span class="st-count" title="Задач в этом статусе">${n || ''}</span>
          <button type="button" class="icon-btn" data-move="-1" ${i === 0 ? 'disabled' : ''} title="Выше" aria-label="Переместить выше">${icon('arrowUp')}</button>
          <button type="button" class="icon-btn" data-move="1" ${i === S.statuses.length - 1 ? 'disabled' : ''} title="Ниже" aria-label="Переместить ниже">${icon('arrowDown')}</button>
          ${st.fixed ? '<span class="st-lock" title="Встроенный статус — удалить нельзя"></span>'
            : `<button type="button" class="icon-btn" data-remove title="Удалить статус" aria-label="Удалить статус">${icon('trash')}</button>`}
        </div>
        ${openPalette === st.key ? `<div class="st-palette" role="group" aria-label="Цвет статуса">${Object.entries(STATUS_COLORS).map(([c, title]) =>
          `<button type="button" class="st-color ${c === st.color ? 'on' : ''}" data-color="${c}" style="background:var(--st-${c})" title="${title}" aria-label="${title}" aria-pressed="${c === st.color}">${icon('check')}</button>`).join('')}</div>` : ''}
      </div>`;
    }).join('');
    $('#st-default', m).innerHTML = S.statuses
      .map((st) => `<option value="${st.key}" ${st.default ? 'selected' : ''}>${esc(st.name)}</option>`).join('');
    $('#st-add', m).disabled = S.statuses.length >= 12;
    $('#st-add', m).title = S.statuses.length >= 12 ? 'Статусов может быть не больше 12' : '';
  }

  const keyOf = (el) => el.closest('[data-key]')?.dataset.key;
  const focusName = (key, select) => {
    const input = $(`[data-key="${key}"] .st-name`, m);
    if (!input) return;
    input.focus();
    if (select) input.select();
  };

  const saveName = async (input) => {
    const key = keyOf(input);
    const st = statusOf(key);
    const name = input.value.replace(/\s+/g, ' ').trim();
    if (name === st.name) { input.value = st.name; return; }
    if (!name) { input.value = st.name; toast('Название статуса не может быть пустым', 'error'); return; }
    try {
      // Без полной перерисовки, чтобы не сбить фокус, если пользователь уже перешёл к другому полю
      S.statuses = await api('PATCH', `/api/statuses/${key}`, { name });
      input.value = statusOf(key).name;
      const opt = $(`#st-default option[value="${key}"]`, m);
      if (opt) opt.textContent = statusOf(key).name;
      refreshOutside();
    } catch (e) { input.value = st.name; fail(e); }
  };
  list.addEventListener('change', (e) => { if (e.target.matches('.st-name')) saveName(e.target); });
  list.addEventListener('keydown', (e) => {
    if (!e.target.matches('.st-name')) return;
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
    if (e.key === 'Escape') { e.target.value = statusOf(keyOf(e.target)).name; }
  });

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const key = keyOf(btn);
    if (btn.hasAttribute('data-swatch')) {
      openPalette = openPalette === key ? null : key;
      draw();
      $(`[data-key="${key}"] .st-color.on`, m)?.focus();
      return;
    }
    if (btn.dataset.color) {
      openPalette = null;
      try { apply(await api('PATCH', `/api/statuses/${key}`, { color: btn.dataset.color })); } catch (err) { fail(err); }
      $(`[data-key="${key}"] [data-swatch]`, m)?.focus();
      return;
    }
    if (btn.dataset.move) {
      const keys = S.statuses.map((x) => x.key);
      const i = keys.indexOf(key);
      const j = i + Number(btn.dataset.move);
      if (j < 0 || j >= keys.length) return;
      [keys[i], keys[j]] = [keys[j], keys[i]];
      try { apply(await api('POST', '/api/statuses/reorder', { keys })); } catch (err) { fail(err); }
      $(`[data-key="${key}"] [data-move="${btn.dataset.move}"]:not(:disabled)`, m)?.focus();
      return;
    }
    if (btn.hasAttribute('data-remove')) {
      const st = statusOf(key);
      const n = S.tasks.filter((t) => t.status === key).length;
      if (n) {
        const ok = await confirmDialog({
          title: `Удалить статус «${st.name}»?`,
          text: `${n} ${plural(n, 'задача перейдёт', 'задачи перейдут', 'задач перейдут')} в «${statusOf('todo').name}».`,
          okText: 'Удалить', danger: true,
        });
        if (!ok) return;
      }
      try {
        const statuses = await api('DELETE', `/api/statuses/${key}`);
        if (n) S.tasks = await api('GET', '/api/tasks');
        apply(statuses);
        toast(st.default ? `Статус «${st.name}» удалён. Новые задачи теперь попадают в «${statusOf('todo').name}»` : `Статус «${st.name}» удалён`);
        $('#st-add', m).focus(); // фокус внутрь окна, чтобы Esc продолжал его закрывать
      } catch (err) { fail(err); }
    }
  });

  const addStatus = async () => {
    const used = new Set(S.statuses.map((x) => x.color));
    const color = Object.keys(STATUS_COLORS).find((c) => !used.has(c)) || 'blue';
    const names = new Set(S.statuses.map((x) => x.name.toLowerCase()));
    let name = 'Новый статус';
    for (let i = 2; names.has(name.toLowerCase()); i++) name = `Новый статус ${i}`;
    const before = new Set(S.statuses.map((x) => x.key));
    try {
      apply(await api('POST', '/api/statuses', { name, color }));
      const added = S.statuses.find((x) => !before.has(x.key));
      if (added) focusName(added.key, true);
    } catch (err) { fail(err); }
  };
  $('#st-add', m).onclick = addStatus;
  $('#st-default', m).onchange = async (e) => {
    try {
      apply(await api('PATCH', `/api/statuses/${e.target.value}`, { default: true }));
      toast(`Новые задачи будут попадать в «${statusOf(e.target.value).name}»`);
    } catch (err) { draw(); fail(err); }
  };

  draw();
  if (focus) focusName(focus, true);
}

// Имя и email (email — это логин). Для смены email просим текущий пароль: из него, как при входе,
// выводится auth, сервер сверяет его. Ключ шифрования от email не зависит — заметки остаются доступны
const profileBlock = () => `
  <form id="pf-form" class="set-block" novalidate>
    <div class="set-caption">Имя и email</div>
    <label class="field"><span>Имя</span><input class="input" id="pf-name" maxlength="80" autocomplete="name" value="${esc(S.user.name || '')}"></label>
    <label class="field"><span>Email — логин для входа</span><input class="input" id="pf-email" type="email" autocomplete="username" value="${esc(S.user.email)}"></label>
    <label class="field" id="pf-pass-row" hidden><span>Текущий пароль — нужен, чтобы сменить email</span><input class="input" id="pf-pass" type="password" autocomplete="current-password"></label>
    <p class="error-text" id="pf-err"></p>
    <div><button class="btn primary" id="pf-save" disabled>Сохранить</button></div>
  </form>`;

function bindProfile(m) {
  const name = $('#pf-name', m);
  const email = $('#pf-email', m);
  const pass = $('#pf-pass', m);
  const save = $('#pf-save', m);
  const norm = (v) => v.trim().toLowerCase();
  const sync = () => {
    const emailChanged = norm(email.value) !== S.user.email;
    $('#pf-pass-row', m).hidden = !emailChanged;
    save.disabled = !emailChanged && name.value.replace(/\s+/g, ' ').trim() === (S.user.name || '');
    $('#pf-err', m).textContent = '';
  };
  name.oninput = email.oninput = sync;
  $('#pf-form', m).onsubmit = async (e) => {
    e.preventDefault();
    const body = { name: name.value };
    const err = $('#pf-err', m);
    err.textContent = '';
    if (!name.value.trim()) { err.textContent = 'Напишите, как вас зовут'; return name.focus(); }
    if (norm(email.value) !== S.user.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm(email.value))) { err.textContent = 'Укажите корректный email'; return email.focus(); }
      if (!pass.value) { err.textContent = 'Введите текущий пароль'; return pass.focus(); }
      body.email = email.value;
    }
    save.disabled = true;
    save.textContent = 'Сохранение…';
    try {
      if (body.email) {
        const pre = await api('POST', '/api/prelogin', { email: S.user.email });
        body.auth = (await Vault.login(pass.value, pre.salt)).auth;
      }
      const { user } = await api('PATCH', '/api/me', body);
      S.user = { ...S.user, ...user };
      name.value = user.name;
      email.value = user.email;
      pass.value = '';
      pass.hidePass?.();
      updateUserBtn();
      toast(body.email ? 'Email изменён — входите с новым' : 'Имя изменено');
    } catch (ex) { err.textContent = ex.message; }
    save.textContent = 'Сохранить';
    const msg = err.textContent;
    sync();
    err.textContent = msg;
  };
}

function updateUserBtn() {
  const u = S.user;
  const b = $('#user-btn');
  if (!b) return;
  $('.avatar', b).textContent = (u.name || u.email).trim()[0]?.toUpperCase() || '?';
  $('.who b', b).textContent = u.name || u.email;
  $('.who small', b).textContent = u.email;
}

// Аккаунт: имя и email, пароль, код восстановления. Старый пароль для смены пароля не нужен: на этом устройстве ключ шифрования уже есть,
// так что, если пароль забыт, его можно сменить там, где вы уже вошли.
function openAccountDialog() {
  const m = openModal(`
    <h2>Аккаунт</h2>
    ${profileBlock()}
    <form id="pw-form" class="set-block">
      <div class="set-caption">Новый пароль</div>
      <label class="field"><span>Новый пароль (не короче ${MIN_PASSWORD} символов)</span><input class="input" type="password" id="pw-new" autocomplete="new-password"></label>
      <label class="field"><span>Повторите пароль</span><input class="input" type="password" id="pw-new2" autocomplete="new-password"></label>
      <p class="error-text" id="pw-err"></p>
      <div><button class="btn primary">Сменить пароль</button></div>
      <p class="set-hint">Старый пароль не нужен. На других устройствах нужно будет войти заново.</p>
    </form>
    <div class="set-block" id="rc-slot">
      <div class="set-caption">Код восстановления</div>
      <p class="set-hint">Нужен, если забудете пароль. Новый код заменит старый — старый перестанет работать.</p>
      <div><button class="btn" id="rc-new">Создать новый код</button></div>
    </div>
    <div class="modal-actions"><button type="button" class="btn" data-close>Готово</button></div>`);
  bindProfile(m);
  passToggle(m);
  $('#pw-form', m).onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#pw-form .btn.primary', m);
    $('#pw-err', m).textContent = '';
    try {
      checkNewPassword($('#pw-new', m).value, $('#pw-new2', m).value);
      btn.disabled = true;
      await api('POST', '/api/me/keys', await Vault.passwordKeys($('#pw-new', m).value));
      $('#pw-new', m).value = $('#pw-new2', m).value = '';
      hidePasswords($('#pw-form', m));
      toast('Пароль изменён');
    } catch (err) { $('#pw-err', m).textContent = err.message; }
    btn.disabled = false;
  };
  $('#rc-new', m).onclick = async () => {
    const ok = await confirmDialog({ title: 'Создать новый код?', text: 'Старый код восстановления перестанет работать.', okText: 'Создать' });
    if (!ok) return;
    try {
      const code = Vault.newCode();
      await api('POST', '/api/me/keys', await Vault.recoveryKeys(code));
      const slot = $('#rc-slot', m);
      slot.innerHTML = `<div class="set-caption">Код восстановления</div>
        <p class="set-hint">Сохраните новый код: скопируйте или скачайте файлом. Старый больше не работает.</p>${codeBlock(code)}`;
      bindCodeBlock(slot, code, S.user.email);
    } catch (err) { fail(err); }
  };
}

// Пользователи и приглашения. Администратор не задаёт пароли и не видит чужие заметки и задачи
async function openUsersDialog() {
  const m = openModal(`
    <h2>Пользователи</h2>
    <p>Пригласите человека по ссылке — пароль он придумает сам. Заметки и задачи зашифрованы: их видит только владелец, даже администратор не может их прочитать.</p>
    <div class="set-caption">Пригласить</div>
    <form id="inv-form" class="inv-form">
      <input class="input" id="inv-label" maxlength="60" placeholder="Для кого, например «Дима» (видно только вам)" autocomplete="off">
      <button class="btn primary">Создать ссылку</button>
    </form>
    <div id="inv-new"></div>
    <div id="inv-list"></div>
    <div class="set-caption">Аккаунты</div>
    <div class="table-wrap" id="users-list"><p class="muted">Загрузка…</p></div>
    <div class="modal-actions"><button type="button" class="btn" data-close>Закрыть</button></div>`, 'wide');
  const link = (token) => `${location.origin}/#/invite/${token}`;
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('Ссылка скопирована'); } catch { toast('Не удалось скопировать — выделите ссылку вручную', 'error'); }
  };
  const shortDate = (s) => toDate(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const load = async () => {
    try {
      const [users, invites] = await Promise.all([api('GET', '/api/admin/users'), api('GET', '/api/admin/invites')]);
      $('#users-list', m).innerHTML = `<table class="users-table"><tbody>${users.map((u) => `<tr>
          <td><b style="font-weight:500">${esc(u.name || '—')}</b> ${u.is_admin ? '<span class="role">админ</span>' : ''}<br><small class="muted">${esc(u.email)}</small></td>
          <td class="num">с ${esc(shortDate(u.created_at))}</td>
          <td style="text-align:right;width:1%">${u.id !== S.user.id ? `<button class="icon-btn" data-del="${u.id}" data-email="${esc(u.email)}" title="Удалить" aria-label="Удалить">${icon('trash')}</button>` : ''}</td>
        </tr>`).join('')}</tbody></table>`;
      $('#inv-list', m).innerHTML = invites.length ? `<table class="users-table"><tbody>${invites.map((i) => `<tr>
          <td><b style="font-weight:500">${esc(i.label || 'Приглашение')}</b><br><small class="${i.expired ? 'danger-text' : 'muted'}">${i.expired ? 'Срок истёк' : `Ждёт регистрации · действует до ${esc(shortDate(i.expires_at))}`}</small></td>
          <td style="text-align:right;white-space:nowrap;width:1%">
            ${i.expired ? '' : `<button class="btn ghost" data-copy="${esc(i.token)}">Скопировать ссылку</button>`}
            <button class="icon-btn" data-inv-del="${i.id}" title="Отменить приглашение" aria-label="Отменить приглашение">${icon('trash')}</button>
          </td></tr>`).join('')}</tbody></table>` : '';
    } catch (e) { fail(e); }
  };
  load();
  $('#inv-form', m).onsubmit = async (e) => {
    e.preventDefault();
    try {
      const { token, days } = await api('POST', '/api/admin/invites', { label: $('#inv-label', m).value });
      $('#inv-label', m).value = '';
      $('#inv-new', m).innerHTML = `<div class="inv-new">
        <div class="inv-link" id="inv-link">${esc(link(token))}</div>
        <div class="inv-row"><span class="set-hint">Отправьте ссылку человеку. Она одноразовая и действует ${days} ${plural(days, 'день', 'дня', 'дней')}.</span>
        <button type="button" class="btn" data-copy="${esc(token)}">Скопировать</button></div></div>`;
      copy(link(token));
      load();
    } catch (err) { fail(err); }
  };
  m.addEventListener('click', async (e) => {
    const cp = e.target.closest('[data-copy]');
    const del = e.target.closest('[data-del]');
    const invDel = e.target.closest('[data-inv-del]');
    if (cp) copy(link(cp.dataset.copy));
    if (invDel) {
      try { await api('DELETE', `/api/admin/invites/${invDel.dataset.invDel}`); $('#inv-new', m).innerHTML = ''; load(); } catch (err) { fail(err); }
    }
    if (del) {
      const ok = await confirmDialog({ title: 'Удалить пользователя?', text: `${del.dataset.email} и все его заметки и задачи будут удалены навсегда.`, okText: 'Удалить', danger: true });
      if (!ok) return;
      try { await api('DELETE', `/api/admin/users/${del.dataset.del}`); toast('Пользователь удалён'); load(); } catch (err) { fail(err); }
    }
  });
}

// Телефон: пока открыта клавиатура, подгоняем приложение под видимую часть экрана.
// iPhone не уменьшает страницу под клавиатуру, а сдвигает её вверх — вместе с панелью форматирования.
(function fitAppToKeyboard() {
  const vv = window.visualViewport;
  if (!vv || !matchMedia('(pointer: coarse)').matches) return;
  const root = document.documentElement;
  const typing = () => document.activeElement?.matches?.('input, textarea, [contenteditable="true"]');
  let raf = 0;
  const sync = () => {
    raf = 0;
    const open = typing() && vv.scale < 1.01 && window.innerHeight - vv.height > 80;
    if (!open) {
      if (root.classList.contains('kb-open')) {
        root.classList.remove('kb-open');
        root.style.removeProperty('--kb-top');
        root.style.removeProperty('--kb-h');
        if (window.scrollY) window.scrollTo(0, 0);
      }
      return;
    }
    root.style.setProperty('--kb-top', Math.round(vv.offsetTop) + 'px');
    root.style.setProperty('--kb-h', Math.round(vv.height) + 'px');
    const first = !root.classList.contains('kb-open');
    root.classList.add('kb-open');
    if (first) keepCaretVisible();
  };
  const later = () => { if (!raf) raf = requestAnimationFrame(sync); };
  // сдвиг видимой области догоняем сразу, без ожидания кадра — иначе экран успевает дёрнуться
  const now = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } sync(); };
  vv.addEventListener('resize', now);
  vv.addEventListener('scroll', now);
  document.addEventListener('focusin', () => { later(); setTimeout(later, 350); });
  document.addEventListener('focusout', () => { later(); setTimeout(later, 350); });
  // курсор в редакторе не должен прятаться под панелью форматирования или за краем экрана
  document.addEventListener('input', (e) => { if (root.classList.contains('kb-open') && e.target.closest?.('.editor')) keepCaretVisible(); });

  // Переход между названием и текстом при открытой клавиатуре. iPhone при смене поля сам прокручивает
  // страницу к нему, и экран дёргается. Поэтому короткое касание другого поля обрабатываем сами:
  // фокус без прокрутки и курсор в точку касания.
  let tap = null;
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    tap = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, at: Date.now() } : null;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (tap && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) > 10) tap = null;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const t = tap; tap = null;
    if (!t || Date.now() - t.at > 450 || !root.classList.contains('kb-open')) return;
    const field = e.target.closest?.('.page-title, .editor[contenteditable="true"]');
    const active = document.activeElement;
    if (!field || field === active || field.contains(active)) return;
    e.preventDefault();
    field.focus({ preventScroll: true });
    if (field.tagName === 'TEXTAREA') {
      const at = textareaOffsetAt(field, t.x, t.y);
      field.setSelectionRange(at, at);
    } else {
      const r = document.caretRangeFromPoint?.(t.x, t.y);
      const sel = getSelection();
      sel.removeAllRanges();
      if (r && field.contains(r.startContainer)) sel.addRange(r);
      else { const end = document.createRange(); end.selectNodeContents(field); end.collapse(false); sel.addRange(end); }
      // обычный клик тоже нужен: по нему отмечаются пункты чек-листа и т. п.
      e.target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: t.x, clientY: t.y }));
    }
    later();
  }, { passive: false });
})();

// Позиция символа в textarea под точкой касания: копия текста с теми же стилями поверх поля
function textareaOffsetAt(ta, x, y) {
  const cs = getComputedStyle(ta);
  const r = ta.getBoundingClientRect();
  const m = document.createElement('div');
  ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'paddingTop', 'paddingRight',
    'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderLeftWidth', 'borderRightWidth', 'borderStyle', 'boxSizing',
    'textTransform', 'textIndent', 'wordSpacing', 'tabSize'].forEach((p) => { m.style[p] = cs[p]; });
  Object.assign(m.style, {
    position: 'fixed', left: r.left + 'px', top: r.top - ta.scrollTop + 'px', width: r.width + 'px', margin: '0',
    whiteSpace: 'pre-wrap', overflowWrap: 'break-word', borderColor: 'transparent', opacity: '0', zIndex: '2147483647',
  });
  m.textContent = ta.value + '\u200b';
  document.body.appendChild(m);
  const cr = document.caretRangeFromPoint?.(x, y);
  const off = cr && m.contains(cr.startContainer) ? cr.startOffset : ta.value.length;
  m.remove();
  return Math.min(off, ta.value.length);
}

function keepCaretVisible() {
  const ed = document.activeElement?.closest?.('.editor');
  const sel = getSelection();
  if (!ed || !sel.rangeCount) return;
  const box = ed.closest('.main, .panel-body');
  if (!box) return;
  const r = sel.getRangeAt(0);
  let rect = r.getClientRects()[0];
  if (!rect) {
    const n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
    rect = n?.getBoundingClientRect();
  }
  if (!rect) return;
  const b = box.getBoundingClientRect();
  const bar = box.querySelector('.toolbar')?.getBoundingClientRect();
  const top = Math.max(b.top, bar ? bar.bottom : b.top) + 8;
  const bottom = b.bottom - 16;
  if (rect.bottom > bottom) box.scrollTop += rect.bottom - bottom;
  else if (rect.top < top) box.scrollTop -= top - rect.top;
}

boot();
