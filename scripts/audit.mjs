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

// ── отчёт ───────────────────────────────────────────────────────────────────
console.log('── ошибки ──');
console.log(problems.length ? problems.map(p => '  ' + p).join('\n') : '  нет');
console.log('\n── объявлено и нигде не используется (' + dead.length + ') ──');
console.log(dead.length ? '  ' + dead.sort().join(', ') : '  нет');
console.log('\n── классы CSS без применения (' + unusedCss.length + ') ──');
console.log(unusedCss.length ? '  ' + unusedCss.join(', ') : '  нет');
process.exit(problems.length ? 1 : 0);
