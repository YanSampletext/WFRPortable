// Достаёт из CHANGELOG.md запись под нужную версию и печатает её.
// Ею же описывается релиз на GitHub, поэтому скрипт нарочно падает, если
// записи нет, версия в сборке не та или номер версии не отвечает тому, что в
// записи написано: тег, который врёт о себе, выйти не должен.
//
//   node scripts/release-notes.mjs v1.9.0            # напечатать
//   node scripts/release-notes.mjs v1.9.0 --check    # только проверить
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

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

// ── путь обновления: то, что ломается один раз и навсегда ───────────────────
// Идентификатор приложения зафиксирован публикацией в магазине. Стоит его
// поменять — и это уже другое приложение: обновление поверх установленного не
// встанет, у людей останется мёртвая версия, а вернуть прежний идентификатор
// после публикации нового нельзя. Имя приложения при этом менять можно
// сколько угодно: подпись под иконкой к идентификатору отношения не имеет.
const FROZEN_APP_ID = 'ru.yansampletext.ordo';
const appId = /applicationId\s+["']([^"']+)["']/.exec(gradle);
if (!appId) fail('Не нашёл applicationId в android/app/build.gradle.');
if (appId[1] !== FROZEN_APP_ID) {
  fail('applicationId стал "' + appId[1] + '", а опубликован "' + FROZEN_APP_ID + '".\n' +
       'Это разные приложения: обновление поверх установленного не встанет.\n' +
       'Идентификатор менять нельзя — переименовывай app_name в strings.xml.');
}

// versionCode обязан расти: Android не ставит обновление с тем же или меньшим.
const vc = /versionCode\s+(\d+)/.exec(gradle);
if (!vc) fail('Не нашёл versionCode в android/app/build.gradle.');
const code = parseInt(vc[1], 10);

// Сверяем с предыдущим выпущенным, если история тегов доступна. В CI при
// checkout глубиной 1 её нет — тогда пропускаем, а не выдумываем.
let prev = null;
try {
  const tags = execSync('git tag -l "v*" --sort=-v:refname', { cwd: root, encoding: 'utf8' })
    .split('\n').map(t => t.trim()).filter(t => t && t !== 'v' + version);
  for (const t of tags) {
    const old = execSync(`git show ${t}:android/app/build.gradle`, { cwd: root, encoding: 'utf8' });
    const m = /versionCode\s+(\d+)/.exec(old);
    if (m) { prev = { tag: t, code: parseInt(m[1], 10) }; break; }
  }
} catch { /* истории нет — проверка versionCode пропускается осознанно */ }

if (prev && code <= prev.code) {
  fail('versionCode ' + code + ', а в ' + prev.tag + ' уже ' + prev.code + '.\n' +
       'Android не поставит обновление с тем же или меньшим versionCode — подними его.');
}

// Подпись: без неё APK не установить поверх прежнего. В сборке ключ приходит
// из секретов, здесь проверяем только что конфигурация на месте.
if (!/signingConfig\s+signingConfigs\.release/.test(gradle)) {
  fail('В release-сборке потерялся signingConfig — APK выйдет неподписанным\n' +
       'и не встанет поверх установленного приложения.');
}

if (check) {
  console.log('CHANGELOG и версия сборки согласны: ' + version + ' (' + found.join(', ') + ')');
} else {
  console.log(body);
}
