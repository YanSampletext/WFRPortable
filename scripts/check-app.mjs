// Полный обход приложения: каждый шаг, каждая вкладка, каждый пункт меню.
// Ищет ошибки JS, повторяющиеся id, переполнение по ширине и пустые экраны.
//
// Запуск:
//   node scripts/check-app.mjs
import { launchChromium, serve } from './browser.mjs';

const srv = await serve(new URL('..', import.meta.url).pathname, 8099);
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 393, height: 850 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)); });

await p.goto('http://127.0.0.1:8099/index.html');
await p.waitForTimeout(700);

// полноценный персонаж штатным генератором
await p.evaluate(() => {
  document.getElementById('view-landing').style.display = 'none';
  document.getElementById('view-app').style.display = 'block';
  _rollFullRandomCharacterDo();
  state.name = 'Проверочный';
  state.xpGained = 500;
  saveCharacterToRoster();
  appMode = 'character'; state.step = 8; goStep(8);
});
await p.waitForTimeout(600);

// ── все вкладки бланка ──────────────────────────────────────────────────────
const tabs = await p.evaluate(() => SHEET_TABS.map(t => t.id));
const tabProblems = [];
for (const t of tabs) {
  const before = errs.length;
  const info = await p.evaluate(tab => {
    try {
      sv4NavGo(tab);
      const page = document.querySelector('.sv4-page');
      const dup = {};
      let dupes = [];
      page.querySelectorAll('[id]').forEach(el => {
        if (dup[el.id]) dupes.push(el.id); else dup[el.id] = 1;
      });
      // настоящее переполнение — только если ни один предок не прокручивает и не обрезает
      // Доходим до самого html: обрезка объявлена на body (декоративный череп
      // нарочно свисает за край), и остановка на нём давала ложную тревогу.
      const scrolls = el => {
        for (let n = el.parentElement; n; n = n.parentElement) {
          const o = getComputedStyle(n).overflowX;
          if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
        }
        return false;
      };
      const wide = [...page.querySelectorAll('*')]
        .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .filter(el => !scrolls(el))
        .map(el => (el.className || '').toString().slice(0, 24)).slice(0, 3);
      return { html: page.innerHTML.length, dupes: [...new Set(dupes)], wide };
    } catch (e) { return { error: e.message }; }
  }, t);
  await p.waitForTimeout(220);
  const line = [];
  if (info.error) line.push('ОШИБКА: ' + info.error);
  if (info.html !== undefined && info.html < 200) line.push('подозрительно пусто (' + info.html + ' символов)');
  if (info.dupes && info.dupes.length) line.push('повторяющиеся id: ' + info.dupes.join(', '));
  if (info.wide && info.wide.length) line.push('вылезает за экран: ' + info.wide.join(', '));
  if (errs.length > before) line.push('ошибок JS: ' + (errs.length - before));
  console.log(`  вкладка ${t.padEnd(10)} ${line.length ? '⚠ ' + line.join(' | ') : 'в порядке'}`);
  if (line.length) tabProblems.push(t);
}

// ── все шаги мастера ────────────────────────────────────────────────────────
console.log('');
for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  const before = errs.length;
  const r = await p.evaluate(step => {
    try {
      appMode = step >= 8 ? 'character' : 'creation';
      state.step = step === 0 ? 0 : state.step;
      goStep(step);
      const page = document.querySelector(`.page[data-step="${step}"]`);
      return { active: page.classList.contains('active'), len: page.innerHTML.length };
    } catch (e) { return { error: e.message }; }
  }, n);
  await p.waitForTimeout(200);
  const bad = r.error ? 'ОШИБКА: ' + r.error : (!r.active ? 'экран не стал активным' : (errs.length > before ? 'ошибок JS: ' + (errs.length - before) : ''));
  console.log(`  шаг ${String(n).padEnd(12)} ${bad || 'в порядке'}`);
}

// ── пункты бокового меню ────────────────────────────────────────────────────
console.log('');
await p.evaluate(() => { appMode = 'character'; goStep(8); });
await p.waitForTimeout(300);
const menu = await p.evaluate(() => {
  drawerOpen();
  return [...document.querySelectorAll('.drawer-item')].map(el => el.querySelector('span').textContent);
});
for (let i = 0; i < menu.length; i++) {
  const before = errs.length;
  try {
    await p.evaluate(idx => {
      const items = document.querySelectorAll('.drawer-item');
      if (items[idx] && !items[idx].disabled) items[idx].click();
    }, i);
  } catch (e) { console.log(`  меню «${menu[i]}» — УВОДИТ СО СТРАНИЦЫ: ${e.message.slice(0, 60)}`); }
  await p.waitForTimeout(350);
  // закрываем всё, что могло открыться
  await p.evaluate(() => { if (typeof ordoDialogClose === 'function') ordoDialogClose(); drawerClose(); goStep(8); drawerOpen(); });
  await p.waitForTimeout(250);
  console.log(`  меню «${menu[i]}»${' '.repeat(Math.max(0, 20 - menu[i].length))} ${errs.length > before ? '⚠ ошибок: ' + (errs.length - before) : 'в порядке'}`);
}
await p.evaluate(() => drawerClose());

// ── светлая тема: читается ли текст ─────────────────────────────────────────
// Цвета смешиваем с подложкой: полупрозрачный фон сам по себе ничего не значит.
console.log('\n── светлая тема ──');
await p.evaluate(() => document.body.classList.add('theme-light'));
for (const t of tabs) {
  const bad = await p.evaluate(tab => {
    sv4NavGo(tab);
    const parse = c => {
      const m = (c || '').match(/[\d.]+/g);
      if (!m) return null;
      return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] };
    };
    const over = (top, bottom) => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a), a: 1
    });
    const lum = c => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
    const bgOf = el => {
      let acc = null;
      for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (!c || c.a === 0) continue;
        acc = acc ? over(acc, c) : c;
        if (acc.a >= 1) break;
      }
      return acc;
    };
    const out = [];
    document.querySelectorAll('.sv4-page *').forEach(el => {
      if (!el.textContent.trim() || el.children.length) return;
      const fg = parse(getComputedStyle(el).color), bg = bgOf(el);
      if (!fg || !bg) return;
      if (Math.abs(lum(over(fg, bg)) - lum(bg)) < 0.13)
        out.push((el.className || el.tagName).toString().slice(0, 26));
    });
    return [...new Set(out)].slice(0, 3);
  }, t);
  await p.waitForTimeout(160);
  console.log(`  ${t.padEnd(10)} ${bad.length ? '⚠ сливается: ' + bad.join(' | ') : 'читается'}`);
}
await p.evaluate(() => document.body.classList.remove('theme-light'));

// ── зоны нажатия ────────────────────────────────────────────────────────────
console.log('\n── зоны нажатия: меньшая сторона <24px или площадь < 44×44 ──');
for (const t of ['persona', 'health', 'skills', 'gear', 'more']) {
  const small = await p.evaluate(tab => {
    sv4NavGo(tab);
    const out = [];
    // Мерить надо не сам элемент, а то, по чему на самом деле попадает палец:
    // поле внутри <label> ловит тап по всей строке, и его собственная высота
    // ничего не говорит о том, легко ли в него попасть.
    const targetOf = el => el.closest('label, button, [role=button]') || el;
    // Порог: меньшая сторона не ниже 24px (WCAG 2.5.8) и площадь не меньше
    // квадрата 44×44 — узкая, но длинная строка проходит, мелкая кнопка нет.
    const AREA = 44 * 44;
    document.querySelectorAll('.sv4-page button, .sv4-page [onclick], .sv4-page input:not([type=checkbox]), .sv4-page select').forEach(el => {
      const r = targetOf(el).getBoundingClientRect();
      if (!r.width || !r.height) return;
      const side = Math.min(r.width, r.height);
      if (side < 24 || r.width * r.height < AREA) {
        out.push(`${(el.className || el.tagName).toString().slice(0, 22)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    });
    return [...new Set(out)].slice(0, 4);
  }, t);
  await p.waitForTimeout(160);
  console.log(`  ${t.padEnd(10)} ${small.length ? '⚠ ' + small.join(' | ') : 'все зоны достаточные'}`);
}

// ── видимость из разметки ───────────────────────────────────────────────────
// Инлайновый обработчик ищет функцию только в глобальной области. Статический
// аудит проверяет, что функция объявлена, — но объявленная внутри модуля или
// внутри IIFE в глобалку не попадает, и разметка сломается на первом клике.
// Проверить это можно лишь в живой странице: спрашиваем window по имени.
console.log('\n── функции, которые зовёт разметка, видны глобально ──');
{
  const tabs = await p.evaluate(() => SHEET_TABS.map(t => t.id));
  const missing = new Set();
  let seen = 0;
  for (const t of tabs) {
    const found = await p.evaluate(tab => {
      sv4NavGo(tab);
      const names = new Set();
      const ATTRS = ['onclick','onchange','oninput','onkeydown','onkeyup','onsubmit','onfocus','onblur'];
      document.querySelectorAll('*').forEach(el => {
        for (const a of ATTRS) {
          const code = el.getAttribute(a);
          if (!code) continue;
          for (const m of code.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) names.add(m[2]);
        }
      });
      const builtin = new Set(['if','for','while','return','typeof','new','event','this','function',
        'alert','confirm','prompt','print','open','close','focus','blur','parseInt','parseFloat',
        'String','Number','Boolean','Array','Object','JSON','Math','Date','setTimeout','isNaN']);
      const out = { seen: 0, missing: [] };
      names.forEach(n => {
        if (builtin.has(n)) return;
        out.seen++;
        if (typeof window[n] !== 'function') out.missing.push(n);
      });
      return out;
    }, t);
    seen += found.seen;
    found.missing.forEach(n => missing.add(n));
  }
  console.log('  проверено имён: ' + seen);
  console.log(missing.size
    ? '  ⚠ НЕ ВИДНЫ ИЗ РАЗМЕТКИ: ' + [...missing].join(', ')
    : '  все видны в window');
  if (missing.size) errs.push('невидимые из разметки функции: ' + [...missing].join(', '));
}

console.log('\nвсего ошибок JS за прогон:', errs.length);
if (errs.length) console.log(errs.slice(0, 8).map(e => '  · ' + e).join('\n'));
await b.close();
srv.close();
