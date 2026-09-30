// Использование: npm run create-admin -- email@example.com "пароль" "Имя"
// Если пользователь с таким email уже есть — задаёт ему новый пароль и права администратора.
const bcrypt = require('bcryptjs');
const db = require('../db');

const [email, password, name = ''] = process.argv.slice(2);
if (!email || !password) {
  console.log('Использование: npm run create-admin -- email@example.com "пароль" "Имя"');
  process.exit(1);
}
if (password.length < 8) {
  console.log('Пароль должен быть не короче 8 символов');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  db.prepare('UPDATE users SET password_hash = ?, is_admin = 1 WHERE id = ?').run(hash, existing.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  console.log(`Пароль обновлён, ${email} теперь администратор`);
} else {
  db.prepare('INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, ?, 1)').run(email, name, hash);
  console.log(`Администратор ${email} создан`);
}
