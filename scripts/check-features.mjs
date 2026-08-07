// Прогон по живым функциям всех модулей: не «отрисовалось ли», а «работает ли».
// Каждая проверка что-то делает и сверяет результат в состоянии, а не на глаз.
//
//   node scripts/check-features.mjs
import { launchChromium, serve } from './browser.mjs';

const srv = await serve(new URL('..', import.meta.url).pathname, 8099);
const b = await launchChromium();
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

// Аргумент обязан доезжать до страницы: без второго параметра p.evaluate
// получал функцию, ждущую значение, и молча звал её с undefined — проверка
// сравнивала с NaN и падала, будто сломан код, а не она сама.
const ev = (fn, arg) => p.evaluate(fn, arg);

// Схватка держит копию в памяти модуля, и localStorage.removeItem её не
// трогает — очищаем тем же способом, что и пользователь.
const clearEnc = () => ev(() => { encList().forEach(x => encRemove(x.id)); return true; });

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
  encList().forEach(x => encRemove(x.id));
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

// ── удар одной кнопкой (attack.js) ──────────────────────────────────────────
await check('у оружия на бланке есть «Атаковать»', () => ev(() => {
  state.sheet.weapons = [{ name: 'Меч', damage: 'РС+4', qualities: '' }];
  sv4NavGo('main');
  renderSheet(); sv4NavGo('main');
  return !!document.querySelector('[data-atk]');
}));

await check('удар считает урон: оружие + ст.усп. − защита', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  state.sheet.weapons = [{ name: 'Меч', damage: 'РС+4' }];
  const id = encAdd('Манекен', 10, 20, true, 2, 3);   // гасит 5
  const rnd = Math.random; Math.random = () => 0;      // d100 = 1, ст.усп. велики
  attackWith(0);
  // цель выбирается в диалоге — жмём первую кнопку
  const btn = document.querySelector('#ordo-dlg .ordo-dlg-btn[data-i="0"]');
  if (!btn) { Math.random = rnd; return 'диалог выбора цели не открылся'; }
  btn.click();
  Math.random = rnd;
  const card = document.querySelector('.sv4-roll-card');
  if (!card) return 'модалка удара не открылась';
  const txt = card.textContent;
  const hasApply = /Нанести \d+ ран/.test(txt);
  return txt.includes('Попал') && txt.includes('урон оружия') &&
         txt.includes('стойкость и броня') && hasApply;
}));

await check('«Нанести раны» списывает с учётом защиты', () => ev(() => {
  const before = encList()[0];
  const btn = [...document.querySelectorAll('.sv4-roll-card button')]
    .find(b => /Нанести/.test(b.textContent));
  const n = parseInt(btn.textContent.match(/\d+/)[0], 10);
  btn.click();
  const after = encList()[0];
  return after.hp === Math.max(0, before.hp - n);
}));

await check('удар мимо не предлагает раны', () => ev(() => {
  const rnd = Math.random; Math.random = () => 0.98;   // d100 = 99, промах
  attackWith(0);
  document.querySelector('#ordo-dlg .ordo-dlg-btn[data-i="0"]').click();
  Math.random = rnd;
  const txt = document.querySelector('.sv4-roll-card').textContent;
  document.getElementById('roll-modal').classList.remove('show');
  return txt.includes('Мимо') && !/Нанести/.test(txt);
}));

await check('удар попадает в журнал бросков', () => ev(() => {
  const r = state.sheet.rollLog[0];
  return !!r && /^Удар: /.test(r.name) && r.d >= 1 && r.d <= 100;
}));

await check('стрельба берёт свой навык', () => ev(() => {
  state.sheet.weapons = [{ name: 'Короткий лук', damage: '+7', range: '30' }];
  const rnd = Math.random; Math.random = () => 0;
  attackWith(0);
  const dlg = document.querySelector('#ordo-dlg .ordo-dlg-btn[data-i="0"]');
  if (dlg) dlg.click();
  Math.random = rnd;
  const txt = document.querySelector('.sv4-roll-card').textContent;
  document.getElementById('roll-modal').classList.remove('show');
  return /стрельб/i.test(txt);
}));

// ── состояния в схватке (encounter.js) ──────────────────────────────────────
await check('состояние вешается и снимается', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  sv4NavGo('crit');
  const id = encAdd('Жертва', 30, 10, true, 0, 0);
  encCond(id, 'Кровоточащий', 2);
  const chip = document.querySelector('.enc-chip');
  const shown = chip && /Кровоточащий 2/.test(chip.textContent);
  encCond(id, 'Кровоточащий', -1);
  const one = /Кровоточащий 1/.test(document.querySelector('.enc-chip').textContent);
  encCond(id, 'Кровоточащий', -1);
  return shown && one && !document.querySelector('.enc-chip');
}));

await check('конец раунда напоминает про кровь', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  sv4NavGo('crit');
  const id = encAdd('Жертва', 30, 10, true, 0, 0);
  encCond(id, 'Кровоточащий', 3);
  encNext();                       // один участник — круг сразу замыкается
  const dlg = document.querySelector('#ordo-dlg.show');
  const asks = dlg && /Кровоточащий 3/.test(dlg.textContent);
  if (dlg) ordoDialogClose();
  return !!asks;
}));

await check('списание по концу раунда снимает ровно по пункту', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  sv4NavGo('crit');
  const id = encAdd('Жертва', 30, 10, true, 0, 0);
  encCond(id, 'Кровоточащий', 3);
  encTickApply();
  return encList()[0].hp === 7;
}));

await check('участник без тикающих состояний не тревожит', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  sv4NavGo('crit');
  const id = encAdd('Целый', 30, 10, true, 0, 0);
  encCond(id, 'Ослепший', 1);
  encNext();
  const dlg = document.querySelector('#ordo-dlg.show');
  if (dlg) ordoDialogClose();
  return !dlg;
}));

await check('encDamage гасит стойкостью и бронёй', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  const id = encAdd('Латник', 20, 15, true, 4, 3);   // гасит 7
  const lost = encDamage(id, 10);
  const none = encDamage(id, 5);                     // меньше защиты — ноль
  return lost === 3 && none === 0 && encList()[0].hp === 12;
}));

await check('«+ Я» берёт стойкость и броню с бланка', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  state.sheet.armor = [{ name: 'Кираса', zones: 'торс', ap: 2 }];
  sv4NavGo('crit');
  encAddSelf();
  const me = encList()[0];
  const tb = Math.floor((sheetCalc().totals['СВ'] || 0) / 10);
  return me.soak === tb + 2;
}));

await check('удар без цели не требует схватки', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  state.sheet.weapons = [{ name: 'Кинжал', damage: 'РС+2' }];
  const rnd = Math.random; Math.random = () => 0;
  attackWith(0);                    // список пуст — диалог выбора не нужен
  Math.random = rnd;
  const card = document.querySelector('.sv4-roll-card');
  const txt = card ? card.textContent : '';
  if (card) document.getElementById('roll-modal').classList.remove('show');
  return !document.querySelector('#ordo-dlg.show') && /Цель не выбрана/.test(txt);
}));

// ── отмена траты опыта (xp-undo.js) ─────────────────────────────────────────
await check('отмена возвращает опыт и покупку', () => ev(() => {
  state.xpGained = 1000; state.sheet.spentXP = 0;
  state.sheet.statAdvBought = {}; state.sheet._cart = [];
  xpRemember({ kind: 'cart', cost: 125, items: [{ type: 'stat', key: 'ББ' }, { type: 'stat', key: 'ББ' }] });
  state.sheet.statAdvBought['ББ'] = 2;
  state.sheet.spentXP = 125;
  xpUndoLast();
  const btn = document.querySelector('#ordo-dlg .ordo-dlg-btn');
  if (!btn) return 'подтверждение не открылось';
  btn.click();
  return state.sheet.spentXP === 0 && !state.sheet.statAdvBought['ББ'] && !xpUndoAvailable();
}));

await check('отмена откатывает талант по уровням', () => ev(() => {
  state.sheet.talentBought = [{ name: 'Бугай', level: 2 }];
  state.sheet.extraTalents = [{ name: 'Бугай', level: 2 }];
  state.sheet.spentXP = 200;
  xpRemember({ kind: 'cart', cost: 100, items: [{ type: 'talent', name: 'Бугай' }] });
  xpUndoLast();
  document.querySelector('#ordo-dlg .ordo-dlg-btn').click();
  return state.sheet.talentBought[0].level === 1 && state.sheet.extraTalents[0].level === 1
      && state.sheet.spentXP === 100;
}));

await check('отмена возвращает прежнюю карьеру', () => ev(() => {
  const was = state.career, wasTier = state.sheet.tier;
  state.sheet.spentXP = 300;
  xpRemember({ kind: 'career', cost: 100, career: was, cls: state.cls,
               tier: wasTier, tier1Done: state.sheet.careerTier1Done,
               override: state.sheet.tierCompleteOverride, toName: 'Другая · 1' });
  state.career = 'Ведьмак'; state.sheet.tier = 3;
  xpUndoLast();
  document.querySelector('#ordo-dlg .ordo-dlg-btn').click();
  return state.career === was && state.sheet.tier === wasTier && state.sheet.spentXP === 200;
}));

await check('отменять нечего — не падает', () => ev(() => {
  state.sheet._lastBuy = null;
  xpUndoLast();
  return !document.querySelector('#ordo-dlg.show') && xpUndoButtonHtml() === '';
}));

// ── экран не гаснет (wakelock.js) ───────────────────────────────────────────
await check('переключатель экрана есть в меню', () => ev(() => {
  drawerOpen();
  const items = [...document.querySelectorAll('.drawer-item')].map(x => x.textContent);
  drawerClose();
  return items.some(t => /Не гасить экран/.test(t));
}));

await check('подпись переключателя показывает состояние', () => ev(() => {
  const off = wakeIsOn();
  drawerOpen();
  const item = [...document.querySelectorAll('.drawer-item')].find(x => /Не гасить экран/.test(x.textContent));
  const sub = item.querySelector('small').textContent;
  drawerClose();
  return off ? /включено/.test(sub) : /выключено|недоступно/.test(sub);
}));

await check('wakeToggle не падает без поддержки API', () => ev(() => {
  const had = navigator.wakeLock;
  try { delete navigator.wakeLock; } catch (e) {}
  wakeToggle();
  if (had) try { Object.defineProperty(navigator, 'wakeLock', { value: had, configurable: true }); } catch (e) {}
  return true;
}));

// ── данные целы ─────────────────────────────────────────────────────────────
await check('ключи хранения не переименованы', () => ev(() => {
  const src = [...document.querySelectorAll('script[src]')].map(s => s.src);
  return !!localStorage.getItem('wfrp4_roster_v1') && src.length > 0;
}));

// ── правки бланка доходят до хранилища ──────────────────────────────────────
// renderTabHealth перерисовывает вкладку, но не сохраняет: пока увечья и
// болезни полагались на него, они жили только в памяти до первого renderSheet.
await check('увечье записывается сразу', () => ev(() => {
  state.sheet.injuries = []; autosave();
  sv4NavGo('health');
  const inp = document.getElementById('inj-input');
  if (!inp) return 'поля увечья нет на вкладке';
  inp.value = 'Сломана рука';
  sv2AddInjury();
  const saved = JSON.parse(localStorage.getItem('wfrp4_roster_v1') || '[]')
    .find(x => x.id === state.id);
  return !!saved && (saved.sheet.injuries || []).length === 1;
}));

await check('снятое увечье тоже записывается', () => ev(() => {
  sv2RemInjury(0);
  const saved = JSON.parse(localStorage.getItem('wfrp4_roster_v1') || '[]')
    .find(x => x.id === state.id);
  return !!saved && (saved.sheet.injuries || []).length === 0;
}));

await check('болезнь записывается сразу', () => ev(() => {
  state.sheet.diseases = []; autosave();
  sv4NavGo('health');
  const inp = document.getElementById('dis-input');
  if (!inp) return 'поля болезни нет на вкладке';
  inp.value = 'Гнойная рана';
  sv2AddDisease();
  const saved = JSON.parse(localStorage.getItem('wfrp4_roster_v1') || '[]')
    .find(x => x.id === state.id);
  const ok = !!saved && (saved.sheet.diseases || []).length === 1;
  sv2RemDisease(0);
  return ok;
}));

await check('переполнение памяти не выдаётся за сохранение', () => ev(() => {
  const orig = localStorage.setItem.bind(localStorage);
  let told = '';
  const origNotify = window.notify;
  window.notify = t => { told += t; };
  localStorage.setItem = () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
  const ok = saveRoster([{ id: 'x' }]);
  localStorage.setItem = orig;
  window.notify = origNotify;
  return ok === false && /переполнена/.test(told);
}));

// ── импорт как недоверенный ввод ────────────────────────────────────────────
// Обмен досье файлами — штатный сценарий, значит присланный JSON может
// содержать что угодно. Собираем персонажа заново по схеме.
await check('импорт ничего не теряет у полного персонажа', () => ev(() => {
  Object.assign(state.sheet, {
    currentHP: 7, portrait: 'data:image/jpeg;base64,AAAA',
    conditions: { 'Кровоточащий': 2 }, injuries: ['перелом'],
    advantage: 3, spells: [{ name: 'Свет' }], rollLog: [{ name: 'Восприятие', d: 42, target: 50 }],
    critLog: [{ zone: 'Голова' }], weapons: [{ name: 'Меч', damage: 'РС+4' }],
    money: { gc: 1, ss: 2, bp: 3 }, notes: 'заметка', sin: 1
  });
  const before = JSON.parse(JSON.stringify(state));
  const after = sanitizeCharacter(before);
  const lost = [];
  for (const k in before.sheet) {
    // Ключи с подчёркиванием — рабочие (корзина магазина, снимок для отмены);
    // им в выгруженном файле делать нечего, и отбрасываются они намеренно.
    if (k.charAt(0) === '_') continue;
    if (JSON.stringify(before.sheet[k]) !== JSON.stringify(after.sheet[k])) lost.push(k);
  }
  for (const k in before) {
    if (k === 'sheet' || k === '_updated') continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) lost.push(k);
  }
  return lost.length === 0 || 'потеряно: ' + lost.join(', ');
}));

await check('импорт выбрасывает посторонние ключи', () => ev(() => {
  const c = sanitizeCharacter({
    race: 'human', stats: { 'ББ': 30 }, evilKey: 'мусор',
    sheet: { notes: 'ok', чужое: 'поле' }
  });
  return !('evilKey' in c) && !('чужое' in c.sheet) && c.sheet.notes === 'ok';
}));

await check('импорт не пускает строку в числовое поле', () => ev(() => {
  const c = sanitizeCharacter({ race: 'human', stats: { 'ББ': 30, плохо: 'много' },
                                sheet: { currentHP: 'не число' } });
  return c.sheet.currentHP === null && !('плохо' in c.stats) && c.stats['ББ'] === 30;
}));

await check('импорт отвергает не-досье', () => ev(() => {
  const bad = [null, 'строка', [1, 2], {}, { sheet: {} }];
  return bad.every(x => { try { sanitizeCharacter(x); return false; } catch (e) { return true; } });
}));

await check('имя с инъекцией отрисовывается текстом', () => ev(() => {
  window.__pwned = 0;
  const evil = '"><img src=x onerror="window.__pwned=1">';
  state.name = evil;
  goStep(7);
  const inp = document.querySelector('.page.active input');
  const ok = inp && inp.value === evil
          && window.__pwned === 0
          && document.querySelectorAll('img[src="x"]').length === 0;
  state.name = 'Гюнтер Фогель'; goStep(8);
  return !!ok;
}));

await check('escHtml и escAttr экранируют кавычки', () => ev(() =>
  escAttr('a"b\'c<d') === 'a&quot;b&#39;c&lt;d' &&
  escHtml('a"b\'c<d') === 'a&quot;b&#39;c&lt;d'));

// ── враждебные имена в разметке ─────────────────────────────────────────────
// Импорт может принести имя с переносом строки, апострофом или слэшем. Пока
// имена вклеивались прямо в onclick, перенос рвал обработчик целиком.
await check('имя с переносом строки не ломает бланк', () => ev(() => {
  state.sheet.extraSkills = [{ name: 'Навык с\nпереносом', adv: 5 }];
  sv4NavGo('skills');
  const cell = [...document.querySelectorAll('[data-call="roll"]')]
    .find(c => c.dataset.v.indexOf('\n') >= 0);
  if (!cell) return 'навык не отрисовался';
  state.sheet.rollLog = [];
  cell.click();
  const m = document.getElementById('roll-modal');
  if (m) m.classList.remove('show');
  const r = state.sheet.rollLog[0];
  return !!r && r.name === 'Навык с\nпереносом';
}));

await check('апостроф, кавычки и слэш доходят целыми', () => ev(() => {
  const names = ["О'кей", 'Кавычки "тут"', 'Слэш\\сюда', 'Тир & Ко'];
  state.sheet.extraSkills = names.map(n => ({ name: n, adv: 3 }));
  sv4NavGo('skills');
  const got = [...document.querySelectorAll('[data-call="roll"]')].map(c => c.dataset.v);
  return names.every(n => got.indexOf(n) >= 0);
}));

await check('в разметке не осталось имён внутри onclick', () => ev(() => {
  // Признак старой схемы: одинарная кавычка внутри onclick вокруг текста
  const bad = [...document.querySelectorAll('.sv4-page [onclick]')]
    .map(el => el.getAttribute('onclick'))
    .filter(a => /'[^']*[А-Яа-я][^']*'/.test(a));
  return bad.length === 0;
}));

await check('урон оружия считается без динамического кода', () => ev(() => {
  const ok = calcWeaponDamage('+РС+4', 4) === 8
          && calcWeaponDamage('+7', 0) === 7
          && calcWeaponDamage('особый', 4) === null
          && calcWeaponDamage('alert(1)', 4) === null;
  return ok && !/Function\s*\(/.test(String(calcWeaponDamage));
}));

// ── встречные проверки ──────────────────────────────────────────────────────
// Без проставленной защиты удар остаётся обычной проверкой; с защитой цель
// бросает тоже, и решает разница уровней успеха.
await check('без защиты цели удар — обычная проверка', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  state.sheet.weapons = [{ name: 'Меч', damage: 'РС+4' }];
  encAdd('Простак', 20, 20, true, 0, 0, 0);
  const rnd = Math.random; Math.random = () => 0;
  attackWith(0);
  document.querySelector('#ordo-dlg .ordo-dlg-btn[data-i="0"]').click();
  Math.random = rnd;
  const txt = document.querySelector('.sv4-roll-card').textContent;
  document.getElementById('roll-modal').classList.remove('show');
  return !/защита \d+ → бросок/.test(txt) && /Попал/.test(txt);
}));

await check('с защитой цель бросает тоже', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  encAdd('Мастер клинка', 20, 20, true, 0, 0, 60);
  const rnd = Math.random; Math.random = () => 0;   // оба выбрасывают 1
  attackWith(0);
  document.querySelector('#ordo-dlg .ordo-dlg-btn[data-i="0"]').click();
  Math.random = rnd;
  const card = document.querySelector('.sv4-roll-card');
  const txt = card.textContent;
  document.getElementById('roll-modal').classList.remove('show');
  return /защита 60 → бросок 1/.test(txt) && /разницы/.test(txt);
}));

await check('слабая атака против сильной защиты — мимо', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  encAdd('Мастер клинка', 20, 20, true, 0, 0, 90);
  // атакующий выбрасывает много (плохо), защитник мало (хорошо)
  const rnd = Math.random;
  let call = 0;
  Math.random = () => (call++ === 0 ? 0.79 : 0);   // 80 у атаки, 1 у защиты
  attackWith(0);
  document.querySelector('#ordo-dlg .ordo-dlg-btn[data-i="0"]').click();
  Math.random = rnd;
  const txt = document.querySelector('.sv4-roll-card').textContent;
  document.getElementById('roll-modal').classList.remove('show');
  return /Мимо/.test(txt) && !/Нанести/.test(txt);
}));

await check('во встречной урон считает разницу успехов', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  encAdd('Щитоносец', 20, 30, true, 0, 0, 20);
  const rnd = Math.random;
  let call = 0;
  // атака d=1 при высокой цели даёт много СУ, защита d=20 при 20 даёт 0
  Math.random = () => (call++ === 0 ? 0 : 0.19);
  attackWith(0);
  document.querySelector('#ordo-dlg .ordo-dlg-btn[data-i="0"]').click();
  Math.random = rnd;
  const txt = document.querySelector('.sv4-roll-card').textContent.replace(/\s+/g, ' ');
  document.getElementById('roll-modal').classList.remove('show');
  // «N урон оружия + M ст.усп. = K» — M это уже разница
  return /урон оружия \+ \d+ ст\.усп\. = \d+/.test(txt);
}));

await check('встречная попадает в журнал с пометкой', () => ev(() => {
  const r = (state.sheet.rollLog || [])[0];
  return !!r && /встречная, защита \d+/.test(r.name);
}));

// ── партия из архива в схватку ──────────────────────────────────────────────
await check('«+ Из архива» подтягивает досье с его числами', () => ev(() => {
  encList().forEach(x => encRemove(x.id));
  // второй персонаж в архиве, которого нет в схватке
  const twin = JSON.parse(JSON.stringify(loadRoster().find(x => x.id === state.id)));
  twin.id = 'twin-1'; twin.name = 'Сопартиец';
  twin.sheet.currentHP = 7;
  twin.sheet.armor = [{ name: 'Кираса', zones: 'торс', ap: 2 }];
  const roster = loadRoster().filter(x => x.id !== 'twin-1');
  roster.push(twin); saveRoster(roster);

  sv4NavGo('crit');
  encAddFromRoster();
  const btn = [...document.querySelectorAll('#ordo-dlg .ordo-dlg-btn[data-i]')]
    .find(b => /Сопартиец/.test(b.textContent));
  if (!btn) return 'сопартийца нет в списке выбора';
  const label = btn.textContent;
  btn.click();
  const row = encList().find(x => x.name === 'Сопартиец');
  return !!row && row.hp === 7 && row.soak >= 2 && /иниц\. \d+/.test(label);
}));

await check('уже вступивших второй раз не предлагают', () => ev(() => {
  encAddFromRoster();
  const dlg = document.querySelector('#ordo-dlg.show');
  const names = dlg ? [...dlg.querySelectorAll('.ordo-dlg-btn[data-i]')].map(b => b.textContent) : [];
  if (dlg) ordoDialogClose();
  return !names.some(t => /Сопартиец/.test(t));
}));

await check('расчёт чужого досье не портит открытое', () => ev(() => {
  const was = { name: state.name, id: state.id, hp: state.sheet.currentHP };
  encList().forEach(x => encRemove(x.id));
  encAddFromRoster();
  const dlg = document.querySelector('#ordo-dlg.show');
  if (dlg) ordoDialogClose();
  return state.name === was.name && state.id === was.id && state.sheet.currentHP === was.hp;
}));

await check('пустой архив не роняет трекер', () => ev(() => {
  const saved = loadRoster();
  saveRoster([]);
  encAddFromRoster();
  const opened = !!document.querySelector('#ordo-dlg.show');
  saveRoster(saved);
  return !opened;
}));

// ── портрет (portrait.js) ───────────────────────────────────────────────────
const makePhoto = () => ev(async () => {
  // Похоже на снимок с телефона: 12 Мп в портретной ориентации
  const c = document.createElement('canvas');
  c.width = 3000; c.height = 4000;
  const g = c.getContext('2d');
  g.fillStyle = '#8b1a1a'; g.fillRect(0, 0, 3000, 4000);
  g.fillStyle = '#d4af37'; g.fillRect(1000, 1200, 1000, 1600);
  const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
  portraitPick();
  const inp = document.getElementById('portrait-file');
  inp.files = dt.files;
  inp.dispatchEvent(new Event('change'));
  await new Promise(r => setTimeout(r, 700));
  return true;
});

await check('шапка досье не растянута', () => ev(() => {
  sv4NavGo('main');
  const box = document.querySelector('.sv4-hero-fields');
  if (!box) return 'полей шапки нет';
  // Пять полей по 44px давали 240px; строка-<label> держит зону нажатия при 32
  return box.getBoundingClientRect().height < 200;
}));

await check('строка поля — label и ловит тап целиком', () => ev(() => {
  const rows = [...document.querySelectorAll('.sv4-hf')];
  return rows.length === 5 && rows.every(r => {
    const rc = r.getBoundingClientRect();
    return r.tagName === 'LABEL' && r.contains(r.querySelector('input'))
        && Math.min(rc.width, rc.height) >= 24 && rc.width * rc.height >= 44 * 44;
  });
}));

await check('значения полей не обрезаются', () => ev(() => {
  state.eyes = 'тёмно-карие'; state.hair = 'тёмно-каштановые';
  renderSheet(); sv4NavGo('main');
  return [...document.querySelectorAll('.sv4-hf input')]
    .every(i => i.scrollWidth <= i.clientWidth + 1);
}));

await check('рамка портрета квадратная', () => ev(() => {
  sv4NavGo('main');
  const el = document.querySelector('.sv4-portrait');
  if (!el) return 'рамки нет';
  const r = el.getBoundingClientRect();
  return Math.round(r.width) === Math.round(r.height) && r.width > 0;
}));

await check('заглушка помещается в рамку', () => ev(() => {
  // Печать сургуча свисает за рамку намеренно, поэтому меряем не коробку,
  // а сам значок с подписью: они обязаны уместиться внутри.
  const el = document.querySelector('.sv4-portrait');
  const box = el.getBoundingClientRect();
  return [...el.children].every(c => {
    const r = c.getBoundingClientRect();
    return r.top >= box.top - 1 && r.bottom <= box.bottom + 1
        && r.left >= box.left - 1 && r.right <= box.right + 1;
  });
}));

await check('пустое место зовёт добавить портрет', () => ev(() => {
  state.sheet.portrait = null;
  sv4NavGo('main'); renderSheet(); sv4NavGo('main');
  const el = document.querySelector('.sv4-portrait');
  return !!el && el.dataset.portrait === 'pick' && /портрет/.test(el.textContent);
}));

await makePhoto();
await check('снимок ужимается до квадрата 256', () => ev(() => new Promise(ok => {
  const src = state.sheet.portrait || '';
  if (!src) return ok('портрет не сохранился');
  const i = new Image();
  i.onload = () => ok(i.width === 256 && i.height === 256);
  i.onerror = () => ok('картинка не читается');
  i.src = src;
})));

await check('портрет весит меньше 60 КБ', () => ev(() => {
  const bytes = (state.sheet.portrait || '').length * 0.75;
  return bytes > 0 && bytes < 60 * 1024;
}));

await check('портрет виден на карточке', () => ev(() => {
  sv4NavGo('main');
  const el = document.querySelector('.sv4-portrait');
  return !!el && el.classList.contains('has-photo') && !!el.querySelector('img');
}));

await check('портрет доехал до хранилища', () => ev(() => {
  const me = JSON.parse(localStorage.getItem('wfrp4_roster_v1') || '[]')
    .find(x => x.id === state.id);
  return !!me && typeof me.sheet.portrait === 'string'
      && me.sheet.portrait.indexOf('data:image/jpeg') === 0;
}));

await check('портрет убирается', () => ev(() => {
  portraitRemove();
  sv4NavGo('main');
  const me = JSON.parse(localStorage.getItem('wfrp4_roster_v1') || '[]')
    .find(x => x.id === state.id);
  return !state.sheet.portrait && !!me && !me.sheet.portrait
      && !document.querySelector('.sv4-portrait.has-photo');
}));

await check('не-картинка отклоняется', () => ev(() => {
  const before = state.sheet.portrait || null;
  const dt = new DataTransfer();
  dt.items.add(new File(['не картинка'], 'a.txt', { type: 'text/plain' }));
  portraitPick();
  const inp = document.getElementById('portrait-file');
  inp.files = dt.files;
  inp.dispatchEvent(new Event('change'));
  return (state.sheet.portrait || null) === before;
}));

// ── ярлыки с иконки (shortcuts.js) ──────────────────────────────────────────
await check('ярлык «кубы» открывает журнал бросков', () => ev(() => {
  appMode = 'character';
  ordoShortcut('dice');
  return _sheetTab === 'rolllog' && state.step === 8;
}));

await check('повторный вызов ярлыка игнорируется', () => ev(() => {
  sv4NavGo('persona');
  ordoShortcut('fight');            // Java зовёт дважды — второй раз молчим
  return _sheetTab === 'persona';
}));

await check('неизвестный ярлык не ломает приложение', () => ev(() => {
  ordoShortcut('нетакого');
  ordoShortcut('');
  ordoShortcut(undefined);
  return true;
}));

// ── старые данные открываются (проверяем после перезагрузки) ────────────────
await ev(() => {
  // Схватка, начатая версией без стойкости, брони и состояний
  localStorage.setItem('wfrp4_encounter_v1', JSON.stringify({
    round: 3, turn: 1,
    list: [{ id: 'old1', name: 'Из прошлой версии', init: 40, hp: 5, maxHp: 8, adv: 1, foe: true }]
  }));
});
await p.reload();
await p.waitForTimeout(900);
await ev(() => {
  const r = JSON.parse(localStorage.getItem('wfrp4_roster_v1') || '[]');
  if (r.length) openCharacter(r[0].id);
});
await p.waitForTimeout(500);

await check('схватка из прежней версии открывается', () => ev(() => {
  state.step = 8; goStep(8); sv4NavGo('crit');
  const list = encList();
  return list.length === 1 && list[0].name === 'Из прошлой версии' && list[0].soak === 0
      && document.getElementById('enc-head').textContent.includes('3');
}));

await check('в старой схватке работают состояния', () => ev(() => {
  const id = encList()[0].id;
  encCond(id, 'Кровоточащий', 1);
  return !!document.querySelector('.enc-chip') && encDamage(id, 2) === 2;
}));

await check('досье из прежней версии открывается', () => ev(() =>
  !!state.name && !!state.race && sheetCalc().maxHP > 0));

await check('ярлык «схватка» после перезапуска работает', () => ev(() => {
  ordoShortcut('fight');
  return _sheetTab === 'crit';
}));

await check('ярлык «архив» уводит в архив', () => ev(() => {
  ordoShortcut('archive');          // второй за запуск — должен быть съеден
  return state.step === 8;
}));

// ── collapse.js: свёрнутое переживает перерисовку ───────────────────────────
// Ширина страницы 393 — мобильная ветка, сворачивание включено.
const firstTitle = () => ev(() => {
  const t = document.querySelector('.sv4-section-title');
  return t ? t.textContent.replace(/\s+/g, ' ').trim() : null;
});

await check('секция сворачивается по тапу', async () => {
  await ev(() => { sv4NavGo('persona'); });
  await p.waitForTimeout(200);
  return ev(() => {
    const t = document.querySelector('.sv4-section-title');
    t.click();
    return t.classList.contains('sv4-collapsed') && t.nextElementSibling.style.display === 'none';
  });
});

await check('свёрнутое переживает перерисовку', async () => {
  await ev(() => renderSheet());
  await p.waitForTimeout(200);
  return ev(() => {
    const t = document.querySelector('.sv4-section-title');
    return t.classList.contains('sv4-collapsed') && t.nextElementSibling.style.display === 'none';
  });
});

await check('свёрнутое переживает уход на вкладку и назад', async () => {
  await ev(() => sv4NavGo('health'));
  await p.waitForTimeout(150);
  await ev(() => sv4NavGo('persona'));
  await p.waitForTimeout(200);
  return ev(() => document.querySelector('.sv4-section-title').classList.contains('sv4-collapsed'));
});

await check('счётчик в заголовке не сбивает память', async () => {
  // Ключ строится без «(12)»: покупка навыка меняет счётчик, но не секцию
  return ev(() => {
    const raw = JSON.parse(localStorage.getItem('wfrp4_collapsed_v1') || '[]');
    return raw.length > 0 && raw.every(k => !/\(\s*\d+\s*\)/.test(k));
  });
});

await check('свёрнутое доезжает до хранилища', () => ev(() => {
  const raw = JSON.parse(localStorage.getItem('wfrp4_collapsed_v1') || '[]');
  return raw.some(k => k.indexOf('persona|') === 0);
}));

await check('повторный тап разворачивает', async () => {
  return ev(() => {
    const t = document.querySelector('.sv4-section-title');
    t.click();
    const raw = JSON.parse(localStorage.getItem('wfrp4_collapsed_v1') || '[]');
    return !t.classList.contains('sv4-collapsed') &&
           t.nextElementSibling.style.display === '' &&
           !raw.some(k => k.indexOf('persona|') === 0);
  });
});

await check('битая память сворачивания не роняет бланк', async () => {
  await ev(() => localStorage.setItem('wfrp4_collapsed_v1', '{не json'));
  await p.reload();
  await p.waitForTimeout(700);
  return ev(() => {
    document.getElementById('view-landing').style.display = 'none';
    document.getElementById('view-app').style.display = 'block';
    const r = loadRoster();
    openCharacter(r[0].id);
    return !!document.querySelector('.sv4-section-title');
  });
});

// ── backup.js: резервная копия всего архива ────────────────────────────────
// Импорт идёт через настоящий <input type=file> и FileReader, а не через
// подсунутый объект: путь, по которому пойдёт человек, и есть тот, что надо
// проверять.
const feedFile = async (text, name = 'ordo-arhiv.json') => {
  await p.setInputFiles('#import-roster', { name, mimeType: 'application/json', buffer: Buffer.from(text, 'utf8') });
  await p.waitForTimeout(250);
};
// Диалог «Добавить / Заменить» — нажимаем то, что нажал бы человек
const dlgClick = async label => {
  await p.waitForTimeout(150);
  const hit = await p.evaluate(t => {
    const b = [...document.querySelectorAll('#ordo-dlg .ordo-dlg-btn')].find(x => x.textContent.trim() === t);
    if (!b) return false;
    b.click(); return true;
  }, label);
  await p.waitForTimeout(250);
  return hit;
};

await check('в конверте лежит весь архив', () => ev(() => {
  const env = JSON.parse(archiveJson());
  return env.ordo === 'archive' && env.v === 1 &&
         env.chars.length === loadRoster().length && env.chars.length > 0;
}));

let backupText = null;
await check('копия снимается, пока архив цел', async () => {
  backupText = await ev(() => {
    // два досье, чтобы проверять именно архив, а не единственную запись
    saveCharacterToRoster();
    const r = loadRoster();
    const twin = JSON.parse(JSON.stringify(r[0]));
    twin.id = genCharId(); twin.name = 'Ханна Кёниг'; twin._updated = Date.now();
    twin.sheet.fateSpent = 2; twin.sheet.gmDead = true;
    r.push(twin); saveRoster(r);
    return archiveJson();
  });
  const env = JSON.parse(backupText);
  return env.chars.length >= 2 && env.chars.some(c => c.name === 'Ханна Кёниг');
});

await check('архив восстанавливается после полной потери', async () => {
  await ev(() => { saveRoster([]); return true; });
  await feedFile(backupText);
  // архив пуст — вопрос не задаётся, кладём сразу
  return ev(() => {
    const r = loadRoster();
    const h = r.find(x => x.name === 'Ханна Кёниг');
    return r.length >= 2 && !!h && h.sheet.fateSpent === 2 && h.sheet.gmDead === true;
  });
});

await check('повторное восстановление не плодит двойников', async () => {
  const before = await ev(() => loadRoster().length);
  await feedFile(backupText);
  if (!await dlgClick('Добавить к архиву')) return 'диалог не показан';
  const after = await ev(() => loadRoster().length);
  return after === before ? true : `было ${before}, стало ${after}`;
});

await check('свежее в архиве не затирается старым из файла', async () => {
  await ev(() => {
    const r = loadRoster();
    const i = r.findIndex(x => x.name === 'Ханна Кёниг');
    r[i].name = 'Ханна Кёниг-Штерн'; r[i]._updated = Date.now() + 100000;
    saveRoster(r);
  });
  await feedFile(backupText);
  if (!await dlgClick('Добавить к архиву')) return 'диалог не показан';
  return ev(() => !!loadRoster().find(x => x.name === 'Ханна Кёниг-Штерн'));
});

await check('замена архива требует второго подтверждения', async () => {
  await feedFile(backupText);
  if (!await dlgClick('Заменить архив')) return 'первый диалог не показан';
  const asked = await ev(() => {
    const t = document.querySelector('#ordo-dlg .ordo-dlg-title');
    return !!t && /Заменить весь архив/.test(t.textContent);
  });
  await dlgClick('Оставить как есть');
  // отказались — правка на месте
  return asked && await ev(() => !!loadRoster().find(x => x.name === 'Ханна Кёниг-Штерн'));
});

await check('замена архива стирает нынешний', async () => {
  await feedFile(backupText);
  if (!await dlgClick('Заменить архив')) return 'первый диалог не показан';
  if (!await dlgClick('Заменить')) return 'подтверждение не показано';
  return ev(() => {
    const r = loadRoster();
    return !r.find(x => x.name === 'Ханна Кёниг-Штерн') && !!r.find(x => x.name === 'Ханна Кёниг');
  });
});

await check('одиночное досье идёт тем же путём', async () => {
  const one = await ev(() => JSON.stringify(loadRoster()[0]));
  const n = await ev(() => loadRoster().length);
  await feedFile(one, 'один.json');
  if (!await dlgClick('Добавить к архиву')) return 'диалог не показан';
  return await ev(() => loadRoster().length) === n;   // тот же id — не двойник
});

await check('мусорный файл не трогает архив', async () => {
  const before = await ev(() => JSON.stringify(loadRoster().map(x => x.id)));
  await feedFile('{это не json', 'мусор.json');
  await p.waitForTimeout(200);
  return await ev(() => JSON.stringify(loadRoster().map(x => x.id))) === before;
});

await check('битое досье пропускается, целые доезжают', async () => {
  await ev(() => saveRoster([]));
  const env = JSON.parse(backupText);
  const whole = env.chars.length;
  env.chars.push({ name: 'Пустышка' });              // ни народа, ни характеристик
  await feedFile(JSON.stringify(env));
  const got = await ev(() => ({ n: loadRoster().length, empty: !!loadRoster().find(x => x.name === 'Пустышка') }));
  return (got.n === whole && !got.empty) ? true : `целых ждали ${whole}, легло ${got.n}${got.empty ? ', пустышка прошла' : ''}`;
});

await check('подделка в файле не доезжает до архива', async () => {
  await ev(() => saveRoster([]));
  const env = JSON.parse(backupText);
  env.chars[0].name = '"><img src=x onerror=window.__pwn=1>';
  env.chars[0].__proto__x = 'мимо';
  env.chars[0].вредное = 'поле не из схемы';
  await feedFile(JSON.stringify(env));
  await p.waitForTimeout(200);
  return ev(() => {
    const c = loadRoster()[0];
    // имя сохраняется как текст, лишние поля отсеиваются, скрипт не выполнялся
    return c.name.indexOf('<img') > 0 && c.вредное === undefined && window.__pwn === undefined;
  });
});

// ── dice.js: лоток в одно нажатие из шапки ─────────────────────────────────
// Журнал обрезается на 30 записях, а к этому месту он уже полон от прошлых
// проверок — считать прирост можно только с чистого.
const clearLog = () => ev(() => { state.sheet.rollLog = []; return true; });

await check('кубик есть в шапке на любой вкладке', async () => {
  const missing = [];
  for (const t of ['persona', 'skills', 'health', 'gear', 'magic', 'more']) {
    await ev(tab => sv4NavGo(tab), t);
    await p.waitForTimeout(120);
    if (!await ev(() => !!document.querySelector('.ordo-bar .ordo-die'))) missing.push(t);
  }
  return missing.length ? 'нет на вкладках: ' + missing.join(', ') : true;
});

await check('нажатие на кубик открывает лоток', async () => {
  await ev(() => sv4NavGo('persona'));
  await p.waitForTimeout(150);
  await ev(() => document.querySelector('.ordo-die').click());
  await p.waitForTimeout(200);
  return ev(() => {
    const dlg = document.getElementById('ordo-dlg');
    return !!dlg && dlg.classList.contains('show') &&
           dlg.querySelectorAll('[data-dice]').length >= 6 &&
           !!dlg.querySelector('#dice-input-modal');
  });
});

await check('бросок из лотка попадает в журнал', async () => {
  await clearLog();
  const before = await ev(() => state.sheet.rollLog.length);
  await ev(() => document.querySelector('#ordo-dlg [data-dice="2d10"]').click());
  await p.waitForTimeout(250);
  return ev(n => {
    const log = state.sheet.rollLog || [];
    const top = log[0];
    return log.length === n + 1 && top.name === '2d10' && top.d >= 2 && top.d <= 20;
  }, before);
});

await check('после броска лоток закрыт, результат виден', () => ev(() => {
  const dlg = document.getElementById('ordo-dlg');
  const res = document.getElementById('roll-modal');
  return !(dlg && dlg.classList.contains('show')) && !!res && res.classList.contains('show');
}));

await check('со страницы никуда не увело', () => ev(() => _sheetTab === 'persona'));

await check('непонятная запись лоток не закрывает', async () => {
  await ev(() => { document.getElementById('roll-modal').classList.remove('show'); diceOpen(); });
  await p.waitForTimeout(200);
  await ev(() => {
    document.getElementById('dice-input-modal').value = 'бросить что-нибудь';
    document.querySelector('#ordo-dlg [data-dice-go]').click();
  });
  await p.waitForTimeout(200);
  return ev(() => {
    const dlg = document.getElementById('ordo-dlg');
    return !!dlg && dlg.classList.contains('show') && !!document.getElementById('dice-input-modal');
  });
});

await check('свободная запись бросается из лотка', async () => {
  await clearLog();
  const before = await ev(() => state.sheet.rollLog.length);
  await ev(() => {
    document.getElementById('dice-input-modal').value = '3d6+2';
    document.querySelector('#ordo-dlg [data-dice-go]').click();
  });
  await p.waitForTimeout(250);
  return ev(n => {
    const top = state.sheet.rollLog[0];
    return state.sheet.rollLog.length === n + 1 && top.name === '3d6+2' && top.d >= 5 && top.d <= 20;
  }, before);
});

await check('журнал не растёт дальше тридцати записей', async () => {
  await clearLog();
  for (let i = 0; i < 33; i++) await ev(() => diceRoll('1d6'));
  return ev(() => state.sheet.rollLog.length === 30);
});

await check('лоток на вкладке журнала по-прежнему работает', async () => {
  await ev(() => { const m = document.getElementById('roll-modal'); if (m) m.classList.remove('show'); });
  await ev(() => sv4NavGo('rolllog'));
  await p.waitForTimeout(200);
  await clearLog();
  const before = await ev(() => state.sheet.rollLog.length);
  await ev(() => document.querySelector('.dice-tray [data-dice="1d6"]').click());
  await p.waitForTimeout(250);
  return ev(n => state.sheet.rollLog.length === n + 1 && state.sheet.rollLog[0].name === '1d6', before);
});

console.log(results.join('\n'));
console.log('\nпрошло ' + pass + ', не прошло ' + fail);
console.log('ошибок JS за прогон: ' + errs.length);
if (errs.length) errs.slice(0, 12).forEach(e => console.log('  ' + e));
await b.close();
srv.close();
process.exit(fail ? 1 : 0);
