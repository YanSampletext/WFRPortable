// Архив досье: сохранение, загрузка, импорт и выгрузка
//
// Вырезано из app.js без изменения семантики: файл по-прежнему обычный
// <script>, все функции остаются глобальными, и разметка находит их так же,
// как находила. Здесь же разбор недоверенного JSON при импорте — этой части полезно жить отдельно.
//
// Подключается ПОСЛЕ app.js: тот держит state и расчёты, которыми здесь
// пользуются. Порядок задан в index.html и в списке ASSETS у sw.js.

// ===================== ROSTER (галерея персонажей) =====================
const ROSTER_KEY = 'wfrp4_roster_v1';
const STATE_KEY  = 'wfrp4_currentstate_v1'; // отдельно от STORAGE_KEY (старая совместимость)

function loadRoster(){
  try{
    const raw = localStorage.getItem(ROSTER_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch(e){ return []; }
}
// Возвращает true, только если запись действительно прошла: у вызывающего
// нет другого способа отличить сохранение от переполненной памяти, а
// сообщать «сохранено», когда ничего не сохранилось, — худшее из возможного.
function saveRoster(roster){
  try{
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
    return true;
  } catch(e){
    // Память кончилась: имя ошибки у браузеров разное, поэтому смотрим и код
    const full = e && (e.name === 'QuotaExceededError' || e.code === 22 ||
                       e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    notify(full
      ? 'Память приложения переполнена — досье не сохранено. Выгрузи лишние досье в JSON и удали их из архива.'
      : 'Не вышло сохранить досье: ' + (e && e.message ? e.message : 'неизвестная ошибка'));
    return false;
  }
}

// Свежий, "чистый" state — для нового персонажа
function freshState(){
  return {
    step: 1,
    id: null,
    race: null, cls: null, career: null,
    rolls: {}, stats: {},
    raceAccepted: false, careerAccepted: false, statsAccepted: false,
    raceRolled: false, careerRolled: false, statsRolled: false,
    raceXpAwarded: false, careerXpAwarded: false, statsXpAwarded: false,
    raceXpAmount: 0, careerXpAmount: 0, statsXpAmount: 0,
    fate: 0, resilience: 0, extraFate: 0, extraRes: 0,
    raceSkillsBig: [], raceSkillsSm: [],
    raceTalentChoices: {}, randomTalents: [],
    careerSkills: {}, careerTalentLvl: null, careerStatAdv: {},
    xpGained: 0,
    pendingRandom: null,
    name: '', age: '', height: '', hair: '', eyes: '',
    motivation: '', ambitionShort: '', ambitionLong: '',
    sheet: {
      tier: 1, currentHP: null, spentXP: 0, currentLuck: null, resolveCurrent: null,
      weapons: [], armours: [], extraSkills: [], skillAdv: {}, extraTalents: [],
      items: [], money: { gc: 0, ss: 0, bp: 0 },
      psychology: '', corruption: 0, mutations: '', notes: '',
      teamName: '', teamShort: '', teamLong: '', starterImported: false,
      doomedProphecy: '',
      moneyRolled: false,
      statAdvBought: {}, skillAdvBought: {}, talentBought: [],
      careerTier1Done: true, tierCompleteOverride: false, careerLog: [],
    },
  };
}

// Стартовая страница: список персонажей
function renderRoster(){
  // разметку карточек держит js/archive.js — один источник на оба экрана
  renderArchiveInto(document.getElementById('roster-area'), { tools: true });
}

function genCharId(){
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
}

// "Зафиксировать" текущего персонажа в roster
function saveCharacterToRoster(){
  const roster = loadRoster();
  if(!state.id) state.id = genCharId();
  const snap = JSON.parse(JSON.stringify(state));
  snap._updated = Date.now();
  const idx = roster.findIndex(p => p.id === state.id);
  if(idx >= 0) roster[idx] = snap;
  else roster.push(snap);
  // О неудаче saveRoster сообщает сам — второй раз тревожить незачем
  if(saveRoster(roster)) notify(`«${state.name || 'персонаж'}» сохранён в галерею.`);
}

// Завершить создание: сохранить и открыть готовый бланк персонажа
function finishAndSaveCharacter(){
  if(!state.race || !state.career){
    notify('Сначала выбери народ и карьеру.');
    return;
  }
  saveCharacterToRoster();
  appMode = 'character';
  _sheetTab = 'persona';
  renderSteps();
  goStep(8);
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 10);
}

// Выгрузка одного досье живёт в archive.js (exportOne) — там же, где карточки
// и меню «⋯», из которого её и вызывают.

// Импортированный файл — недоверенные данные: обмен досье между игроками это
// штатный сценарий, и присланный JSON может содержать что угодно. Собираем
// персонажа заново по схеме: незнакомые ключи не переносятся, а знакомые
// берутся только если тип совпал с ожидаемым.
//
// Значения при этом не «чистятся» — имя со скобками остаётся именем со
// скобками. Безопасность обеспечивает экранирование при выводе; здесь задача
// другая: не пустить в состояние приложения посторонние поля и не дать
// строке оказаться там, где код ждёт число.
// null в схеме значит «ещё не заполнено», и стоит он у полей разного рода:
// race и career — строки, currentHP и currentLuck — числа. Поэтому по типу
// образца их не различить, и числовые перечислены поимённо ниже.
const NUMERIC_OR_EMPTY = ['currentHP', 'currentLuck', 'resolveCurrent'];

function fitsShape(value, sample, key){
  if(value === undefined) return false;
  if(sample === null){
    if(value === null) return true;
    return NUMERIC_OR_EMPTY.indexOf(key) >= 0
      ? typeof value === 'number'
      : (typeof value === 'string' || typeof value === 'number');
  }
  if(Array.isArray(sample)) return Array.isArray(value);
  if(typeof sample === 'object') return !!value && typeof value === 'object' && !Array.isArray(value);
  return typeof value === typeof sample;
}

function sanitizeCharacter(raw){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('это не досье');
  const clean = freshState();
  for(const k in clean){
    if(k === 'sheet') continue;
    if(fitsShape(raw[k], clean[k], k)) clean[k] = raw[k];
  }
  const rawSheet = (raw.sheet && typeof raw.sheet === 'object') ? raw.sheet : {};
  clean.sheet = {};
  for(const k in SHEET_DEFAULTS){
    clean.sheet[k] = fitsShape(rawSheet[k], SHEET_DEFAULTS[k], k)
      ? rawSheet[k]
      : (Array.isArray(SHEET_DEFAULTS[k]) ? SHEET_DEFAULTS[k].slice()
        : (SHEET_DEFAULTS[k] && typeof SHEET_DEFAULTS[k] === 'object'
           ? JSON.parse(JSON.stringify(SHEET_DEFAULTS[k])) : SHEET_DEFAULTS[k]));
  }
  // Характеристики проходят проверку формы как объект, но значения внутри
  // идут прямо в арифметику — строка там превращает весь бланк в NaN.
  for(const key of ['stats', 'rolls', 'careerStatAdv']){
    const src = clean[key];
    if(src && typeof src === 'object'){
      const num = {};
      for(const k in src){ const v = parseInt(src[k], 10); if(!isNaN(v)) num[k] = v; }
      clean[key] = num;
    }
  }
  if(!clean.race || !clean.stats) throw new Error('в файле нет ни народа, ни характеристик');
  return clean;
}

function importToRoster(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const data = sanitizeCharacter(JSON.parse(e.target.result));
      // Дадим новый id если нет / дублируется
      const roster = loadRoster();
      if(!data.id || roster.find(p => p.id === data.id)) data.id = genCharId();
      data._updated = Date.now();
      roster.push(data);
      if(!saveRoster(roster)) return;
      notify('Импортировано в галерею.');
      renderRoster();
    } catch(err){ notify('Ошибка импорта: '+err.message); }
  };
  reader.readAsText(file);
  input.value = '';
}

// ===== SAVE / LOAD (старая логика — теперь работает с текущим state, не с roster) =====
const STORAGE_KEY = 'wfrp4_sheet_v1';

// Галочка «сохранено» ставится после удачной записи, а не до попытки:
// иначе при переполненной памяти она загоралась бы над несохранённым досье.
function autosave(){
  // Автосохраняем ТОЛЬКО если этот state — уже сохранённый персонаж (есть id в roster)
  if(!state.id) return;
  try{
    const roster = loadRoster();
    const idx = roster.findIndex(p => p.id === state.id);
    if(idx < 0) return; // не в roster — не пишем
    const snap = JSON.parse(JSON.stringify(state));
    snap._updated = Date.now();
    roster[idx] = snap;
    if(saveRoster(roster)) savedTickShow();
  } catch(e){
    notify('Не вышло сохранить изменения: ' + (e && e.message ? e.message : 'неизвестная ошибка'));
  }
}
function exportSheet(){
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (state.name || 'wfrp4_character').replace(/\s+/g,'_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}
function importSheet(input){
  // Импорт = добавить в галерею
  importToRoster(input);
}

// Полная схема бланка — единственный источник правды и для дозаполнения
// старых сохранений, и для белого списка при импорте. Разъедься эти два
// списка — импорт начал бы молча выбрасывать поля, которые приложение
// считает своими.
const SHEET_DEFAULTS = {
    tier: 1, currentHP: null, spentXP: 0, currentLuck: null, resolveCurrent: null,
    weapons: [], armor: [], trappings: [],
    extraSkills: [], skillAdv: {}, extraTalents: [],
    money: { gc: 0, ss: 0, bp: 0 },
    psychology: '', corruption: 0, mutations: '', notes: '',
    teamName: '', teamShort: '', teamLong: '', starterImported: false,
    doomedProphecy: '',
    moneyRolled: false,
    statAdvBought: {},
    skillAdvBought: {},
    talentBought: [],
    careerTier1Done: true,
    tierCompleteOverride: false,
    careerLog: [],
    conditions: {}, injuries: [], diseases: [], advantage: 0,
    spells: [], blessings: [], miracles: [],
    rollLog: [],
    critLog: [], critWounds: 0, potionUsedScene: false,
    psych: {fearRank:0, fearSL:0, fearActive:false, frenzy:false},
    langMagick: 0, channelSkill: 0, channelled: 0, nearCorruption: false, miscastLog: [],
    praySkill: 0, sin: 0, wrathLog: [],
    endeavoursUsed: 0, downtimeLog: [],
    portrait: '',
    // Эти двое живут на бланке с самого начала, но в схеме их не было:
    // без них импорт молча терял потраченную судьбу и отметку о смерти.
    fateSpent: 0, gmDead: false,
};

function migrateState(){
  // Гарантируем, что вся структура state.sheet существует (для старых сохранений)
  if(!state.sheet) state.sheet = {};
  const defaults = SHEET_DEFAULTS;
  for(const k in defaults){
    if(state.sheet[k] === undefined) state.sheet[k] = defaults[k];
  }
  // Миграция старых названий состояний → канонические имена книги (значения сохраняются)
  if(state.sheet.conditions){
    const condMap = {
      'Кровотечение':'Кровоточащий','Оглушение':'Оглушённый','Ослепление':'Ослепший',
      'Отравление':'Отравленный','Падение':'Лежащий','Поражение':'Сломленный',
      'Удушение':'Опутанный','Усталость':'Уставший','Шок':'Ошеломлённый'
    };
    for(const oldName in condMap){
      if(state.sheet.conditions[oldName] !== undefined){
        const v = state.sheet.conditions[oldName];
        delete state.sheet.conditions[oldName];
        if(v) state.sheet.conditions[condMap[oldName]] = (state.sheet.conditions[condMap[oldName]]||0) + v;
      }
    }
  }
  // Верхне-уровневые флаги (могут отсутствовать в старых сохранениях)
  if(state.raceAccepted   === undefined) state.raceAccepted = false;
  if(state.careerAccepted === undefined) state.careerAccepted = false;
  if(state.statsAccepted  === undefined) state.statsAccepted = false;
  // Новые флаги «бросок сделан» и суммы начисленного XP (для блокировки перебросов и честного отката).
  // Для старых сохранений: если шаг уже принят — считаем, что бросок был сделан.
  if(state.raceRolled   === undefined) state.raceRolled = !!state.raceAccepted;
  if(state.careerRolled === undefined) state.careerRolled = !!state.careerAccepted;
  if(state.statsRolled  === undefined) state.statsRolled = !!state.statsAccepted;
  if(state.raceXpAwarded   === undefined) state.raceXpAwarded = !!state.raceAccepted;
  if(state.careerXpAwarded === undefined) state.careerXpAwarded = !!state.careerAccepted;
  if(state.statsXpAwarded  === undefined) state.statsXpAwarded = !!state.statsAccepted;
  if(state.raceXpAmount === undefined) state.raceXpAmount = state.raceAccepted ? 20 : 0;
  if(state.careerXpAmount === undefined) state.careerXpAmount = 0;
  if(state.statsXpAmount  === undefined) state.statsXpAmount = state.statsAccepted ? 50 : 0;
  // Миграция старых слотов брони/предметов (armours/items → armor/trappings)
  if(Array.isArray(state.sheet.armours) && state.sheet.armours.length && !state.sheet.armor.length){
    state.sheet.armours.forEach(a => {
      state.sheet.armor.push({
        name: a.name||'',
        zones: Array.isArray(a.zones) ? a.zones.join(', ') : (a.zones||''),
        ap: a.ap||0,
        qualities: typeof a.qualities==='string' ? a.qualities : (a.qualities||[]).join(', '),
        enc: a.enc || a.weight_num || 0,
      });
    });
  }
  delete state.sheet.armours;
  if(Array.isArray(state.sheet.items) && state.sheet.items.length && !state.sheet.trappings.length){
    state.sheet.items.forEach(it => {
      state.sheet.trappings.push({ name: it.name||'', enc: it.enc||0, desc: it.desc||'' });
    });
  }
  delete state.sheet.items;
  // Нормализация веса оружия: weight → enc, reach → range
  (state.sheet.weapons||[]).forEach(w => {
    if(w.enc === undefined && w.weight !== undefined) w.enc = parseInt(w.weight)||0;
    if(w.range === undefined && w.reach !== undefined) w.range = w.reach;
  });
  // Чищу extraSkills от тех, что есть в common_skills (они теперь сами там)
  if(Array.isArray(state.sheet.extraSkills)){
    state.sheet.extraSkills = state.sheet.extraSkills.filter(es => {
      const isCommon = DATA.common_skills.some(cs => cs.name.toLowerCase() === es.name.toLowerCase());
      if(isCommon){
        const k = es.name.toLowerCase();
        state.sheet.skillAdv[k] = (state.sheet.skillAdv[k] || 0) + (es.adv || 0);
        return false;
      }
      return true;
    });
  }
}

// При запуске:
//  1) Если в localStorage остался "старый" одиночный state — мигрируем его в roster.
//  2) Открываем галерею персонажей.
(function(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const saved = JSON.parse(raw);
      // Мигрируем в roster только если есть имя или хотя бы выбраны раса+карьера
      if(saved && (saved.name || (saved.race && saved.career))){
        const roster = loadRoster();
        if(!saved.id) saved.id = genCharId();
        if(!roster.find(p => p.id === saved.id)){
          saved._updated = Date.now();
          roster.push(saved);
          saveRoster(roster);
        }
      }
      // Старый ключ больше не нужен — чистим, чтобы не сбивал при следующем открытии
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch(e){}
  // state остаётся "пустым" — пользователь сам выбирает: открыть персонажа или создать нового
  Object.assign(state, freshState());
  migrateState();
})();
