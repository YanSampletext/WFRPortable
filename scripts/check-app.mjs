// Полный обход приложения: каждый шаг, каждая вкладка, каждый пункт меню.
// Ищет ошибки JS, повторяющиеся id, переполнение по ширине и пустые экраны.
//
// Запуск: подними локальный сервер и выполни
//   npx http-server . -p 8099 -s &
//   node scripts/check-app.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const b = await chromium.launch();
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
      const scrolls = el => {
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
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

console.log('\nвсего ошибок JS за прогон:', errs.length);
if (errs.length) console.log(errs.slice(0, 8).map(e => '  · ' + e).join('\n'));
await b.close();
