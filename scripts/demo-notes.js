// Добавляет ~20 примеров заметок (с подзаметками) — чтобы посмотреть, как выглядит заполненная база.
// Использование: npm run demo-notes                  — для первого администратора
//                npm run demo-notes -- email@example.com — для конкретного пользователя
// Сервер можно не останавливать: после запуска просто обновите страницу.
const sanitizeHtml = require('sanitize-html');
const db = require('../db');

const email = process.argv[2];
const user = email
  ? db.prepare('SELECT id, email FROM users WHERE email = ?').get(email)
  : db.prepare('SELECT id, email FROM users WHERE is_admin = 1 ORDER BY id LIMIT 1').get();
if (!user) {
  console.log(email ? `Пользователь ${email} не найден` : 'Пользователей пока нет — сначала создайте администратора');
  process.exit(1);
}

const plain = (html) => sanitizeHtml(html.replace(/<\/(p|div|h\d|li|pre|blockquote)>|<br\s*\/?>/gi, ' $&'),
  { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const p = (...lines) => lines.map((l) => `<p>${l}</p>`).join('');
const ul = (...items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const ol = (...items) => `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;
const check = (...items) => `<ul class="checklist">${items.map(([done, t]) =>
  `<li data-checked="${done}">${t}</li>`).join('')}</ul>`;

// [заголовок, содержимое, [подзаметки]]
const tree = [
  ['Работа в поддержке', p('Всё, что помогает быстро и спокойно отвечать клиентам.'), [
    ['Шаблоны ответов', p('Готовые формулировки для частых вопросов. Перед отправкой — подставить детали клиента.')
      + '<h2>Приветствие</h2>' + p('Здравствуйте! Спасибо, что написали. Сейчас разберёмся.')
      + '<h2>Нужны подробности</h2>' + p('Пришлите, пожалуйста, скриншот и ссылку на задачу — так быстрее найдём причину.'), [
      ['Вход и пароли', p('Сброс пароля, двухфакторная авторизация, блокировка после неудачных попыток.')
        + ol('Проверить, что email указан без опечаток.', 'Отправить ссылку на сброс пароля.', 'Если письма нет — проверить папку «Спам».')],
      ['Оплата и тарифы', p('Смена тарифа, счета для юрлиц, возврат средств.')
        + '<blockquote>Возвраты оформляет только бухгалтерия — не обещать сроки самостоятельно.</blockquote>'],
    ]],
    ['Частые вопросы клиентов', ul('Как добавить сотрудника в организацию', 'Почему не приходят уведомления', 'Как выгрузить отчёт в Excel', 'Как настроить маршрут согласования')],
    ['Эскалация обращений', p('Когда передавать обращение второй линии:')
      + check([true, 'Ошибка воспроизводится у нескольких клиентов'], [true, 'Есть шаги воспроизведения'], [false, 'Приложены логи или HAR-файл'])],
    ['Заметки со встреч', p('Планёрка 29.09: обсудили рост обращений по уведомлениям, договорились собрать примеры и передать разработке.'), []],
    ['Итоги смены', p('Короткий отчёт в конце дня: сколько обращений, что повторялось, что передано дальше.')],
  ]],
  ['Изучаю тестирование', p('План перехода в QA: теория, практика, портфолио.'), [
    ['Теория тестирования', ul('Виды тестирования: функциональное, регрессионное, смоук', 'Техники тест-дизайна: классы эквивалентности, граничные значения', 'Жизненный цикл бага'), [
      ['Как писать баг-репорт', ol('Заголовок: что сломалось и где.', 'Шаги воспроизведения.', 'Ожидаемый и фактический результат.', 'Окружение: браузер, ОС, версия.')],
      ['Тест-кейсы и чек-листы', p('Чек-лист — список проверок, тест-кейс — проверка с шагами и ожидаемым результатом.')],
    ]],
    ['SQL-шпаргалка', '<pre><code>SELECT title, updated_at\nFROM pages\nWHERE user_id = 1\nORDER BY updated_at DESC\nLIMIT 10;</code></pre>'
      + p('JOIN, GROUP BY, HAVING — разобрать на практике.')],
    ['Инструменты', ul('DevTools: вкладки Network и Console', 'Postman — запросы к API', 'Git и GitHub Desktop')],
  ]],
  ['Личное', p('Планы, покупки и всё остальное.'), [
    ['Книги на осень', check([true, '«Чистый код» — Роберт Мартин'], [false, '«Тестирование Дот Ком» — Роман Савин'], [false, '«Думай медленно… решай быстро» — Канеман'])],
    ['Список покупок', check([false, 'Кофе'], [false, 'Батарейки AA'], [true, 'Удлинитель'])],
    ['Идеи для отпуска', p('Куда поехать весной: Калининград, Казань или Алтай. Сравнить цены на билеты в феврале.')],
  ]],
  ['Идеи для «Базы знаний»', p('Что можно добавить в приложение позже.')
    + ul('Раздел «Статьи»', 'Теги для заметок', 'Экспорт заметки в PDF', 'Общий доступ к заметке по ссылке')],
  ['Полезные ссылки', p('Справка Pyrus: <a href="https://pyrus.com/ru/help">pyrus.com/ru/help</a>')
    + p('Документация MDN: <a href="https://developer.mozilla.org/ru/">developer.mozilla.org</a>')],
];

const count = (nodes) => nodes.reduce((n, [, , kids = []]) => n + 1 + count(kids), 0);
const total = count(tree);

const ins = db.prepare(`INSERT INTO pages (user_id, parent_id, title, content, search_text, position, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`);
const nextPos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM pages WHERE user_id = ? AND parent_id IS ?');

// Разная «давность» изменения, чтобы «Недавно изменённые» и подписи «N дней назад» выглядели живо
let n = 0;
const age = () => `-${Math.round((n++ * 37) % 900 + n * 11)} hours`;

db.transaction(() => {
  const add = (parentId, nodes) => nodes.forEach(([title, content, kids = []], i) => {
    const pos = parentId === null ? nextPos.get(user.id, null).p : i;
    const a = age();
    const id = ins.run(user.id, parentId, title, content, `${title} ${plain(content)}`.toLowerCase(), pos, a, a).lastInsertRowid;
    add(id, kids);
  });
  add(null, tree);
})();

console.log(`Добавлено заметок: ${total} (пользователь ${user.email}). Обновите страницу в браузере.`);
