'use strict';

/* =========================================================
   Разделы приложения. Чтобы добавить новый раздел в будущем:
   добавьте объект сюда и функцию отрисовки в render<Имя>().
   ========================================================= */
const SECTIONS = [
  { id: 'notes', title: 'Заметки', icon: 'book', hint: 'Заметки с текстом, вложенные друг в друга' },
  { id: 'tasks', title: 'Задачи', icon: 'tasks', hint: 'Список дел и доска' },
];

const STATUS = {
  todo: { title: 'Нужно сделать', color: 'var(--faint)' },
  in_progress: { title: 'В работе', color: 'var(--warn)' },
  done: { title: 'Готово', color: 'var(--accent)' },
};
const PRIORITY = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };

// ---------- icons ----------
const ICONS = {
  book: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 1h13v-3M8 7h7',
  tasks: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
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
  star: 'M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.75 1-5.8L3.5 9.7l5.9-.9z',
};
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
  return toDate(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
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

function toast(text, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = text;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 3200);
}
const fail = (e) => toast(e.message, 'error');

// ---------- state ----------
const S = {
  user: null,
  pages: [],
  tasks: [],
  expanded: new Set(store.get('kb-expanded', [])),
  taskView: store.get('kb-task-view', 'list'),
  taskFilter: 'all',
  page: null, // currently open page with content
  numbering: store.get('kb-numbering', true),
  selectMode: false, // bulk selection on the notes home
  selected: new Set(),
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
        <div class="auth-brand"><div class="logo">${icon('book')}</div><b>База знаний</b></div>
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
  [S.pages, S.tasks] = await Promise.all([api('GET', '/api/pages'), api('GET', '/api/tasks')]);
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
          <div class="logo">${icon('book')}</div>
          <span class="name">База знаний</span>
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
    </div>`;
  renderTree();
  updateCounts();
  $('#open-search').onclick = openSearch;
  $('#user-btn').onclick = (e) => openUserMenu(e.currentTarget);
  $('#scrim').onclick = closeNav;
}

function closeNav() { $('#shell')?.classList.remove('nav-open'); }
const topbar = (inner) => `<div class="topbar"><button class="icon-btn menu-toggle" data-act="nav" aria-label="Меню">${icon('menu')}</button>${inner}</div>`;

function updateCounts() {
  const open = S.tasks.filter((t) => t.status !== 'done').length;
  const el = $('#count-tasks');
  if (el) el.textContent = open || '';
  const n = $('#count-notes');
  if (n) n.textContent = S.pages.length || '';
}

function setActiveNav(section) {
  S.section = section;
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.section === section));
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
  await flushPageSave();
  closeOverlays(true);
  const [, section, id] = location.hash.split('/');
  if (section !== 'notes' || id) { S.selectMode = false; S.selected.clear(); }
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
const numOrIcon = (nums, id, cls) => (S.numbering ? `<span class="${cls}">${nums.get(id)}</span>` : icon('file', cls === 'tree-num' ? 'doc' : ''));

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
      <div class="fav-row ${t.status === 'done' ? 'done' : ''}" data-fav-task="${t.id}" role="button" tabindex="0">
        <span class="fav-dot" style="background:${STATUS[t.status].color}" title="${STATUS[t.status].title}"></span>
        <span class="fav-title">${esc(t.title)}</span>${unfav}
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
    <button data-m="open">${icon('file')}Открыть</button>
    <button data-m="add">${icon('plus')}Добавить подзаметку</button>
    <button data-m="move">${icon('move')}Переместить…</button>
    <hr>
    <button data-m="delete" class="danger">${icon('trash')}Удалить</button>`, (m) => {
    if (m === 'open') location.hash = `#/notes/${id}`;
    if (m === 'add') createPage(id);
    if (m === 'move') openMoveDialog(id);
    if (m === 'delete') deletePage(p);
  });
}

async function deletePage(p) {
  const n = descendants(p.id).length;
  const ok = await confirmDialog({
    title: `Удалить «${titleOf(p)}»?`,
    text: n ? `Подзаметки (${n}) тоже будут удалены. Отменить удаление нельзя.` : 'Отменить удаление нельзя.',
    okText: 'Удалить',
    danger: true,
  });
  if (!ok) return;
  try {
    const removed = new Set([p.id, ...descendants(p.id)]);
    await api('DELETE', `/api/pages/${p.id}`);
    S.pages = S.pages.filter((x) => !removed.has(x.id));
    updateCounts();
    toast('Заметка удалена');
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
  const recent = [...S.pages].sort((a, b) => toDate(b.updated_at) - toDate(a.updated_at)).slice(0, 5);
  const rows = [];
  const anyOpen = S.pages.some((p) => homeExpanded.has(p.id) && childrenOf(p.id).length);
  const sel = S.selectMode ? selectionInfo() : null;
  const walk = (pid, depth) => childrenOf(pid).forEach((p) => {
    const kids = childrenOf(p.id).length;
    const closed = !homeExpanded.has(p.id);
    const state = !sel ? '' : S.selected.has(p.id) ? 'on' : sel.all.has(p.id) ? 'on implied' : '';
    rows.push(`<li><a class="outline-row depth-${Math.min(depth, 3)} ${state ? 'selected' : ''}" href="#/notes/${p.id}" ${S.selectMode ? '' : 'draggable="true"'} data-id="${p.id}" style="padding-left:${12 + depth * 26}px">
      ${S.selectMode ? `<span class="sel-box ${state}" role="checkbox" aria-checked="${!!state}" aria-label="Выбрать"></span>` : ''}
      ${kids ? `<button class="twisty ${closed ? '' : 'open'}" data-home="toggle" aria-label="${closed ? 'Развернуть' : 'Свернуть'}">${icon('chevron')}</button>` : '<span class="twisty"></span>'}
      ${numOrIcon(nums, p.id, 'toc-num')}
      <span class="toc-title">${esc(titleOf(p))}${p.favorite_at ? icon('star', 'filled mini-star') : ''}</span>
      <span class="toc-meta">${kids && closed ? `${descendants(p.id).length} внутри · ` : ''}${ago(p.updated_at)}</span>
      <button class="icon-btn row-add" data-home="add" title="Добавить подзаметку" aria-label="Добавить подзаметку">${icon('plus')}</button>
    </a></li>`);
    if (kids && !closed) walk(p.id, depth + 1);
  });
  walk(null, 0);
  $('#main').innerHTML = `
    ${topbar('<div class="crumbs"><span>Заметки</span></div>')}
    <div class="notes-home">
      <div class="tasks-head">
        <h1>Заметки</h1>
        <button class="btn primary" id="home-new">${icon('plus')}Новая заметка</button>
      </div>
      ${S.pages.length ? `
      <div class="toc-head">
        <h3>Все заметки · ${S.pages.length}</h3>
        <span class="outline-tools">
          <button class="btn ghost" id="toggle-all">${anyOpen ? 'Свернуть всё' : 'Развернуть всё'}</button>
          <button class="btn ghost ${S.selectMode ? 'on' : ''}" id="select-mode">${S.selectMode ? 'Готово' : 'Выбрать'}</button>
        </span>
      </div>
      <ol class="toc outline ${S.selectMode ? 'selecting' : ''}" id="outline">${rows.join('')}</ol>
      ${S.selectMode ? `
      <div class="bulk-bar" role="region" aria-label="Выбранные заметки">
        <span class="bulk-count">${sel.total
          ? `Выбрано: <b>${sel.total}</b>${sel.total > S.selected.size ? ` <span class="muted">(с подзаметками)</span>` : ''}`
          : 'Отметьте заметки, которые нужно удалить'}</span>
        <button class="btn ghost" id="sel-all">${sel.total === S.pages.length ? 'Снять выделение' : 'Выбрать все'}</button>
        <button class="btn danger solid" id="sel-delete" ${sel.total ? '' : 'disabled'}>${icon('trash')}Удалить</button>
      </div>` : '<p class="hint">Перетаскивайте строки: к верхнему или нижнему краю строки — поменять порядок, в середину — вложить внутрь.</p>'}
      <section>
        <div class="toc-head"><h3>Недавно изменённые</h3></div>
        <ol class="toc">${recent.map((p) => `<li><a class="toc-row" href="#/notes/${p.id}">
          ${numOrIcon(nums, p.id, 'toc-num')}<span class="toc-title">${esc(titleOf(p))}</span><span class="toc-meta">${ago(p.updated_at)}</span></a></li>`).join('')}</ol>
      </section>` : `
      <div class="empty">
        <h2>Здесь будут ваши заметки</h2>
        <p>Создайте первую заметку. Внутрь любой заметки можно добавлять подзаметки — так получится структура базы.</p>
      </div>`}
    </div>`;
  $('#home-new').onclick = () => createPage(null);
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
    $('#sel-delete').onclick = confirmBulkDelete;
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

function confirmBulkDelete() {
  const { roots, all, total } = selectionInfo();
  if (!total) return;
  const names = roots.slice(0, 5).map((id) => `<li>${esc(titleOf(pageById(id)))}${descendants(id).length ? ` <span class="muted">+ ${descendants(id).length} подзам.</span>` : ''}</li>`).join('');
  const m = openModal(`
    <h2>Удалить ${total} ${plural(total, 'заметку', 'заметки', 'заметок')}?</h2>
    <p>Заметки будут удалены навсегда вместе с подзаметками. Восстановить их нельзя.</p>
    <ul class="bulk-list">${names}${roots.length > 5 ? `<li class="muted">и ещё ${roots.length - 5}…</li>` : ''}</ul>
    <form id="bulk-form">
      <label class="field"><span>Чтобы подтвердить, введите слово УДАЛИТЬ</span>
        <input class="input" id="bulk-confirm" autocomplete="off" spellcheck="false" placeholder="УДАЛИТЬ"></label>
      <p class="error-text" id="bulk-err"></p>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Отмена</button>
        <button class="btn danger solid" id="bulk-go" disabled>Удалить навсегда</button>
      </div>
    </form>`);
  const input = $('#bulk-confirm', m);
  const go = $('#bulk-go', m);
  const ok = () => input.value.trim().toUpperCase() === 'УДАЛИТЬ';
  input.focus();
  input.oninput = () => { go.disabled = !ok(); };
  $('#bulk-form', m).onsubmit = async (e) => {
    e.preventDefault();
    if (!ok()) return;
    go.disabled = true;
    input.disabled = true;
    let done = 0;
    try {
      for (const id of roots) {
        go.textContent = `Удаление… ${done + 1} из ${roots.length}`;
        await api('DELETE', `/api/pages/${id}`);
        done++;
      }
      S.pages = S.pages.filter((p) => !all.has(p.id));
      toast(`Удалено: ${total} ${plural(total, 'заметка', 'заметки', 'заметок')}`);
    } catch (err) {
      S.pages = await api('GET', '/api/pages').catch(() => S.pages);
      toast(`Удалено не всё: ${err.message}`, 'error');
    }
    closeModal(m);
    S.selectMode = false;
    S.selected.clear();
    updateCounts();
    renderNotesHome();
  };
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

window.addEventListener('beforeunload', () => {
  if (!pendingSave) return;
  fetch(`/api/pages/${pendingSave.id}`, {
    method: 'PATCH', keepalive: true, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'kb' },
    body: JSON.stringify(pendingSave.data),
  });
});

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
    <select data-block aria-label="Тип текста">
      <option value="p">Текст</option><option value="h1">Заголовок 1</option>
      <option value="h2">Заголовок 2</option><option value="h3">Заголовок 3</option>
    </select>
    <span class="sep"></span>
    <button class="icon-btn" data-cmd="bold" title="Жирный (Ctrl+B)"><span class="tb-text">Ж</span></button>
    <button class="icon-btn" data-cmd="italic" title="Курсив (Ctrl+I)"><span class="tb-text" style="font-style:italic;font-family:var(--font-read)">К</span></button>
    <button class="icon-btn" data-cmd="underline" title="Подчёркнутый (Ctrl+U)"><span class="tb-text" style="text-decoration:underline">П</span></button>
    <button class="icon-btn" data-cmd="strikeThrough" title="Зачёркнутый"><span class="tb-text" style="text-decoration:line-through">З</span></button>
    <span class="sep"></span>
    <button class="icon-btn" data-cmd="insertUnorderedList" title="Маркированный список">${icon('list')}</button>
    <button class="icon-btn" data-cmd="insertOrderedList" title="Нумерованный список">${icon('ol')}</button>
    <button class="icon-btn" data-cmd="checklist" title="Чек-лист">${icon('checklist')}</button>
    <span class="sep"></span>
    <button class="icon-btn" data-cmd="quote" title="Цитата">${icon('quote')}</button>
    <button class="icon-btn" data-cmd="code" title="Блок кода">${icon('code')}</button>
    <button class="icon-btn" data-cmd="link" title="Ссылка">${icon('link')}</button>
    <button class="icon-btn" data-cmd="insertHorizontalRule" title="Разделитель">${icon('hr')}</button>
    <button class="icon-btn" data-cmd="clear" title="Очистить форматирование">${icon('clear')}</button>`;

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
    const inChecklist = !!blk?.closest('ul.checklist');
    $('[data-cmd="insertUnorderedList"]', bar).classList.toggle('on', !!blk?.closest('ul') && !inChecklist);
    $('[data-cmd="checklist"]', bar).classList.toggle('on', inChecklist);
    $('[data-cmd="quote"]', bar).classList.toggle('on', !!blk?.closest('blockquote'));
    $('[data-cmd="code"]', bar).classList.toggle('on', !!blk?.closest('pre'));
    const tag = blk?.closest('h1,h2,h3')?.tagName.toLowerCase() || 'p';
    $('[data-block]', bar).value = tag;
  };
  document.addEventListener('selectionchange', refresh);

  bar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  $('[data-block]', bar).addEventListener('change', (e) => {
    editor.focus();
    document.execCommand('formatBlock', false, `<${e.target.value}>`);
    changed();
    refresh();
  });

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmd]');
    if (!b) return;
    const cmd = b.dataset.cmd;
    if (!editor.contains(getSelection().anchorNode)) placeCaretEnd(editor);
    const blk = blockOf();
    if (cmd === 'checklist') toggleChecklist(editor, blk);
    else if (cmd === 'quote') document.execCommand('formatBlock', false, blk?.closest('blockquote') ? '<p>' : '<blockquote>');
    else if (cmd === 'code') document.execCommand('formatBlock', false, blk?.closest('pre') ? '<p>' : '<pre>');
    else if (cmd === 'link') return askLink(editor, changed);
    else if (cmd === 'clear') { document.execCommand('removeFormat'); document.execCommand('unlink'); }
    else document.execCommand(cmd);
    changed();
    refresh();
  });

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
  editor.addEventListener('input', () => {
    $$('ul.checklist > li:not([data-checked])', editor).forEach((li) => li.setAttribute('data-checked', 'false'));
    markEmpty();
    changed();
  });

  editor.addEventListener('keydown', (e) => {
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
      askLink(editor, changed);
    }
  });

  editor.addEventListener('click', (e) => {
    const li = e.target.closest('ul.checklist > li');
    if (li && e.target === li && e.clientX - li.getBoundingClientRect().left < 26) {
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
    if (html) document.execCommand('insertHTML', false, cleanHTML(html));
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
const FILTERS = [
  { id: 'all', title: 'Все', test: () => true },
  { id: 'today', title: 'На сегодня', test: (t) => t.status !== 'done' && t.due_date && t.due_date <= todayStr() },
  { id: 'overdue', title: 'Просроченные', test: (t) => t.status !== 'done' && t.due_date && t.due_date < todayStr() },
  { id: 'high', title: 'Высокий приоритет', test: (t) => t.priority === 'high' && t.status !== 'done' },
];

function renderTasks() {
  S.page = null;
  setActiveNav('tasks');
  renderTree();
  $('#main').innerHTML = `
    ${topbar('<div class="crumbs"><span>Задачи</span></div>')}
    <div class="tasks-wrap">
      <div class="tasks-head">
        <h1>Задачи</h1>
        <div class="segmented" role="tablist">
          <button data-view="list" class="${S.taskView === 'list' ? 'on' : ''}">${icon('list')}Список</button>
          <button data-view="board" class="${S.taskView === 'board' ? 'on' : ''}">${icon('board')}Доска</button>
        </div>
      </div>
      <form class="quick-add" id="quick-add">
        <input class="input" id="qa-title" placeholder="Новая задача — напишите и нажмите Enter" maxlength="300" autocomplete="off">
        <button class="btn primary">${icon('plus')}Добавить</button>
      </form>
      <div class="filters" id="filters"></div>
      <div id="tasks-body"></div>
    </div>`;
  $$('[data-view]').forEach((b) => b.onclick = () => {
    S.taskView = b.dataset.view;
    store.set('kb-task-view', S.taskView);
    $$('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
    renderTasksBody();
  });
  $('#quick-add').onsubmit = async (e) => {
    e.preventDefault();
    const input = $('#qa-title');
    const title = input.value.trim();
    if (!title) return input.focus();
    const extra = S.taskFilter === 'today' || S.taskFilter === 'overdue' ? { due_date: todayStr() }
      : S.taskFilter === 'high' ? { priority: 'high' } : {};
    try {
      const t = await api('POST', '/api/tasks', { title, ...extra });
      S.tasks.push(t);
      input.value = '';
      renderTasksBody();
      updateCounts();
    } catch (err) { fail(err); }
  };
  renderTasksBody();
}

function renderTasksBody() {
  const body = $('#tasks-body');
  if (!body) return;
  $('#filters').innerHTML = FILTERS.map((f) => {
    const n = S.tasks.filter(f.test).length;
    return `<button class="chip ${S.taskFilter === f.id ? 'on' : ''}" data-filter="${f.id}">${f.title}<span class="n">${n}</span></button>`;
  }).join('');
  $$('[data-filter]').forEach((b) => b.onclick = () => { S.taskFilter = b.dataset.filter; renderTasksBody(); });

  const filter = FILTERS.find((f) => f.id === S.taskFilter);
  const list = S.tasks.filter(filter.test);
  const byStatus = (s) => list.filter((t) => t.status === s).sort((a, b) => a.position - b.position || b.id - a.id);

  if (!S.tasks.length) {
    body.innerHTML = `<div class="empty" style="margin-top:6vh"><h2>Задач пока нет</h2><p>Напишите первую задачу в поле выше и нажмите Enter.</p></div>`;
    return;
  }

  if (S.taskView === 'board') {
    body.innerHTML = `<div class="board">${Object.keys(STATUS).map((s) => {
      const items = byStatus(s);
      return `<section class="column" data-status="${s}">
        <div class="column-head"><span class="dot" style="background:${STATUS[s].color}"></span>${STATUS[s].title}<span class="n">${items.length}</span></div>
        ${items.map(taskCard).join('') || '<div class="col-empty">Перетащите сюда задачу</div>'}
        <button class="add-inline" data-add="${s}">${icon('plus')}Добавить</button>
      </section>`;
    }).join('')}</div>`;
    setupBoardDnD(body);
  } else {
    const order = ['in_progress', 'todo', 'done'];
    const groups = order.map((s) => ({ s, items: byStatus(s) })).filter((g) => g.items.length);
    body.innerHTML = groups.length ? groups.map((g) => `
      <section class="task-group">
        <h3><span class="dot" style="width:8px;height:8px;border-radius:50%;background:${STATUS[g.s].color}"></span>${STATUS[g.s].title}<span class="n">${g.items.length}</span></h3>
        ${g.items.map(taskRow).join('')}
      </section>`).join('') : '<p class="muted">Под этот фильтр задач нет.</p>';
  }
}

function taskMeta(t) {
  const parts = [];
  if (t.due_date) {
    const cls = t.status !== 'done' && t.due_date < todayStr() ? 'overdue' : t.due_date === todayStr() ? 'today' : '';
    parts.push(`<span class="due ${cls}">${icon('calendar')}${dueLabel(t.due_date)}</span>`);
  }
  if (t.priority !== 'medium' || t.status !== 'done') parts.push(`<span class="prio ${t.priority}">${PRIORITY[t.priority]}</span>`);
  return `<span class="t-meta">${parts.join('')}</span>`;
}
function checkBtn(t) {
  const cls = t.status === 'done' ? 'on' : t.status === 'in_progress' ? 'half' : '';
  return `<button class="check ${cls}" data-check="${t.id}" aria-label="${t.status === 'done' ? 'Вернуть в работу' : 'Отметить выполненной'}">${icon('check')}</button>`;
}
const favMark = (t) => (t.favorite_at ? icon('star', 'filled mini-star') : '');
const taskRow = (t) => `<div class="task-row ${t.status === 'done' ? 'done' : ''}" data-task="${t.id}">${checkBtn(t)}<span class="t-title">${esc(t.title)}${favMark(t)}</span>${taskMeta(t)}</div>`;
const taskCard = (t) => `<div class="card ${t.status === 'done' ? 'done' : ''}" draggable="true" data-task="${t.id}"><div class="c-title">${esc(t.title)}${favMark(t)}</div>${t.due_date || t.priority !== 'medium' ? taskMeta(t) : ''}</div>`;

$('#app').addEventListener('click', async (e) => {
  const chk = e.target.closest('[data-check]');
  if (chk) {
    e.stopPropagation();
    const t = S.tasks.find((x) => x.id === Number(chk.dataset.check));
    await updateTask(t, { status: t.status === 'done' ? 'todo' : 'done' });
    return;
  }
  const add = e.target.closest('[data-add]');
  if (add) {
    const status = add.dataset.add;
    const form = document.createElement('form');
    form.innerHTML = `<input class="input" placeholder="Название и Enter" maxlength="300">`;
    add.replaceWith(form);
    const input = $('input', form);
    input.focus();
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      if (!input.value.trim()) return;
      try {
        S.tasks.push(await api('POST', '/api/tasks', { title: input.value.trim(), status }));
        updateCounts();
        renderTasksBody();
        $(`[data-status="${status}"] [data-add]`)?.click();
      } catch (err) { fail(err); }
    };
    input.onblur = () => setTimeout(() => { if (document.contains(form) && !input.value.trim()) renderTasksBody(); }, 150);
    input.onkeydown = (ev) => { if (ev.key === 'Escape') renderTasksBody(); };
    return;
  }
  const row = e.target.closest('[data-task]');
  if (row && !row.classList.contains('dragging')) openTaskPanel(Number(row.dataset.task));
});

async function updateTask(t, patch) {
  Object.assign(t, patch);
  renderTasksBody();
  renderTree();
  updateCounts();
  try {
    Object.assign(t, await api('PATCH', `/api/tasks/${t.id}`, patch));
    renderTasksBody();
  } catch (e) { fail(e); }
}

function setupBoardDnD(root) {
  let dragId = null;
  const ph = document.createElement('div');
  ph.className = 'card-placeholder';
  root.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
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
    else col.insertBefore(ph, $('[data-add]', col));
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
    ids.forEach((id, i) => { const t = S.tasks.find((x) => x.id === id); t.status = status; t.position = i; });
    renderTasksBody();
    updateCounts();
    try { await api('POST', '/api/tasks/reorder', { status, ids }); } catch (err) { fail(err); }
  });
}

function openTaskPanel(id) {
  const t = S.tasks.find((x) => x.id === id);
  if (!t) return;
  closeOverlays();
  const ov = document.createElement('div');
  ov.className = 'overlay';
  const panel = document.createElement('aside');
  panel.className = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Задача');
  panel.innerHTML = `
    <div class="panel-head">
      <span class="muted">Создана ${ago(t.created_at)}</span>
      <button class="icon-btn fav-btn" id="tp-fav" data-id="${t.id}"></button>
      <button class="icon-btn" id="tp-delete" title="Удалить задачу" aria-label="Удалить задачу">${icon('trash')}</button>
      <button class="icon-btn" id="tp-close" title="Закрыть (Esc)" aria-label="Закрыть">${icon('x')}</button>
    </div>
    <div class="panel-body">
      <textarea class="page-title" id="tp-title" rows="1" maxlength="300" placeholder="Название задачи">${esc(t.title)}</textarea>
      <div class="props">
        <span>Статус</span>
        <select id="tp-status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${v.title}</option>`).join('')}</select>
        <span>Приоритет</span>
        <select id="tp-prio">${Object.entries(PRIORITY).map(([k, v]) => `<option value="${k}" ${t.priority === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <span>Срок</span>
        <input type="date" id="tp-due" value="${t.due_date || ''}">
      </div>
      <div>
        <div id="tp-toolbar"></div>
        <div class="editor" id="tp-desc" contenteditable="true" data-placeholder="Описание, заметки, чек-лист…">${t.description}</div>
      </div>
    </div>`;
  document.body.append(ov, panel);
  const close = () => { saveDesc.flush(); ov.remove(); panel.remove(); document.removeEventListener('keydown', onKey); };
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
  const saveTitle = debounce(() => { if (title.value.trim()) updateTask(t, { title: title.value.trim() }); }, 500);
  title.oninput = () => { grow(); saveTitle(); };
  title.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } };
  $('#tp-status', panel).onchange = (e) => updateTask(t, { status: e.target.value });
  $('#tp-prio', panel).onchange = (e) => updateTask(t, { priority: e.target.value });
  $('#tp-due', panel).onchange = (e) => updateTask(t, { due_date: e.target.value || null });

  const desc = $('#tp-desc', panel);
  let descDirty = false;
  const saveDescNow = async () => {
    if (!descDirty) return;
    descDirty = false;
    try { Object.assign(t, await api('PATCH', `/api/tasks/${t.id}`, { description: serializeEditor(desc) })); } catch (e) { fail(e); }
  };
  const saveDesc = debounce(saveDescNow, 700);
  saveDesc.flush = () => { saveDesc.cancel(); saveDescNow(); };
  $('#tp-toolbar', panel).replaceWith(makeEditor(desc, () => { descDirty = true; saveDesc(); }));

  $('#tp-delete', panel).onclick = async () => {
    const ok = await confirmDialog({ title: 'Удалить задачу?', text: `«${t.title}» будет удалена без возможности восстановления.`, okText: 'Удалить', danger: true });
    if (!ok) return;
    try {
      await api('DELETE', `/api/tasks/${t.id}`);
      S.tasks = S.tasks.filter((x) => x.id !== t.id);
      renderTree();
      descDirty = false;
      close();
      renderTasksBody();
      updateCounts();
      toast('Задача удалена');
    } catch (e) { fail(e); }
  };
  if (!t.description) setTimeout(() => title.focus(), 50);
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
        return `<div class="result" data-i="${items.length - 1}">${icon('file')}<b>${hl(p.title || 'Без названия', q)}</b><small>${hl(p.snippet || '', q)}</small></div>`;
      }).join('');
    }
    if (data.tasks.length) {
      html += '<h4>Задачи</h4>' + data.tasks.map((t) => {
        items.push({ task: t.id });
        return `<div class="result" data-i="${items.length - 1}">${icon('tasks')}<b>${hl(t.title, q)}</b><small>${STATUS[t.status].title}${t.snippet ? ' · ' + hl(t.snippet, q) : ''}</small></div>`;
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
function closeMenus() { $$('.menu').forEach((m) => m.remove()); }

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
