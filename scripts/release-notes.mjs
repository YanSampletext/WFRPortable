// Достаёт из CHANGELOG.md запись под нужную версию и печатает её.
// Ею же описывается релиз на GitHub, поэтому скрипт нарочно падает, если
// записи нет, версия в сборке не та или номер версии не отвечает тому, что в
// записи написано: тег, который врёт о себе, выйти не должен.
//
//   node scripts/release-notes.mjs v1.9.0            # напечатать
//   node scripts/release-notes.mjs v1.9.0 --check    # только проверить
import { readFileSync } from 'node:fs';

// Разделы Keep a Changelog в том порядке, в каком они должны идти.
// Ничего сверх этого списка: «Внутри», «Прочее» и подобное разъезжается у
// каждого по-своему, и по такой записи уже не понять, чего стоит выпуск.
const SECTIONS = ['Добавлено', 'Изменено', 'Устарело', 'Удалено', 'Исправлено', 'Безопасность'];
// Разделы, из-за которых выпуск перестаёт быть патчем: появилось новое или
// изменилось привычное — по семантике это минорная версия.
const MINOR_WORTHY = ['Добавлено', 'Изменено', 'Устарело', 'Удалено'];

const arg = process.argv[2] || '';
const check = process.argv.includes('--check');
const version = arg.replace(/^v/, '');

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Нужна версия вида v1.9.0, получено: ' + (arg || '(пусто)'));
  process.exit(2);
}

const root = new URL('..', import.meta.url).pathname;
const md = readFileSync(root + 'CHANGELOG.md', 'utf8');
const lines = md.split('\n');

const fail = msg => { console.error(msg); process.exit(1); };

// ── запись под версию ───────────────────────────────────────────────────────
// Заголовок вида «## 1.9.0 — 7 августа 2026»
const head = new RegExp('^##\\s+' + version.replace(/\./g, '\\.') + '(\\s|$)');
const from = lines.findIndex(l => head.test(l));
if (from < 0) {
  fail('В CHANGELOG.md нет записи о версии ' + version + '.\n' +
       'Тег без описания выпускать нельзя — допиши раздел «## ' + version + ' — <дата>».');
}
let to = lines.length;
for (let i = from + 1; i < lines.length; i++) {
  if (/^##\s+\d/.test(lines[i])) { to = i; break; }
}
const block = lines.slice(from + 1, to);
const body = block.join('\n').trim();
if (!body) fail('Запись о версии ' + version + ' пуста.');

// ── разделы: только известные и в правильном порядке ────────────────────────
const found = block.filter(l => /^###\s/.test(l)).map(l => l.replace(/^###\s+/, '').trim());
if (!found.length) fail('В записи о ' + version + ' нет ни одного раздела «### …».');

const unknown = found.filter(s => SECTIONS.indexOf(s) < 0);
if (unknown.length) {
  fail('Незнакомые разделы в записи о ' + version + ': ' + unknown.join(', ') + '.\n' +
       'Разрешены только: ' + SECTIONS.join(', ') + '.');
}
const order = found.map(s => SECTIONS.indexOf(s));
for (let i = 1; i < order.length; i++) {
  if (order[i] <= order[i - 1]) {
    fail('Разделы в записи о ' + version + ' идут не по порядку: ' + found.join(' → ') + '.\n' +
         'Порядок: ' + SECTIONS.join(' → ') + ' (повторять раздел нельзя).');
  }
}

// ── номер версии против того, что в записи ──────────────────────────────────
// Патч — это только починки и закрытые дыры. Есть «Добавлено» или
// «Изменено» — значит выпуск минорный, и номер должен это показывать.
const [maj, min, patch] = version.split('.').map(Number);
const weighty = found.filter(s => MINOR_WORTHY.indexOf(s) >= 0);
if (patch > 0 && weighty.length) {
  fail('Версия ' + version + ' — патч, а в записи есть: ' + weighty.join(', ') + '.\n' +
       'По семантике это минорный выпуск: подними до ' + maj + '.' + (min + 1) + '.0 ' +
       'или перенеси эти пункты в «Исправлено»/«Безопасность».');
}

// ── версия в сборке ─────────────────────────────────────────────────────────
// Иначе выйдет APK не тот, что описан в релизе.
const gradle = readFileSync(root + 'android/app/build.gradle', 'utf8');
const vn = /versionName\s+"([^"]+)"/.exec(gradle);
if (!vn) fail('Не нашёл versionName в android/app/build.gradle.');
if (vn[1] !== version) {
  fail('Тег v' + version + ', а в build.gradle versionName "' + vn[1] + '".\n' +
       'Подними версию и versionCode, иначе Android не поставит обновление.');
}

if (check) {
  console.log('CHANGELOG и версия сборки согласны: ' + version + ' (' + found.join(', ') + ')');
} else {
  console.log(body);
}
