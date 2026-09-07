// Статический аудит: что вызывается из разметки, но не объявлено; что объявлено,
// но никем не зовётся; какие классы CSS нигде не встречаются; целы ли комментарии.
//
// Запуск: node scripts/audit.mjs
import { readFileSync, readdirSync } from 'node:fs';

const jsFiles  = readdirSync('js').filter(f => f.endsWith('.js')).map(f => 'js/' + f);
const cssFiles = readdirSync('css').filter(f => f.endsWith('.css')).map(f => 'css/' + f);
const html     = readFileSync('index.html', 'utf8');
const jsSrc    = Object.fromEntries(jsFiles.map(f => [f, readFileSync(f, 'utf8')]));
const cssSrc   = Object.fromEntries(cssFiles.map(f => [f, readFileSync(f, 'utf8')]));
const allJs    = Object.values(jsSrc).join('\n');
const allCss   = Object.values(cssSrc).join('\n');
const problems = [];

// ── 1. функции, объявленные в проекте ───────────────────────────────────────
const declared = new Set();
for (const src of Object.values(jsSrc)) {
  for (const m of src.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) declared.add(m[1]);
  for (const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) declared.add(m[1]);
  for (const m of src.matchAll(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/gm)) declared.add(m[1]);
}

// браузерное и то, что объявлено внутри объектов/классов
const builtin = new Set(['alert','confirm','prompt','print','open','close','focus','blur','event',
  'setTimeout','clearTimeout','requestAnimationFrame','encodeURIComponent','decodeURIComponent',
  'parseInt','parseFloat','isNaN','JSON','Math','Date','Array','Object','String','Number','Boolean',
  'localStorage','sessionStorage','document','window','navigator','location','history','console',
  'if','for','while','return','typeof','new','delete','this','true','false','null','undefined',
  'catch','try','switch','case','function','var','let','const','else','do','in','of','void','class']);

// ── 2. что зовётся из inline-обработчиков разметки ──────────────────────────
const inlineCalls = new Map();   // имя → где встретилось
const scan = (text, where) => {
  for (const m of text.matchAll(/\bon(?:click|change|input|keydown|keyup|submit|focus|blur)\s*=\s*(["'])([\s\S]*?)\1/g)) {
    // только самостоятельные вызовы: «el.remove()» — метод, а не наша функция
    for (const c of m[2].matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const n = c[2];
      if (builtin.has(n)) continue;
      if (!inlineCalls.has(n)) inlineCalls.set(n, where);
    }
  }
};
scan(html, 'index.html');
for (const [f, src] of Object.entries(jsSrc)) scan(src, f);

for (const [name, where] of inlineCalls) {
  if (!declared.has(name)) problems.push(`НЕТ ФУНКЦИИ  ${name}()  — вызывается из ${where}`);
}

// ── 3. объявлено, но нигде не используется ──────────────────────────────────
const dead = [];
for (const name of declared) {
  if (name.length < 4) continue;
  const uses = (allJs.match(new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b', 'g')) || []).length
             + (html.match(new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b', 'g')) || []).length;
  if (uses <= 1) dead.push(name);          // единственное вхождение — само объявление
}

// ── 4. классы CSS, которых нет ни в разметке, ни в скриптах ─────────────────
const usedText = html + '\n' + allJs;
const cssClasses = new Set();
// .woff2 в url() и .googleapis в комментарии — не классы, а куски путей
const cssNoUrls = allCss
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/url\([^)]*\)/g, '')
  .replace(/https?:\/\/\S+/g, '');
for (const m of cssNoUrls.matchAll(/\.([a-z][a-z0-9_-]{2,})/gi)) cssClasses.add(m[1]);
const unusedCss = [...cssClasses].filter(c => !usedText.includes(c)).sort();

// ── 5. целостность комментариев в стилях ────────────────────────────────────
for (const [f, src] of Object.entries(cssSrc)) {
  const o = (src.match(/\/\*/g) || []).length, c = (src.match(/\*\//g) || []).length;
  if (o !== c) problems.push(`КОММЕНТАРИИ  ${f}: открыто ${o}, закрыто ${c}`);
}

// ── 6. всё подключённое закешировано и наоборот ─────────────────────────────
const sw = readFileSync('sw.js', 'utf8');
for (const m of html.matchAll(/<script src="(js\/[^"]+)"/g)) {
  if (!sw.includes(m[1])) problems.push(`НЕ В КЕШЕ   ${m[1]} подключён, но его нет в ASSETS sw.js`);
}
for (const m of html.matchAll(/<link[^>]+href="(css\/[^"]+)"/g)) {
  if (!sw.includes(m[1])) problems.push(`НЕ В КЕШЕ   ${m[1]} подключён, но его нет в ASSETS sw.js`);
}
for (const m of sw.matchAll(/'\.\/(js\/[^']+|css\/[^']+)'/g)) {
  if (!html.includes(m[1])) problems.push(`ЛИШНЕЕ В КЕШЕ  ${m[1]} есть в ASSETS, но нигде не подключён`);
}

// ── 7. файлы скриптов, забытые в разметке ───────────────────────────────────
for (const f of jsFiles) if (!html.includes(f)) problems.push(`НЕ ПОДКЛЮЧЁН  ${f}`);
for (const f of cssFiles) if (!html.includes(f) && !allCss.includes(f.split('/')[1]))
  problems.push(`НЕ ПОДКЛЮЧЁН  ${f}`);

// ── 8. повторяющиеся id в статической разметке ──────────────────────────────
const ids = {};
for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids[m[1]] = (ids[m[1]] || 0) + 1;
for (const [id, n] of Object.entries(ids)) if (n > 1) problems.push(`ПОВТОР ID   ${id} × ${n} в index.html`);

// ── 8б. карточка поверх подложки не должна глушить всплытие ─────────────────
// Подложка закрывалась от любого клика внутри, поэтому карточку защищали
// event.stopPropagation(). Вместе со всплытием обрубалось делегирование:
// кнопки с data-call ловит обработчик на документе, и «Ещё раз» не делала
// ничего вовсе — молча, без единой ошибки в консоли. Закрывать подложку надо
// по e.target === подложка, а карточке ничего глушить не нужно.
// [^>]*, а не «что угодно, кроме кавычек»: между именем класса и onclick стоит
// закрывающая кавычка атрибута, и правило с исключёнными кавычками не совпадало
// ни с одним из трёх видов этой строки в проекте. Проверено на образце ниже —
// без такой проверки оно бы молча зеленело.
const SWALLOW = /sv4-roll-card[^>]*onclick="event\.stopPropagation\(\)"/;
if (!SWALLOW.test('<div class="sv4-roll-card ${cls}" onclick="event.stopPropagation()">'))
  problems.push('САМОПРОВЕРКА  правило про глушение всплытия не ловит собственный образец');
for (const [f, src] of Object.entries(jsSrc)) {
  if (SWALLOW.test(src))
    problems.push(`ГЛУШИТ ВСПЛЫТИЕ  ${f}: карточка гасит событие — кнопки data-call внутри работать не будут`);
}

// ── 8в. подстановка внутри обычных кавычек ─────────────────────────────────
// В обычных кавычках ${...} — просто текст, и он уходит на экран как есть.
// Так в журнал веры попадало буквальное «${ICONS.check}», а в мастер создания —
// «${ICONS.warn} слишком много». Ловим узко и потому надёжно: строка в обычных
// кавычках, начинающаяся с «<» (то есть кусок разметки) и содержащая ${…}.
// Шире брать нельзя — внутри шаблонных строк одинарные кавычки законны, и
// правило начнёт врать.
const RAWTPL = /'<[^'\n]*\$\{[A-Za-z_$][^'\n]*'/g;
if (!"x = '<span>${ICONS.warn}</span>';".match(RAWTPL))
  problems.push('САМОПРОВЕРКА  правило про подстановку в обычных кавычках не ловит собственный образец');
for (const [f, src] of Object.entries(jsSrc)) {
  RAWTPL.lastIndex = 0;
  for (const m of src.match(RAWTPL) || [])
    problems.push(`МЁРТВАЯ ПОДСТАНОВКА  ${f}: ${m.slice(0, 60)} — в обычных кавычках это просто текст`);
}

// ── 9. чужой сеттинг в собственном оформлении ───────────────────────────────
// Это Warhammer Fantasy, а не Warhammer 40 000. «Ордо» (Ordo Malleus, Ordo
// Hereticus) и «Империум» — Инквизиция и Империя Человечества из
// сорокатысячника. Здесь Империя: Рейкланд, Альтдорф, ордена Зигмара,
// Колледжи Магии. Уровни допуска и грифы секретности — тоже не отсюда,
// имперская канцелярия обходится печатями и грамотами. Сюда же чужие
// вымышленные миры и земные дни недели: имперская неделя восьмидневная.
//
// Проверяем только собственные тексты приложения. js/data.js не трогаем: там
// книжные данные, и карьера «Инквизитор» в WFRP4 совершенно законна — это
// ступень охотника на ведьм.
const OWN_TEXT = ['index.html', 'manifest.json', 'privacy.html', 'README.md',
                  ...cssFiles, ...jsFiles.filter(f => f !== 'js/data.js')];
// \b в JavaScript определяется через [A-Za-z0-9_] — по латинице. Перед
// кириллической буквой границы слова для движка не существует, поэтому
// /\bИмпериум/ не совпадает НИКОГДА. На этом правило про «Ордо» пролежало
// мёртвым: проверяли его латинским Ordo и ничего не заметили. Границу
// задаём сами, явным перечислением букв обоих алфавитов.
const L = '[A-Za-zА-Яа-яЁё]';
const LS = `${L}*`;   // хвост слова: \\w в JS кириллицу не берёт
const word = (body, flags = 'g') => new RegExp(`(?<!${L})(?:${body})(?!${L})`, flags);

const ALIEN = [
  // ── Warhammer 40 000 ──
  [word('Ordo(?=\\s+[A-ZА-Я])'), 'Ordo — это Инквизиция WH40k, не Империя Фэнтези'],
  [word('Ордо'),                 '«Ордо» — из WH40k; в Империи Фэнтези таких структур нет'],
  [word('Imperi(?:um|vm)', 'gi'),'Imperium — Империя Человечества из WH40k; здесь Империя'],
  [word(`Империум${LS}`),         '«Империум» — из WH40k; в Фэнтези просто Империя'],
  [word(`Инквизици${L}+`),        'Инквизиция как организация — WH40k; здесь охотники на ведьм'],
  [word(`космодесант${LS}|Адептус|Сегментум`, 'gi'), 'словарь WH40k'],
  [word('Терра|Терре|Терры'),    'Терра — WH40k; столица Империи — Альтдорф'],
  // ── современная канцелярия вместо имперской ──
  [/Допуск\s+[IVX\d]+/g,         'уровни допуска — современная секретность, не имперская канцелярия'],
  [/'СЕКРЕТНО'|«СЕКРЕТНО»/g,     'гриф «СЕКРЕТНО» — не из Старого Света; там сургуч и печать'],
  // ── чужие вымышленные миры: однажды «Зима близко» уже пролезла в эпиграф ──
  [/Зима близко/gi,              '«Зима близко» — девиз Старков из «Игры престолов»'],
  [word(`Хоббит${LS}|Мордор|Джедай${LS}`, 'gi'), 'из другого вымышленного мира'],
  // ── земной календарь: имперская неделя восьмидневная ──
  [word(`понедельник${LS}|вторник${LS}|сред[аыу]|четверг${LS}|пятниц${L}+|суббот${L}+|воскресень${L}+`, 'gi'),
                                 'земные дни недели: в Империи Веллентаг, Марктаг, Фестаг и прочие'],
];

// Проверка проверки. Каждое правило обязано сработать на своём образце —
// иначе оно молча зеленеет, как это уже было с кириллическим \b.
const CANARY = [
  'Ordo Malleus', 'Досье Ордо', 'Imperivm', 'Империума не существует',
  'Инквизиция дремлет', 'космодесант', 'вернулся на Терру и на Терре остался',
  'Допуск III', '«СЕКРЕТНО»', 'Зима близко', 'Мордор',
  'обычный вторник, а в среду пятница',
].join(' | ');
for (const [re, why] of ALIEN) {
  re.lastIndex = 0;
  if (!CANARY.match(re)) problems.push(`САМОПРОВЕРКА  правило «${why}» не ловит собственный образец`);
}
// Технические строки, которые изменить уже нельзя: appId зафиксирован
// публикацией, адрес поддержки принадлежит автору.
const ALLOW = /ru\.yansampletext\.ordo|boosty\.to\/ordodos/g;
for (const f of OWN_TEXT) {
  let src;
  try { src = readFileSync(f, 'utf8'); } catch { continue; }
  const clean = src.replace(ALLOW, '');
  for (const [re, why] of ALIEN) {
    const hits = clean.match(re);
    if (hits) problems.push(`ЧУЖОЙ ЛОР  ${f}: «${hits[0]}» — ${why}`);
  }
}

// ── отчёт ───────────────────────────────────────────────────────────────────
console.log('── ошибки ──');
console.log(problems.length ? problems.map(p => '  ' + p).join('\n') : '  нет');
console.log('\n── объявлено и нигде не используется (' + dead.length + ') ──');
console.log(dead.length ? '  ' + dead.sort().join(', ') : '  нет');
console.log('\n── классы CSS без применения (' + unusedCss.length + ') ──');
console.log(unusedCss.length ? '  ' + unusedCss.join(', ') : '  нет');
process.exit(problems.length ? 1 : 0);
