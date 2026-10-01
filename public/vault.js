/* Шифрование в браузере.
   У каждого пользователя свой случайный ключ данных (AES-GCM). На сервер он уходит только в зашифрованном виде:
   один раз — ключом из пароля, второй раз — ключом из кода восстановления. Из пароля (и из кода) браузер
   выводит два независимых значения: auth — для входа (сервер хранит от него bcrypt) и kek — чтобы
   расшифровать ключ данных. Поэтому ни сервер, ни администратор прочитать заметки и задачи не могут.
   На этом устройстве ключ данных лежит в IndexedDB, пока пользователь не выйдет. */
const Vault = (() => {
  const te = new TextEncoder();
  const td = new TextDecoder();
  const PASS_ITER = 310000;
  const CODE_ITER = 100000; // в коде восстановления ~98 бит случайности, много итераций не нужно
  const CODE_ABC = '23456789ABCDEFGHJKMNPQRSTVWXYZ'; // без похожих символов: 0/O, 1/I/L, U/V
  const PREFIX = 'e1:';
  let key = null;

  const b64 = (buf) => {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
  const concat = (a, b) => { const out = new Uint8Array(a.length + b.length); out.set(a); out.set(b, a.length); return out; };

  async function derive(secret, saltB64, iterations) {
    const base = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations }, base, 256);
    const hk = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveBits', 'deriveKey']);
    const info = (s) => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: te.encode(s) });
    const auth = hex(await crypto.subtle.deriveBits(info('silo-auth'), hk, 256));
    const kek = await crypto.subtle.deriveKey(info('silo-kek'), hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return { auth, kek };
  }
  const normCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  async function seal(k, bytes) {
    const iv = rnd(12);
    return b64(concat(iv, new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, bytes))));
  }
  async function unseal(k, s) {
    const all = unb64(s);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, k, all.subarray(12));
  }
  async function wrapWith(kek) { return seal(kek, await crypto.subtle.exportKey('raw', key)); }
  async function unwrapWith(kek, wrapped) {
    const raw = await unseal(kek, wrapped);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }

  // ---------- хранение ключа на устройстве ----------
  const idb = () => new Promise((resolve, reject) => {
    const r = indexedDB.open('silo', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('keys');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  async function idbDo(mode, fn) {
    const d = await idb();
    return new Promise((resolve, reject) => {
      const tx = d.transaction('keys', mode);
      const req = fn(tx.objectStore('keys'));
      tx.oncomplete = () => { d.close(); resolve(req?.result); };
      tx.onerror = () => { d.close(); reject(tx.error); };
    });
  }

  return {
    ready: () => !!key,

    newCode() {
      const n = rnd(20);
      const s = [...n].map((x) => CODE_ABC[x % CODE_ABC.length]).join('');
      return s.match(/.{4}/g).join('-');
    },

    // Новый ключ данных (новый аккаунт или старый аккаунт, у которого шифрования ещё не было)
    async create() {
      key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    },

    // Значения для сервера: группа пароля и/или группа кода восстановления
    async passwordKeys(password) {
      const kdf_salt = b64(rnd(16));
      const { auth, kek } = await derive(password, kdf_salt, PASS_ITER);
      return { auth, kdf_salt, wrapped_key: await wrapWith(kek) };
    },
    async recoveryKeys(code) {
      const rec_salt = b64(rnd(16));
      const { auth, kek } = await derive(normCode(code), rec_salt, CODE_ITER);
      return { rec_auth: auth, rec_salt, rec_wrapped: await wrapWith(kek) };
    },

    // Вход: из пароля — auth для сервера и функция, которая откроет ключ данных из ответа
    async login(password, salt) {
      const { auth, kek } = await derive(password, salt, PASS_ITER);
      return { auth, open: async (wrapped) => { key = await unwrapWith(kek, wrapped); } };
    },
    async recovery(code, recSalt) {
      const { auth, kek } = await derive(normCode(code), recSalt, CODE_ITER);
      return { auth, open: async (wrapped) => { key = await unwrapWith(kek, wrapped); } };
    },

    async save(userId) { await idbDo('readwrite', (s) => s.put(key, `u${userId}`)); },
    async load(userId) {
      try { key = (await idbDo('readonly', (s) => s.get(`u${userId}`))) || null; } catch { key = null; }
      return !!key;
    },
    async forget(userId) {
      key = null;
      try { await idbDo('readwrite', (s) => s.delete(`u${userId}`)); } catch { /* ignore */ }
    },

    isSealed: (v) => typeof v === 'string' && v.startsWith(PREFIX),
    async encrypt(text) {
      if (!key) throw new Error('Нет ключа шифрования. Войдите в аккаунт заново');
      return PREFIX + await seal(key, te.encode(text));
    },
    async decrypt(s) {
      try { return td.decode(await unseal(key, s.slice(PREFIX.length))); } catch { return '⚠ Не удалось расшифровать'; }
    },
  };
})();
