// Чужое досье не должно исполняться.
//
// Персонажей пересылают друг другу файлами, и файл может прийти откуда угодно.
// Здесь собирается досье, где каждая строка и каждое число заменены разметкой
// с кодом, импортируется штатной кнопкой и открывается на всех экранах.
// Сработавшая метка — значит значение из файла ушло в страницу как HTML.
//
// Сгенерированный персонаж заполняет не всё: заклинаний, критов, болезней,
// журналов у него нет. Поэтому каждый список бланка дополняется записью со
// всеми полями, какие приложение туда кладёт.
import { launchChromium, serve } from './browser.mjs';

const srv = await serve(new URL('..', import.meta.url).pathname, 8097);
const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 393, height: 850 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
p.on('dialog', d => d.dismiss());
await p.goto('http://127.0.0.1:8097/index.html');
await p.waitForTimeout(700);

let failed = 0;
const ok = (cond, text) => { console.log(`  ${cond ? '✓' : '✗'} ${text}`); if (!cond) failed++; };

// ── досье с кодом в каждом поле ─────────────────────────────────────────────
const paths = await p.evaluate(() => {
  window.__hits = new Set();
  window.__x = n => window.__hits.add(n);
  document.getElementById('view-landing').style.display = 'none';
  document.getElementById('view-app').style.display = 'block';
  _rollFullRandomCharacterDo();
  state.name = 'Ядовитый';
  // случайные таланты мастер показывает только у людей: остальные народы
  // их не тянут, и проверка через раз смотрела бы мимо
  state.race = 'human';
  state.randomTalents = [null, null, { roll: 5, talent: 'Смекалка' },
                         { roll: 40, talent: 'Здоровяк' }, { roll: 90, talent: 'Везение' }];

  // одна запись со всеми полями, которые встречаются в списках бланка
  const entry = () => ({
    name: 'n', adv: 5, level: 1, hint: 'h', group: 'Основное', range: 'r', damage: '+РС',
    enc: 1, qualities: 'q', zones: 'z', ap: 1, cn: 3, target: 't', duration: 'd',
    inc: 'i', dur: 'd', sym: 's', day: 1, phase: 'инкубация', kind: 'k', text: 'т',
    applied: false, id: 'e1', type: 'cast', roll: 11, from: 'f', to: 't', cost: 100,
    completed: true, d: 42, outcome: 'o', sl: 2, t: 1, zone: 'Голова', wounds: 1,
    effect: 'e', lethal: false, dZone: 5, dWound: 7, skill: 'Атлетика', value: 30,
    goal: 5, acc: 1, tries: [{ d: 12, target: 30, sl: 1, dif: 'Серьёзная', t: 1 }],
    conds: { 'Кровоточащий': 1 }, reward: { type: 'note' },
  });
  const s = state.sheet;
  for (const k in s) if (Array.isArray(s[k]) && !s[k].length) s[k].push(entry());
  s.rollLog[0].target = 30;          // у заклинаний цель — текст, у броска — число
  s.injuries = ['рана'];
  s.conditions = { 'Кровоточащий': 1 };
  window.__legit = JSON.parse(JSON.stringify(state));

  // «Народ» и «карьера» — ключи справочника: с кодом в них импорт откажет
  // целиком и дальше смотреть будет нечего. Их проверка — ниже, отдельно.
  const keep = new Set(['race', 'cls', 'career', 'id', 'portrait']);
  const map = [];
  const pay = n => `'"><img src=x onerror=__x(${n})>`;
  const src = JSON.parse(JSON.stringify(state));
  (function walk(o, path) {
    for (const k of Object.keys(o)) {
      const v = o[k], here = path + '.' + k;
      if (path === '' && keep.has(k)) continue;
      if (typeof v === 'string' || typeof v === 'number') { map.push(here); o[k] = pay(map.length - 1); }
      else if (v && typeof v === 'object') walk(v, here);
    }
  })(src, '');
  window.__file = new File([JSON.stringify(src)], 'x.json');
  return map;
});

const importFile = () => p.evaluate(() => new Promise(done => {
  const inp = document.createElement('input'); inp.type = 'file';
  const dt = new DataTransfer(); dt.items.add(window.__file); inp.files = dt.files;
  const before = loadRoster().length;
  importToRoster(inp);
  setTimeout(() => done(loadRoster().length > before ? loadRoster().at(-1).id : null), 400);
}));

const id = await importFile();
ok(!!id, 'досье с разметкой вместо значений импортируется');

const call = (fn, arg) => p.evaluate(fn, arg).catch(e => errs.push(e.message.slice(0, 140)))
  .then(() => p.waitForTimeout(150));
if (id) {
  await call(() => renderRoster());
  await call(id => openCharacter(id), id);
  for (const t of await p.evaluate(() => SHEET_TABS.map(t => t.id))) await call(t => sv4NavGo(t), t);
  // Шаги мастера рисуются только в режиме создания. Вперёд goStep не пустит,
  // пока не пройден предыдущий шаг, а в испорченном досье он не пройден, —
  // поэтому заходим на каждый шаг как бы назад, с последнего.
  for (let st = 1; st <= 7; st++) await call(st => { appMode = 'creation'; state.step = 7; goStep(st); }, st);
  await call(() => { appMode = 'character'; goStep(8); });
  await call(id => openCharacterShop(id), id);
  // окна, которые показывают записи досье
  await call(() => {
    const tryIt = f => { try { f(); } catch (e) {} };
    goStep(8);
    tryIt(() => rollCastingTest(0, 0));
    tryIt(() => rollPrayTest(0, 'blessing', 0));
    tryIt(() => attackWith(0, 0));
    tryIt(() => extRoll(state.sheet.extended[0].id, 0));
    tryIt(() => encAddCharacter());
  });
  // Диалоги, в заголовки и кнопки которых попадают имена: досье, участника
  // схватки, оружия. При пустой схватке удар диалога не открывает, поэтому
  // сперва ставим персонажа в схватку.
  await call(id => {
    renderRoster();
    const m = document.querySelector('[data-id="' + id + '"] [data-action="menu"]');
    if (m) m.click();
  }, id);
  await call(() => {
    ordoDialogClose();
    encList().forEach(x => encRemove(x.id));
    encAddSelf();
    const me = encList()[0];
    if (me) encCondPick(me.id);
  });
  await call(() => { ordoDialogClose(); attackWith(0, 0); });
  await call(() => { ordoDialogClose(); encList().forEach(x => encRemove(x.id)); });
}
const hits = await p.evaluate(() => [...window.__hits].sort((a, b) => a - b));
ok(hits.length === 0, `ни одно из ${paths.length} значений не исполнилось` +
  (hits.length ? ':\n      ' + hits.map(n => paths[n]).join('\n      ') : ''));

// ── честное досье проходит без изменений ───────────────────────────────────
// Нормализация не должна трогать настоящие данные: иначе обмен досье между
// игроками тихо портил бы персонажей.
const changed = await p.evaluate(() => {
  const a = window.__legit, c = sanitizeCharacter(JSON.parse(JSON.stringify(a)));
  const out = [];
  (function walk(x, y, path) {
    for (const k of new Set([...Object.keys(x || {}), ...Object.keys(y || {})])) {
      const u = x?.[k], v = y?.[k];
      if (u && v && typeof u === 'object' && typeof v === 'object') walk(u, v, path + '.' + k);
      else if (JSON.stringify(u) !== JSON.stringify(v)) out.push(`${path}.${k}: ${JSON.stringify(u)} → ${JSON.stringify(v)}`);
    }
  })(a, c, '');
  return out;
});
ok(!changed.length, 'честное досье после импорта совпадает с исходным' +
  (changed.length ? ':\n      ' + changed.slice(0, 10).join('\n      ') : ''));

// ── ключи справочника, которых нет ─────────────────────────────────────────
// Досье с чужим народом или карьерой не открывается: бланк строится от
// справочника. Такой файл надо отклонять на входе, а не пускать в архив.
for (const [label, patch] of [['незнакомый народ', ['race', 'Нет такого']],
                             ['незнакомая карьера', ['career', 'Нет такой']],
                             ['народ «constructor»', ['race', 'constructor']]]) {
  const r = await p.evaluate(([key, val]) => new Promise(done => {
    _rollFullRandomCharacterDo();
    const bad = JSON.parse(JSON.stringify(state)); bad[key] = val;
    const inp = document.createElement('input'); inp.type = 'file';
    const dt = new DataTransfer(); dt.items.add(new File([JSON.stringify(bad)], 'b.json')); inp.files = dt.files;
    const before = loadRoster().length;
    importToRoster(inp);
    setTimeout(() => done(loadRoster().length === before), 400);
  }), patch);
  ok(r, `${label} в файле — импорт отклонён`);
}

ok(errs.length === 0, 'ошибок JS нет' + (errs.length ? ': ' + [...new Set(errs)].slice(0, 5).join(' | ') : ''));
console.log(`\n${failed ? 'не прошло ' + failed : 'всё прошло'}`);
await b.close(); srv.close();
process.exit(failed ? 1 : 0);
