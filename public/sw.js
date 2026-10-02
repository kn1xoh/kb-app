/* Silo: показ напоминаний о задачах. Работает в фоне, даже когда Silo закрыт.
   Название задачи приходит зашифрованным — расшифровываем ключом, который лежит на этом устройстве
   (IndexedDB silo/keys, туда его кладёт vault.js при входе). Страницы не кешируются. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const keyFor = (userId) => new Promise((resolve) => {
  const r = indexedDB.open('silo', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('keys');
  r.onerror = () => resolve(null);
  r.onsuccess = () => {
    const d = r.result;
    try {
      const q = d.transaction('keys', 'readonly').objectStore('keys').get(`u${userId}`);
      q.onsuccess = () => { d.close(); resolve(q.result || null); };
      q.onerror = () => { d.close(); resolve(null); };
    } catch { d.close(); resolve(null); }
  };
});

async function decrypt(s, userId) {
  if (!s) return '';
  if (!s.startsWith('e1:')) return s;
  try {
    const key = await keyFor(userId);
    if (!key) return '';
    const all = Uint8Array.from(atob(s.slice(3)), (c) => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, key, all.subarray(12));
    return new TextDecoder().decode(plain);
  } catch { return ''; }
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
      return self.registration.showNotification(title || 'Напоминание о задаче', {
        ...base,
        body: dueText(data.due_date, data.due_time) || 'Напоминание о задаче',
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
