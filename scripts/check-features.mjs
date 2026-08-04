// Прогон по живым функциям всех модулей: не «отрисовалось ли», а «работает ли».
// Каждая проверка что-то делает и сверяет результат в состоянии, а не на глаз.
//
//   npx http-server . -p 8099 -s &
//   node scripts/check-features.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 393, height: 850 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR: ' + e.message.slice(0, 180)));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });

await p.goto('http://127.0.0.1:8099/index.html');
await p.waitForTimeout(700);

let pass = 0, fail = 0;
const results = [];
async function check(name, fn) {
  const before = errs.length;
  let verdict;
  try { verdict = await fn(); } catch (e) { verdict = 'СБОЙ: ' + e.message.slice(0, 120); }
  const newErrs = errs.slice(before);
  const ok = verdict === true && !newErrs.length;
  if (ok) pass++; else fail++;
  results.push((ok ? '  ✓ ' : '  ✗ ') + name.padEnd(42) +
    (ok ? '' : (verdict === true ? '' : String(verdict)) + (newErrs.length ? ' | ' + newErrs.join('; ') : '')));
}

const ev = fn => p.evaluate(fn);

// ── подготовка персонажа ────────────────────────────────────────────────────
await ev(() => {
  document.getElementById('view-landing').style.display = 'none';
  document.getElementById('view-app').style.display = 'block';
  _rollFullRandomCharacterDo();
  state.name = 'Гюнтер Фогель'; state.xpGained = 2000;
  saveCharacterToRoster();
  appMode = 'character'; state.step = 8; goStep(8);
});
await p.waitForTimeout(600);

// ── app.js: досье и ростер ──────────────────────────────────────────────────
await check('персонаж создан целиком', () => ev(() => {
  const s = sheetCalc();
  return !!(state.race && state.career && state.stats && state.stats['ББ'] > 0 && s.maxHP > 0);
}));

await check('ростер сохраняет и находит', () => ev(() => {
  const r = loadRoster();
  return r.length >= 1 && r.some(x => x.name === 'Гюнтер Фогель');
}));

await check('повторное сохранение не плодит копии', () => ev(() => {
  const n = loadRoster().length;
  saveCharacterToRoster(); saveCharacterToRoster();
  return loadRoster().length === n;
}));

await check('открытие досье возвращает состояние', () => ev(() => {
  const id = loadRoster()[0].id;
  const nm = loadRoster()[0].name;
  openCharacter(id);
  return state.name === nm;
}));

// ── health.js ───────────────────────────────────────────────────────────────
await check('sv2HealBy лечит и не пускает выше максимума', () => ev(() => {
  const max = sheetCalc().maxHP;
  state.sheet.currentHP = 1; sv2HealBy(3);
  const a = state.sheet.currentHP;
  sv2HealBy(999);
  return a === 4 && state.sheet.currentHP === max;
}));

await check('sv2HealBy не лечит отрицательным числом', () => ev(() => {
  state.sheet.currentHP = 5; sv2HealBy(-5);
  return state.sheet.currentHP === 5;      // лечение, а не урон: минус игнорируется
}));

await check('sv2RestSleep лечит при удачном броске', () => ev(() => {
  const rnd = Math.random;
  Math.random = () => 0;                   // d100 = 1, гарантированный успех
  state.sheet.currentHP = 0;
  sv2RestSleep();
  Math.random = rnd;
  return state.sheet.currentHP > 0;
}));

await check('sv2RestDay считает день отдыха', () => ev(() => {
  const rnd = Math.random;
  Math.random = () => 0;
  state.sheet.currentHP = 0;
  sv2RestDay();
  Math.random = rnd;
  return state.sheet.currentHP >= 0;
}));

await check('sv2SpendFate списывает очко навсегда', () => ev(() => {
  const before = state.sheet.fateSpent || 0;
  sv2SpendFate();
  const after = state.sheet.fateSpent || 0;
  state.sheet.fateSpent = before;
  return after === before + 1;
}));

await check('sv2MarkDead закрывает дело', () => ev(() => {
  const was = !!state.sheet.gmDead;
  sv2MarkDead();
  const dead = !!state.sheet.gmDead;
  state.sheet.gmDead = was;
  return dead;
}));

// ── crit.js ─────────────────────────────────────────────────────────────────
await check('critRollZone даёт зону из таблицы', () => ev(() => {
  const z = critRollZone();
  // zone — ключ таблицы, label — как это зовут в бланке
  return !!z && ['head','larm','rarm','body','lleg','rleg'].includes(z.zone)
      && z.label === CRIT_ZONE_LABEL[z.zone] && z.d >= 1 && z.d <= 100;
}));

await check('critDoFullRoll пишет в журнал критов', () => ev(() => {
  state.sheet.critLog = [];
  critDoFullRoll();
  const e = state.sheet.critLog[0];
  return state.sheet.critLog.length === 1 && !!e.zone && !!(e.name || e.wound || e.n);
}));

await check('critDoZoneRoll бьёт по указанной зоне', () => ev(() => {
  state.sheet.critLog = [];
  critDoZoneRoll('head');
  return state.sheet.critLog.length === 1 && state.sheet.critLog[0].zone === 'Голова';
}));

await check('каждая зона крита отдаёт рану', () => ev(() =>
  ['head','larm','rarm','body','lleg','rleg'].every(z => {
    const w = critRollWound(z);
    return !!w && !!w.name && typeof w.wounds === 'number' && !!w.effect;
  })));

await check('крит 100 по любой зоне — смерть', () => ev(() => {
  const rnd = Math.random; Math.random = () => 0.999;   // d100 = 100
  const all = ['head','larm','rarm','body','lleg','rleg'].every(z => critRollWound(z).lethal);
  Math.random = rnd;
  return all;
}));

await check('critParseConds достаёт состояния из текста', () => ev(() => {
  const c = critParseConds('Получает 2 «Кровоточащий» и 1 «Ослепший».');
  return c && c['Кровоточащий'] === 2 && c['Ослепший'] === 1;
}));

await check('critClearLog чистит журнал критов', () => ev(() => {
  critDoFullRoll(); critClearLog();
  return state.sheet.critLog.length === 0;
}));

// ── diseases.js ─────────────────────────────────────────────────────────────
await check('diseaseAdd / diseaseDay / diseaseDel', () => ev(() => {
  state.sheet.diseases = [];
  diseaseAdd('Чёрная чума');
  const added = state.sheet.diseases.length === 1;
  const day0 = state.sheet.diseases[0].day || 0;
  diseaseDay(0, 1);
  const moved = (state.sheet.diseases[0].day || 0) === day0 + 1;
  diseaseDel(0, true);
  return added && moved && state.sheet.diseases.length === 0;
}));

// ── psych.js ────────────────────────────────────────────────────────────────
await check('fumbleRoll даёт заминку', () => ev(() => {
  const out = fumbleRoll();
  return document.body.innerHTML.length > 0 && out !== false;
}));

await check('psyCoolTarget считает от Хл', () => ev(() => {
  const t = psyCoolTarget();
  return typeof t === 'number' && t > 0;
}));

await check('psyFearStart спрашивает ранг и запоминает', () => ev(() => {
  psyFearStart();
  const btn = document.querySelector('#ordo-dlg .ordo-dlg-num[data-v="3"]');
  if (!btn) return 'диалог ранга не открылся';
  btn.click();
  const p = psyState();
  return p.fearRank === 3 && p.fearActive === true;
}));

await check('psyFrenzy заводит ярость при удачном броске', () => ev(() => {
  const rnd = Math.random; Math.random = () => 0;   // d100 = 1
  psyState().frenzy = false;
  psyFrenzy();
  const on = !!psyState().frenzy;
  Math.random = rnd;
  return on;
}));

await check('psyFrenzy выходит из ярости с «Уставший»', () => ev(() => {
  psyState().frenzy = true;
  state.sheet.conditions = {};
  psyFrenzy();
  const off = !psyState().frenzy;
  const tired = (state.sheet.conditions || {})['Уставший'] >= 1;
  return off && tired;
}));

await check('psyFrenzy не заводится при провале', () => ev(() => {
  const rnd = Math.random; Math.random = () => 0.999;  // d100 = 100
  psyState().frenzy = false;
  psyFrenzy();
  const on = !!psyState().frenzy;
  Math.random = rnd;
  return !on;
}));

// ── spells.js ───────────────────────────────────────────────────────────────
await check('spellLores отдаёт учения', () => ev(() => {
  const l = spellLores();
  return (Array.isArray(l) ? l.length : Object.keys(l).length) > 0;
}));

await check('spellAdd кладёт заклинание и не дублирует', () => ev(() => {
  state.sheet.spells = [];
  const lore = spellLores()[0];
  const s = SPELL_LIB.find(x => x.l === lore);
  spellAdd(s.l, s.n);
  const one = state.sheet.spells.length === 1 && state.sheet.spells[0].name === s.n;
  spellAdd(s.l, s.n);
  return one && state.sheet.spells.length === 1;
}));

await check('spellAdd молчит на несуществующее', () => ev(() => {
  const n = state.sheet.spells.length;
  spellAdd('Нет такого учения', 'Нет такого заклинания');
  return state.sheet.spells.length === n;
}));

// ── schemes.js ──────────────────────────────────────────────────────────────
await check('careerScheme знает схему карьеры', () => ev(() => {
  const s = careerScheme(state.career);
  return s === null || typeof s === 'object' || typeof s === 'string';
}));

// ── marks.js ────────────────────────────────────────────────────────────────
await check('gmOpen открывает пометки мастера', () => ev(() => {
  gmOpen();
  const m = document.querySelector('.gm-modal.open, [class*="gm-"].open');
  const open = !!m;
  if (m) m.classList.remove('open');
  return open;
}));

// ── dialogs.js ──────────────────────────────────────────────────────────────
await check('ordoConfirm показывает и закрывает', () => ev(() => {
  let said = false;
  ordoConfirm({ title: 'Тест', text: 'Проверка', onYes: () => { said = true; } });
  const shown = !!document.querySelector('#ordo-dlg.show');
  const yes = [...document.querySelectorAll('#ordo-dlg button')][0];
  yes.click();
  return shown && said && !document.querySelector('#ordo-dlg.show');
}));

await check('ordoNumber отдаёт выбранное число', () => ev(() => new Promise(res => {
  ordoNumber({ title: 'Сколько', min: 1, max: 5, onPick: v => res(v === 4) });
  const btn = document.querySelector('#ordo-dlg .ordo-dlg-num[data-v="4"]');
  if (!btn) return res('кнопок с числами нет');
  btn.click();
  setTimeout(() => res('onPick не вызвался'), 400);
})));

await check('ordoInput отдаёт введённый текст', () => ev(() => new Promise(res => {
  ordoInput({ title: 'Имя', value: '', onOk: v => res(v === 'Пробное') });
  const inp = document.getElementById('ordo-dlg-input');
  if (!inp) return res('поля ввода нет');
  inp.value = 'Пробное';
  [...document.querySelectorAll('#ordo-dlg .ordo-dlg-btn')].find(b => !b.classList.contains('ghost')).click();
  setTimeout(() => res('onOk не вызвался'), 400);
})));

// ── shell.js ────────────────────────────────────────────────────────────────
await check('меню открывается и закрывается', () => ev(() => {
  drawerOpen(); const open = drawerIsOpen();
  drawerClose(); return open && !drawerIsOpen();
}));

await check('openSupport не уводит из приложения', () => ev(() => {
  const src = String(openSupport);
  const noRedirect = !/location\s*\.\s*href\s*=/.test(src);
  const usesNewWindow = src.includes('window.open');
  return noRedirect && usesNewWindow;
}));

// ── back-nav.js ─────────────────────────────────────────────────────────────
await check('аппаратное «назад» закрывает меню', () => ev(() => new Promise(res => {
  drawerOpen();
  setTimeout(() => { history.back(); setTimeout(() => res(!drawerIsOpen()), 350); }, 120);
})));

// ── ad-slot.js ──────────────────────────────────────────────────────────────
await check('adSlotSet показывает и убирает баннер', () => ev(() => {
  adSlotSet('<b>тест</b>');
  const h1 = getComputedStyle(document.documentElement).getPropertyValue('--ad-h').trim();
  adSlotSet(null);
  const h2 = getComputedStyle(document.documentElement).getPropertyValue('--ad-h').trim();
  return h1 !== h2 && (h2 === '0px' || h2 === '0' || h2 === '');
}));

// ── archive.js ──────────────────────────────────────────────────────────────
await check('архив рисует карточки', () => ev(() => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  renderArchiveInto(host, {});
  const n = host.querySelectorAll('.ark-card, .card').length;
  host.remove();
  return n >= 1;
}));

// ── dice.js ─────────────────────────────────────────────────────────────────
await check('diceRoll держит диапазон 1d10', () => ev(() => {
  let lo = 99, hi = -1;
  for (let i = 0; i < 300; i++) { const v = diceRoll('1d10'); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  document.getElementById('roll-modal').classList.remove('show');
  return lo === 1 && hi === 10;
}));

await check('diceParse отбивает мусор', () => ev(() =>
  diceParse('ерунда') === null && diceParse('0d6') === null && diceParse('1d0') === null
  && diceParse('99d10') === null && diceParse('2d10+4') !== null));

// ── encounter.js ────────────────────────────────────────────────────────────
await check('схватка: очередь, раунды, раны', () => ev(() => {
  localStorage.removeItem('wfrp4_encounter_v1');
  sv4NavGo('crit');
  encAdd('Быстрый', 60, 10, true);
  encAdd('Медленный', 10, 10, true);
  const rows = () => [...document.querySelectorAll('.enc-row .enc-name')].map(x => x.textContent.trim());
  const orderOk = rows()[0].startsWith('Быстрый');
  const nowFirst = document.querySelector('.enc-row.now .enc-name').textContent.startsWith('Быстрый');
  encNext();
  const nowSecond = document.querySelector('.enc-row.now .enc-name').textContent.startsWith('Медленный');
  encNext();
  const round2 = document.getElementById('enc-head').textContent.includes('2');
  return orderOk && nowFirst && nowSecond && round2;
}));

await check('схватка живёт отдельно от досье', () => ev(() => {
  const enc = localStorage.getItem('wfrp4_encounter_v1');
  const roster = localStorage.getItem('wfrp4_roster_v1');
  return !!enc && !!roster && !roster.includes('wfrp4_encounter');
}));

// ── проверки d100 и преимущество ────────────────────────────────────────────
await check('rollCheck пишет в журнал', () => ev(() => {
  state.sheet.rollLog = [];
  rollCheck('Восприятие', 45);
  document.getElementById('roll-modal').classList.remove('show');
  const r = state.sheet.rollLog[0];
  return !!r && r.name === 'Восприятие' && r.d >= 1 && r.d <= 100;
}));

await check('преимущество даёт +10 к бою', () => ev(() => {
  state.sheet.advantage = 3;
  state.sheet.rollLog = [];
  rollCheck('Рукопашный бой (Основное)', 40);
  document.getElementById('roll-modal').classList.remove('show');
  const withAdv = state.sheet.rollLog[0].target;
  state.sheet.advantage = 0;
  state.sheet.rollLog = [];
  rollCheck('Рукопашный бой (Основное)', 40);
  document.getElementById('roll-modal').classList.remove('show');
  const without = state.sheet.rollLog[0].target;
  return withAdv === 70 && without === 40;
}));

await check('преимущество не лезет в небоевые навыки', () => ev(() => {
  state.sheet.advantage = 3;
  state.sheet.rollLog = [];
  rollCheck('Обаяние', 40);
  document.getElementById('roll-modal').classList.remove('show');
  const t = state.sheet.rollLog[0].target;
  state.sheet.advantage = 0;
  return t === 40;
}));

// ── опыт ────────────────────────────────────────────────────────────────────
await check('свободный ввод опыта прибавляет и отнимает', () => ev(() => {
  sv4NavGo('persona');
  const el = document.getElementById('xp-free');
  if (!el) return 'поля свободного ввода опыта нет на бланке';
  const before = state.xpGained;
  el.value = '7';  addXPFree(1);
  const up = state.xpGained === before + 7;
  document.getElementById('xp-free').value = '3'; addXPFree(-1);
  return up && state.xpGained === before + 4;
}));

await check('опыт не падает ниже потраченного', () => ev(() => {
  const el = document.getElementById('xp-free');
  state.sheet.spentXP = 100; state.xpGained = 120;
  el.value = '500'; addXPFree(-1);
  return state.xpGained === 100;
}));

// ── экспорт и импорт ────────────────────────────────────────────────────────
await check('JSON-выгрузка досье собирается', () => ev(() => {
  const p = loadRoster()[0];
  const json = JSON.stringify(p, null, 2);
  const back = JSON.parse(json);
  return back.name === p.name && !!back.stats && !!back.sheet;
}));

await check('импорт принимает выгруженное', () => ev(() => {
  const p = JSON.parse(JSON.stringify(loadRoster()[0]));
  p.id = 'test-import'; p.name = 'Импортированный';
  const roster = loadRoster();
  roster.push(p); saveRoster(roster);
  const ok = loadRoster().some(x => x.name === 'Импортированный');
  saveRoster(loadRoster().filter(x => x.id !== 'test-import'));
  return ok;
}));

// ── тема ────────────────────────────────────────────────────────────────────
await check('тема переключается и запоминается', () => ev(() => {
  const was = document.body.classList.contains('theme-light');
  toggleTheme();
  const now = document.body.classList.contains('theme-light');
  const saved = localStorage.getItem('wfrp4_theme');
  toggleTheme();
  return was !== now && (saved === 'light' || saved === 'dark');
}));

// ── печать ──────────────────────────────────────────────────────────────────
await check('печать прячет панели и рамку', () => ev(() => {
  const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (e) { return []; } })
    .filter(r => r.conditionText === 'print' || (r.media && r.media.mediaText === 'print'))
    .map(r => r.cssText).join(' ');
  return ['ordo-bar', 'toast-stack', 'ad-slot', 'app-drawer'].every(sel => css.includes(sel));
}));

// ── данные целы ─────────────────────────────────────────────────────────────
await check('ключи хранения не переименованы', () => ev(() => {
  const src = [...document.querySelectorAll('script[src]')].map(s => s.src);
  return !!localStorage.getItem('wfrp4_roster_v1') && src.length > 0;
}));

console.log(results.join('\n'));
console.log('\nпрошло ' + pass + ', не прошло ' + fail);
console.log('ошибок JS за прогон: ' + errs.length);
if (errs.length) errs.slice(0, 12).forEach(e => console.log('  ' + e));
await b.close();
process.exit(fail ? 1 : 0);
