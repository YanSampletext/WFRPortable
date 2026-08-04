// Собирает то, что отдаётся пользователю: содержимое APK или сайт для Pages.
// Исходники в корне остаются читаемыми — index.html по-прежнему открывается
// двойным кликом. Никаких сборщиков и зависимостей: только node.
//
//   node scripts/build-www.mjs                    → www/  (для APK, без service worker)
//   node scripts/build-www.mjs --target=web --out=_site  → сайт для Pages
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, def) => {
  const found = args.find(a => a.startsWith('--' + name + '='));
  return found ? found.slice(name.length + 3) : def;
};
const target = arg('target', 'app');            // app | web
const out = join(root, arg('out', 'www'));

// Всё, из чего состоит приложение. sw.js берём только для веба: внутри APK
// файлы и так локальные, а его кеш пережил бы обновление приложения и
// продолжил отдавать старую вёрстку.
const ITEMS = ['index.html', 'manifest.json', 'css', 'js', 'fonts', 'icons']
  .concat(target === 'web' ? ['sw.js', 'privacy.html'] : []);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const item of ITEMS) {
  const from = join(root, item);
  if (!existsSync(from)) {
    console.error(`нет файла или папки: ${item}`);
    process.exit(1);
  }
  cpSync(from, join(out, item), { recursive: true });
}

// ── минификация CSS ────────────────────────────────────────────────────────
// Только безопасные преобразования: комментарии, лишние пробелы и переводы
// строк. Порядок правил, значения и специфичность не трогаем — каскад
// остаётся ровно тем же, что в исходниках.
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')      // комментарии
    .replace(/\s+/g, ' ')                  // любые пробелы → один
    .replace(/\s*([{}:;,>~])\s*/g, '$1')   // пробелы вокруг разделителей
    .replace(/;}/g, '}')                   // висящая точка с запятой
    .replace(/([\s:,(])0\.(\d)/g, '$1.$2') // 0.5 → .5
    .trim();
}

let before = 0, after = 0;
const cssDir = join(out, 'css');
for (const name of readdirSync(cssDir)) {
  if (!name.endsWith('.css')) continue;
  const p = join(cssDir, name);
  const src = readFileSync(p, 'utf8');
  const min = minifyCss(src);
  before += Buffer.byteLength(src);
  after += Buffer.byteLength(min);
  writeFileSync(p, min, 'utf8');
}

// ── правки index.html под цель сборки ──────────────────────────────────────
const indexPath = join(out, 'index.html');
let html = readFileSync(indexPath, 'utf8');
if (target === 'app') {
  html = html.replace(
    "if('serviceWorker' in navigator && location.protocol.startsWith('http')){",
    "if(false){ // в собранном приложении service worker отключён"
  );
}
writeFileSync(indexPath, html, 'utf8');

const kb = n => Math.round(n / 1024);
console.log(`${arg('out', 'www')}/ собрана для «${target}»: ${ITEMS.join(', ')}`);
console.log(`CSS: ${kb(before)} КБ → ${kb(after)} КБ`);
