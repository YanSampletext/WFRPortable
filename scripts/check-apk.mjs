// Проверка собранного APK: пережило ли сжатие R8 то, до чего доходят по имени.
// R8 выбрасывает недостижимый код, а мост WebView и плагины Capacitor
// поднимаются рефлексией — упасть это может уже на запуске, поэтому классы
// и методы ищем прямо в classes.dex: имена там лежат обычным UTF-8.
//
//   node scripts/check-apk.mjs путь/к/файлу.apk
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const apk = process.argv[2];
if (!apk) { console.error('укажи путь к APK'); process.exit(2); }

const dir = mkdtempSync(join(tmpdir(), 'apk-'));
const problems = [];
const say = (ok, text) => { console.log((ok ? '  ✓ ' : '  ✗ ') + text); if (!ok) problems.push(text); };

// ── что лежит внутри ────────────────────────────────────────────────────────
const list = execFileSync('unzip', ['-l', apk], { encoding: 'utf8' });
const size = n => {
  const m = new RegExp('^\\s*(\\d+)\\s.*\\s' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'm').exec(list);
  return m ? parseInt(m[1], 10) : 0;
};
const kb = n => Math.round(n / 1024);
console.log('APK: ' + kb(readFileSync(apk).length) + ' КБ');
console.log('  classes.dex        ' + kb(size('classes.dex')) + ' КБ');
console.log('  assets/public/js/app.js ' + kb(size('assets/public/js/app.js')) + ' КБ');
console.log('');

// ── сайт внутри пакета цел ──────────────────────────────────────────────────
console.log('── содержимое ──');
for (const f of ['assets/public/index.html', 'assets/public/js/app.js', 'assets/public/js/dice.js',
                 'assets/public/js/encounter.js', 'assets/public/css/base.css',
                 'assets/capacitor.config.json', 'assets/capacitor.plugins.json']) {
  say(list.includes(f), f);
}
say(!list.includes('assets/public/sw.js'), 'service worker в приложение не попал (и не должен)');

// ── что должно пережить R8 ──────────────────────────────────────────────────
execFileSync('unzip', ['-o', '-q', apk, 'classes*.dex', '-d', dir]);
let dex = '';
for (const n of ['classes.dex', 'classes2.dex', 'classes3.dex']) {
  try { dex += readFileSync(join(dir, n), 'latin1'); } catch (e) {}
}

console.log('\n── пережило сжатие ──');
const need = [
  ['Lru/yansampletext/ordo/MainActivity;', 'MainActivity — её поднимает система по имени из манифеста'],
  ['Lcom/getcapacitor/BridgeActivity;',    'BridgeActivity — от неё наследуется MainActivity'],
  ['Lcom/getcapacitor/Bridge;',            'Bridge — мост между JS и Java'],
  ['Lcom/getcapacitor/JSExport;',          'JSExport — генерация интерфейса для JS'],
  ['Lcom/capacitorjs/plugins/preferences/PreferencesPlugin;',
                                           'PreferencesPlugin — вторая копия досье в SharedPreferences'],
  ['Landroid/webkit/JavascriptInterface;', 'аннотация @JavascriptInterface сохранена'],
];
for (const [sym, what] of need) say(dex.includes(sym), what);

// androidx под keep-правила не попадает, и R8 переименовывает его классы:
// искать «WindowInsetsCompat» бесполезно, его там больше нет по имени.
// А вот имена методов самого Android переименовать нельзя — по ним и судим,
// что код отступов под часы и вырез камеры на месте.
console.log('\n── отступы под системные панели (имена фреймворка) ──');
for (const [sym, what] of [
  ['setOnApplyWindowInsetsListener', 'подписка на системные отступы'],
  ['onApplyWindowInsets',            'обработчик отступов'],
  ['getDisplayCutout',               'учёт выреза камеры'],
]) say(dex.includes(sym), what);

// Из JS в Java уходит ровно один вызов по имени: androidBridge.postMessage
// в MessageHandler, помеченный @JavascriptInterface. Обратно — nativeCallback.
console.log('\n── мост, который зовут строкой ──');
say(dex.includes('Lcom/getcapacitor/MessageHandler;'), 'MessageHandler — приёмник сообщений из JS');
say(dex.includes('postMessage'), 'postMessage — метод, который зовёт androidBridge');
say(dex.includes('nativeCallback'), 'nativeCallback — ответ из Java в JS');

// Если R8 не отработал, dex останется прежним — а это тихая потеря 5 МБ.
console.log('\n── сжатие ──');
const obfuscated = (dex.match(/L[a-z0-9]{1,2}\/[a-z0-9]{1,2};/g) || []).length;
say(obfuscated > 100, 'R8 отработал: сокращённых имён классов ' + obfuscated);
say(size('classes.dex') < 3 * 1024 * 1024, 'classes.dex меньше 3 МБ (' + kb(size('classes.dex')) + ' КБ)');

rmSync(dir, { recursive: true, force: true });
console.log('\n' + (problems.length ? 'НЕ ПРОШЛО: ' + problems.length : 'всё на месте'));
process.exit(problems.length ? 1 : 0);
