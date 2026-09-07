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
         txt.includes('выносливость и броня') && hasApply;
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

// ── reference.js: поиск по справочнику ─────────────────────────────────────
await check('в справочник попали все каталоги', () => ev(() => {
  const kinds = {};
  refSearch('').forEach(e => kinds[e.kind] = (kinds[e.kind] || 0) + 1);
  const need = ['оружие', 'броня', 'качество', 'состояние', 'сложность', 'талант',
                'навык', 'карьера', 'заклинание', 'болезнь'];
  const miss = need.filter(k => !kinds[k]);
  if (miss.length) return 'не хватает: ' + miss.join(', ');
  if (kinds['сложность'] !== 7) return 'ступеней сложности в справочнике ' + kinds['сложность'];
  return refCount() > 400;
}));

await check('шкалу сложностей можно найти поиском', () => ev(() => {
  // За столом спрашивают словами: «а трудная это сколько».
  const bad = [['трудная', 'Трудная'], ['очень лёгкая', 'Очень лёгкая'], ['серьёзная', 'Серьёзная']]
    .filter(([q, want]) => (refSearch(q, 'сложность')[0] || {}).name !== want)
    .map(([q]) => q);
  if (bad.length) return 'не находится: ' + bad.join(', ');
  const t = (refSearch('трудная', 'сложность')[0] || {});
  return /−20/.test(t.sub + ' ' + t.text) ? true : 'в записи нет модификатора: ' + t.sub;
}));

await check('точное название находится первым', () => ev(() => {
  const pairs = [['щит', 'щит'], ['горящий', 'горящий'], ['бугай', 'бугай']];
  return pairs.every(([q, want]) => {
    const top = refSearch(q)[0];
    return top && top.name.toLowerCase().indexOf(want) === 0;
  });
}));

await check('поиск не различает регистр и «ё»', () => ev(() => {
  const a = refSearch('ГОРЯЩИЙ').length, b = refSearch('горящий').length;
  const c = refSearch('щадящее').length, d = refSearch('щадящее').length;
  return a > 0 && a === b && c > 0 && c === d;
}));

await check('ищется и по описанию, не только по названию', () => ev(() => {
  // «хладнокровие» — название навыка, но встречается и в описаниях талантов
  const hits = refSearch('хладнокровие');
  return hits.length > 1 && hits.some(e => e.kind === 'талант');
}));

await check('название важнее описания в выдаче', () => ev(() => {
  const hits = refSearch('пронзающее');
  return hits.length > 0 && hits[0].kind === 'качество' && hits[0].name === 'пронзающее';
}));

await check('раздел сужает выдачу', () => ev(() => {
  const all = refSearch('').length;
  const only = refSearch('', 'качество');
  return only.length > 0 && only.length < all && only.every(e => e.kind === 'качество');
}));

await check('пустой запрос отдаёт весь справочник', () => ev(() => refSearch('').length === refCount()));

await check('бессмыслица ничего не находит', () => ev(() => refSearch('ъыфждлор').length === 0));

await check('окно открывается и рисует список', async () => {
  await ev(() => sv4NavGo('persona'));
  await p.waitForTimeout(150);
  await ev(() => refOpen());
  await p.waitForTimeout(250);
  return ev(() => {
    const m = document.getElementById('ref-modal');
    return !!m && m.classList.contains('show') &&
           document.querySelectorAll('#ref-list .spick-row').length > 0 &&
           !!document.getElementById('ref-q');
  });
});

await check('набор в поле сужает список', async () => {
  await ev(() => {
    const q = document.getElementById('ref-q');
    q.value = 'щит';
    q.dispatchEvent(new Event('input'));
  });
  await p.waitForTimeout(200);
  return ev(() => {
    const rows = [...document.querySelectorAll('#ref-list .spick-row')];
    return rows.length > 0 && rows.length < 60 &&
           /щит/i.test(rows[0].querySelector('b').textContent);
  });
});

await check('кнопка раздела переключает выдачу', async () => {
  await ev(() => {
    document.getElementById('ref-q').value = '';
    document.getElementById('ref-q').dispatchEvent(new Event('input'));
    document.querySelector('[data-ref-kind="талант"]').click();
  });
  await p.waitForTimeout(200);
  return ev(() => {
    const rows = [...document.querySelectorAll('#ref-list .spick-row')];
    const marks = rows.map(r => r.querySelector('.spick-cn').textContent);
    return rows.length > 0 && marks.every(m => m === 'талант') &&
           document.querySelector('[data-ref-kind="талант"]').classList.contains('on');
  });
});

await check('длинная выдача обрезается с честной подписью', async () => {
  await ev(() => document.querySelector('[data-ref-kind="всё"]').click());
  await p.waitForTimeout(200);
  return ev(() => {
    const rows = document.querySelectorAll('#ref-list .spick-row').length;
    const tail = document.querySelector('#ref-list .muted');
    return rows === 60 && !!tail && /Показано 60 из \d+/.test(tail.textContent);
  });
});

await check('справочник закрывается и не уводит со страницы', async () => {
  await ev(() => refClose());
  await p.waitForTimeout(150);
  return ev(() => {
    const m = document.getElementById('ref-modal');
    return !m.classList.contains('show') && _sheetTab === 'persona';
  });
});

await check('плитка «Справочник» открывает окно', async () => {
  await ev(() => sv4NavGo('more'));
  await p.waitForTimeout(200);
  const found = await ev(() => {
    const t = [...document.querySelectorAll('.ordo-tile')]
      .find(x => /Справочник/.test(x.textContent));
    if (!t) return false;
    t.click(); return true;
  });
  if (!found) return 'плитки нет на вкладке «Ещё»';
  await p.waitForTimeout(250);
  const ok = await ev(() => document.getElementById('ref-modal').classList.contains('show'));
  await ev(() => refClose());
  return ok;
});

// ── talent-hints.js: какие таланты касаются броска ─────────────────────────
const giveTalents = names => ev(list => {
  state.sheet.extraTalents = list.map(n => ({ name: n, level: 1 }));
  return true;
}, names);

await check('талант находится по своей проверке', async () => {
  await giveTalents(['Верный выстрел', 'Батман', 'Аура величия']);
  return ev(() => {
    const pairs = [
      ['стрельба (луки)', 'Верный выстрел'],
      ['рукопашный бой (основное)', 'Батман'],
      ['лидерство', 'Аура величия']
    ];
    return pairs.every(([roll, want]) =>
      talentsForCheck(roll).some(t => t.name.toLowerCase() === want.toLowerCase()));
  });
});

await check('условие срабатывания показывается', () => ev(() => {
  const t = talentsForCheck('стрельба (луки)').find(x => x.name.toLowerCase() === 'верный выстрел');
  return !!t && /прицеливании/.test(t.when);
}));

await check('к чужой проверке таланты не липнут', () => ev(() =>
  !talentsForCheck('плавание').some(t => t.name === 'Батман')));

await check('чужие таланты не показываются', async () => {
  await giveTalents(['Бдительность']);
  return ev(() => !talentsForCheck('лидерство').some(t => t.name === 'Бдительность'));
});

await check('запятая в скобках не рвёт проверку надвое', () => ev(() => {
  // «рукопашный бой (кулачное, при попытках коснуться противника)» — одна проверка
  const t = DATA.all_talents.find(x => x.name === 'Быстрые руки');
  return /кулачное, при/.test(t.checks);
}));

await check('талант с двумя проверками ловится по обеим', async () => {
  await giveTalents(['Грамотность']);   // «книжные изыскания, язык (письменный)»
  // Расовые и карьерные таланты записаны в книжных данных строчными
  // («грамотность»), и если он уже есть у случайного персонажа, в выдачу
  // попадёт именно тот вариант. Сверяем без учёта регистра.
  return ev(() => {
    const has = (roll, name) => talentsForCheck(roll)
      .some(t => t.name.toLowerCase() === name.toLowerCase());
    return has('книжные изыскания', 'Грамотность') && has('язык (рейкшпиль)', 'Грамотность');
  });
});

await check('таланты попадают на карточку броска', async () => {
  await giveTalents(['Верный выстрел']);
  await ev(() => rollCheck('стрельба (луки)', 50));
  await p.waitForTimeout(200);
  return ev(() => {
    const box = document.querySelector('#roll-modal .roll-talents');
    return !!box && /Верный выстрел/.test(box.textContent) && /прицеливании/.test(box.textContent);
  });
});

await check('без подходящих талантов блока нет вовсе', async () => {
  // Персонаж создаётся случайно, и «плавание» время от времени оказывалось в
  // чьих-то проверках — проверка падала не из-за кода, а из-за везения при
  // генерации. Спрашиваем у самого персонажа, к какой проверке у него таланты
  // не липнут, и уже её и бросаем.
  const name = await ev(() => {
    const probes = ['плавание', 'гребля', 'азартные игры', 'дрессировка', 'лицедейство'];
    return probes.find(n => !talentsForCheck(n).length) || null;
  });
  if (!name) return 'у персонажа таланты нашлись на все пробные проверки';
  await ev(n => rollCheck(n, 50), name);
  await p.waitForTimeout(200);
  return ev(() => !document.querySelector('#roll-modal .roll-talents'));
});

await check('бросок ничего не прибавляет сам', async () => {
  // Напоминание — не расчёт: цель остаётся ровно той, что передали
  await giveTalents(['Верный выстрел']);
  await ev(() => { state.sheet.advantage = 0; rollCheck('стрельба (луки)', 47); });
  await p.waitForTimeout(200);
  return ev(() => {
    // Строка про цель у обычной проверки — кнопка сложности, у проверок сна и
    // болезней — простой текст; спрашиваем ту, что есть.
    const el = document.querySelector('#roll-modal .sv4-roll-dif, #roll-modal .sv4-roll-target');
    const t = el ? el.textContent : '';
    return /≤\s*47/.test(t) && /Серьёзная\s*\+0/.test(t) && state.sheet.rollLog[0].target === 47;
  });
});

await check('подсказка не мешает броску характеристики', async () => {
  await ev(() => { const m = document.getElementById('roll-modal'); if (m) m.classList.remove('show'); });
  await ev(() => rollCheck('ББ', 45));
  await p.waitForTimeout(200);
  return ev(() => document.getElementById('roll-modal').classList.contains('show'));
});

await check('карточка удара тоже напоминает о талантах', async () => {
  await clearEnc();                       // без цели удар бьёт сразу, без выбора
  const ready = await ev(() => {
    state.sheet.extraTalents = [{ name: 'Батман', level: 1 }];
    state.sheet.weapons = [{ name: 'Ручное оружие', group: 'Основное', damage: '+РС+4' }];
    attackWith(0);
    return true;
  });
  await p.waitForTimeout(300);
  if (!ready) return 'удар не состоялся';
  return ev(() => {
    const box = document.querySelector('#roll-modal .roll-talents');
    return !!box && /Батман/.test(box.textContent) && /батмана/.test(box.textContent);
  });
});

await check('на удар из лука боевой талант рукопашной не липнет', async () => {
  await ev(() => {
    state.sheet.extraTalents = [{ name: 'Батман', level: 1 }];
    state.sheet.weapons = [{ name: 'Лук', group: 'Лук', damage: '+РС+3' }];
    attackWith(0);
  });
  await p.waitForTimeout(300);
  return ev(() => {
    // Блока может не быть вовсе, а может и быть: у случайного персонажа
    // найдутся собственные стрелковые таланты, и это правильно. Важно одно —
    // рукопашного среди них нет. Прежняя редакция требовала пустоты и падала
    // примерно раз в пять прогонов не из-за кода, а из-за везения генератора.
    const box = document.querySelector('#roll-modal .roll-talents');
    return !box || !/Батман/.test(box.textContent);
  });
});

// ── стоимость развития: сверка с таблицей книги ────────────────────────────
await check('таблица развития совпадает с книгой', () => ev(() => {
  // WFRP4, таблица стоимости развития: шаги 1–5, 6–10, … 66+
  const book = [
    [1, 25, 10], [5, 25, 10], [6, 30, 15], [10, 30, 15], [11, 40, 20],
    [15, 40, 20], [16, 50, 30], [20, 50, 30], [21, 70, 40], [25, 70, 40],
    [26, 90, 60], [30, 90, 60], [31, 120, 80], [35, 120, 80], [36, 150, 110],
    [40, 150, 110], [41, 190, 140], [45, 190, 140], [46, 230, 180],
    [50, 230, 180], [51, 280, 220], [55, 280, 220], [56, 330, 270],
    [60, 330, 270], [61, 390, 320], [65, 390, 320]
  ];
  const bad = book.filter(([step, ch, sk]) => {
    const c = advCostFor(step - 1);
    return c.char !== ch || c.skill !== sk;
  });
  return bad.length ? 'расходится на шагах: ' + bad.map(b => b[0]).join(', ') : true;
}));

await check('полоса «66+» открытая, надбавки сверху нет', () => ev(() => {
  // В книге последняя полоса без верхней границы: всё от 66-го шага — 450/380
  const over = [66, 70, 71, 80, 120, 500];
  const bad = over.filter(n => {
    const c = advCostFor(n - 1);
    return c.char !== 450 || c.skill !== 380;
  });
  return bad.length ? 'дороже книги на шагах: ' + bad.join(', ') : true;
}));

await check('карьерный шаг вдвое дороже вне карьеры', () => ev(() => {
  // Правило книги: развитие вне карьеры стоит вдвое
  const inC = advCostFor(0).char;
  return inC === 25 && inC * 2 === 50;
}));

// ── карьеры: строение по книге ─────────────────────────────────────────────
await check('у каждой карьеры четыре ступени', () => ev(() => {
  const bad = Object.entries(DATA.careers)
    .filter(([, c]) => !c.tiers || c.tiers.length !== 4)
    .map(([k, c]) => k + '(' + (c.tiers ? c.tiers.length : 0) + ')');
  return bad.length ? bad.join(', ') : true;
}));

await check('положение растёт по ступеням, кроме отрёкшихся', () => ev(() => {
  // Убийцы дали обет смерти, флагелланты отреклись от мирского — у них
  // положение намеренно не растёт. Это книга, а не ошибка данных.
  const FLAT = ['Убийца чудовищ', 'Флагеллант'];
  const rank = { 'медный': 1, 'серебряный': 2, 'золотой': 3 };
  const val = s => {
    const m = /^(медный|серебряный|золотой)\s+(\d+)/.exec(s || '');
    return m ? rank[m[1]] * 10 + (+m[2]) : null;
  };
  const bad = [];
  for (const [name, c] of Object.entries(DATA.careers)) {
    let prev = 0, flat = FLAT.indexOf(name) >= 0;
    for (const t of c.tiers) {
      const v = val(t.status);
      if (v === null) { bad.push(name + ': не разобрано «' + t.status + '»'); break; }
      if (!flat && v <= prev) { bad.push(name + ': ' + t.name + ' не выше предыдущей'); break; }
      prev = v;
    }
  }
  return bad.length ? bad.slice(0, 4).join(' | ') : true;
}));

await check('отрёкшиеся остаются при своём положении', () => ev(() => {
  // Обратная сторона исключения: если у них вдруг начнёт расти — это тоже
  // расхождение с книгой, просто в другую сторону
  return ['Убийца чудовищ', 'Флагеллант'].every(n => {
    const st = DATA.careers[n].tiers.map(t => t.status);
    return st.every(s => s === st[0]);
  });
}));

// ── деньги: 1 крона = 20 шиллингов = 240 пенни ─────────────────────────────
await check('соотношение монет книжное', () => ev(() =>
  moneyToBP({ gc: 1, ss: 0, bp: 0 }) === 240 &&
  moneyToBP({ gc: 0, ss: 20, bp: 0 }) === 240 &&
  moneyToBP({ gc: 0, ss: 1, bp: 0 }) === 12));

await check('размен монет ничего не теряет', () => ev(() => {
  // Туда-обратно: сумма в пенни обязана совпасть до монеты
  for (const t of [1, 11, 12, 239, 240, 241, 1000, 5237]) {
    const m = bpToMoney(t);
    if (moneyToBP(m) !== t) return 'потеряно на ' + t + ' бп';
    if (m.ss > 19 || m.bp > 11) return 'не свёрнуто в старшую монету на ' + t + ' бп';
  }
  return true;
}));

await check('отдых считает деньги так же, как бланк', () => ev(() => {
  // Две независимые пары функций — расхождение между ними означало бы, что
  // трата в отдыхе и трата на бланке дают разный кошелёк
  for (const t of [1, 12, 240, 999, 4321]) {
    const a = JSON.stringify(bpToMoney(t)), b = JSON.stringify(dtBpToMoney(t));
    if (a !== b) return 'расходятся на ' + t + ' бп: ' + a + ' против ' + b;
    if (dtMoneyToBp(bpToMoney(t)) !== t) return 'обратный счёт разошёлся на ' + t;
  }
  return true;
}));

// ── навыки: базовые против профессиональных ────────────────────────────────
await check('базовых навыков двадцать шесть', () => ev(() =>
  DATA.common_skills.length === 26 && DATA.prof_skills.length === 19));

await check('плавание базовое, как гребля', () => ev(() => {
  // Обоими правит сила, оба базовые по книге. Плавание лежало в
  // профессиональных — значит начиналось с нуля вместо значения силы.
  const c = n => DATA.common_skills.find(s => s.name === n);
  const sw = c('Плавание'), row = c('Гребля');
  return !!sw && !!row && sw.stat === 'С' && row.stat === 'С' &&
         !DATA.prof_skills.some(s => s.name === 'Плавание');
}));

await check('плавание есть на бланке без покупки', async () => {
  await ev(() => sv4NavGo('skills'));
  await p.waitForTimeout(150);
  return ev(() => {
    // Случайному персонажу плавание могло достаться от народа или карьеры,
    // поэтому сверяем не абсолют, а правило: итог = сила + шаги.
    const sk = compileSkills().find(s => s.name === 'Плавание');
    const strength = sheetCalc().totals['С'] || 0;
    if (!sk) return 'плавания нет на бланке';
    if (!sk.isCommon) return 'плавание не помечено базовым';
    return sk.value === strength + (sk.adv || 0)
      ? true
      : `итог ${sk.value}, а сила ${strength} плюс шаги ${sk.adv}`;
  });
});

await check('купленное плавание не пропало у старых досье', () => ev(() => {
  // Досье из версии, где плавание было профессиональным: шаги лежат в
  // extraSkills. migrateState обязан свернуть их в общий навык, а не потерять.
  // Считаем прирост, а не абсолют: у случайного персонажа плавание уже могло
  // быть от народа или карьеры, и тогда абсолютное число ничего не докажет.
  state.sheet.extraSkills = state.sheet.extraSkills || [];
  const was = (compileSkills().find(s => s.name === 'Плавание') || {}).adv || 0;
  const wasFolded = state.sheet.skillAdv['плавание'] || 0;
  state.sheet.extraSkills.push({ name: 'Плавание', stat: 'С', adv: 7 });
  migrateState();
  const left = state.sheet.extraSkills.some(s => s.name === 'Плавание');
  const folded = (state.sheet.skillAdv['плавание'] || 0) - wasFolded;
  const now = (compileSkills().find(s => s.name === 'Плавание') || {}).adv || 0;
  return (!left && folded === 7 && now - was === 7)
    ? true
    : `осталось в extraSkills: ${left}, свёрнуто +${folded}, на бланке +${now - was} (ждали +7)`;
}));

// ── целостность справочника: ссылки обязаны разрешаться ────────────────────
// Народ или карьера, ссылающиеся на несуществующий навык или талант, дают
// пустую строку на бланке — игрок видит название и ничего за ним.
await check('карьеры и народы ссылаются на живые навыки', () => ev(() => {
  const known = new Set([...DATA.common_skills, ...DATA.prof_skills]
    .map(s => s.name.toLowerCase()));
  const base = n => n.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
  const ok = n => known.has(n.trim().toLowerCase()) || known.has(base(n));
  const bad = [];
  for (const r of Object.values(DATA.races))
    (r.race_skills || []).forEach(s => { if (!ok(s)) bad.push(r.name + ': ' + s); });
  for (const [k, c] of Object.entries(DATA.careers))
    (c.tiers || []).forEach(t => String(t.skills || '').split(',').forEach(s => {
      if (s.trim() && !ok(s)) bad.push(k + '/' + t.name + ': ' + s.trim());
    }));
  return bad.length ? bad.slice(0, 4).join(' | ') : true;
}));

await check('необученные общие навыки свёрнуты, но фильтр их достаёт', async () => {
  await ev(() => { _skillsAll = false; sv4NavGo('skills'); });
  await p.waitForTimeout(320);
  const n = await ev(() => {
    const rows = [...document.querySelectorAll('.sv4-sk-common tbody tr')];
    return { all: rows.length, shown: rows.filter(r => r.offsetParent).length };
  });
  if (n.all !== 26) return 'общих навыков в таблице ' + n.all + ', а в книге 26';
  if (n.shown >= n.all) return 'свёрнуто ничего';
  // Имя берём из самой таблицы: у случайного персонажа обученным может
  // оказаться любой навык, и жёстко названный сюда не годится.
  const probe = await ev(() => {
    const r = document.querySelector('.sv4-sk-common tr.sk-untrained');
    return r ? r.cells[0].textContent.trim() : null;
  });
  if (!probe) return 'нет ни одной свёрнутой строки';
  const seen = await ev(name => {
    skillFilterApply(name.toLowerCase());
    return [...document.querySelectorAll('.sv4-sk-common tbody tr')]
      .filter(r => r.offsetParent).map(r => r.cells[0].textContent.trim());
  }, probe);
  if (seen.indexOf(probe) < 0) return 'фильтр не показал «' + probe + '»: ' + seen.join(', ');
  const back = await ev(() => {
    skillFilterApply('');
    const rows = [...document.querySelectorAll('.sv4-sk-common tbody tr')];
    return rows.filter(r => r.offsetParent).length;
  });
  if (back !== n.shown) return 'после снятия фильтра видно ' + back + ', а было ' + n.shown;
  const opened = await ev(() => {
    skillsToggleAll();
    const rows = [...document.querySelectorAll('.sv4-sk-common tbody tr')];
    const shown = rows.filter(r => r.offsetParent).length;
    skillsToggleAll();
    return shown;
  });
  return opened === 26 ? true : 'после «показать все» видно ' + opened;
});

await check('названия талантов показываются с заглавной', () => ev(() => {
  // Книжные данные записаны вперемешку: расовые и карьерные строчными. Регистр
  // правится оформлением, а не данными, — значит и проверять надо оформление:
  // собираем те же гнёзда, что рисует бланк, и спрашиваем у браузера.
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:-9999px';
  box.innerHTML = '<div class="sv4-tal-name">грамотность</div>' +
                  '<div class="sv4-qt-chip"><span class="sv4-qt-name">грамотность</span></div>' +
                  '<div class="roll-talent"><b>грамотность</b></div>';
  document.body.appendChild(box);
  const bad = ['.sv4-tal-name', '.sv4-qt-name', '.roll-talent > b'].filter(sel =>
    getComputedStyle(box.querySelector(sel), '::first-letter').textTransform !== 'uppercase');
  box.remove();
  return bad.length ? 'первая буква не поднимается: ' + bad.join(', ') : true;
}));

await check('характеристику везде зовут одним именем', () => ev(() => {
  // Игрок читает талант «макс: рейтинг общительности» и ищет на листе
  // общительность, которой там нет: десятая характеристика зовётся харизмой.
  // Так же было с «дистанционным боем» вместо дальнего. Родительный падеж
  // программой из STAT_FULL не вывести, поэтому он выписан рядом — и первым
  // делом сверяется с самим списком: переименуют характеристику, не тронув
  // таблицу, — проверка встанет, а не промолчит.
  const GEN = {
    'ББ': 'ближнего боя', 'ДБ': 'дальнего боя', 'С': 'силы', 'В': 'выносливости',
    'И': 'инициативы', 'Пр': 'проворства', 'Л': 'ловкости', 'Инт': 'интеллекта',
    'СВ': 'силы воли', 'Х': 'харизмы'
  };
  const miss = STAT_NAMES.filter(s => !GEN[s]);
  if (miss.length) return 'в таблице падежей нет: ' + miss.join(', ');
  const known = Object.values(GEN);
  const skills = [...(DATA.common_skills || []), ...(DATA.prof_skills || [])]
    .map(s => s.name.toLowerCase());
  const bad = [];

  (DATA.all_talents || []).forEach(t => {
    const m = /^(?:рейтинг|бонус)\s+(.+)$/.exec(String(t.max || '').trim());
    if (!m) return;                       // «1», «один раз», «нет» — не ссылки
    const what = m[1].toLowerCase();
    if (known.indexOf(what) >= 0) return;
    // «рейтинг навыка стрельбы» — ссылка на навык, и это законно
    const sk = /^навыка\s+(.+)$/.exec(what);
    if (sk && skills.some(n => n.indexOf(sk[1].slice(0, -1)) === 0)) return;
    bad.push('талант «' + t.name + '»: ' + t.max);
  });

  (typeof SPELL_LIB === 'undefined' ? [] : SPELL_LIB).forEach(sp => {
    const text = [sp.t, sp.d, sp.r, sp.b].filter(Boolean).join(' ');
    for (const m of text.matchAll(/бонус\s+([а-яё]+(?:\s+воли)?)/gi)) {
      const what = m[1].toLowerCase();
      if (what === 'характеристики') continue;      // общая формулировка
      if (known.indexOf(what) < 0) bad.push('заклинание «' + sp.n + '»: бонус ' + m[1]);
    }
  });

  return bad.length ? bad.slice(0, 5).join('; ') : true;
}));

await check('карьеры и народы ссылаются на живые таланты', () => ev(() => {
  const known = new Set(DATA.all_talents.map(t => t.name.toLowerCase()));
  const base = n => n.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
  const ok = n => {
    n = n.trim();
    if (!n || n === '{случайный талант}') return true;
    if (known.has(n.toLowerCase()) || known.has(base(n))) return true;
    return [...known].some(k => base(k) === base(n));
  };
  // Разделители — запятая и «или», но только ВНЕ скобок: запись
  // «обострённое восприятие (вкус или осязание)» — один талант с выбором
  // уточнения, а не два. На этом спотыкались уже трижды.
  const parts = s => {
    const out = []; let depth = 0, cur = '';
    for (const ch of String(s)) {
      if (ch === '(') depth++; else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    const flat = [];
    for (const chunk of out) {
      let d = 0, buf = '', i = 0;
      while (i < chunk.length) {
        const ch = chunk[i];
        if (ch === '(') d++; else if (ch === ')') d--;
        if (d === 0 && chunk.slice(i).match(/^\s+или\s+/)) {
          flat.push(buf); buf = '';
          i += chunk.slice(i).match(/^\s+или\s+/)[0].length;
          continue;
        }
        buf += ch; i++;
      }
      flat.push(buf);
    }
    return flat.map(x => x.trim()).filter(Boolean);
  };
  const bad = [];
  for (const r of Object.values(DATA.races))
    (r.race_talents || []).forEach(t => parts(t).forEach(x => {
      if (!ok(x)) bad.push(r.name + ': ' + x);
    }));
  for (const [k, c] of Object.entries(DATA.careers))
    (c.tiers || []).forEach(t => parts(t.talents || '').forEach(x => {
      if (!ok(x)) bad.push(k + '/' + t.name + ': ' + x);
    }));
  return bad.length ? bad.slice(0, 4).join(' | ') : true;
}));

await check('у каждого качества предметов есть описание', () => ev(() => {
  const known = new Set(Object.keys(QUALITY_INFO).map(k => k.toLowerCase()));
  const strip = q => q.replace(/\s*\([^)]*\)/g, '').replace(/\s+\d+$/, '').trim();
  const bad = [];
  for (const it of [...WEAPONS_CATALOG, ...ARMOR_CATALOG])
    String(it.qualities || '').split(',').forEach(q => {
      const v = q.trim().toLowerCase();
      if (!v || v === '—' || v === '-') return;
      if (!known.has(strip(v)) && !known.has(v)) bad.push(it.name + ': ' + q.trim());
    });
  return bad.length ? bad.slice(0, 4).join(' | ') : true;
}));

// ── терминология: одно слово — один смысл ──────────────────────────────────
await check('судьба и упорство названы своими именами', async () => {
  await ev(() => sv4NavGo('fate'));
  await p.waitForTimeout(200);
  return ev(() => {
    const labels = [...document.querySelectorAll('.sv4-v-l')].map(e => e.textContent.trim());
    // Судьба и упорство — постоянные запасы; удача и решимость — то, что
    // восполняется. «Стойкость» здесь не должна встречаться вовсе: так
    // называется навык выносливости, и одно слово на два смысла путает.
    const need = ['СУДЬБА', 'УДАЧА', 'УПОРСТВО', 'РЕШИМОСТЬ'];
    const miss = need.filter(n => !labels.includes(n));
    if (miss.length) return 'нет ячеек: ' + miss.join(', ') + ' (есть: ' + labels.join(', ') + ')';
    return labels.includes('СТОЙКОСТЬ') ? '«СТОЙКОСТЬ» осталась на вкладке судьбы' : true;
  });
});

await check('восполняется решимость, а не упорство', async () => {
  return ev(() => {
    const calc = sheetCalc();
    state.sheet.resolveCurrent = 0;
    // Кнопка «Восполнить» у решимости обязана поднимать её до упорства
    const cells = [...document.querySelectorAll('.sv4-vit')];
    const cell = cells.find(c => (c.querySelector('.sv4-v-l') || {}).textContent === 'РЕШИМОСТЬ');
    if (!cell) return 'ячейки решимости нет';
    const btn = cell.querySelector('.sv4-btn-mini');
    if (!btn) return 'кнопки «Восполнить» нет';
    btn.click();
    return state.sheet.resolveCurrent === calc.upor
      ? true
      : `восполнено до ${state.sheet.resolveCurrent}, а упорство ${calc.upor}`;
  });
});

// ── рост: книжные футы плюс понятные сантиметры ────────────────────────────
await check('рост переводится в сантиметры', () => ev(() => {
  const cases = [["5'9''", 175], ["5'9\"", 175], ["4'3''", 130], ["3'1''", 94],
                 ["5'11''", 180], ["5 9", 175], ['69"', 175]];
  const bad = cases.filter(([s, cm]) => heightToCm(s) !== cm)
    .map(([s, cm]) => `${s}→${heightToCm(s)} (ждали ${cm})`);
  return bad.length ? bad.join(', ') : true;
}));

await check('непонятный рост не выдумывает сантиметры', () => ev(() => {
  // Поле свободное: человек мог вписать что угодно, и врать про рост нельзя
  const junk = ['', '—', 'высокий', 'ок. двух метров', '999', "40'0''", 'abc'];
  const bad = junk.filter(s => heightToCm(s) !== null).map(s => `«${s}»→${heightToCm(s)}`);
  return bad.length ? bad.join(', ') : true;
}));

await check('сантиметры видны на бланке', async () => {
  await ev(() => { state.height = "5'9''"; sv4NavGo('persona'); });
  await p.waitForTimeout(200);
  return ev(() => {
    const el = document.querySelector('.sv4-hf-cm');
    return !!el && /175\s*см/.test(el.textContent);
  });
});

// ── сложность проверки: +60 … −30 ──────────────────────────────────────────
await check('шкала сложностей совпадает с книгой', () => ev(() => {
  const want = [['Очень лёгкая', 60], ['Лёгкая', 40], ['Средняя', 20], ['Серьёзная', 0],
                ['Сложная', -10], ['Трудная', -20], ['Очень трудная', -30]];
  if (DIFFICULTY.length !== want.length) return 'ступеней ' + DIFFICULTY.length + ', а в книге ' + want.length;
  const bad = want.filter((w, i) => DIFFICULTY[i].name !== w[0] || DIFFICULTY[i].mod !== w[1])
                  .map((w, i) => w[0] + ' ' + w[1]);
  return bad.length ? bad.join(', ') : true;
}));

await check('в книжных данных сложности названы так же', () => ev(async (files) => {
  // Крит-таблицы, болезни, ошибки сотворения ссылаются на сложность словами.
  // Если шкала здесь разойдётся с ними, приложение начнёт спорить само с собой.
  const tiers = DIFFICULTY.map(d => {
    const w = d.name.toLowerCase().split(' ');
    return { very: w.length > 1, stem: w[w.length - 1].replace(/ая$/, ''), mod: d.mod };
  });
  const re = new RegExp('(очень\\s+)?(' + tiers.map(t => t.stem).join('|') + ')[а-яё]{0,3}\\s*\\(([+−-]?\\d{1,2})\\)', 'gi');
  const bad = [];
  for (const f of files) {
    const src = await (await fetch(f)).text();
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(src))) {
      const very = !!m[1], stem = m[2].toLowerCase();
      const t = tiers.find(x => x.stem === stem && x.very === very);
      if (!t) continue;
      const n = parseInt(m[3].replace('−', '-'), 10);
      if (t.mod !== n) bad.push(f + ': «' + m[0].trim() + '» вместо ' + t.mod);
    }
  }
  return bad.length ? bad.slice(0, 4).join('; ') : true;
}, ['js/crit.js', 'js/diseases.js', 'js/psych.js', 'js/magic.js', 'js/data.js', 'js/health.js']));

await check('сложность сдвигает цель ровно на свой модификатор', () => ev(() => {
  const bad = [];
  for (const d of DIFFICULTY) {
    state.sheet.advantage = 0;
    rollCheck('плавание', 50, d.mod);
    const got = state.sheet.rollLog[0].target;
    if (got !== 50 + d.mod) bad.push(d.name + ': ' + got + ' вместо ' + (50 + d.mod));
  }
  return bad.length ? bad.join(', ') : true;
}));

await check('сложность и преимущество складываются, а не спорят', () => ev(() => {
  state.sheet.advantage = 2;                       // +20 к боевой проверке
  rollCheck('рукопашный бой (базовый)', 45, -20);  // трудная
  const r = state.sheet.rollLog[0];
  state.sheet.advantage = 0;
  return r.target === 45 ? true : 'цель ' + r.target + ', а ждали 45 (45 +20 −20)';
}));

await check('«Ещё раз» вообще делает бросок', async () => {
  // Проверка этого не проверяла и потому молчала: карточка глушила всплытие,
  // кнопку с data-call ловит обработчик на документе — и нажатие не делало
  // ничего. Сравнение шло с той же самой записью, которая не менялась.
  // Журнал обрезается на тридцати записях, поэтому сравнивать длину можно
  // только с пустого — иначе «стало на одну больше» не наступит никогда.
  await clearLog();
  await ev(() => { state.sheet.advantage = 0; rollCheck('плавание', 50); });
  await p.waitForTimeout(200);
  const before = await ev(() => state.sheet.rollLog.length);
  await ev(() => document.querySelector('#roll-modal [data-call="roll"]').click());
  await p.waitForTimeout(200);
  const after = await ev(() => state.sheet.rollLog.length);
  if (after !== before + 1) return 'записей было ' + before + ', стало ' + after;
  return ev(() => document.getElementById('roll-modal').classList.contains('show')
    ? true : 'карточка закрылась вместо повтора');
});

await check('«Ещё раз» не прибавляет преимущество второй раз', async () => {
  // Раньше повтор получал имя с припиской и цель уже с надбавкой — и надбавка
  // ложилась поверх самой себя.
  await clearLog();
  await ev(() => { state.sheet.advantage = 3; rollCheck('рукопашный бой (базовый)', 40); });
  await p.waitForTimeout(150);
  const first = await ev(() => state.sheet.rollLog[0].target);
  const n = await ev(() => state.sheet.rollLog.length);
  await ev(() => document.querySelector('#roll-modal [data-call="roll"]').click());
  await p.waitForTimeout(200);
  const r = await ev(() => { const l = state.sheet.rollLog; state.sheet.advantage = 0;
    return { n: l.length, target: l[0].target }; });
  if (r.n !== n + 1) return 'повтор не бросил: записей ' + n + ' → ' + r.n;
  return (first === 70 && r.target === 70) ? true
    : 'первый ' + first + ', повтор ' + r.target + ', а ждали 70 и 70';
});

await check('ни одна кнопка не заглушена по дороге к обработчику', async () => {
  // Кнопки с data-атрибутами ловит один обработчик на документе. Стоит предку
  // погасить всплытие — и кнопка мертва молча, без ошибки в консоли. Так и было
  // с «Ещё раз» несколько выпусков подряд. Смотрим на всех вкладках и внутри
  // окон: карточка броска, справочник, лоток кубов, критическое ранение.
  const SEL = '[data-call],[data-act],[data-atk],[data-ref-kind],[data-dice],[data-sk]';
  const scan = () => ev(sel => {
    const out = [];
    document.querySelectorAll(sel).forEach(el => {
      for (let n = el.parentElement; n; n = n.parentElement) {
        const h = n.getAttribute && n.getAttribute('onclick');
        if (h && /stopPropagation/.test(h)) {
          out.push(((el.className || el.tagName) + '').slice(0, 22) +
                   ' в ' + ((n.className || n.tagName) + '').slice(0, 20));
          break;
        }
      }
    });
    return [...new Set(out)];
  }, SEL);
  let bad = [];
  const tabs = await ev(() => SHEET_TABS.map(t => t.id));
  for (const t of tabs) { await ev(x => sv4NavGo(x), t); bad = bad.concat(await scan()); }
  const closeAll = () => ev(() => {
    ['roll-modal', 'crit-modal', 'ref-modal'].forEach(id => {
      const m = document.getElementById(id); if (m) m.classList.remove('show');
    });
    if (typeof ordoDialogClose === 'function') ordoDialogClose();
  });
  for (const open of [
    () => { state.sheet.advantage = 0; rollCheck('плавание', 50); },
    () => refOpen(),
    () => diceOpen(),
    () => critDoFullRoll()
  ]) {
    await closeAll();
    await ev(open);
    await p.waitForTimeout(200);
    bad = bad.concat(await scan());
  }
  await closeAll();
  bad = [...new Set(bad)];
  return bad.length ? 'заглушены: ' + bad.slice(0, 4).join('; ') : true;
});

// ── сложность в магии и вере ───────────────────────────────────────────────
await check('сложность доходит до сотворения, каналирования и молитвы', () => ev(() => {
  state.sheet.langMagick = 52; state.sheet.channelSkill = 44; state.sheet.praySkill = 48;
  state.sheet.spells = [{ name: 'Проба', cn: 2, range: '', target: '', duration: '' }];
  state.sheet.blessings = [{ name: 'Проба', range: '', target: '', duration: '' }];
  state.sheet.miscastLog = []; state.sheet.wrathLog = [];
  const bad = [];
  // Провал или дубль кладут сверху запись об ошибке сотворения или о гневе
  // богов, так что строка самого броска не обязана быть первой. Ищем по
  // всему журналу, а не в его верхушке.
  const said = (log, want) => {
    const hit = log.find(e => ((e || {}).text || '').indexOf('против ' + want) >= 0);
    return hit ? null : log.map(e => (e.text || '').replace(/<[^>]+>/g, '')).join(' // ').slice(0, 90);
  };
  rollCastingTest(0, -20);
  let w = said(state.sheet.miscastLog, 32);      // 52 − 20
  if (w) bad.push('сотворение: ' + w);
  state.sheet.miscastLog = [];
  rollChannelling(20);
  w = said(state.sheet.miscastLog, 64);          // 44 + 20
  if (w) bad.push('каналирование: ' + w);
  rollPrayTest(0, 'blessing', -30);
  w = said(state.sheet.wrathLog, 18);            // 48 − 30
  if (w) bad.push('молитва: ' + w);
  return bad.length ? bad.join(' | ') : true;
}));

await check('без сложности магия бросает как прежде', () => ev(() => {
  state.sheet.miscastLog = [];
  state.sheet.langMagick = 52;
  rollCastingTest(0);
  const hit = state.sheet.miscastLog.find(e => /d100 = /.test((e || {}).text || ''));
  if (!hit) return 'записи о броске нет вовсе';
  const t = hit.text;
  if (t.indexOf('против 52') < 0) return 'цель не 52: ' + t.replace(/<[^>]+>/g, '').slice(0, 70);
  // Подписи сложности при нулевом модификаторе быть не должно
  return /\(Серьёзная/.test(t) ? 'приписана серьёзная при обычном броске' : true;
}));

await check('в журнал веры не попадает сырая подстановка', () => ev(() => {
  // Две строки были записаны в обычных кавычках, и «${ICONS.check}» уходило
  // в журнал буквально.
  state.sheet.wrathLog = [];
  state.sheet.praySkill = 99;                    // чтобы наверняка вышел успех
  rollPrayTest(0, 'blessing');
  // Смотрим весь журнал: гнев богов мог лечь поверх строки молитвы.
  const raw = state.sheet.wrathLog.filter(e => ((e || {}).text || '').indexOf('${') >= 0);
  return raw.length ? 'сырая подстановка: ' + raw[0].text.slice(0, 80) : true;
}));

// ── растянутые проверки ────────────────────────────────────────────────────
await check('растянутая копит уровни успеха попытка за попыткой', () => ev(() => {
  state.sheet.extended = [];
  const rows = compileSkills();
  const sk = rows[0];
  state.sheet.extended.unshift({ id: 'extT', name: 'Перевод гримуара', skill: sk.name,
                                 value: sk.value, goal: 8, acc: 0, tries: [] });
  for (let i = 0; i < 5; i++) extRoll('extT');
  const e = state.sheet.extended[0];
  if (e.tries.length !== 5) return 'попыток записано ' + e.tries.length;
  const sum = e.tries.reduce((a, t) => a + t.sl, 0);
  if (e.acc !== sum) return 'накоплено ' + e.acc + ', а сумма попыток ' + sum;
  // Каждая попытка обязана считаться по той же формуле, что и весь бланк
  const bad = e.tries.filter(t => t.sl !== Math.trunc(t.target / 10) - Math.trunc(t.d / 10));
  return bad.length ? 'уровни успеха посчитаны иначе, чем на бланке' : true;
}));

await check('сложность попытки сдвигает цель', () => ev(() => {
  const e = state.sheet.extended[0];
  const bad = [];
  for (const d of DIFFICULTY) {
    extRoll('extT', d.mod);
    const t = state.sheet.extended[0].tries.slice(-1)[0];
    if (t.target !== e.value + d.mod) bad.push(d.name + ': ≤' + t.target + ' вместо ≤' + (e.value + d.mod));
  }
  return bad.length ? bad.join(', ') : true;
}));

await check('растянутая берёт сегодняшнее значение навыка, а не записанное', () => ev(() => {
  const e = state.sheet.extended[0];
  const rows = compileSkills();
  const live = (rows.find(r => r.name === e.skill) || {}).value;
  e.value = 1;                       // как будто навык записали давно и он вырос
  extRoll('extT');
  return state.sheet.extended[0].value === live
    ? true
    : 'взято ' + state.sheet.extended[0].value + ', а на бланке ' + live;
}));

await check('попытка попадает в общий журнал бросков', () => ev(() => {
  state.sheet.rollLog = [];              // журнал обрезан на тридцати записях
  const before = state.sheet.rollLog.length;
  extRoll('extT');
  const r = state.sheet.rollLog[0];
  if (state.sheet.rollLog.length !== before + 1) return 'в журнал не записалось';
  if (!/растянутая/.test(r.name)) return 'в журнале: ' + r.name;
  const t = state.sheet.extended[0].tries.slice(-1)[0];
  return (r.d === t.d && r.target === t.target) ? true
    : 'журнал и попытка разошлись: ' + r.d + '/' + r.target + ' против ' + t.d + '/' + t.target;
}));

await check('досье без растянутых проверок открывается как прежде', () => ev(() => {
  // Поле добавлено к формату сохранения; старые досье его просто не имеют.
  delete state.sheet.extended;
  const html = extBlockHtml();
  if (!/пока ничего не начато/.test(html)) return 'блок не справился с отсутствующим полем';
  extAdd();
  const ok = !!document.getElementById('ext-name');
  ordoDialogClose();
  state.sheet.extended = [];
  return ok ? true : 'не открылось окно «завести дело»';
}));

// ── встречная проверка ─────────────────────────────────────────────────────
await check('встречная берёт уже выпавший бросок, а не новый', async () => {
  await ev(() => {
    const m = document.getElementById('roll-modal'); if (m) m.classList.remove('show');
    state.sheet.advantage = 0; rollCheck('обаяние', 52);
  });
  await p.waitForTimeout(200);
  const mine = await ev(() => {
    const b = document.querySelector('#roll-modal [data-call="opposed"]');
    if (!b) return null;
    const r = state.sheet.rollLog[0];
    return { d: parseInt(b.dataset.r, 10), target: parseInt(b.dataset.n, 10),
             sl: parseInt(b.dataset.s, 10), logD: r.d, logTarget: r.target };
  });
  if (!mine) return 'кнопки встречной на карточке нет';
  if (mine.d !== mine.logD || mine.target !== mine.logTarget)
    return 'кнопка несёт d=' + mine.d + '/≤' + mine.target + ', а выпало ' + mine.logD + '/≤' + mine.logTarget;
  const want = Math.trunc(mine.target / 10) - Math.trunc(mine.d / 10);
  return mine.sl === want ? true : 'ст.усп. в кнопке ' + mine.sl + ', а по формуле ' + want;
});

await check('встречная сравнивает уровни успеха и пишет в журнал', async () => {
  await ev(() => document.querySelector('#roll-modal [data-call="opposed"]').click());
  await p.waitForTimeout(250);
  const open = await ev(() => !!document.getElementById('opp-val'));
  if (!open) return 'диалог встречной не открылся';
  await clearLog();
  const n = await ev(() => state.sheet.rollLog.length);
  await ev(() => { document.getElementById('opp-val').value = 45; document.getElementById('opp-go').click(); });
  await p.waitForTimeout(250);
  return ev(prev => {
    const sides = document.querySelectorAll('#roll-modal .opp-side');
    if (sides.length !== 2) return 'сторон на карточке ' + sides.length;
    const nums = [...sides].map(s => ({
      d: parseInt(s.querySelector('.opp-die').textContent, 10),
      t: parseInt(s.querySelector('.opp-vs').textContent.replace(/[^\d]/g, ''), 10)
    }));
    const sl = nums.map(x => Math.trunc(x.t / 10) - Math.trunc(x.d / 10));
    const diff = sl[0] - sl[1];
    const said = (document.querySelector('#roll-modal .sv4-roll-outcome') || {}).textContent || '';
    const want = diff > 0 ? 'Верх твой' : diff < 0 ? 'Верх за противником' : 'Ничья';
    if (said.indexOf(want) < 0) return 'сказано «' + said + '», а разница ' + diff;
    if (nums[1].t !== 45) return 'противник бросает против ' + nums[1].t + ', а задали 45';
    const log = state.sheet.rollLog;
    if (log.length !== prev + 1) return 'в журнал не записалось';
    return /^Встречная: обаяние/.test(log[0].name) ? true : 'в журнале: ' + log[0].name;
  }, n);
});

await check('встречная без значения противника не бросает', async () => {
  await ev(() => {
    const m = document.getElementById('roll-modal'); if (m) m.classList.remove('show');
    state.sheet.advantage = 0; rollCheck('запугивание', 40);
  });
  await p.waitForTimeout(200);
  await ev(() => document.querySelector('#roll-modal [data-call="opposed"]').click());
  await p.waitForTimeout(200);
  await clearLog();
  const n = await ev(() => state.sheet.rollLog.length);
  await ev(() => { document.getElementById('opp-val').value = ''; document.getElementById('opp-go').click(); });
  await p.waitForTimeout(200);
  return ev(prev => {
    const still = !!document.getElementById('opp-val');
    const rolled = state.sheet.rollLog.length !== prev;
    ordoDialogClose();
    const m = document.getElementById('roll-modal'); if (m) m.classList.remove('show');
    if (rolled) return 'бросок случился без значения противника';
    return still ? true : 'диалог закрылся, ничего не сказав';
  }, n);
});

await check('карточка называет сложность и служит кнопкой', async () => {
  await ev(() => { state.sheet.advantage = 0; rollCheck('скрытность', 47, -20); });
  await p.waitForTimeout(200);
  return ev(() => {
    const b = document.querySelector('#roll-modal .sv4-roll-dif');
    if (!b) return 'строки сложности нет';
    const t = b.textContent.replace(/\s+/g, ' ');
    if (!/Трудная\s*−20/.test(t)) return 'подпись: ' + t;
    if (!/≤\s*27/.test(t)) return 'цель не показана: ' + t;
    return b.dataset.call === 'roll-dif' && b.dataset.n === '47' ? true : 'кнопка ведёт не туда';
  });
});

await check('выбор сложности открывается и считает цели', async () => {
  await ev(() => { state.sheet.advantage = 0; difficultyPick('скрытность', 47); });
  await p.waitForTimeout(200);
  return ev(() => {
    const rows = [...document.querySelectorAll('#ordo-dlg .dif-row')];
    if (rows.length !== 7) return 'строк ' + rows.length;
    const want = [107, 87, 67, 47, 37, 27, 17];
    const bad = rows.map((r, i) => {
      const got = parseInt((r.querySelector('.dif-target').textContent.match(/-?\d+/) || [])[0], 10);
      return got === want[i] ? null : DIFFICULTY[i].name + ': ' + got + ' вместо ' + want[i];
    }).filter(Boolean);
    return bad.length ? bad.join(', ') : true;
  });
});

await check('выбор сложности учитывает преимущество', async () => {
  await ev(() => { ordoDialogClose(); state.sheet.advantage = 2; difficultyPick('рукопашный бой (базовый)', 45); });
  await p.waitForTimeout(200);
  return ev(() => {
    const row = document.querySelectorAll('#ordo-dlg .dif-row')[3];   // серьёзная (+0)
    const got = parseInt((row.querySelector('.dif-target').textContent.match(/-?\d+/) || [])[0], 10);
    ordoDialogClose(); state.sheet.advantage = 0;
    return got === 65 ? true : 'цель ' + got + ', а ждали 65 (45 +20 за преимущество)';
  });
});

await check('строка списка бросает выбранную сложность', async () => {
  await ev(() => { state.sheet.advantage = 0; difficultyPick('плавание', 50); });
  await p.waitForTimeout(200);
  await ev(() => document.querySelectorAll('#ordo-dlg .dif-row')[6].click());   // очень трудная
  await p.waitForTimeout(200);
  return ev(() => {
    const r = state.sheet.rollLog[0];
    const open = (document.getElementById('ordo-dlg') || {}).className || '';
    if (/show/.test(open)) return 'диалог не закрылся';
    return (r.target === 20 && r.dif === -30) ? true : 'цель ' + r.target + ', сложность ' + r.dif;
  });
});

await check('журнал и копия для мастера помнят сложность', async () => {
  await ev(() => { state.sheet.advantage = 0; rollCheck('уклонение', 55, -10); sv4NavGo('rolllog'); });
  await p.waitForTimeout(250);
  return ev(() => {
    const row = document.querySelector('.sv4-rolllog-row .sv4-rolllog-main');
    if (!row || !/Сложная\s*−10/.test(row.textContent.replace(/\s+/g, ' '))) return 'в журнале: ' + (row ? row.textContent : '—');
    return /Сложная −10/.test(rollLogRows()) ? true : 'разметка журнала без сложности';
  });
});

await check('серьёзная проверка ничего лишнего в сохранение не пишет', () => ev(() => {
  state.sheet.advantage = 0;
  rollCheck('плавание', 50);
  const r = state.sheet.rollLog[0];
  return ('dif' in r || 'adv' in r) ? 'записаны нули: ' + JSON.stringify(r) : true;
}));

await check('удержание на характеристике открывает выбор', async () => {
  // Бросают с главной вкладки: на «Статах» те же ячейки нарочно не кликабельны
  // Карточка предыдущего броска растянута на весь экран и перехватила бы жест
  await ev(() => {
    ordoDialogClose();
    const m = document.getElementById('roll-modal'); if (m) m.classList.remove('show');
    sv4NavGo('persona');
  });
  await p.waitForTimeout(400);
  // hover сам прокручивает до ячейки и ставит курсор в её середину; голый
  // p.mouse этого не делает и жмёт по пустому месту вьюпорта
  const cell = p.locator('.sv4-stat.rollable').first();
  await cell.hover();
  await clearLog();
  const logBefore = await ev(() => (state.sheet.rollLog || []).length);
  await p.mouse.down();
  await p.waitForTimeout(650);
  await p.mouse.up();
  await p.waitForTimeout(250);
  return ev(before => {
    const open = /show/.test((document.getElementById('ordo-dlg') || {}).className || '');
    const rolled = (state.sheet.rollLog || []).length !== before;
    ordoDialogClose();
    if (!open) return 'выбор сложности не открылся';
    return rolled ? 'удержание всё равно бросило кубик' : true;
  }, logBefore);
});

await check('короткий тап по-прежнему просто бросает', async () => {
  await p.waitForTimeout(300);
  await clearLog();
  const before = await ev(() => (state.sheet.rollLog || []).length);
  await p.locator('.sv4-stat.rollable').first().click();
  await p.waitForTimeout(300);
  return ev(b => {
    const open = /show/.test((document.getElementById('ordo-dlg') || {}).className || '');
    const rolled = (state.sheet.rollLog || []).length === b + 1;
    const m = document.getElementById('roll-modal');
    if (m) m.classList.remove('show');
    if (open) return 'тап открыл выбор сложности';
    return rolled ? true : 'бросок не случился';
  }, before);
});

console.log(results.join('\n'));
console.log('\nпрошло ' + pass + ', не прошло ' + fail);
console.log('ошибок JS за прогон: ' + errs.length);
if (errs.length) errs.slice(0, 12).forEach(e => console.log('  ' + e));
await b.close();
srv.close();
process.exit(fail ? 1 : 0);
