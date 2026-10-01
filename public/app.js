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
  move: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  palette: 'M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2zM7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01M17 11h.01',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  bold: 'M7 5h5.5a3.5 3.5 0 0 1 0 7H7zM7 12h6.5a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M10 5h8M6 19h8M14.5 5l-5 14',
  underline: 'M7 4v7a5 5 0 0 0 10 0V4M5 20h14',
  strike: 'M4 12h16M16.5 7c-.6-1.6-2.2-2.5-4.4-2.5-2.6 0-4.6 1.3-4.6 3.3 0 1.4.9 2.4 2.6 3M8 16.3c.6 2 2.3 3.2 4.6 3.2 2.7 0 4.6-1.3 4.6-3.4 0-.8-.2-1.4-.7-1.9',
  text: 'M5 7V5h14v2M12 5v14M9 19h6',
  chevronDown: 'M7 10l5 5 5-5',
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
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'kb' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && S.user) { S.user = null; renderAuth(); }
  if (!res.ok) throw new Error(data.error || 'Что-то пошло не так. Попробуйте ещё раз');
  return data;
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

// ---------- state ----------
const S = {
  user: null,
  pages: [],
  tasks: [],
  statuses: [],
  expanded: new Set(store.get('kb-expanded', [])),
  taskView: store.get('kb-task-view', 'list'),
  taskFilter: 'all',
  page: null, // currently open page with content
  numbering: store.get('kb-numbering', true),
  selectMode: false, // bulk selection on the notes home
  selected: new Set(),
  trash: null, // «Недавно удалённые» заметки: { days, items }, null — ещё не загружено
  trashOpen: store.get('kb-trash-open', false),
  taskSelect: false, // режим «Выбрать» в Задачах
  taskSelected: new Set(),
  taskTrash: null, // «Недавно удалённые» задачи: { days, items }
  taskTrashOpen: store.get('kb-task-trash-open', false),
  doneOpen: store.get('kb-done-open', false), // блок «Завершённые» развёрнут
  doneAll: false,
};
const saveExpanded = () => store.set('kb-expanded', [...S.expanded]);

// ---------- theme ----------
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  store.set('kb-theme-choice', t);
  try { if (t === 'system') localStorage.removeItem('kb-theme'); else localStorage.setItem('kb-theme', t); } catch { /* ignore */ }
}
const themeChoice = () => store.get('kb-theme-choice', 'system');

/* =========================================================
   Auth
   ========================================================= */
async function boot() {
  try {
    const { user, needsSetup } = await api('GET', '/api/me');
    if (user) { S.user = user; await startApp(); } else renderAuth(needsSetup);
  } catch (e) {
    $('#app').innerHTML = `<div class="auth"><div class="auth-card"><h1>Сервер недоступен</h1><p>${esc(e.message)}</p></div></div>`;
  }
}

function renderAuth(setup = false) {
  closeOverlays();
  $('#app').innerHTML = `
    <main class="auth">
      <div class="auth-card">
        <div class="auth-brand"><div class="logo">${LOGO}</div><b class="brand-name">Silo</b></div>
        <div style="display:grid;gap:6px">
          <h1>${setup ? 'Создайте аккаунт администратора' : 'Вход в аккаунт'}</h1>
          <p>${setup ? 'Это первый запуск. Администратор создаёт аккаунты для остальных пользователей.' : 'Аккаунт выдаёт администратор. Если забыли пароль, обратитесь к нему.'}</p>
        </div>
        <form id="auth-form" novalidate>
          ${setup ? '<label class="field"><span>Имя</span><input class="input" id="a-name" autocomplete="name"></label>' : ''}
          <label class="field"><span>Email</span><input class="input" id="a-email" type="email" autocomplete="username" required></label>
          <label class="field"><span>Пароль${setup ? ' (не короче 8 символов)' : ''}</span><input class="input" id="a-pass" type="password" autocomplete="${setup ? 'new-password' : 'current-password'}" required></label>
          <p class="error-text" id="a-err"></p>
          <button class="btn primary" type="submit">${setup ? 'Создать и войти' : 'Войти'}</button>
        </form>
      </div>
    </main>`;
  $('#a-email').focus();
  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter || $('#auth-form button');
    btn.disabled = true;
    $('#a-err').textContent = '';
    try {
      const body = { email: $('#a-email').value, password: $('#a-pass').value };
      if (setup) body.name = $('#a-name').value;
      const { user } = await api('POST', setup ? '/api/setup' : '/api/login', body);
      S.user = user;
      await startApp();
    } catch (err) {
      $('#a-err').textContent = err.message;
      btn.disabled = false;
    }
  });
}

async function startApp() {
  [S.pages, S.tasks, S.statuses] = await Promise.all([api('GET', '/api/pages'), api('GET', '/api/tasks'), api('GET', '/api/statuses')]);
  renderShell();
  if (!location.hash) location.hash = '#/notes';
  else route();
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
async function route() {
  if (!S.user) return;
  const [, section, id] = location.hash.split('/');
  await flushPageSave();
  if (S.page && !(section === 'notes' && Number(id) === S.page.id)) await finalizePage(S.page.id);
  closeOverlays(true);
  if (section !== 'notes' || id) { S.selectMode = false; S.selected.clear(); }
  S.taskSelect = false;
  S.taskSelected.clear();
  if (section === 'tasks') return renderTasks();
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
          <h1>Заметки</h1>
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
          <button class="btn ghost" id="toggle-all">${anyOpen ? 'Свернуть всё' : 'Развернуть всё'}</button>
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
  updateFab();
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
  $('#toggle-all').onclick = () => {
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
    store.set('kb-trash-open', S.trashOpen);
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
    setSaveState('Сохранено');
  } catch (e) {
    setSaveState('Не сохранено');
    fail(e);
  }
}
function queuePageSave(data) {
  if (!S.page) return;
  pendingSave = { id: S.page.id, data: { ...(pendingSave?.id === S.page.id ? pendingSave.data : {}), ...data } };
  setSaveState('Изменено');
  pageSave();
}
function setSaveState(t) { const el = $('#save-state'); if (el) el.textContent = t; }

// Заметка без названия не сохраняется: при уходе с неё сервер даёт название из первой строки текста,
// а совсем пустую удаляет. Состояние на клиенте подтягиваем под ответ.
async function finalizePage(id) {
  const p = pageById(id);
  if (!p || p.title.trim()) return;
  try {
    const r = await api('POST', `/api/pages/${id}/finalize`);
    if (r.deleted) {
      S.pages = S.pages.filter((x) => x.id !== id);
      S.expanded.delete(id);
      updateCounts();
    } else if (r.title) p.title = r.title;
    renderTree();
  } catch { /* не мешаем уйти со страницы */ }
}

window.addEventListener('beforeunload', () => {
  $('.panel')?.unloadFn?.();
  const data = pendingSave?.data || {};
  // заметка без названия — один запрос, который и сохраняет, и даёт название (или удаляет пустую)
  if (S.page && !pageById(S.page.id)?.title.trim()) sendNow('POST', `/api/pages/${S.page.id}/finalize`, data);
  else if (pendingSave) sendNow('PATCH', `/api/pages/${pendingSave.id}`, data);
});
function sendNow(method, url, body) {
  fetch(url, {
    method, keepalive: true, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'kb' },
    body: JSON.stringify(body),
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
    ${topbar('<nav class="crumbs" id="crumbs"></nav><span class="save-state" id="save-state"></span><button class="icon-btn fav-btn" id="page-fav"></button><button class="icon-btn" id="page-more" aria-label="Действия с заметкой">' + icon('more') + '</button>')}
    <article class="page">
      <textarea class="page-title" id="page-title" rows="1" placeholder="Без названия" maxlength="300">${esc(page.title)}</textarea>
      <div class="page-meta"><span id="page-num"></span>Изменено ${ago(page.updated_at)}</div>
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
    renderTree();
    renderCrumbs();
  });
  title.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); placeCaretStart($('#editor')); }
  });
  const editor = $('#editor');
  $('#toolbar-slot').replaceWith(makeEditor(editor, () => queuePageSave({ content: serializeEditor(editor) })));
  $('#page-more').onclick = (e) => openPageMenu(e.currentTarget, id);
  updatePageFavButton();
  $('#page-fav').onclick = () => setPageFavorite(pageById(id) || S.page, !S.page.favorite_at);
  if (!page.title && !page.content) title.focus();
}

function renderCrumbs() {
  const el = $('#crumbs');
  if (!el || !S.page) return;
  const chain = [...ancestors(S.page.id), pageById(S.page.id)].filter(Boolean);
  const num = $('#page-num');
  if (num) num.textContent = S.numbering ? `Заметка ${pageNumbers().get(S.page.id)} · ` : '';
  el.innerHTML = `<a href="#/notes">Заметки</a>` + chain.map((p) => `<span class="sep">/</span><a href="#/notes/${p.id}">${esc(titleOf(p))}</a>`).join('');
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
        <span class="toc-title">${esc(titleOf(k))}</span>
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
  let curBlock = 'p';

  const changed = () => { markEmpty(); onChange(); };
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
    $('[data-block-label]', bar).textContent = BLOCKS[curBlock];
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
const FILTERS = [
  { id: 'all', title: 'Все', test: (t) => !isDone(t) },
  { id: 'today', title: 'На сегодня', test: (t) => !isDone(t) && t.due_date && t.due_date <= todayStr() },
  { id: 'overdue', title: 'Просроченные', test: (t) => !isDone(t) && t.due_date && t.due_date < todayStr() },
  { id: 'high', title: 'Высокий приоритет', test: (t) => !isDone(t) && t.priority === 'high' },
];

function renderTasks() {
  S.page = null;
  setActiveNav('tasks');
  renderTree();
  $('#main').innerHTML = `
    ${topbar('', 'bare')}
    <div class="tasks-wrap ${S.taskView === 'board' ? 'wide' : ''}">
      <div class="tasks-head home-head">
        <div class="home-title">
          <h1>Задачи</h1>
          <p class="home-sub" id="tasks-sub"></p>
        </div>
        <button class="btn ghost" id="edit-statuses" title="Добавить, переименовать или перекрасить статусы">${icon('palette')}Статусы</button>
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
  $('#edit-statuses').onclick = () => openStatusesDialog();
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
  const extra = S.taskFilter === 'today' || S.taskFilter === 'overdue' ? { due_date: todayStr() }
    : S.taskFilter === 'high' ? { priority: 'high' } : {};
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
  $('#filters').innerHTML = FILTERS.map((f) => {
    const n = S.tasks.filter(f.test).length;
    return `<button class="chip ${S.taskFilter === f.id ? 'on' : ''}" data-filter="${f.id}">${f.title}<span class="n">${n}</span></button>`;
  }).join('');
  $$('[data-filter]').forEach((b) => b.onclick = () => { S.taskFilter = b.dataset.filter; S.taskSelected.clear(); renderTasksBody(); });
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

  const filter = FILTERS.find((f) => f.id === S.taskFilter);
  const list = S.tasks.filter(filter.test);
  const byStatus = (s) => list.filter((t) => t.status === s).sort((a, b) => a.position - b.position || b.id - a.id);
  let main;
  if (S.taskView === 'board') {
    main = `<div class="board ${S.taskSelect ? 'selecting' : ''}" style="--cols:${S.statuses.length}">${S.statuses.map(({ key: s }) => {
      const items = byStatus(s);
      return `<section class="column" data-status="${s}">
        <div class="column-head"><span class="dot" style="background:${statusColor(s)}"></span><span class="col-name">${esc(statusOf(s).name)}</span><span class="kids-n">${items.length}</span></div>
        ${items.map(taskCard).join('') || '<div class="col-empty">Перетащите сюда задачу</div>'}
      </section>`;
    }).join('')}</div>`;
  } else {
    // Группы списка идут в том же порядке, что и колонки доски (порядок из окна «Статусы»)
    const order = S.statuses.map((x) => x.key);
    // Задачи со статусом, которого уже нет (удалён в другой вкладке), не должны пропасть из списка
    list.forEach((t) => { if (!order.includes(t.status)) order.push(t.status); });
    const groups = order.map((s) => ({ s, items: byStatus(s) })).filter((g) => g.items.length);
    main = groups.length ? groups.map((g) => `
      <section class="task-group">
        <h3><span class="dot" style="background:${statusColor(g.s)}"></span>${esc(statusOf(g.s).name)}<span class="kids-n">${g.items.length}</span></h3>
        <div class="task-list">${g.items.map(taskRow).join('')}</div>
      </section>`).join('')
      : `<p class="muted">${S.taskFilter === 'all' ? 'Все задачи завершены.' : 'Под этот фильтр задач нет.'}</p>`;
  }
  body.innerHTML = main + (S.taskFilter === 'all' ? doneSection() : '') + taskTrashSection() + taskBulkBar();
  const allBtn = $('[data-bulk="all"]', body);
  if (allBtn) {
    const visible = $$('[data-task]', body).length;
    allBtn.textContent = S.taskSelected.size && S.taskSelected.size >= visible ? 'Снять выделение' : 'Выбрать все';
  }
  if (S.taskView === 'board') setupBoardDnD(body);
  if (S.taskTrash === null && S.taskTrashOpen) loadTaskTrash();
}

// «Завершённые» — свёрнутый блок под задачами, свежие сверху
function doneSection() {
  const done = S.tasks.filter(isDone).sort((a, b) => toDate(b.completed_at) - toDate(a.completed_at) || b.id - a.id);
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
    const cls = t.due_date < todayStr() ? 'overdue' : t.due_date === todayStr() ? 'today' : '';
    parts.push(`<span class="due ${cls}">${icon('calendar')}${dueLabel(t.due_date)}</span>`);
  }
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
      if (fold.dataset.fold === 'done') { S.doneOpen = !S.doneOpen; store.set('kb-done-open', S.doneOpen); }
      else { S.taskTrashOpen = !S.taskTrashOpen; store.set('kb-task-trash-open', S.taskTrashOpen); }
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

async function updateTask(t, patch) {
  Object.assign(t, patch);
  refreshTasks();
  try {
    Object.assign(t, await api('PATCH', `/api/tasks/${t.id}`, patch));
    renderTasksBody();
    return true;
  } catch (e) { fail(e); return false; }
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
          <button class="icon-btn" id="tp-close" title="Закрыть (Esc)" aria-label="Закрыть">${icon('x')}</button>
        </div>
      </div>
      <div class="props">
        <span>Статус</span>
        ${done
          ? `<span class="prop-text done-state" title="${esc(ago(t.completed_at))}">${icon('check')}Завершена<span class="muted">· ${esc(fullDateTime(t.completed_at))}</span></span>`
          : `<select id="tp-status">${S.statuses.map((st) => `<option value="${st.key}" ${t.status === st.key ? 'selected' : ''}>${esc(st.name)}</option>`).join('')}</select>`}
        <span>Приоритет</span>
        <select id="tp-prio">${Object.entries(PRIORITY).map(([k, v]) => `<option value="${k}" ${t.priority === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <span>Срок</span>
        <button type="button" class="date-btn" id="tp-due"></button>
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
  const markDirty = () => { saveEl.textContent = 'Изменено'; };
  const track = async (run) => {
    saving++;
    saveEl.textContent = 'Сохранение…';
    const ok = await run();
    if (!ok) saveFailed = true;
    if (--saving === 0) {
      saveEl.textContent = saveFailed ? 'Не сохранено' : 'Сохранено';
      saveFailed = false;
    }
    return ok;
  };
  const update = (patch) => track(() => updateTask(t, patch));
  let closed = null;
  const close = () => {
    if (closed) return closed;
    ov.remove(); panel.remove(); document.removeEventListener('keydown', onKey);
    if (title.value.trim() || t.title.trim()) {
      saveTitleNow();
      saveDesc.flush();
      return (closed = Promise.resolve());
    }
    return (closed = finalizeTask());
  };
  // Задача без названия не остаётся (как заметки): сервер даёт название из первой строки описания,
  // а без текста удаляет насовсем. Несохранённое описание уходит тем же запросом.
  const finalizeTask = async () => {
    saveTitle.cancel();
    saveDesc.cancel();
    if (!S.tasks.includes(t)) return;
    const body = descDirty ? { description: serializeEditor(desc) } : {};
    descDirty = false;
    const hasText = !!desc.textContent.trim();
    if (!hasText) { S.tasks = S.tasks.filter((x) => x !== t); refreshTasks(); updateCounts(); }
    try {
      const r = await api('POST', `/api/tasks/${t.id}/finalize`, body);
      if (r.deleted) {
        if (S.tasks.includes(t)) { S.tasks = S.tasks.filter((x) => x !== t); refreshTasks(); updateCounts(); }
      } else if (r.title) {
        if (body.description !== undefined) t.description = body.description;
        t.title = r.title;
        refreshTasks();
      }
    } catch (e) { fail(e); }
  };
  // Закрытие вкладки с открытой карточкой: один keepalive-запрос (название из описания или сохранение описания)
  panel.unloadFn = () => {
    if (!S.tasks.includes(t)) return;
    const body = descDirty ? { description: serializeEditor(desc) } : {};
    const v = title.value.trim();
    if (v && v !== t.title) body.title = v;
    if (!v && !t.title.trim()) sendNow('POST', `/api/tasks/${t.id}/finalize`, body);
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
    try { Object.assign(t, await api('PATCH', `/api/tasks/${t.id}`, patch)); } catch (e) { fail(e); }
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
  title.oninput = () => { grow(); if (title.value.trim()) markDirty(); saveTitle(); };
  // Enter в названии — переход к описанию
  title.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitleNow(); desc.focus(); } };
  const statusSel = $('#tp-status', panel);
  if (statusSel) statusSel.onchange = (e) => update({ status: e.target.value });
  $('#tp-prio', panel).onchange = (e) => update({ priority: e.target.value });
  const dueBtn = $('#tp-due', panel);
  const paintDue = () => {
    const overdue = t.due_date && !isDone(t) && t.due_date < todayStr();
    dueBtn.className = `date-btn ${t.due_date ? '' : 'no-date'} ${overdue ? 'overdue' : ''}`;
    dueBtn.innerHTML = `${icon('calendar')}<span>${t.due_date ? dueLong(t.due_date) : 'Без срока'}</span>`;
  };
  paintDue();
  dueBtn.onclick = () => openDatePicker(dueBtn, t.due_date, async (v) => {
    if (v === (t.due_date || null)) return;
    await update({ due_date: v });
    paintDue();
  });

  const desc = $('#tp-desc', panel);
  let descDirty = false;
  const saveDescNow = async () => {
    if (!descDirty) return;
    descDirty = false;
    await track(async () => {
      try { Object.assign(t, await api('PATCH', `/api/tasks/${t.id}`, { description: serializeEditor(desc) })); return true; } catch (e) { fail(e); return false; }
    });
  };
  const saveDesc = debounce(saveDescNow, 700);
  saveDesc.flush = () => { saveDesc.cancel(); saveDescNow(); };
  $('#tp-toolbar', panel).replaceWith(makeEditor(desc, () => { descDirty = true; markDirty(); saveDesc(); }));

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
  if (justCreated || !t.description) setTimeout(() => title.focus(), 50);
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
    else {
      if (!location.hash.startsWith('#/tasks')) location.hash = '#/tasks';
      setTimeout(() => openTaskPanel(it.task), 150);
    }
  };
  const recent = () => {
    const pages = [...S.pages].sort((a, b) => toDate(b.updated_at) - toDate(a.updated_at)).slice(0, 6)
      .map((p) => ({ id: p.id, title: p.title, snippet: 'Недавно изменена' }));
    draw('', { pages, tasks: [] });
  };
  const search = debounce(async () => {
    const q = input.value.trim();
    if (!q) return recent();
    try { draw(q, await api('GET', `/api/search?q=${encodeURIComponent(q)}`)); } catch (e) { fail(e); }
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
  setTimeout(() => document.addEventListener('mousedown', outside), 0);
  function outside(e) { if (!menu.contains(e.target)) { closeMenus(); document.removeEventListener('mousedown', outside); } }
  $('button', menu)?.focus();
  return menu;
}
function closeMenus() { $$('.menu').forEach((m) => (m.cleanup ? m.cleanup() : m.remove())); }
// Свой выбор даты: быстрые варианты + календарь. onPick получает 'ГГГГ-ММ-ДД' или null (без срока)
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
function openDatePicker(anchor, value, onPick) {
  closeMenus();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tStr = ymd(today);
  const dow = (today.getDay() + 6) % 7; // 0 = понедельник
  const quick = [
    ['Сегодня', today],
    ['Завтра', addDays(today, 1)],
    ['В понедельник', addDays(today, 7 - dow)],
    ['Через неделю', addDays(today, 7)],
  ];
  const base = value ? new Date(value + 'T00:00') : today;
  let year = base.getFullYear(), month = base.getMonth();
  let focusDay = value || tStr;

  const box = document.createElement('div');
  box.className = 'menu datepicker';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Выбор срока');
  document.body.append(box);

  const done = (v) => { cleanup(); onPick(v); };
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
      ${value ? '<button type="button" class="dp-clear" data-clear>' + icon('x') + 'Убрать срок</button>' : ''}`;
  }
  function place() {
    const r = anchor.getBoundingClientRect();
    const w = box.offsetWidth, h = box.offsetHeight;
    let top = r.bottom + 4;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 4);
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
    const day = e.target.closest('[data-d]');
    if (day) done(day.dataset.d);
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


function openUserMenu(anchor) {
  const cur = themeChoice();
  const seg = (v, t) => `<button data-m="theme-${v}" data-keep="1" class="${cur === v ? 'on' : ''}">${t}</button>`;
  showMenu(anchor, `
    <div class="menu-label">Тема</div>
    <div class="seg">${seg('system', 'Как в системе')}${seg('light', 'Светлая')}${seg('dark', 'Тёмная')}</div>
    <button data-m="numbering" data-keep="1">${icon('ol')}Нумерация заметок<span class="menu-state">${S.numbering ? 'вкл' : 'выкл'}</span></button>
    <hr>
    <button data-m="password">${icon('key')}Сменить пароль</button>
    ${S.user.is_admin ? `<button data-m="users">${icon('users')}Пользователи</button>` : ''}
    <hr>
    <button data-m="logout">${icon('logout')}Выйти</button>`, async (m, btn) => {
    if (m.startsWith('theme-')) {
      applyTheme(m.slice(6));
      $$('.seg button', btn.closest('.menu')).forEach((b) => b.classList.toggle('on', b === btn));
    }
    if (m === 'numbering') {
      S.numbering = !S.numbering;
      store.set('kb-numbering', S.numbering);
      $('.menu-state', btn).textContent = S.numbering ? 'вкл' : 'выкл';
      renderTree();
      if (S.page) { renderCrumbs(); renderSubpages(); } else if (!location.hash.startsWith('#/tasks')) renderNotesHome();
    }
    if (m === 'password') openPasswordDialog();
    if (m === 'users') openUsersDialog();
    if (m === 'logout') {
      await flushPageSave();
      if (S.page) await finalizePage(S.page.id);
      await api('POST', '/api/logout').catch(() => {});
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
  return m;
}
function closeModal(m) { m.overlay?.remove(); m.remove(); m.onclose?.(); }
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
function openStatusesDialog({ focus = null } = {}) {
  const m = openModal(`
    <h2>Статусы задач</h2>
    <p>Статусы — это колонки на доске и группы в списке. «${esc(statusOf('todo').name)}» нельзя удалить — в него переходят задачи удалённого статуса, — но можно переименовать и перекрасить. Готовую задачу завершают кнопкой в её карточке, она попадает в блок «Завершённые».</p>
    <div class="st-list" id="st-list"></div>
    <div class="st-default">
      <label for="st-default">Новые задачи попадают в</label>
      <select id="st-default"></select>
    </div>
    <div class="modal-actions st-actions">
      <button type="button" class="btn" id="st-add">${icon('plus')}Добавить статус</button>
      <button type="button" class="btn primary" data-close>Готово</button>
    </div>`, 'statuses');
  const list = $('#st-list', m);
  let openPalette = null;

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

function genPassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = crypto.getRandomValues(new Uint32Array(12));
  return [...arr].map((n) => chars[n % chars.length]).join('');
}

function openPasswordDialog() {
  const m = openModal(`
    <h2>Смена пароля</h2>
    <form id="pw-form">
      <label class="field"><span>Текущий пароль</span><input class="input" type="password" id="pw-cur" autocomplete="current-password"></label>
      <label class="field"><span>Новый пароль (не короче 8 символов)</span><input class="input" type="password" id="pw-new" autocomplete="new-password"></label>
      <p class="error-text" id="pw-err"></p>
      <div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button class="btn primary">Сменить пароль</button></div>
    </form>`);
  $('#pw-cur', m).focus();
  $('#pw-form', m).onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('POST', '/api/me/password', { current: $('#pw-cur', m).value, next: $('#pw-new', m).value });
      closeModal(m);
      toast('Пароль изменён');
    } catch (err) { $('#pw-err', m).textContent = err.message; }
  };
}

async function openUsersDialog() {
  const m = openModal(`
    <h2>Пользователи</h2>
    <p>Каждый пользователь видит только свои заметки и задачи. Создайте аккаунт и передайте человеку email и пароль.</p>
    <div class="table-wrap" id="users-list"><p class="muted">Загрузка…</p></div>
    <form id="user-form">
      <h3 style="margin:8px 0 0;font-size:15px">Новый пользователь</h3>
      <div class="inline-form">
        <label class="field"><span>Имя</span><input class="input" id="nu-name" autocomplete="off"></label>
        <label class="field"><span>Email</span><input class="input" id="nu-email" type="email" autocomplete="off"></label>
        <label class="field full"><span>Пароль</span>
          <span style="display:flex;gap:8px"><input class="input" id="nu-pass" autocomplete="off"><button type="button" class="btn" id="nu-gen">Сгенерировать</button></span>
        </label>
        <label class="checkbox full"><input type="checkbox" id="nu-admin"> Администратор (может управлять пользователями)</label>
      </div>
      <p class="error-text" id="nu-err"></p>
      <div class="modal-actions"><button type="button" class="btn" data-close>Закрыть</button><button class="btn primary">Создать аккаунт</button></div>
    </form>`, 'wide');
  const load = async () => {
    try {
      const users = await api('GET', '/api/admin/users');
      $('#users-list', m).innerHTML = `<table class="users-table">
        <thead><tr><th>Пользователь</th><th>Заметок</th><th>Задач</th><th></th></tr></thead>
        <tbody>${users.map((u) => `<tr>
          <td><b style="font-weight:500">${esc(u.name || '—')}</b> ${u.is_admin ? '<span class="role">админ</span>' : ''}<br><small class="muted">${esc(u.email)}</small></td>
          <td class="num">${u.pages}</td><td class="num">${u.tasks}</td>
          <td style="text-align:right;white-space:nowrap">
            <button class="btn ghost" data-reset="${u.id}" data-email="${esc(u.email)}">Новый пароль</button>
            ${u.id !== S.user.id ? `<button class="icon-btn" data-del="${u.id}" data-email="${esc(u.email)}" title="Удалить" aria-label="Удалить">${icon('trash')}</button>` : ''}
          </td></tr>`).join('')}</tbody></table>`;
    } catch (e) { fail(e); }
  };
  load();
  $('#nu-gen', m).onclick = () => { $('#nu-pass', m).value = genPassword(); };
  $('#user-form', m).onsubmit = async (e) => {
    e.preventDefault();
    $('#nu-err', m).textContent = '';
    const body = { name: $('#nu-name', m).value, email: $('#nu-email', m).value, password: $('#nu-pass', m).value, is_admin: $('#nu-admin', m).checked };
    try {
      await api('POST', '/api/admin/users', body);
      toast(`Аккаунт создан. Передайте: ${body.email} / ${body.password}`);
      ['#nu-name', '#nu-email', '#nu-pass'].forEach((s) => { $(s, m).value = ''; });
      $('#nu-admin', m).checked = false;
      load();
    } catch (err) { $('#nu-err', m).textContent = err.message; }
  };
  $('#users-list', m).addEventListener('click', async (e) => {
    const reset = e.target.closest('[data-reset]');
    const del = e.target.closest('[data-del]');
    if (reset) {
      const pw = genPassword();
      const ok = await confirmDialog({ title: 'Задать новый пароль?', text: `Новый пароль для ${reset.dataset.email}: ${pw}\nСкопируйте его перед подтверждением. Пользователь будет разлогинен на всех устройствах.`, okText: 'Задать пароль' });
      if (!ok) return;
      try {
        await api('PATCH', `/api/admin/users/${reset.dataset.reset}`, { password: pw });
        try { await navigator.clipboard.writeText(pw); toast('Пароль изменён и скопирован'); } catch { toast(`Пароль изменён: ${pw}`); }
      } catch (err) { fail(err); }
    }
    if (del) {
      const ok = await confirmDialog({ title: 'Удалить пользователя?', text: `${del.dataset.email} и все его заметки и задачи будут удалены навсегда.`, okText: 'Удалить', danger: true });
      if (!ok) return;
      try { await api('DELETE', `/api/admin/users/${del.dataset.del}`); toast('Пользователь удалён'); load(); } catch (err) { fail(err); }
    }
  });
}

boot();
