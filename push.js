// Web Push без сторонних библиотек: подпись VAPID (RFC 8292) и шифрование aes128gcm (RFC 8291)
// на встроенном node:crypto. Уведомление уходит в службу браузера (Google, Apple, Mozilla, Microsoft),
// а она доставляет его на телефон или компьютер, даже когда Silo закрыт.
const crypto = require('crypto');

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const unb64u = (s) => Buffer.from(String(s), 'base64url');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

// Ключи VAPID — одна пара на сервер, хранится в базе (таблица meta), чтобы подписки
// не ломались после перезапуска или переезда сервера
function createVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  return {
    publicKey: b64u(Buffer.concat([Buffer.from([4]), unb64u(jwk.x), unb64u(jwk.y)])),
    privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }),
  };
}

function vapidAuth(endpoint, vapid, subject) {
  const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64u(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  }));
  const data = `${header}.${claims}`;
  const sig = crypto.sign('sha256', Buffer.from(data), { key: vapid.privateKey, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${data}.${b64u(sig)}, k=${vapid.publicKey}`;
}

// Шифрование содержимого для конкретного браузера (его ключи p256dh и auth из подписки).
// test — фиксированные ключ и соль для проверки по примеру из RFC 8291
function encrypt(payload, p256dh, authSecret, test = null) {
  const uaPublic = unb64u(p256dh);
  const auth = unb64u(authSecret);
  const ecdh = crypto.createECDH('prime256v1');
  if (test) ecdh.setPrivateKey(unb64u(test.asPrivate));
  const asPublic = test ? ecdh.getPublicKey() : ecdh.generateKeys();
  const shared = ecdh.computeSecret(uaPublic);
  const ikm = hmac(hmac(auth, shared), Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]));
  const salt = test ? unb64u(test.salt) : crypto.randomBytes(16);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const head = Buffer.alloc(21);
  salt.copy(head, 0);
  head.writeUInt32BE(4096, 16);
  head[20] = asPublic.length;
  return Buffer.concat([head, asPublic, body]);
}

// Адреса подписок выдают только службы уведомлений браузеров — другие не принимаем,
// чтобы сервер не отправлял запросы куда попало
const PUSH_HOSTS = /(^|\.)(googleapis\.com|mozilla\.com|mozaws\.net|windows\.com|apple\.com)$/i;
function validEndpoint(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname) && url.length <= 1000;
  } catch { return false; }
}

// Отправка одного уведомления. Результат: 'ok' | 'gone' (подписка больше не действует — удалить) | 'error'
async function send(sub, data, vapid, subject) {
  try {
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: vapidAuth(sub.endpoint, vapid, subject),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'high',
      },
      body: encrypt(JSON.stringify(data), sub.p256dh, sub.auth),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return 'ok';
    if (res.status === 404 || res.status === 410) return 'gone';
    console.error(`Уведомление не доставлено (${res.status}): ${(await res.text().catch(() => '')).slice(0, 200)}`);
    return 'error';
  } catch (e) {
    console.error('Уведомление не доставлено:', e.message);
    return 'error';
  }
}

module.exports = { createVapidKeys, encrypt, send, validEndpoint };
