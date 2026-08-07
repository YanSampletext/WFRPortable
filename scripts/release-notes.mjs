// Достаёт из CHANGELOG.md запись под нужную версию и печатает её.
// Ею же описывается релиз на GitHub, поэтому скрипт нарочно падает, если
// записи нет или версия в сборке не та: тег без описания выйти не должен.
//
//   node scripts/release-notes.mjs v1.8.0            # напечатать
//   node scripts/release-notes.mjs v1.8.0 --check    # только проверить
import { readFileSync } from 'node:fs';

const arg = process.argv[2] || '';
const check = process.argv.includes('--check');
const version = arg.replace(/^v/, '');

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Нужна версия вида v1.8.0, получено: ' + (arg || '(пусто)'));
  process.exit(2);
}

const root = new URL('..', import.meta.url).pathname;
const md = readFileSync(root + 'CHANGELOG.md', 'utf8');

// Заголовок записи: «## 1.8.0 — 7 августа 2026»
const lines = md.split('\n');
const head = new RegExp('^##\\s+' + version.replace(/\./g, '\\.') + '(\\s|$)');
const from = lines.findIndex(l => head.test(l));
if (from < 0) {
  console.error('В CHANGELOG.md нет записи о версии ' + version + '.');
  console.error('Тег без описания выпускать нельзя — допиши раздел «## ' + version + ' — <дата>».');
  process.exit(1);
}
let to = lines.length;
for (let i = from + 1; i < lines.length; i++) {
  if (/^##\s+\d/.test(lines[i])) { to = i; break; }
}
const body = lines.slice(from + 1, to).join('\n').trim();
if (!body) {
  console.error('Запись о версии ' + version + ' пуста.');
  process.exit(1);
}

// Версия в сборке должна совпадать с тегом, иначе выйдет APK не тот, что
// описан в релизе. Проверяем versionName, а не versionCode: он и есть 1.8.0.
const gradle = readFileSync(root + 'android/app/build.gradle', 'utf8');
const vn = /versionName\s+"([^"]+)"/.exec(gradle);
if (!vn) {
  console.error('Не нашёл versionName в android/app/build.gradle.');
  process.exit(1);
}
if (vn[1] !== version) {
  console.error('Тег v' + version + ', а в build.gradle versionName "' + vn[1] + '".');
  console.error('Подними версию и versionCode, иначе Android не поставит обновление.');
  process.exit(1);
}

if (check) {
  console.log('CHANGELOG и версия сборки согласны: ' + version);
} else {
  console.log(body);
}
