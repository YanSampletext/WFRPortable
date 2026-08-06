// ===================== DATA =====================
// ===================== STATE =====================
const STAT_NAMES = ['ББ','ДБ','С','В','И','Пр','Л','Инт','СВ','Х'];
const STAT_FULL = {
  'ББ':'Ближний бой','ДБ':'Дальний бой','С':'Сила','В':'Выносливость',
  'И':'Инициатива','Пр':'Проворство','Л':'Ловкость','Инт':'Интеллект',
  'СВ':'Сила воли','Х':'Харизма'
};

// ===================== ENGINE: TALENT EFFECTS =====================
// Эффекты талантов — что талант даёт пассивно при расчётах.
// Формат: { stat: '+5' } — повышает базовое значение характеристики на 5.
//         { move: '+1' } — повышает скорость.
//         { hp: '+rV' }  — повышает максимум здоровья на бонус выносливости за уровень.
//         { encumbrance: '+2*lvl' } — +2 к лимиту переносимого веса за уровень.
//         { resolveMax: '+1*lvl' } — +1 к макс. решимости за уровень.
//         { corruptionThreshold: '+1*lvl' } — +1 к порогу скверны за уровень.
function talentEffLevel(name, talents, totals){
  const lvl = talentLevel(name, talents);
  if(lvl <= 0) return 0;
  const eff = TALENT_EFFECTS[name];
  if(!eff) return lvl;
  if(eff.max) return Math.min(lvl, eff.max);
  if(eff.maxStat && totals){
    const cap = Math.max(1, Math.floor((totals[eff.maxStat]||0)/10));
    return Math.min(lvl, cap);
  }
  return lvl;
}

// Возвращает уровень таланта у персонажа (сколько шагов сделано), 0 если нет.
// talents — необязательный заранее собранный список (compileTalents()), чтобы не
// пересобирать его многократно за один расчёт. Если не передан — соберём сами.
function talentLevel(name, talents){
  const lower = name.toLowerCase();
  let lvl = 0;
  const list = talents || compileTalents() || [];
  list.forEach(t => {
    if(t.name && t.name.toLowerCase() === lower) lvl += (t.level || 1);
  });
  return lvl;
}

// Возвращает суммарный бонус от талантов к характеристике
function talentStatBonus(stat, talents){
  const list = talents || compileTalents() || [];
  let bonus = 0;
  Object.entries(TALENT_EFFECTS).forEach(([talName, eff]) => {
    if(eff.stat === stat){
      // Максимум: 1 — даже если талант записан дважды, бонус даётся один раз
      const lvl = talentEffLevel(talName, list, null);
      if(lvl > 0) bonus += eff.amount * (eff.perLevel ? lvl : 1);
    }
  });
  return bonus;
}

// Бонус к скорости
function talentMoveBonus(talents){
  const list = talents || compileTalents() || [];
  let bonus = 0;
  Object.entries(TALENT_EFFECTS).forEach(([talName, eff]) => {
    if(eff.move){
      const lvl = talentLevel(talName, list);
      if(lvl > 0) bonus += eff.move * (eff.perLevel ? lvl : 1);
    }
  });
  return bonus;
}

// Бонус к макс. здоровью (Здоровяк: +РВ за уровень)
function talentHpBonus(rv, talents){
  // Hardy: Максимум — бонус выносливости; за уровень даёт +[БВ] ран
  const lvl = talentEffLevel('здоровяк', talents, { 'В': rv * 10 });
  return lvl > 0 ? rv * lvl : 0;
}

// Бонус к лимиту переносимого веса (Бугай: +2 за уровень)
function talentEncumbranceBonus(talents, totals){
  // Sturdy: Максимум — бонус силы; +2 очка обременения за уровень
  const lvl = talentEffLevel('бугай', talents, totals);
  return lvl > 0 ? 2 * lvl : 0;
}

// Бонус к макс. решимости (Твёрдость духа: +1 за уровень)
function talentResolveBonus(talents){
  return talentLevel('твёрдость духа', talents);
}

// Бонус к порогу скверны (Духовная чистота: +1 за уровень)
function talentCorruptionThresholdBonus(talents){
  return talentLevel('духовная чистота', talents);
}

let state = {
  step: 1,
  race: null,
  cls: null,
  career: null,
  rolls: {},         // {stat: 2d10_value}
  stats: {},         // final stat values
  // === Блокировки повторных бросков после "Согласиться" (по правилам книги) ===
  raceAccepted: false,    // согласился с народом по броску
  careerAccepted: false,  // согласился с карьерой по броску
  statsAccepted: false,   // согласился с характеристиками по броску
  // === Один случайный бросок на шаг (нельзя «перебрасывать до удачного») ===
  raceRolled: false,      // случайный бросок народа уже сделан
  careerRolled: false,    // случайный бросок карьеры уже сделан
  statsRolled: false,     // характеристики уже брошены «все разом»
  raceXpAwarded: false,   // XP за народ уже начислен (защита от повтора)
  raceXpAmount: 0,        // сколько XP начислено за случайный народ (+20) — для отката при ручной смене
  careerXpAwarded: false, // XP за карьеру уже начислен
  careerXpAmount: 0,      // сколько именно XP начислено за случайную карьеру (для отката)
  statsXpAwarded: false,  // XP за характеристики уже начислен
  statsXpAmount: 0,       // сколько XP начислено за характеристики (+50/+25) — для отката при сбросе
  fate: 0,
  resilience: 0,
  extraFate: 0,
  extraRes: 0,
  raceSkillsBig: [],   // 3 navыки по 5 шагов
  raceSkillsSm: [],    // 3 navыки по 3 шага
  raceTalentChoices: {}, // for "X или Y"
  randomTalents: [],   // случайные таланты
  careerSkills: {},    // {skill: adv}
  careerTalentLvl: null, // имя выбранного таланта для +1
  careerStatAdv: {},   // {stat: adv} 5 шагов между 3 доступными
  xpGained: 0,
  pendingRandom: null, // {type: 'race'|'career'|'stats', ...} — ждёт «Согласиться»
  // финал
  name: '', age: '', height: '', hair:'', eyes:'',
  motivation: '', ambitionShort:'', ambitionLong:'',
  // === Поля интерактивного листа (шаг 8) ===
  sheet: {
    tier: 1,                       // текущая ступень карьеры (1..4)
    currentHP: null,               // текущее здоровье; null = равно max
    spentXP: 0,                    // потрачено опыта
    currentLuck: null,             // текущая удача (если null — = судьба)
    resolveCurrent: null,          // текущая решимость
    weapons: [],                   // [{name, group, dmg, range, qualities}]
    // Броня: zones — массив ['head','body','larm','rarm','lleg','rleg','shield']
    armours: [],                   // [{name, zones:[], ap, qualities, weight}]
    extraSkills: [],               // [{name, stat, adv}] — профессиональные/добавленные
    skillAdv: {},                  // {skill_name: adv} — для общих навыков, шаги в листе
    extraTalents: [],              // [{name, level, hint}]
    items: [],                     // [{name, qty, weight}]
    money: { gc: 0, ss: 0, bp: 0 },
    psychology: '',
    corruption: 0,
    advantage: 0,
    mutations: '',
    // === Магия (гл. VIII) ===
    spells: [],            // [{name, cn, range, target, duration, effect, memorized}]
    langMagick: 0,         // итог навыка «язык (магик)» — для проверки сотворения
    channelSkill: 0,       // итог навыка «концентрация» — для каналирования
    channelled: 0,         // накоплено SL каналированием (сбрасывается при сотворении)
    nearCorruption: false, // рядом с искажающим влиянием (любая 8 на единицах → малая ошибка)
    miscastLog: [],        // журнал ошибок [{type, roll, text}]
    // === Вера (гл. VII) ===
    blessings: [],         // [{name, range, target, duration, effect}]
    miracles: [],          // [{name, range, target, duration, effect}]
    praySkill: 0,          // итог навыка «молитва»
    sin: 0,                // очки греха (усиливают Гнев Богов на +10 каждое)
    wrathLog: [],          // журнал гнева
    // === Между приключениями (гл. VI) ===
    endeavoursUsed: 0,     // потрачено усилий (макс 3 без последствий — 1/неделю)
    downtimeLog: [],       // журнал отыгранных усилий [{kind, text, reward, applied}]
    notes: '',
    teamName: '',
    teamShort: '',
    teamLong: '',
    starterImported: false,        // флаг: стартовое имущество уже импортировано
    moneyRolled: false,            // флаг: стартовые монеты уже брошены (1 раз по книге)
    // === XP-магазин / журнал ===
    statAdvBought: {},             // {stat: количество купленных шагов СВЕРХ карьерных}
    skillAdvBought: {},            // {skill_lowercase: куплено шагов}
    talentBought: [],              // [{name, level}] купленные таланты
    careerTier1Done: true,         // отметка завершения 1-й ступени (по умолчанию true т.к. она создаётся)
    tierCompleteOverride: false,   // ручной GM-оверрайд завершения ступени
    careerLog: [],                 // [{from, to, cost, completed}] журнал смен карьеры/ступеней
  },
};

// Уведомления копятся в общем столбике под шапкой, а не наслаиваются друг на друга
function notify(msg){
  let stack = document.getElementById('toast-stack');
  if(!stack){
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    document.body.appendChild(stack);
  }
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  stack.appendChild(t);
  while(stack.children.length > 3) stack.firstElementChild.remove();
  setTimeout(()=>t.remove(), 2200);
}

// Реальные высоты шапки и нижней панели → в CSS-переменные,
// чтобы контент и плавающие кнопки точно не заезжали под них
function syncOrdoBars(){
  const root = document.documentElement;
  const bar = document.querySelector('.ordo-bar');
  const nav = document.querySelector('.sv4-bottom-nav');
  if(bar) root.style.setProperty('--ordo-barh', Math.round(bar.getBoundingClientRect().height) + 'px');
  if(nav) root.style.setProperty('--ordo-navh', Math.round(nav.getBoundingClientRect().height) + 'px');
  else root.style.removeProperty('--ordo-navh');
}
window.addEventListener('resize', syncOrdoBars);
window.addEventListener('orientationchange', () => setTimeout(syncOrdoBars, 150));

function roll(n, sides){
  let s = 0; for(let i=0;i<n;i++) s += Math.floor(Math.random()*sides)+1; return s;
}
function rollD100(){ return Math.floor(Math.random()*100) + 1; }

function inRange(roll, range){
  if(!range) return false;
  // диапазон вида "01-03" или "100" или "97-100"
  const parts = String(range).split('-');
  const a = parseInt(parts[0], 10);
  const b = parts.length > 1 ? parseInt(parts[1], 10) : a;
  return roll >= a && roll <= b;
}

// ===================== КАТАЛОГ ОРУЖИЯ =====================
// Формат: {name, kind: 'melee'|'ranged', group, price, weight, avail, reach, damage, qualities, two_handed, weight_num}
// damage в виде формулы — '+РС+4' (для ближнего боя и метательного) или '+9' (фиксированный, для арбалетов/пороха).
// Цена: 'X/Y' = X пенни/Y пенни (альтернатива). КР = золотая крона.
// ===================== КАТАЛОГ БРОНИ =====================
function findInCatalog(catalog, query){
  if(!query) return null;
  const q = String(query).toLowerCase().trim();
  // 1) Точное совпадение
  let hit = catalog.find(x => x.name.toLowerCase() === q);
  if(hit) return hit;
  // 2) Совпадение по началу
  hit = catalog.find(x => q.startsWith(x.name.toLowerCase()) || x.name.toLowerCase().startsWith(q));
  if(hit) return hit;
  // 3) Содержит
  hit = catalog.find(x => q.includes(x.name.toLowerCase()) || x.name.toLowerCase().includes(q));
  return hit || null;
}

// Расчёт численного урона из формулы (например '+РС+4' при РС=4 даёт 8).
//
// Раньше здесь стоял Function('return ('+s+')') под охраной регулярки. Охрана
// была плотной, но это оставалось единственным местом, где приложение
// собирало и запускало код на ходу: под строгой политикой безопасности
// (а её вправе включить и магазин, и будущая версия WebView) такой вызов
// молча падает, и урон оружия перестаёт считаться без единой жалобы.
// Формулы в книге — это только сложение и вычитание, так что складываем сами.
function calcWeaponDamage(formula, rs){
  if(!formula || formula === '—' || formula === 'особый') return null;
  let s = String(formula).replace(/\s+/g, '');
  const RS = (typeof rs === 'number' && !isNaN(rs)) ? rs : 0;
  s = s.replace(/РС/g, String(RS));
  if(!/^[+-]?\d+([+-]\d+)*$/.test(s)) return null;
  // Разбиваем на слагаемые вместе со знаками: «4+4» → [+4, +4], «-2+7» → [-2, +7]
  const parts = s.match(/[+-]?\d+/g);
  if(!parts) return null;
  return parts.reduce((sum, p) => sum + parseInt(p, 10), 0);
}

// ===================== УМНЫЙ ИМПОРТ ИМУЩЕСТВА =====================
// Разбирает строку trappings ("кастет, кожаная куртка, ручное оружие")

// ===================== STEP 8 : INTERACTIVE SHEET =====================

// ---- helpers ----
function sheetCalc(){
  // Возвращает все вычисленные итоги листа
  const r = state.race ? DATA.races[state.race] : null;
  const tals = compileTalents(); // собираем таланты один раз на весь расчёт
  // Полные значения характеристик = базовое (2d10 + народ) + 5 стартовых шагов карьеры (шаг 4 книги)
  // + купленное за опыт + бонусы талантов.
  const totals = {};
  STAT_NAMES.forEach(s => {
    const base = state.stats[s] || 0;
    const starting = (state.careerStatAdv && state.careerStatAdv[s]) || 0; // 5 стартовых шагов карьеры
    const bought = (state.sheet.statAdvBought && state.sheet.statAdvBought[s]) || 0;
    const talBonus = talentStatBonus(s, tals);
    totals[s] = base + starting + bought + talBonus;
  });
  const C = totals['С']||0, V = totals['В']||0, SV = totals['СВ']||0;
  let maxHP = null;
  if(state.race && V > 0){
    // HP считаем как только выбран народ и есть выносливость
    const RS = Math.floor(C/10), RV = Math.floor(V/10), RSV = Math.floor(SV/10);
    maxHP = (state.race === 'halfling') ? (2*RV+RSV) : (RS+2*RV+RSV);
    maxHP += talentHpBonus(RV, tals); // Здоровяк
  }
  const fate   = r ? Math.max(0, r.fate + state.extraFate - ((state.sheet&&state.sheet.fateSpent)||0)) : 0;
  const upor   = r ? r.resilience + state.extraRes + talentResolveBonus(tals) : 0;
  const move   = (r ? r.move : 0) + talentMoveBonus(tals);
  // Лимит переносимого веса = РС + РВ (в пунктах веса); +2 за уровень «Бугая».
  const RS_b = Math.floor((totals['С']||0)/10);
  const RV_b = Math.floor((totals['В']||0)/10);
  const encMax = RS_b + RV_b + talentEncumbranceBonus(tals, totals);
  // Порог скверны: рейтинг СВ + рейтинг В + Духовная чистота
  const RSV_b = Math.floor((totals['СВ']||0)/10);
  const corruptionThreshold = RV_b + RSV_b + talentCorruptionThresholdBonus(tals);
  // Максимум очков удачи = текущие очки судьбы + уровень таланта «Удачливый»
  // (Luck, Максимум: бонус харизмы)
  const fortuneMax = fate + talentEffLevel('удачливый', tals, totals);
  return {
    maxHP, fate, upor, totals, move, fortuneMax,
    encMax, corruptionThreshold,
    RSb: RS_b, RVb: RV_b, RSVb: RSV_b,
  };
}

function bonus(v){ return Math.floor((v||0)/10); }

// Карта характеристик по имени навыка
function statFor(name){
  const stMap = {};
  DATA.common_skills.forEach(cs => stMap[cs.name.toLowerCase()] = cs.stat);
  DATA.prof_skills.forEach(cs   => stMap[cs.name.toLowerCase()] = cs.stat);
  const low = name.toLowerCase();
  if(stMap[low]) return stMap[low];
  // Попробуем по первому слову (рукопашный бой (основное) → рукопашный бой)
  const m = low.match(/^([\u0400-\u04ff\s-]+?)(?:\s*\(|\s*$)/);
  if(m){
    const key = m[1].trim();
    if(stMap[key]) return stMap[key];
  }
  // Грубые эвристики на случай нестандартного названия
  if(low.startsWith('знание') || low.startsWith('наблюд') || low.startsWith('интуи')
     || low.startsWith('ориент') || low.startsWith('книжн') || low.startsWith('выживание')
     || low.startsWith('выслеж') || low.startsWith('дрессир')) return 'И';
  if(low.startsWith('оценка')) return 'Инт';
  if(low.startsWith('язык') || low.startsWith('тайные')) return 'Инт';
  if(low.startsWith('артистизм') || low.startsWith('лидерство') || low.startsWith('обаяние')
     || low.startsWith('сплет') || low.startsWith('торговля') || low.startsWith('подкуп')
     || low.startsWith('молитвословие')) return 'Х';
  if(low.startsWith('ремесло') || low.startsWith('лечение') || low.startsWith('искусство')
     || low.startsWith('ловкость рук') || low.startsWith('взлом')
     || low.startsWith('обращение с лов') || low.startsWith('музиц')) return 'Л';
  if(low.startsWith('рукопашный')) return 'ББ';
  if(low.startsWith('стрельба')) return 'ДБ';
  if(low.startsWith('усмирение') || low.startsWith('хладнокровие')
     || low.startsWith('концентрация')) return 'СВ';
  if(low.startsWith('обращение с животными')) return 'Инт';
  if(low.startsWith('кутёж') || low.startsWith('стойкость')) return 'В';
  if(low.startsWith('запугивание') || low.startsWith('атлетика') || low.startsWith('лазание')
     || low.startsWith('плавание') || low.startsWith('гребля')) return 'С';
  if(low.startsWith('вождение') || low.startsWith('верховая') || low.startsWith('скрытность')
     || low.startsWith('уклонение') || low.startsWith('сценическое') || low.startsWith('хождение')) return 'Пр';
  return '?';
}

/* Собирает ПОЛНЫЙ список общих навыков с шагами развития и пометками источников.
   Возвращает массив:
     { name, stat, adv, value, sources: ['народ','карьера',...], isCommon: bool }
*/
function compileSkills(){
  const calc = sheetCalc();
  const skMap = {};

  // Все 25 общих навыков сразу — всегда видны
  DATA.common_skills.forEach(cs => {
    skMap[cs.name.toLowerCase()] = {
      name: cs.name,
      stat: cs.stat,
      adv: 0,
      sources: [],
      isCommon: true,
      isGroup: cs.group,
      spec: null,
    };
  });

  function add(name, adv, src){
    const k = name.toLowerCase();
    if(!skMap[k]){
      skMap[k] = {
        name, stat: statFor(name), adv: 0, sources: [], isCommon: false,
      };
    }
    skMap[k].adv += adv;
    if(!skMap[k].sources.includes(src)) skMap[k].sources.push(src);
  }

  // Народные навыки
  state.raceSkillsBig.forEach(s => add(s, 5, 'народ'));
  state.raceSkillsSm.forEach(s  => add(s, 3, 'народ'));
  // Карьерные навыки 1-й ступени
  Object.entries(state.careerSkills).forEach(([k,v]) => { if(v>0) add(k, v, 'карьера'); });
  // Также пометим карьерные без шагов как «доступные карьерные»
  const c = state.career ? DATA.careers[state.career] : null;
  if(c){
    const tier = c.tiers[(state.sheet.tier||1) - 1] || c.tiers[0];
    const careerSkillNames = (tier.skills || '').split(/,\s*/).map(s=>s.trim()).filter(Boolean);
    careerSkillNames.forEach(name => {
      const k = name.toLowerCase();
      if(!skMap[k]){
        skMap[k] = { name, stat: statFor(name), adv: 0, sources: [], isCommon: false };
      }
      if(!skMap[k].sources.includes('карьера')) skMap[k].sources.push('карьера');
    });
    // Народные перечни тоже пометим
    if(state.race){
      const r = DATA.races[state.race];
      r.race_skills.forEach(rs => {
        const k = rs.toLowerCase();
        if(!skMap[k]){
          skMap[k] = { name: rs, stat: statFor(rs), adv: 0, sources: [], isCommon: false };
        }
        if(!skMap[k].sources.includes('народ-перечень')) skMap[k].sources.push('народ-перечень');
      });
    }
  }
  // Дополнительные шаги развития из листа (skillAdv)
  Object.entries(state.sheet.skillAdv || {}).forEach(([k, v]) => {
    if(!skMap[k]) skMap[k] = { name: k, stat: statFor(k), adv: 0, sources: [], isCommon: false };
    skMap[k].adv += (v || 0);
    if(v > 0 && !skMap[k].sources.includes('лист')) skMap[k].sources.push('лист');
  });
  // Купленные шаги в магазине XP
  Object.entries(state.sheet.skillAdvBought || {}).forEach(([k, v]) => {
    if(!skMap[k]) skMap[k] = { name: k, stat: statFor(k), adv: 0, sources: [], isCommon: false };
    skMap[k].adv += (v || 0);
    if(v > 0 && !skMap[k].sources.includes('XP-магазин')) skMap[k].sources.push('XP-магазин');
  });
  // Профессиональные / добавленные вручную
  state.sheet.extraSkills.forEach(es => add(es.name, es.adv, 'ручн.'));

  const totals = calc.totals;
  const result = Object.values(skMap).map(sk => ({
    ...sk,
    value: (totals[sk.stat] || 0) + sk.adv,
  }));
  result.sort((a,b) => a.name.localeCompare(b.name, 'ru'));
  return result;
}

function findTalentHint(name){
  // Спец-описания для расовых черт, которых нет в общем справочнике all_talents
  const SPECIAL_HINTS = {
    'роковое пророчество': 'Особая черта людей: мрачное предсказание о судьбе и гибели персонажа. Не даёт боевого эффекта — это завязка для отыгрыша. Раз за сессию, действуя в духе пророчества, можно получить очко Удачи. Сам текст придумывается с ведущим и записывается на шаге «Штрихи».',
    'небольшой': 'Персонаж заметно ниже большинства жителей Старого Света. Труднее попасть по нему в дальнем бою, но и дотянуться/нести тяжёлое сложнее (особенности роста — см. книгу).',
  };
  const low = name.toLowerCase();
  if(SPECIAL_HINTS[low]) return SPECIAL_HINTS[low];
  // Ищем точное совпадение или совпадение по началу (без скобок)
  for(const t of (DATA.all_talents || [])){
    if(t.name.toLowerCase() === low) return t.hint;
  }
  // Без скобок: "Бесстрашие (враг)" → "бесстрашие"
  const stripped = low.replace(/\s*\(.+?\)\s*/g, '').trim();
  for(const t of (DATA.all_talents || [])){
    const tn = t.name.toLowerCase().replace(/\s*\(.+?\)\s*/g, '').trim();
    if(tn === stripped) return t.hint;
  }
  return null;
}

// Имена — в атрибут, а не в строковый литерал onclick.
//
// Раньше названия навыков, талантов и карьер вклеивались прямо в onclick, а
// экранировала их функция jsArg. Внутри onclick="..." такой текст живёт как
// код: перенос строки в имени — и обработчик перестаёт разбираться целиком
// («Invalid or unexpected token»), а прилететь перенос может из импорта.
// В data-атрибуте тот же текст живёт как текст, и ломать нечего; jsArg вместе
// со всем своим классом ошибок больше не нужна.
//
// Числа остались в разметке: подставлять их безопасно, а в мосте они
// приводятся явно, без угадывания «похоже на число — значит число».
document.addEventListener('click', function (e) {
  const el = e.target.closest('[data-call]');
  if (!el) return;
  const v = el.dataset.v || '';
  const n = el.dataset.n;
  switch (el.dataset.call) {
    case 'roll':          rollCheck(v, parseInt(n, 10) || 0); break;
    case 'career-pick':   pickCareerFromSearch(el.dataset.cls || '', v); break;
    case 'talent-race':   chooseRaceTalent(parseInt(n, 10) || 0, v); break;
    case 'skill-career':  changeCareerSkill(v, parseInt(n, 10) || 0); break;
    case 'talent-career': selectCareerTalent(v); break;
    case 'skill-remove':  removeExtraSkill(v); break;
    case 'talent-remove': removeExtraTalent(v); break;
    case 'skill-buy':     buySkillAdv(v); break;
    case 'talent-buy':    buyTalent(v); break;
  }
});

function compileTalents(){
  const r = state.race ? DATA.races[state.race] : null;
  const tals = [];
  if(r){
    r.race_talents.forEach((t, idx) => {
      if(t.includes(' или ')){
        const ch = state.raceTalentChoices['rt_'+idx];
        if(ch) tals.push({ name: ch, level: 1, src: 'народ', hint: findTalentHint(ch) });
        else tals.push({ name: t, level: 1, src: 'народ — не выбрано', hint: 'Расовый талант не выбран — выбери один вариант на шаге «Народ».' });
      } else if(t === '{случайный талант}'){
        const tn = state.randomTalents[idx];
        if(tn) tals.push({ name: tn.talent, level: 1, src: 'народ', hint: findTalentHint(tn.talent) });
      } else {
        tals.push({ name: t, level: 1, src: 'народ', hint: findTalentHint(t) });
      }
    });
  }
  if(state.careerTalentLvl) tals.push({
    name: state.careerTalentLvl, level: 1, src: 'карьера', hint: findTalentHint(state.careerTalentLvl)
  });
  state.sheet.extraTalents.forEach(t => tals.push({
    name: t.name, level: t.level, src: 'ручн.', hint: t.hint || findTalentHint(t.name)
  }));
  return tals;
}


// ===== ACTIONS =====

// Степпер шагов навыка: правка без клавиатуры (Mobile Usability: minimize typing)

// Фильтр навыков по имени (Mobile patterns: search/filter для длинных списков)
function skillFilterApply(q){
  q = (q||'').trim().toLowerCase();
  document.querySelectorAll('#sheet-area .sv4-tbl tbody tr').forEach(tr => {
    const name = (tr.cells[0] ? tr.cells[0].textContent : '').toLowerCase();
    tr.style.display = (!q || name.includes(q)) ? '' : 'none';
  });
}
// «✓ сохранено» — видимость статуса системы, не чаще раза в пару секунд
let _savedTickTs = 0;
function savedTickShow(){
  const now = Date.now();
  if(now - _savedTickTs < 2000) return;
  _savedTickTs = now;
  let el = document.getElementById('saved-tick');
  if(!el){
    el = document.createElement('div'); el.id = 'saved-tick'; el.textContent = '✓ сохранено';
    document.body.appendChild(el);
  }
  el.classList.add('show');
  setTimeout(()=>{ el.classList.remove('show'); }, 1200);
}

function stpAdj(btn, d){
  const inp = btn.parentElement.querySelector('input[data-sk]');
  if(!inp) return;
  inp.value = Math.max(0, (parseInt(inp.value)||0) + d);
  updateSkillAdv(inp);
}
function updateSkillAdv(input){
  const name = input.dataset.sk;
  const v = Math.max(0, parseInt(input.value)||0);
  const lower = name.toLowerCase();
  // Фиксированные шаги из всех источников, кроме ручных.
  // ВАЖНО: сопоставляем регистронезависимо — так же, как compileSkills().
  let fixed = 0;
  let careerKey = null;
  (state.raceSkillsBig||[]).forEach(rs => { if(rs.toLowerCase()===lower) fixed += 5; });
  (state.raceSkillsSm||[]).forEach(rs  => { if(rs.toLowerCase()===lower) fixed += 3; });
  Object.keys(state.careerSkills||{}).forEach(k => {
    if(k.toLowerCase()===lower){ careerKey = k; fixed += (state.careerSkills[k]||0); }
  });
  ((state.sheet&&state.sheet.extraSkills)||[]).forEach(es => {
    if(es.name && es.name.toLowerCase()===lower) fixed += (es.adv||0);
  });
  if(!state.sheet.skillAdv) state.sheet.skillAdv = {};
  // Ручные шаги = введённый итог МИНУС фиксированные (присваиваем, а не прибавляем)
  const manual = v - fixed;
  if(manual > 0){
    state.sheet.skillAdv[lower] = manual;
  } else {
    delete state.sheet.skillAdv[lower];
    // Ввели меньше фиксированных — уменьшаем карьерную часть; народные шаги не трогаем
    if(manual < 0 && careerKey !== null){
      state.careerSkills[careerKey] = Math.max(0, (state.careerSkills[careerKey]||0) + manual);
    }
  }
  renderSheet();
}

function addExtraSkill(){
  const n = document.getElementById('new-skill-name').value.trim();
  const a = parseInt(document.getElementById('new-skill-adv').value)||1;
  if(!n) return;
  state.sheet.extraSkills.push({ name: n, adv: a });
  document.getElementById('new-skill-name').value = '';
  renderSheet();
}
function removeExtraSkill(name){
  state.sheet.extraSkills = state.sheet.extraSkills.filter(es => es.name !== name);
  renderSheet();
}
function addExtraTalent(){
  const n = document.getElementById('new-talent-name').value.trim();
  const l = parseInt(document.getElementById('new-talent-lvl').value)||1;
  if(!n) return;
  const hint = findTalentHint(n);
  state.sheet.extraTalents.push({ name: n, level: l, hint });
  document.getElementById('new-talent-name').value = '';
  renderSheet();
}
function removeExtraTalent(name){
  state.sheet.extraTalents = state.sheet.extraTalents.filter(t => t.name !== name);
  renderSheet();
}





// ===================== INIT (старый — заглушаем, используем наш) =====================
// renderSteps() и goStep(0) вызовем из нашего init ниже

// ===================== РЕЖИМ ОТОБРАЖЕНИЯ =====================
// currentMode: 'landing' | 'creation' | 'character'
// В режиме 'creation' показываются шаги 0-8 без шага 9 в навбаре
// В режиме 'character' показываются шаги 8 и 9 без шагов 1-7

let appMode = 'landing'; // 'landing', 'creation', 'character'

// Шаги для каждого режима
const CREATION_STEPS = [
  {n:1, name:'Народ'},
  {n:2, name:'Карьера'},
  {n:3, name:'Статы'},
  {n:4, name:'Судьба'},
  {n:5, name:'Навыки'},
  {n:6, name:'Имущество'},
  {n:7, name:'Штрихи'},
  // Шаг 8 (Бланк) — это уже готовый персонаж, не часть полосы создания
];

const CHARACTER_STEPS = [
  {n:8, name:'Бланк'},
  {n:9, name:'Магазин XP'},
];

function renderSteps(){
  // ленту из девяти шагов заменили индикатор «Шаг N из 7» и заголовок экрана
  if(typeof renderStepsCompact === 'function') renderStepsCompact();
  if(typeof shellSyncBar === 'function') shellSyncBar();
}

function stepComplete(n){
  switch(n){
    case 1: return !!state.race;
    case 2: return !!state.career;
    case 3: return !!(state.statsAccepted || state.statsRolled || (state.stats && Object.keys(state.stats).length));
    case 4: { const r0 = state.race ? DATA.races[state.race] : null; return !!r0 && ((state.extraFate||0) + (state.extraRes||0)) === r0.extra; }
    case 5: return !!(state.raceSkillsBig && state.raceSkillsBig.length >= 3 && state.raceSkillsSm && state.raceSkillsSm.length >= 3);
    case 6: return !!(state.sheet && state.sheet.moneyRolled);
    default: return true;
  }
}
const STEP_LABEL = {1:'Народ',2:'Карьера',3:'Статы',4:'Судьба',5:'Навыки',6:'Имущество',7:'Штрихи'};
function firstIncompleteStep(){
  for(let k=1;k<=7;k++){ if(!stepComplete(k)) return k; }
  return 99;
}
function goStep(n){
  // направление перехода — для анимации экрана (вперёд влево, назад вправо)
  try{ document.body.classList.toggle('nav-back', typeof state.step === 'number' && n < state.step); }catch(e){}
  // Шаг 9 разрешён только в режиме 'character'
  if(n === 9 && appMode === 'creation') {
    notify('Магазин XP доступен после сохранения персонажа.');
    return;
  }
  // Нельзя перескакивать вперёд, пока предыдущие шаги не завершены
  if(n >= 1 && n <= 7 && n > state.step){
    const fi = firstIncompleteStep();
    if(n > fi){ notify('Сначала заверши шаг ' + fi + ' · ' + (STEP_LABEL[fi]||'')); return; }
  }
  state.step = n;
  if(n !== 9){ const cb=document.getElementById('cart-badge'); if(cb) cb.remove(); }
  // На бланке своя шапка — глобальную и степпер прячем, чтобы не было трёх шапок
  try{
    document.body.classList.toggle('sheet-mode', (n === 8 || n === 9) && appMode === 'character');
    // sheet-full — только сам бланк: он идёт во всю ширину, без отступов .app
    document.body.classList.toggle('sheet-full', n === 8 && appMode === 'character');
  }catch(e){}
  // Автовыдача стартового имущества по классу и карьере (шаг 5 книги) — один раз, на 1-й ступени
  if(n === 8 && appMode === 'character' && state.career && (state.sheet.tier||1) === 1){
    try{
      if(!state.sheet.starterImported) sv2AddStarterGear();
      if(!state.sheet.moneyRolled) rollStartingMoney();
      if(typeof autosave === 'function') autosave();
    }catch(e){}
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelector(`.page[data-step="${n}"]`).classList.add('active');
  renderSteps();
  if(n === 0) renderRoster();
  if(n === 1) renderRaceCards();
  if(n === 2) renderClassCards();
  if(n === 3) renderStatsArea();
  if(n === 4) renderFateArea();
  if(n === 5) renderSkillsArea();
  if(n === 6) renderTrappings();
  if(n === 7) renderFinishing();
  if(n === 8) {
    renderSheet();
  }
  if(n === 9) renderShop();
  updateLockedButtons();
  if(typeof navEnter === 'function') navEnter('step', n);
  // при возврате по кнопке «назад» позицию восстанавливает back-nav.js
  if(!(typeof navGoingBack === 'function' && navGoingBack())) window.scrollTo(0, 0);
}

// ===================== LANDING =====================
// Мрачные эпиграфы в духе Старого Света — случайный при каждом входе на лендинг.
const LANDING_EPIGRAPHS = [
  '«Час самый тёмный наступает перед тем, как сгустится тьма».',
  '«В Старом Свете надежда — роскошь, которую мало кто может себе позволить».',
  '«Сигмар хранит. Но руки твои держат сталь — не молитву».',
  '«Чума не спрашивает имени. Голод не знает жалости. Сталь не ведает пощады».',
  '«За каждым тёплым очагом — холодная могила. Грейся, пока можешь».',
  '«Деньги, вера и острый клинок. Без двух последних первое не спасёт».',
  '«Мутанты в лесах, крысы под городом, измена при дворе. Выбирай, где умереть».',
  '«Здесь не бывает героев — только те, кто ещё не пал».',
  '«Дороги Империи вымощены костями тех, кто шёл первым».',
  '«Зима близко, кошель пуст, а на тракте — разбойники. Обычный вторник».',
];
function showRandomEpigraph(){
  const el = document.getElementById('landing-epigraph');
  if(!el) return;
  const pick = LANDING_EPIGRAPHS[Math.floor(Math.random()*LANDING_EPIGRAPHS.length)];
  // мягкое появление
  el.style.opacity = '0';
  setTimeout(() => { el.textContent = pick; el.style.opacity = '0.62'; }, 120);
}
function goHome(){
  document.getElementById('view-app').style.display = 'none';
  document.getElementById('view-landing').style.display = 'flex';
  appMode = 'landing';
  renderLandingChars();
  showRandomEpigraph();
  if(typeof navEnter === 'function') navEnter('home', '');
}

// === Переключение темы (тёмная / тёплый пергамент) ===
function toggleTheme(){
  const light = document.body.classList.toggle('theme-light');
  try { localStorage.setItem('wfrp4_theme', light ? 'light' : 'dark'); } catch(e){}
  updateThemeBtn(light);
}
function updateThemeBtn(light){
  const b = document.getElementById('theme-btn');
  if(b) b.textContent = light ? '☀ Светлая' : '🌙 Тёмная';
}
function applySavedTheme(){
  let t = 'dark';
  try { t = localStorage.getItem('wfrp4_theme') || 'dark'; } catch(e){}
  const light = (t === 'light');
  document.body.classList.toggle('theme-light', light);
  updateThemeBtn(light);
}

function showApp(mode){
  appMode = mode;
  document.getElementById('view-landing').style.display = 'none';
  document.getElementById('view-app').style.display = 'block';
}

function handleCreate(){
  Object.assign(state, freshState());
  migrateState();
  showApp('creation');
  renderSteps();
  goStep(1);
}

function openCharacter(id){
  const roster = loadRoster();
  const p = roster.find(x => x.id === id);
  if(!p){ notify('Персонаж не найден.'); return; }
  Object.assign(state, freshState());
  Object.assign(state, JSON.parse(JSON.stringify(p)));
  migrateState();
  // Если мы в landing → переходим в app в режиме character
  if(appMode === 'landing'){
    showApp('character');
  } else {
    appMode = 'character';
  }
  renderSteps();
  goStep(8);
}

function openCharacterShop(id){
  const roster = loadRoster();
  const p = roster.find(x => x.id === id);
  if(!p){ notify('Персонаж не найден.'); return; }
  Object.assign(state, freshState());
  Object.assign(state, JSON.parse(JSON.stringify(p)));
  migrateState();
  if(appMode === 'landing'){
    showApp('character');
  } else {
    appMode = 'character';
  }
  renderSteps();
  goStep(9);
}

// startNewCharacter вызывается из галереи (шаг 0)
function startNewCharacter(){
  Object.assign(state, freshState());
  migrateState();
  appMode = 'creation';
  showApp('creation');
  renderSteps();
  goStep(1);
}

// deleteCharacter: после удаления возвращаемся на шаг 0
function deleteCharacter(id, ev, skipConfirm){
  if(ev && ev.stopPropagation) ev.stopPropagation();
  const roster = loadRoster();
  const p = roster.find(x => x.id === id);
  if(!p){ notify('Персонаж не найден.'); return; }
  if(!skipConfirm){
    ordoConfirm({
      title: 'Изъять дело из архива?',
      text: `«${escHtml(p.name || 'Безымянный')}» будет удалён безвозвратно.`,
      yes: 'Удалить', no: 'Оставить', danger: true,
      onYes: () => deleteCharacter(id, null, true)
    });
    return;
  }
  const newRoster = roster.filter(x => x.id !== id);
  saveRoster(newRoster);
  if(state.id === id) Object.assign(state, freshState());
  notify('Персонаж удалён.');
  goStep(0);
  renderLandingChars(); // обновить лендинг тоже
}

// ===================== LANDING CHARS =====================
function renderLandingChars(){
  renderArchiveInto(document.getElementById('landing-char-list'), { tools: false });
}
