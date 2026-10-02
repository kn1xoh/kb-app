/* Silo: показ напоминаний о задачах. Работает в фоне, даже когда Silo закрыт.
   Название задачи приходит зашифрованным — расшифровываем ключом, который лежит на этом устройстве
   (IndexedDB silo/keys, туда его кладёт vault.js при входе). Страницы не кешируются. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Ключ на этом устройстве: CryptoKey (u<id>) и его копия байтами (raw-u<id>). Копия нужна потому,
// что на iPhone фоновый обработчик уведомлений не всегда может прочитать CryptoKey из базы браузера
const readKeys = (userId) => new Promise((resolve) => {
  const r = indexedDB.open('silo', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('keys');
  r.onerror = () => resolve({ err: 'idb' });
  r.onsuccess = () => {
    const d = r.result;
    try {
      const store = d.transaction('keys', 'readonly').objectStore('keys');
      const out = {};
      const a = store.get(`u${userId}`);
      const b = store.get(`raw-u${userId}`);
      a.onsuccess = () => { out.key = a.result || null; };
      a.onerror = (ev) => { ev.preventDefault(); out.keyErr = String(a.error?.name || 'err'); };
      b.onsuccess = () => { out.raw = b.result || null; };
      b.onerror = (ev) => { ev.preventDefault(); };
      a.transaction.oncomplete = () => { d.close(); resolve(out); };
      a.transaction.onabort = () => { d.close(); resolve({ ...out, err: out.keyErr || 'abort' }); };
    } catch (e) { d.close(); resolve({ err: String(e?.name || 'tx') }); }
  };
});

// Возвращает { text } или { text: '', why } — why временно показывается в уведомлении,
// чтобы понять, почему на устройстве не расшифровалось название
async function decrypt(s, userId) {
  if (!s) return { text: '', why: 'пустое' };
  if (!s.startsWith('e1:')) return { text: s };
  const k = await readKeys(userId);
  const all = Uint8Array.from(atob(s.slice(3)), (c) => c.charCodeAt(0));
  const open = async (key) => new TextDecoder().decode(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, key, all.subarray(12)));
  let why = k.err || (k.keyErr ? `ключ: ${k.keyErr}` : '');
  if (k.key) {
    try { return { text: await open(k.key) }; } catch (e) { why = `ключ: ${e?.name || 'ошибка'}`; }
  }
  if (k.raw) {
    try {
      const key = await crypto.subtle.importKey('raw', k.raw, { name: 'AES-GCM' }, false, ['decrypt']);
      return { text: await open(key) };
    } catch (e) { why = `копия: ${e?.name || 'ошибка'}`; }
  }
  return { text: '', why: why || (k.key || k.raw ? 'не подошёл' : 'нет ключа — войдите в Silo заново') };
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// «Срок: сегодня, 14:30» / «Срок: пт, 9 окт»
function dueText(date, time) {
  if (!date) return '';
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  let label;
  if (date === ymd(today)) label = 'сегодня';
  else if (date === ymd(tomorrow)) label = 'завтра';
  else if (date === ymd(yesterday)) label = 'вчера';
  else {
    const d = new Date(`${date}T00:00`);
    label = `${d.toLocaleDateString('ru-RU', { weekday: 'short' })}, ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')}`;
  }
  return `Срок: ${label}${time ? `, ${time}` : ''}`;
}

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let data = {};
    try { data = e.data ? e.data.json() : {}; } catch { /* пустое уведомление */ }
    const base = { icon: '/icons/icon-192.png', lang: 'ru' };
    if (data.kind === 'task') {
      const title = await decrypt(data.title, data.u);
      const due = dueText(data.due_date, data.due_time);
      return self.registration.showNotification(title.text || 'Напоминание о задаче', {
        ...base,
        // временно: если название не расшифровалось — причина в скобках (убрать, когда починим)
        body: [due || (title.text ? 'Напоминание' : ''), title.why && `(${title.why})`].filter(Boolean).join(' ') || 'Напоминание',
        tag: `task-${data.id}`,
        renotify: true,
        data: { task: data.id },
      });
    }
    return self.registration.showNotification('Silo', { ...base, body: 'Уведомления работают — напоминания о задачах придут сюда', tag: 'test' });
  })());
});

// Нажатие на уведомление: открыть задачу в уже открытом Silo или открыть Silo
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const task = e.notification.data?.task;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
    if (win) {
      await win.focus().catch(() => {});
      if (task) win.postMessage({ openTask: task });
      return;
    }
    await self.clients.openWindow(task ? `/#/tasks/${task}` : '/');
  })());
});
