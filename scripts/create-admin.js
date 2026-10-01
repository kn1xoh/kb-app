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

(async () => {
  await db.init();
  const hash = bcrypt.hashSync(password, 10);
  const existing = await db.get('SELECT id, kdf_salt FROM users WHERE email = ?', email);
  if (existing?.kdf_salt) {
    // Заметки зашифрованы ключом из пароля: новый пароль отсюда задать нельзя, иначе данные не откроются
    console.log('У этого аккаунта заметки зашифрованы, поэтому задать пароль отсюда нельзя.');
    console.log('Восстановите доступ на экране входа: «Забыли пароль?» и код восстановления.');
    process.exit(1);
  } else if (existing) {
    await db.run('UPDATE users SET password_hash = ?, is_admin = 1 WHERE id = ?', hash, existing.id);
    await db.run('DELETE FROM sessions WHERE user_id = ?', existing.id);
    console.log(`Пароль обновлён, ${email} теперь администратор`);
  } else {
    await db.run('INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, ?, 1)', email.trim().toLowerCase(), name, hash);
    console.log(`Администратор ${email} создан. При первом входе он получит код восстановления, а заметки зашифруются`);
  }
  await db.close();
})().catch((e) => { console.error(e.message || e); process.exit(1); });
