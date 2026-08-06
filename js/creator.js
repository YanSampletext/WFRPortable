// Мастер создания персонажа: шаги 1–7
//
// Вырезано из app.js без изменения семантики: файл по-прежнему обычный
// <script>, все функции остаются глобальными, и разметка находит их так же,
// как находила. Пятая часть app.js уходила на мастер создания, и до расчётов бланка приходилось прокручивать все семь шагов.
//
// Подключается ПОСЛЕ app.js: тот держит state и расчёты, которыми здесь
// пользуются. Порядок задан в index.html и в списке ASSETS у sw.js.

// ===================== STEPS NAV =====================
function updateLockedButtons(){
  // Народ: блокируем бросок после согласия ИЛИ после первого броска (нельзя «перебрасывать до удачного»).
  const br = document.getElementById('btn-roll-race');
  if(br){
    if(state.raceAccepted){ br.disabled = true; br.textContent = 'Народ принят (+20 XP получено)'; }
    else if(state.raceRolled){ br.disabled = true; br.textContent = 'Бросок сделан — согласись или выбери вручную'; }
    else { br.disabled = false; br.textContent = 'Бросить 1d100 (+20 XP за согласие)'; }
  }
  // Карьера: обе кнопки броска блокируются после согласия или первого броска.
  const bc1 = document.getElementById('btn-roll-career-1');
  const bc3 = document.getElementById('btn-roll-career-3');
  const careerLocked = !!state.careerAccepted || !!state.careerRolled;
  if(bc1){
    if(state.careerAccepted){ bc1.disabled = true; bc1.textContent = 'Карьера принята'; }
    else if(state.careerRolled){ bc1.disabled = true; bc1.textContent = 'Бросок сделан'; }
    else { bc1.disabled = false; bc1.textContent = 'Бросить 1d100 (+50 XP)'; }
  }
  if(bc3){
    bc3.disabled = careerLocked;
    if(!careerLocked) bc3.textContent = 'Бросить 3 раза (+25 XP)';
    else if(state.careerRolled && !state.careerAccepted) bc3.textContent = 'Бросок сделан';
  }
  // Характеристики: «Бросить все» блокируется после согласия/перераспределения или первого броска.
  const bs = document.getElementById('btn-roll-all-stats');
  if(bs){
    if(state.statsAccepted){ bs.disabled = true; bs.textContent = 'Характеристики приняты'; }
    else if(state.statsRolled){ bs.disabled = true; bs.textContent = 'Бросок сделан'; }
    else { bs.disabled = false; bs.textContent = 'Бросить все характеристики'; }
  }
  for(let k=1;k<=6;k++){ const nb = document.getElementById('btn-next-'+k); if(nb){ const ok = stepComplete(k); nb.disabled = !ok; nb.title = ok ? '' : 'Сначала заверши этот шаг'; } }
  if(document.getElementById('steps')) renderSteps();
}

// ===================== STEP 1 : RACE =====================
function renderRaceCards(){
  const el = document.getElementById('race-cards');
  const ids = Object.keys(DATA.races);
  el.innerHTML = ids.map(id => {
    const r = DATA.races[id];
    const sel = (state.race === id) ? 'selected' : '';
    const sub = r.subname ? `<div class="card-sub">${r.subname}</div>` : '';
    const emblem = RACE_EMBLEMS[id] || RACE_EMBLEMS.human;
    return `<div class="card race-card ${sel}" onclick="selectRace('${id}')">
      <span class="card-corner tl">${ICONS.corner}</span>
      <span class="card-corner tr">${ICONS.corner}</span>
      <span class="card-corner bl">${ICONS.corner}</span>
      <span class="card-corner br">${ICONS.corner}</span>
      <div class="card-emblem">${emblem}</div>
      <div class="card-name">${r.name}</div>
      ${sub}
      <div class="card-desc">${r.desc}</div>
    </div>`;
  }).join('');
  renderRaceDetail();
}

function selectRace(id, fromRoll){
  // Ручной выбор народа (не из броска): гасим «висящий» оффер согласия со случайным броском.
  // Сам бросок остаётся заблокированным (raceRolled не сбрасываем) — перебрасывать нельзя.
  if(!fromRoll && state.pendingRandom && state.pendingRandom.type === 'race'){
    state.pendingRandom = null;
    const el = document.getElementById('race-roll-result'); if(el) el.innerHTML = '';
  }
  if(state.race !== id){
    // Если народ был получен случайным броском (и за него начислен +20 XP), а теперь
    // игрок ВРУЧНУЮ выбирает ДРУГОЙ народ — это свободный выбор (0 XP по правилам):
    // снимаем «принято» и возвращаем бонус. Повторный бросок не разблокируем (raceRolled остаётся).
    if(!fromRoll && state.raceAccepted){
      const refund = state.raceXpAmount || 0;
      if(refund) state.xpGained = Math.max(0, (state.xpGained || 0) - refund);
      state.raceAccepted = false;
      state.raceXpAwarded = false;
      state.raceXpAmount = 0;
      if(refund) notify(`Народ выбран вручную — бонус ${refund} XP за случайный бросок снят (свободный выбор = 0 XP).`);
      if(typeof updateLockedButtons === 'function') updateLockedButtons();
    }
    state.race = id;
    state.rolls = {}; state.stats = {};
    state.raceSkillsBig = []; state.raceSkillsSm = [];
    state.raceTalentChoices = {}; state.randomTalents = [];
    state.fate = DATA.races[id].fate;
    state.resilience = DATA.races[id].resilience;
    state.extraFate = 0; state.extraRes = DATA.races[id].extra;
    // если выбранная карьера недоступна для нового народа — сбросим
    if(state.career){
      const peoples = (DATA.careers[state.career]?.peoples || '').toLowerCase();
      const map = {human:'человек', dwarf:'гном', halfling:'полурослик', helf:'высший эльф', welf:'лесной эльф'};
      if(!peoples.includes(map[id])){
        state.career = null; state.cls = null;
      }
    }
  }
  renderRaceCards();
  if(typeof updateLockedButtons === 'function') updateLockedButtons();
}

function renderRaceDetail(){
  const el = document.getElementById('race-detail');
  if(!state.race){ el.innerHTML = '<p class="muted" style="margin-top:14px;">Выбери народ, чтобы увидеть модификаторы.</p>'; return; }
  const r = DATA.races[state.race];
  let html = '<div class="panel" style="margin-top:14px;">';
  html += '<div class="panel-title">Модификаторы характеристик — ' + r.name + '</div>';
  html += '<div class="stat-grid">';
  STAT_NAMES.forEach(s => {
    const m = r.stats_mod[s];
    html += `<div class="stat-box">
      <span class="stat-abbr">${s}</span>
      <span class="stat-full">${STAT_FULL[s]}</span>
      <span class="stat-val" style="color:var(--gold2)">+${m}</span>
      <span class="stat-base">2d10 + ${m}</span>
    </div>`;
  });
  html += '</div>';
  html += `<div style="margin-top:10px;font-size:13px;display:flex;gap:18px;flex-wrap:wrap;">
    <div><span class="tier-label">Здоровье:</span> ${r.hp_formula}</div>
    <div><span class="tier-label">Судьба:</span> ${r.fate}</div>
    <div><span class="tier-label">Упорство:</span> ${r.resilience}</div>
    <div><span class="tier-label">Доп. пункты:</span> ${r.extra}</div>
    <div><span class="tier-label">Скорость:</span> ${r.move}</div>
  </div>`;
  html += '</div>';

  html += '<div class="panel"><div class="panel-title">Народные навыки</div>';
  html += '<p class="muted" style="margin-bottom:6px;">Выбери 3 навыка по 5 шагов и 3 навыка по 3 шага (это сделаешь на шаге 5).</p>';
  html += '<div>' + r.race_skills.map(s => `<span class="tag">${s}</span>`).join(' ') + '</div>';
  html += '</div>';

  html += '<div class="panel"><div class="panel-title">Народные таланты</div>';
  html += '<p class="muted" style="margin-bottom:6px;">Получаешь все указанные. Где есть «или» — выберешь один (на шаге 5). «{случайный талант}» — бросок 1d100 по таблице.</p>';
  html += '<div>' + r.race_talents.map(t => `<span class="tag">${t}</span>`).join(' ') + '</div>';
  html += '</div>';
  el.innerHTML = html;
}

function rollRandomRace(){
  if(state.raceAccepted){
    notify('Ты уже согласился с броском. +20 XP получено, перебрасывать нельзя.');
    return;
  }
  if(state.raceRolled){
    notify('Случайный бросок народа уже сделан — выбери «Согласиться» (+20 XP) или укажи народ вручную (0 XP). Перебрасывать нельзя.');
    return;
  }
  const r = rollD100();
  let chosen = null;
  for(const item of DATA.random_races){
    if(inRange(r, item.roll)){ chosen = item.race; break; }
  }
  const name = DATA.races[chosen].name;
  state.raceRolled = true;
  // Предлагаем согласиться (+20 XP)
  state.pendingRandom = { type: 'race', value: chosen, roll: r };
  const el = document.getElementById('race-roll-result');
  el.innerHTML = `Выпало <b>${r}</b> — <b>${name}</b>. <button class="btn btn-sm btn-gold" onclick="acceptRandom()">✓ Согласиться (+20 XP)</button> <button class="btn btn-sm" onclick="declineRandom()">✗ Выбрать вручную</button>`;
  selectRace(chosen, true);
  if(typeof updateLockedButtons === 'function') updateLockedButtons();
}

function acceptRandom(){
  const pr = state.pendingRandom;
  if(!pr) return;
  let nextStep = state.step;
  if(pr.type === 'race'){
    if(!state.raceXpAwarded){ state.xpGained = (state.xpGained || 0) + 20; state.raceXpAwarded = true; state.raceXpAmount = 20; }
    state.raceAccepted = true;
    notify('+ 20 XP за согласие с народом. Переход к карьере.');
    nextStep = 2;
  } else if(pr.type === 'career'){
    if(!state.careerXpAwarded){ state.xpGained = (state.xpGained || 0) + 50; state.careerXpAwarded = true; state.careerXpAmount = 50; }
    state.careerAccepted = true;
    notify('+ 50 XP за согласие с карьерой. Переход к характеристикам.');
    nextStep = 3;
  } else if(pr.type === 'stats'){
    if(!state.statsXpAwarded){ state.xpGained = (state.xpGained || 0) + 50; state.statsXpAwarded = true; state.statsXpAmount = 50; }
    state.statsAccepted = true;
    notify('+ 50 XP за согласие с характеристиками. Переход к судьбе.');
    nextStep = 4;
  } else if(pr.type === 'career-3'){
    if(!state.careerXpAwarded){ state.xpGained = (state.xpGained || 0) + 25; state.careerXpAwarded = true; state.careerXpAmount = 25; }
    state.careerAccepted = true;
    notify('+ 25 XP за выбор из 3 бросков. Переход к характеристикам.');
    nextStep = 3;
  }
  state.pendingRandom = null;
  if(nextStep !== state.step) goStep(nextStep);
  else goStep(state.step);
}
function declineRandom(){
  const pr = state.pendingRandom;
  if(pr && pr.type === 'stats'){
    // Перераспределение даёт +25 XP
    if(!state.statsXpAwarded){ state.xpGained = (state.xpGained || 0) + 25; state.statsXpAwarded = true; state.statsXpAmount = 25; }
    state.statsAccepted = true;
    notify('+ 25 XP за перераспределение. Теперь можешь поменять значения местами.');
  } else if(pr && pr.type === 'race'){
    const el = document.getElementById('race-roll-result'); if(el) el.innerHTML = '';
    notify('Народ выбирается вручную (0 XP).');
  } else if(pr && (pr.type === 'career' || pr.type === 'career-3')){
    const el = document.getElementById('career-roll-result'); if(el) el.innerHTML = '';
    notify('Карьера выбирается вручную (0 XP).');
  }
  state.pendingRandom = null;
  goStep(state.step);
}

// ===================== STEP 2 : CLASS/CAREER =====================
function renderClassCards(){
  const el = document.getElementById('class-cards');
  const names = Object.keys(DATA.classes);
  el.innerHTML = names.map(name => {
    const c = DATA.classes[name];
    const sel = (state.cls === name) ? 'selected' : '';
    return `<div class="card class-card ${sel}" onclick="selectClass('${name}')">
      <span class="card-corner tl">${ICONS.corner}</span>
      <span class="card-corner tr">${ICONS.corner}</span>
      <span class="card-corner bl">${ICONS.corner}</span>
      <span class="card-corner br">${ICONS.corner}</span>
      <div class="card-emblem">${CLASS_EMBLEMS[name] || CLASS_EMBLEMS.default}</div>
      <div class="card-name">${name}</div>
      <div class="card-desc">${c.desc}</div>
    </div>`;
  }).join('');
  renderClassDetail();
}

function selectClass(name){
  if(state.cls !== name){
    state.cls = name;
    state.career = null;
  }
  renderClassCards();
}

// Поиск/фильтр по всем 64 карьерам (по названию, в любом классе)
function careerSearch(){
  const inp = document.getElementById('career-search');
  const box = document.getElementById('career-search-results');
  if(!inp || !box) return;
  const q = (inp.value||'').trim().toLowerCase();
  const onlyMyRace = !!(document.getElementById('career-search-myrace') && document.getElementById('career-search-myrace').checked);
  if(!q && !onlyMyRace){ box.innerHTML = ''; return; }
  // Собираем все карьеры из всех классов
  const hits = [];
  Object.keys(DATA.classes).forEach(cls => {
    DATA.classes[cls].careers.forEach(cn => {
      const matchText = !q || cn.toLowerCase().includes(q);
      const matchRace = !onlyMyRace || raceMatch(cn);
      if(matchText && matchRace) hits.push({ cls, cn });
    });
  });
  if(!hits.length){
    box.innerHTML = `<div class="panel" style="margin-top:10px;"><p class="muted">Ничего не найдено${onlyMyRace?' для твоего народа':''}.</p></div>`;
    return;
  }
  let html = `<div class="panel" style="margin-top:10px;"><div class="panel-title">Найдено: ${hits.length}</div><div class="cards">`;
  hits.forEach(({cls, cn}) => {
    const matches = raceMatch(cn);
    const dim = matches ? '' : 'opacity:0.4;';
    const peoples = DATA.careers[cn]?.peoples || '';
    const sel = (state.career === cn) ? 'selected' : '';
    html += `<div class="card ${sel}" style="${dim}" data-call="career-pick" data-cls="${escAttr(cls)}" data-v="${escAttr(cn)}">
      <div class="card-name">${escHtml(cn)}</div>
      <div class="card-sub">${escHtml(cls)} · ${escHtml(peoples)}</div>
    </div>`;
  });
  html += '</div></div>';
  box.innerHTML = html;
}
function pickCareerFromSearch(cls, cn){
  state.cls = cls;
  selectCareer(cn);
  // прокручиваем к деталям выбранной карьеры
  const det = document.getElementById('class-detail');
  if(det) det.scrollIntoView({behavior:'smooth', block:'start'});
}

function raceMatch(careerName){
  if(!state.race) return true;
  const peoples = (DATA.careers[careerName]?.peoples || '').toLowerCase();
  const map = {human:'человек', dwarf:'гном', halfling:'полурослик', helf:'высший эльф', welf:'лесной эльф'};
  return peoples.includes(map[state.race]);
}

function renderClassDetail(){
  const el = document.getElementById('class-detail');
  if(!state.cls){ el.innerHTML = ''; return; }
  const c = DATA.classes[state.cls];
  let html = '<div class="panel" style="margin-top:14px;">';
  html += `<div class="panel-title">${state.cls} — карьеры</div>`;
  html += `<p class="muted" style="margin-bottom:8px;">Имущество за класс: ${c.trappings}.</p>`;
  html += '<div class="cards">';
  for(const cn of c.careers){
    const matches = raceMatch(cn);
    const sel = (state.career === cn) ? 'selected' : '';
    const dim = matches ? '' : 'opacity:0.4;';
    const peoples = DATA.careers[cn]?.peoples || '';
    html += `<div class="card ${sel}" style="${dim}" onclick="selectCareer('${cn}')">
      <div class="card-name">${cn}</div>
      <div class="card-sub">${peoples}</div>
    </div>`;
  }
  html += '</div>';
  html += '</div>';

  if(state.career){
    html += renderCareerDetail(state.career);
  }
  el.innerHTML = html;
}

function selectCareer(name){
  if(!raceMatch(name)){
    notify('Карьера недоступна твоему народу — но ведущий может разрешить (см. книга стр. 32).');
  }
  // selectCareer вызывается только при РУЧНОМ выборе карьеры (клик по карточке).
  // Гасим «висящий» оффер согласия со случайным броском, если он есть (ручной выбор = 0 XP).
  // Сам бросок остаётся заблокированным (careerRolled не сбрасываем) — перебрасывать нельзя.
  if(state.pendingRandom && (state.pendingRandom.type === 'career' || state.pendingRandom.type === 'career-3')){
    state.pendingRandom = null;
    const el = document.getElementById('career-roll-result'); if(el) el.innerHTML = '';
  }
  // Если карьера была получена случайным броском (и за неё начислен XP), а теперь
  // игрок ВРУЧНУЮ выбирает ДРУГУЮ карьеру — это свободный выбор (0 XP по правилам):
  // снимаем блокировку «принято» и возвращаем ранее начисленный бонус XP.
  if(state.careerAccepted && name !== state.career){
    const refund = state.careerXpAmount || 0;
    if(refund) state.xpGained = Math.max(0, (state.xpGained||0) - refund);
    state.careerAccepted = false;
    state.careerXpAwarded = false;
    state.careerXpAmount = 0;
    if(refund) notify(`Карьера выбрана вручную — бонус ${refund} XP за случайный бросок снят (свободный выбор = 0 XP).`);
    if(typeof updateLockedButtons === 'function') updateLockedButtons();
  }
  state.career = name;
  // сбросим шаги развития характеристик и навыков карьеры
  state.careerStatAdv = {};
  state.careerSkills = {};
  state.careerTalentLvl = null;
  renderClassDetail();
  if(typeof updateLockedButtons === 'function') updateLockedButtons();
}

function renderCareerDetail(name){
  const c = DATA.careers[name];
  if(!c) return '';
  let html = '<div class="panel">';
  html += `<div class="panel-title">${c.name} (${c.class}) — карьерная лестница</div>`;
  html += `<p class="muted" style="margin-bottom:8px;"><b>Народы:</b> ${escHtml(c.peoples)}</p>`;
  c.tiers.forEach((t, idx) => {
    const title = `<span style="color:var(--gold2);">${idx+1}. ${escHtml(t.name)}</span>`;
    const body = `
      <div style="margin-bottom:4px;"><b>Навыки:</b> ${escHtml(t.skills || '—')}</div>
      <div style="margin-bottom:4px;"><b>Таланты:</b> ${escHtml(t.talents || '—')}</div>
      <div><b>Имущество:</b> ${escHtml(t.trappings || '—')}</div>
    `;
    // Первая ступень открыта по умолчанию
    html += accordion(title, `Статус: ${t.status}`, body, idx === 0);
  });
  html += '</div>';
  return html;
}

function rollRandomCareer(){
  if(state.careerAccepted){
    notify('Ты уже согласился с карьерой. XP получено, перебрасывать нельзя.');
    return;
  }
  if(!state.race){ notify('Сначала выбери народ.'); return; }
  if(state.careerRolled){
    notify('Случайный бросок карьеры уже сделан — согласись или выбери карьеру вручную (0 XP). Перебрасывать нельзя.');
    return;
  }
  const r = rollD100();
  const raceKey = state.race;
  let found = null;
  for(const item of DATA.random_careers){
    const rng = item[raceKey];
    if(inRange(r, rng)){ found = item; break; }
  }
  const el = document.getElementById('career-roll-result');
  if(!found){
    el.textContent = `Выпало ${r} — для твоего народа нет карьеры в этом диапазоне. Перебрось.`;
    return;
  }
  state.careerRolled = true;
  state.pendingRandom = { type: 'career', value: found.career, cls: found.class, roll: r };
  el.innerHTML = `Выпало <b>${r}</b> — <b>${found.class}</b> / <b>${found.career}</b>. <button class="btn btn-sm btn-gold" onclick="acceptRandom()">✓ Согласиться (+50 XP)</button> <button class="btn btn-sm" onclick="declineRandom()">✗ Вручную</button>`;
  state.cls = found.class;
  state.career = found.career;
  state.careerStatAdv = {}; state.careerSkills = {}; state.careerTalentLvl = null;
  renderClassCards();
  if(typeof updateLockedButtons === 'function') updateLockedButtons();
}

// Бросить 3 раза, выбрать одну — даёт +25 XP за согласие (книга, стр.27)
function rollRandomCareer3(){
  if(state.careerAccepted){
    notify('Ты уже согласился с карьерой. XP получено, перебрасывать нельзя.');
    return;
  }
  if(!state.race){ notify('Сначала выбери народ.'); return; }
  if(state.careerRolled){
    notify('Случайный бросок карьеры уже сделан — выбери из выпавших вариантов, согласись или возьми карьеру вручную (0 XP). Перебрасывать нельзя.');
    return;
  }
  const options = [];
  const raceKey = state.race;
  let attempts = 0;
  while(options.length < 3 && attempts < 30){
    attempts++;
    const r = rollD100();
    let found = null;
    for(const item of DATA.random_careers){
      const rng = item[raceKey];
      if(inRange(r, rng)){ found = item; break; }
    }
    if(found && !options.find(o => o.career === found.career)){
      options.push({ ...found, roll: r });
    }
  }
  const el = document.getElementById('career-roll-result');
  if(options.length === 0){
    el.textContent = 'Не удалось набрать варианты — попробуй снова.';
    return;
  }
  state.careerRolled = true;
  let html = `<div style="margin-top:8px;">Брошено 3 раза, выбери одну (+25 XP):<br>`;
  options.forEach((o, i) => {
    html += `<button class="btn btn-sm btn-gold" style="margin:3px;" onclick="pickFromThree(${i})">${o.roll}: ${o.class}/${o.career}</button>`;
  });
  html += `<button class="btn btn-sm" style="margin:3px;" onclick="declineRandom()">✗ Никакая — выбрать вручную</button></div>`;
  el.innerHTML = html;
  state._careerThreeOptions = options;
  if(typeof updateLockedButtons === 'function') updateLockedButtons();
}
function pickFromThree(idx){
  const opts = state._careerThreeOptions;
  if(!opts || !opts[idx]) return;
  const found = opts[idx];
  state.cls = found.class;
  state.career = found.career;
  state.careerStatAdv = {}; state.careerSkills = {}; state.careerTalentLvl = null;
  state.pendingRandom = { type: 'career-3', value: found.career, cls: found.class };
  acceptRandom();
}

// ===================== STEP 3 : STATS =====================
function renderStatsArea(){
  const el = document.getElementById('stats-area');
  if(!state.race){ el.innerHTML = '<p class="muted">Сначала выбери народ.</p>'; return; }
  const r = DATA.races[state.race];
  const locked = state.statsAccepted;
  if(state.allocMode && !locked){ renderAllocMode(el, r); return; }
  let html = '';
  if(locked){
    html += `<p class="status-line good" style="margin-bottom:8px;"><span class="ic">${ICONS.lock}</span> Характеристики приняты — перебрасывать нельзя. Можешь править значения вручную.</p>`;
  }
  html += '<div class="stat-grid">';
  STAT_NAMES.forEach(s => {
    const mod = r.stats_mod[s];
    const rolled = state.rolls[s];
    const val = state.stats[s];
    const cls = (val != null) ? 'rolled' : '';
    html += `<div class="stat-box ${cls}">
      <span class="stat-abbr">${s}</span>
      <span class="stat-full">${STAT_FULL[s]}</span>
      <input class="stat-edit" type="number" min="1" max="99" value="${val ?? ''}"
             onchange="setStat('${s}', this.value)" />
      <span class="stat-base">${rolled ? `${rolled} + ${mod} (2d10+${mod})` : `2d10 + ${mod}`}</span>
      <button class="btn btn-sm" onclick="rollStat('${s}')" ${(locked || rolled != null)?'disabled':''} title="${rolled != null ? 'Уже брошено — перебрасывать нельзя' : 'Бросить 2d10'}"><span class="ic">${ICONS.dice}</span></button>
    </div>`;
  });
  html += '</div>';

  // Сводка
  const rolledCount = STAT_NAMES.filter(s => state.stats[s] != null).length;
  let summary = rolledCount + ' / ' + STAT_NAMES.length + ' заполнено';
  const ss = byId('stats-summary');
  if(state.pendingRandom && state.pendingRandom.type === 'stats' && rolledCount === 10){
    summary += ` · <button class="btn btn-sm btn-gold" onclick="acceptRandom()">✓ Согласиться (+50 XP)</button> <button class="btn btn-sm" onclick="declineRandom()">✗ Перераспределить (+25 XP)</button>`;
    if(ss) ss.innerHTML = summary;
  } else {
    if(ss) ss.textContent = summary;
  }

  if(!locked){
    html += `<p class="muted" style="margin-top:10px;font-size:11px;">Вариант из книги (шаг 3): вместо бросков —
      <button class="btn btn-sm" onclick="startAlloc()">⚖ распределить 100 очков</button>
      <span class="muted">(мин 4, макс 18 на характеристику, без бонусных XP)</span></p>`;
  }
  el.innerHTML = html;
  renderCareerStatAdv();
}

function startAlloc(){
  state.allocMode = true;
  if(!state.statAlloc){
    state.statAlloc = {};
    STAT_NAMES.forEach(s => state.statAlloc[s] = 10); // старт: поровну
  }
  renderStatsArea();
}
function cancelAlloc(){ state.allocMode = false; renderStatsArea(); }
function setAlloc(s, v){
  const n = Math.max(4, Math.min(18, parseInt(v)||4));
  state.statAlloc[s] = n;
  renderStatsArea();
}
function renderAllocMode(el, r){
  const sum = STAT_NAMES.reduce((a,s)=>a+(state.statAlloc[s]||0),0);
  const ok = sum === 100;
  let html = `<p class="muted">Распредели ровно <b>100 очков</b> по десяти характеристикам (мин <b>4</b>, макс <b>18</b>). Итог = очки + модификатор народа. Бонусных XP этот путь не даёт.</p>
  <div class="stat-grid">`;
  STAT_NAMES.forEach(s => {
    const mod = r.stats_mod[s];
    const pts = state.statAlloc[s]||10;
    html += `<div class="stat-box rolled">
      <span class="stat-abbr">${s}</span>
      <span class="stat-full">${STAT_FULL[s]}</span>
      <div class="sv4-row" style="gap:6px;justify-content:center;align-items:center;">
        <button class="btn btn-sm" onclick="setAlloc('${s}',${pts-1})">−</button>
        <input class="stat-edit" style="width:52px;" type="number" min="4" max="18" value="${pts}" onchange="setAlloc('${s}',this.value)" />
        <button class="btn btn-sm btn-gold" onclick="setAlloc('${s}',${pts+1})">+</button>
      </div>
      <span class="stat-base">${pts} + ${mod} = <b>${pts+mod}</b></span>
    </div>`;
  });
  html += `</div>
  <p style="margin-top:10px;font-size:13px;${ok?'color:var(--green2,#7fbf7f)':''}">Распределено: <b>${sum} / 100</b>${sum>100?' — слишком много!':(sum<100?` — осталось ${100-sum}`:' ✓')}</p>
  <div class="sv4-row" style="gap:8px;margin-top:8px;">
    <button class="btn btn-gold" ${ok?'':'disabled'} onclick="applyAlloc()">✓ Принять распределение</button>
    <button class="btn" onclick="cancelAlloc()">← Назад к броскам</button>
  </div>`;
  el.innerHTML = html;
}
function applyAlloc(){
  const r = DATA.races[state.race];
  const sum = STAT_NAMES.reduce((a,s)=>a+(state.statAlloc[s]||0),0);
  if(sum !== 100){ notify('Нужно распределить ровно 100 очков.'); return; }
  STAT_NAMES.forEach(s => {
    state.stats[s] = (state.statAlloc[s]||0) + r.stats_mod[s];
    state.rolls[s] = null;
  });
  state.statsAccepted = true;
  state.allocMode = false;
  state.pendingRandom = null;
  notify('Характеристики распределены (без бонусных XP).');
  renderStatsArea();
  if(typeof autosave==='function') autosave();
}

function rollStat(s){
  if(!state.race) return;
  if(state.statsAccepted){
    notify('Ты уже согласился с характеристиками. Перебрасывать нельзя — но можно править руками.');
    return;
  }
  if(state.rolls[s] != null){
    notify('Эта характеристика уже брошена. Перебрасывать нельзя (правь руками, если нужно). Чтобы начать заново — «Сбросить → ручной ввод».');
    return;
  }
  const mod = DATA.races[state.race].stats_mod[s];
  const r = roll(2, 10);
  state.rolls[s] = r;
  state.stats[s] = r + mod;
  state.statsRolled = true; // зафиксировали факт броска — «Бросить все» больше недоступно
  renderStatsArea();
  if(typeof updateLockedButtons === 'function') updateLockedButtons();
}

function rollAllStats(){
  if(!state.race) return;
  if(state.statsAccepted){
    notify('Ты уже согласился с характеристиками. Перебрасывать нельзя.');
    return;
  }
  if(state.statsRolled){
    notify('Характеристики уже брошены — согласись (+50 XP), перераспредели (+25 XP) или «Сбросить → ручной ввод» (0 XP). Перебрасывать нельзя.');
    return;
  }
  STAT_NAMES.forEach(s => {
    const mod = DATA.races[state.race].stats_mod[s];
    const r = roll(2, 10);
    state.rolls[s] = r;
    state.stats[s] = r + mod;
  });
  state.statsRolled = true;
  state.pendingRandom = { type: 'stats' };
  renderStatsArea();
  notify('Все характеристики брошены. Согласись (+50 XP) или перераспредели (+25 XP).');
  if(typeof updateLockedButtons === 'function') updateLockedButtons();
}

function resetStats(){
  // «Сбросить → ручной ввод»: очищаем значения для ручного назначения (0 XP).
  // Возвращаем уже начисленный за бросок опыт (+50/+25), если он был.
  // ВАЖНО: повторный бросок не разблокируем (statsRolled остаётся true) —
  // нельзя «перебрасывать до удачного». Хочешь именно бросать заново — начни персонажа сначала.
  const refund = state.statsXpAmount || 0;
  if(refund) state.xpGained = Math.max(0, (state.xpGained || 0) - refund);
  state.statsXpAwarded = false;
  state.statsXpAmount = 0;
  state.statsAccepted = false;
  state.pendingRandom = (state.pendingRandom && state.pendingRandom.type === 'stats') ? null : state.pendingRandom;
  state.rolls = {}; state.stats = {};
  renderStatsArea();
  if(typeof updateLockedButtons === 'function') updateLockedButtons();
  if(refund) notify(`Характеристики сброшены к ручному вводу. Бонус ${refund} XP за бросок снят (ручное назначение = 0 XP).`);
}

function setStat(s, v){
  const n = parseInt(v, 10);
  if(!isNaN(n) && n >= 1 && n <= 99) state.stats[s] = n;
  else delete state.stats[s];
}

function renderCareerStatAdv(){
  const el = document.getElementById('career-stat-advances');
  if(!el) return;
  if(!state.career){ el.innerHTML = '<p class="muted">Сначала выбери карьеру (шаг 2).</p>'; return; }
  const sc = careerScheme();
  if(!sc){ el.innerHTML = '<p class="muted">Схема карьеры не найдена.</p>'; return; }
  const sum = Object.values(state.careerStatAdv||{}).reduce((a,b)=>a+b,0);
  const left = 5 - sum;
  let html = `
    <p class="muted">По правилам (шаг 4 создания): распредели <b>5 шагов развития</b> между тремя характеристиками карьеры, отмеченными «+». Каждый шаг = +1 к характеристике.</p>
    <div class="sv4-row" style="gap:10px;flex-wrap:wrap;margin:10px 0;">`;
  sc.plus.forEach(st => {
    const v = state.careerStatAdv[st]||0;
    html += `<div class="cstat-adv-card${v>0?' has':''}">
      <div class="cstat-adv-name">${st}</div>
      <div class="cstat-adv-row">
        <button class="btn btn-sm" onclick="chgCareerStatAdv('${st}',-1)">−</button>
        <span class="cstat-adv-val">${v}</span>
        <button class="btn btn-sm btn-gold" onclick="chgCareerStatAdv('${st}',1)">+</button>
      </div>
      <div class="cstat-adv-sub muted">${(state.stats[st]||'?')} → <b>${(state.stats[st]||0)+v}</b></div>
    </div>`;
  });
  html += `</div>
    <div id="career-stat-sum" class="${sum===5?'ok':''}" style="font-size:13px;">Распределено: <b>${sum} / 5</b>${sum>5?' — слишком много!':(left>0?` — осталось ${left}`:' ✓')}</div>
    <p class="muted" style="font-size:11px;margin-top:8px;">Схема «+» карьеры «${escHtml(state.career)}»: ${sc.plus.join(', ')}. Ступени открывают: 2-я — ${sc.t2}, 3-я — ${sc.t3}, 4-я — ${sc.t4}.
      <button class="btn btn-sm" style="margin-left:6px;" onclick="editScheme()">✎ поправить схему</button></p>`;
  el.innerHTML = html;
}
function chgCareerStatAdv(st, d){
  const cur = state.careerStatAdv[st]||0;
  const sum = Object.values(state.careerStatAdv||{}).reduce((a,b)=>a+b,0);
  if(d>0 && sum>=5){ notify('Все 5 шагов уже распределены.'); return; }
  const nv = Math.max(0, cur+d);
  if(nv===0) delete state.careerStatAdv[st]; else state.careerStatAdv[st]=nv;
  renderCareerStatAdv();
  if(typeof autosave==='function') autosave();
}
function editScheme(){
  const sc = careerScheme();
  ordoInput({
    title: 'Схема карьеры',
    text: 'Три характеристики «+» через запятую:\nББ, ДБ, С, В, И, Пр, Л, Инт, СВ, Х',
    value: sc.plus.join(', '),
    onOk: _editSchemeApply
  });
}
function _editSchemeApply(ans){
  if(!ans) return;
  const valid = ['ББ','ДБ','С','В','И','Пр','Л','Инт','СВ','Х'];
  const arr = ans.split(',').map(x=>x.trim()).filter(x=>valid.includes(x));
  if(arr.length!==3){ notify('Нужно ровно 3 характеристики из списка.'); return; }
  if(!state.schemeOverride) state.schemeOverride = {};
  state.schemeOverride[state.career] = { plus: arr };
  // сбросить распределение по недоступным
  Object.keys(state.careerStatAdv||{}).forEach(k=>{ if(!arr.includes(k)) delete state.careerStatAdv[k]; });
  renderCareerStatAdv();
  if(typeof autosave==='function') autosave();
}

// ===================== STEP 4 : FATE =====================
function renderFateArea(){
  const el = document.getElementById('fate-area');
  if(!state.race){ el.innerHTML = '<p class="muted">Сначала выбери народ.</p>'; return; }
  const r = DATA.races[state.race];
  // Расчёт ОЗ
  let hp = '?';
  const C = state.stats['С']; const V = state.stats['В']; const SV = state.stats['СВ'];
  if(C && V && SV){
    const RS = Math.floor(C/10), RV = Math.floor(V/10), RSV = Math.floor(SV/10);
    if(state.race === 'halfling') hp = (2*RV) + RSV;
    else hp = RS + (2*RV) + RSV;
  }
  let html = `<div class="panel">
    <div class="panel-title">Здоровье</div>
    <p>Формула: <b>${r.hp_formula}</b></p>
    <p style="font-size:18px;color:var(--gold2);font-family:Cinzel,serif;margin-top:4px;">ОЗ = ${hp}</p>
    <p class="muted" style="margin-top:4px;">РС = ${C?Math.floor(C/10):'?'}, РВ = ${V?Math.floor(V/10):'?'}, РСВ = ${SV?Math.floor(SV/10):'?'}</p>
  </div>`;
  // Судьба и упорство
  const totalAssigned = state.extraFate + state.extraRes;
  const remaining = r.extra - totalAssigned;
  const statusClass = (remaining === 0) ? 'good' : (remaining > 0 ? 'warn' : 'bad');
  const statusText = (remaining === 0)
    ? '✓ всё распределено'
    : (remaining > 0 ? `<span class="ic">${ICONS.warn}</span> нераспределено: ${remaining} (по правилам нужно распределить ВСЕ пункты)` : `<span class="ic">${ICONS.warn}</span> перебор: ${-remaining}`);
  html += `<div class="panel">
    <div class="panel-title">Судьба и упорство</div>
    <p class="muted" style="margin-bottom:8px;">Базовая судьба: <b>${r.fate}</b>. Базовое упорство: <b>${r.resilience}</b>. Доступно дополнительных пунктов: <b>${r.extra}</b>. Распредели их ВСЕ между судьбой и упорством — это обязательно по правилам.</p>
    <div class="row">
      <div class="col">
        <label>Судьба = ${r.fate} + <span style="color:var(--gold2)">${state.extraFate}</span> = <b>${r.fate + state.extraFate}</b></label>
        <input type="range" min="0" max="${r.extra}" value="${state.extraFate}" oninput="setExtraFate(this.value)" />
      </div>
      <div class="col">
        <label>Упорство = ${r.resilience} + <span style="color:var(--gold2)">${state.extraRes}</span> = <b>${r.resilience + state.extraRes}</b></label>
        <input type="range" min="0" max="${r.extra}" value="${state.extraRes}" oninput="setExtraRes(this.value)" />
      </div>
    </div>
    <p class="status-line ${statusClass}" style="margin-top:6px;">Распределено: ${totalAssigned} / ${r.extra}. ${statusText}</p>
    <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
      <button class="btn btn-sm" onclick="autoDistribute('fate')">Все в Судьбу</button>
      <button class="btn btn-sm" onclick="autoDistribute('res')">Все в Упорство</button>
      <button class="btn btn-sm" onclick="autoDistribute('half')">Поровну</button>
    </div>
    <p style="margin-top:8px;">Удача = Судьба = <b>${r.fate + state.extraFate}</b>. Решимость = Упорство = <b>${r.resilience + state.extraRes}</b>.</p>
  </div>`;
  el.innerHTML = html;
  if(typeof updateLockedButtons==='function') updateLockedButtons();
}

function setExtraFate(v){
  if(!state.race || !DATA.races[state.race]) return;
  const r = DATA.races[state.race];
  let n = parseInt(v, 10);
  if(isNaN(n) || n < 0) n = 0;
  if(n > r.extra) n = r.extra;
  state.extraFate = n;
  // подстроим upor чтобы сумма <= extra
  if(state.extraFate + state.extraRes > r.extra)
    state.extraRes = r.extra - state.extraFate;
  renderFateArea();
}
function setExtraRes(v){
  if(!state.race || !DATA.races[state.race]) return;
  const r = DATA.races[state.race];
  let n = parseInt(v, 10);
  if(isNaN(n) || n < 0) n = 0;
  if(n > r.extra) n = r.extra;
  state.extraRes = n;
  if(state.extraFate + state.extraRes > r.extra)
    state.extraFate = r.extra - state.extraRes;
  renderFateArea();
}
function autoDistribute(mode){
  if(!state.race || !DATA.races[state.race]) return;
  const r = DATA.races[state.race];
  if(mode === 'fate'){ state.extraFate = r.extra; state.extraRes = 0; }
  else if(mode === 'res'){ state.extraRes = r.extra; state.extraFate = 0; }
  else { // half
    state.extraFate = Math.floor(r.extra / 2);
    state.extraRes  = r.extra - state.extraFate;
  }
  renderFateArea();
}

// ===================== STEP 5 : SKILLS / TALENTS =====================
function renderSkillsArea(){
  const elR = document.getElementById('race-skills-area');
  const elC = document.getElementById('career-skills-area');
  if(!state.race){ elR.innerHTML = '<p class="muted">Выбери народ.</p>'; }
  else renderRaceSkills(elR);
  if(!state.career){ elC.innerHTML = '<p class="muted">Выбери карьеру.</p>'; }
  else renderCareerSkills(elC);
  if(typeof updateLockedButtons==='function') updateLockedButtons();
}

function renderRaceSkills(el){
  const r = DATA.races[state.race];
  // 3 навыка по 5 шагов и 3 навыка по 3 шага
  let html = `<p class="muted" style="margin-bottom:6px;">Выбери 3 навыка по 5 шагов:</p>`;
  html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">';
  r.race_skills.forEach(s => {
    const big = state.raceSkillsBig.includes(s);
    const sm  = state.raceSkillsSm.includes(s);
    let cls = 'btn btn-sm';
    if(big) cls += ' btn-gold';
    html += `<button class="${cls}" onclick="toggleRaceSkill('${s}', 'big')">${s}${big ? ' +5' : ''}</button>`;
  });
  html += '</div>';
  html += `<p class="muted" style="margin-bottom:6px;">И 3 навыка по 3 шага (можно совпадать с предыдущими? — нет, лучше другие):</p>`;
  html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">';
  r.race_skills.forEach(s => {
    const big = state.raceSkillsBig.includes(s);
    const sm  = state.raceSkillsSm.includes(s);
    let cls = 'btn btn-sm';
    if(sm) cls += ' btn-red';
    html += `<button class="${cls}" onclick="toggleRaceSkill('${s}', 'sm')" ${big?'disabled':''}>${s}${sm ? ' +3' : ''}</button>`;
  });
  html += '</div>';
  html += `<p class="muted">Большие: ${state.raceSkillsBig.length} / 3. Малые: ${state.raceSkillsSm.length} / 3.</p>`;

  // Народные таланты — выбор для "X или Y"
  html += `<div class="sec-title" style="margin-top:14px;">Народные таланты</div>`;
  r.race_talents.forEach((t, idx) => {
    if(t.includes(' или ')){
      const opts = t.split(' или ').map(s=>s.trim());
      const chosen = state.raceTalentChoices['rt_'+idx];
      html += '<div style="margin:4px 0;">';
      opts.forEach(o => {
        const cls = (chosen === o) ? 'btn btn-sm btn-gold' : 'btn btn-sm';
        html += `<button class="${cls}" data-call="talent-race" data-n="${idx}" data-v="${escAttr(o)}">${o}</button> `;
      });
      html += '<span class="muted">— выбери один</span></div>';
    } else if(t === '{случайный талант}'){
      const tn = state.randomTalents[idx];
      if(tn){
        html += `<div style="margin:4px 0;"><span class="tag">${tn.talent}</span> <span class="muted">(выпало ${tn.roll})</span> <button class="btn btn-sm" onclick="rerollRandomTalent(${idx})"><span class="ic">${ICONS.dice}</span> Перебросить</button></div>`;
      } else {
        html += `<div style="margin:4px 0;"><button class="btn btn-sm" onclick="rollRandomTalent(${idx})"><span class="ic">${ICONS.dice}</span> Бросить 1d100</button></div>`;
      }
    } else {
      const hint = findTalentHint(t);
      const isProphecy = t.includes('Роковое');
      html += `<span class="tag" title="${escAttr(hint||'')}">${t}</span>${isProphecy?' <span class="muted" style="font-size:12px;">— впишешь на шаге «Штрихи»</span>':''} `;
    }
  });
  el.innerHTML = html;
}

function toggleRaceSkill(s, kind){
  if(kind === 'big'){
    const idx = state.raceSkillsBig.indexOf(s);
    if(idx >= 0) state.raceSkillsBig.splice(idx, 1);
    else if(state.raceSkillsBig.length < 3 && !state.raceSkillsSm.includes(s))
      state.raceSkillsBig.push(s);
    else if(state.raceSkillsSm.includes(s)){
      // перенесём из малых в большие, если есть место
      state.raceSkillsSm.splice(state.raceSkillsSm.indexOf(s), 1);
      if(state.raceSkillsBig.length < 3) state.raceSkillsBig.push(s);
    }
  } else {
    const idx = state.raceSkillsSm.indexOf(s);
    if(idx >= 0) state.raceSkillsSm.splice(idx, 1);
    else if(state.raceSkillsSm.length < 3 && !state.raceSkillsBig.includes(s))
      state.raceSkillsSm.push(s);
  }
  renderSkillsArea();
}

function chooseRaceTalent(idx, opt){
  state.raceTalentChoices['rt_'+idx] = opt;
  renderSkillsArea();
}

function rollRandomTalent(idx){
  const r = rollD100();
  let chosen = null;
  for(const item of DATA.random_talents){
    if(inRange(r, item.roll)){ chosen = item.talent; break; }
  }
  state.randomTalents[idx] = { roll: r, talent: chosen };
  renderSkillsArea();
}
function rerollRandomTalent(idx){
  state.randomTalents[idx] = null;
  renderSkillsArea();
}

function renderCareerSkills(el){
  const c = DATA.careers[state.career];
  if(!c){ el.innerHTML = ''; return; }
  const t1 = c.tiers[0];
  const skills = (t1.skills || '').split(/,\s*/).map(s => s.trim()).filter(Boolean);
  const talents = (t1.talents || '').split(/,\s*/).map(s => s.trim()).filter(Boolean);

  let html = `<p class="muted" style="margin-bottom:8px;">1-я ступень — <b>${t1.name}</b> (${t1.status}). Распредели 40 шагов между 8 навыками (≤ 10 на навык).</p>`;
  // Кнопки быстрого заполнения
  html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
    <button class="btn btn-sm btn-gold" onclick="fillCareerSkillsEqually()"><span class="ic">${ICONS.bolt}</span> Всё по 5</button>
    <button class="btn btn-sm" onclick="clearCareerSkills()">Очистить</button>
  </div>`;
  let total = 0;
  html += '<div>';
  skills.forEach(s => {
    const cur = state.careerSkills[s] || 0;
    total += cur;
    html += `<div class="skill-row">
      <span class="skill-name">${s}</span>
      <button class="btn btn-sm" data-call="skill-career" data-n="-1" data-v="${escAttr(s)}">−</button>
      <span class="skill-adv">+${cur}</span>
      <button class="btn btn-sm" data-call="skill-career" data-n="1" data-v="${escAttr(s)}">+</button>
    </div>`;
  });
  const statusClass = (total === 40) ? 'good' : (total > 40 ? 'bad' : 'warn');
  const statusText = (total === 40) ? '✓ всё распределено' : (total > 40 ? '<span class="ic">${ICONS.warn}</span> слишком много' : `осталось распределить: ${40 - total}`);
  html += `<p class="status-line ${statusClass}" style="margin-top:6px;">Распределено: ${total} / 40. ${statusText}</p>`;
  html += '</div>';

  html += `<div class="sec-title" style="margin-top:10px;">Таланты карьеры — 1-я ступень (выбери 1 — +1 шаг развития)</div>`;
  html += '<p class="muted" style="margin-bottom:6px;font-size:12px;">Показаны только таланты 1-й ступени. На более высоких ступенях появятся другие.</p>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
  talents.forEach(t => {
    const sel = (state.careerTalentLvl === t) ? 'btn btn-sm btn-gold' : 'btn btn-sm';
    const hint = findTalentHint(t);
    const tit = hint ? `title="${escAttr(hint)}"` : '';
    html += `<button class="${sel}" ${tit} data-call="talent-career" data-v="${escAttr(t)}">${t}</button>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

function fillCareerSkillsEqually(){
  if(!state.career) return;
  const t1 = DATA.careers[state.career].tiers[0];
  const skills = (t1.skills || '').split(/,\s*/).map(s => s.trim()).filter(Boolean);
  state.careerSkills = {};
  skills.forEach(s => state.careerSkills[s] = 5);
  renderSkillsArea();
}
function clearCareerSkills(){
  state.careerSkills = {};
  renderSkillsArea();
}

function changeCareerSkill(s, delta){
  let cur = state.careerSkills[s] || 0;
  cur += delta;
  if(cur < 0) cur = 0;
  if(cur > 10) cur = 10;
  state.careerSkills[s] = cur;
  renderSkillsArea();
}
function selectCareerTalent(t){
  state.careerTalentLvl = (state.careerTalentLvl === t) ? null : t;
  renderSkillsArea();
}

// ===================== STEP 6 : TRAPPINGS =====================
function renderTrappings(){
  const el = document.getElementById('trappings-area');
  if(!state.cls || !state.career){ el.innerHTML = '<p class="muted">Выбери класс и карьеру.</p>'; return; }
  const cls = DATA.classes[state.cls];
  const car = DATA.careers[state.career];
  const t1 = car.tiers[0];
  const [sosl, posStr] = t1.status.split(' ');
  const pos = parseInt(posStr, 10) || 0;
  const wealth = DATA.starting_wealth[sosl] || '';
  let amount = '';
  if(sosl === 'медный')      amount = `${pos * 2}d10 медных пенни (${pos} × 2d10)`;
  if(sosl === 'серебряный')  amount = `${pos}d10 серебряных шиллингов (${pos} × 1d10)`;
  if(sosl === 'золотой')     amount = `${pos} золотых крон`;
  let html = `<div class="panel">
    <div class="panel-title">За класс «${state.cls}»</div>
    <p>${cls.trappings}</p>
  </div>`;
  html += `<div class="panel">
    <div class="panel-title">За карьеру — 1-я ступень «${t1.name}»</div>
    <p>${t1.trappings || '—'}</p>
  </div>`;
  // Текущее состояние кошелька в state.sheet.money
  const m = state.sheet.money;
  const moneyDone = !!state.sheet.moneyRolled;
  html += `<div class="panel">
    <div class="panel-title">Начальное богатство</div>
    <p>Статус 1-й ступени: <b>${t1.status}</b>.</p>
    <p>Формула: ${wealth}</p>
    <p style="font-size:16px;color:var(--gold2);margin-top:4px;">≈ ${amount}</p>
    <p class="muted" style="font-size:11px;margin-top:6px;"><span class="ic">${ICONS.warn}</span> По правилам книги кидается один раз. Если хочешь перебросить — сначала сбрось.</p>
    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
      <button class="btn btn-gold" onclick="rollStartingMoney()" ${moneyDone?'disabled':''}><span class="ic">${ICONS.dice}</span> Бросить монеты${moneyDone?' (уже брошено)':''}</button>
      <button class="btn btn-sm" onclick="resetMoney()">Сбросить и обнулить</button>
    </div>
    <p style="margin-top:8px;">Текущий кошелёк (можно изменить на шаге 8): <b>${m.gc}</b> золотых, <b>${m.ss}</b> серебряных, <b>${m.bp}</b> медных.</p>
  </div>`;
  el.innerHTML = html;
  if(typeof updateLockedButtons === 'function') updateLockedButtons();
}

function rollStartingMoney(){
  if(!state.career) return;
  if(state.sheet.moneyRolled){
    notify('Монеты уже были брошены. Используй «Сбросить», чтобы перебросить.');
    return;
  }
  const t1 = DATA.careers[state.career].tiers[0];
  const [sosl, posStr] = t1.status.split(' ');
  const pos = parseInt(posStr, 10) || 0;
  if(pos === 0){
    state.sheet.moneyRolled = true;
    notify('Статус «' + t1.status + '» — стартового капитала нет (нищета). Монеты можно вписать вручную.');
    renderTrappings();
    return;
  }
  let total = 0;
  if(sosl === 'медный'){
    // pos × 2d10 медных пенни
    for(let i=0;i<pos;i++) total += roll(2, 10);
    state.sheet.money.bp = (state.sheet.money.bp || 0) + total;
    notify(`Брошено ${pos}×2d10 = ${total} медных пенни`);
  } else if(sosl === 'серебряный'){
    for(let i=0;i<pos;i++) total += roll(1, 10);
    state.sheet.money.ss = (state.sheet.money.ss || 0) + total;
    notify(`Брошено ${pos}×1d10 = ${total} серебряных шиллингов`);
  } else if(sosl === 'золотой'){
    state.sheet.money.gc = (state.sheet.money.gc || 0) + pos;
    notify(`+ ${pos} золотых крон`);
  }
  state.sheet.moneyRolled = true;
  renderTrappings();
}

function resetMoney(){
  state.sheet.money = { gc: 0, ss: 0, bp: 0 };
  state.sheet.moneyRolled = false;
  renderTrappings();
}

// ===================== STEP 7 : FINISHING =====================
function renderFinishing(){
  const el = document.getElementById('finishing-area');
  if(!state.race){ el.innerHTML = '<p class="muted">Выбери народ.</p>'; return; }
  const ageF = DATA.age_formulas[state.race];
  const heightF = DATA.height_formulas[state.race];
  let html = `<div class="panel">
    <div class="panel-title">Имя и облик</div>
    <div class="row">
      <div class="col">
        <label>Имя персонажа</label>
        <input type="text" value="${escAttr(state.name||'')}" oninput="state.name=this.value;autosave()" />
      </div>
      <div class="col">
        <label>Возраст (${ageF})</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="text" value="${escAttr(state.age||'')}" oninput="state.age=this.value;autosave()" />
          <button class="btn btn-sm" onclick="rollAge()"><span class="ic">${ICONS.dice}</span></button>
        </div>
      </div>
      <div class="col">
        <label>Рост (${heightF})</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="text" value="${escAttr(state.height||'')}" oninput="state.height=this.value;autosave()" />
          <button class="btn btn-sm" onclick="rollHeight()"><span class="ic">${ICONS.dice}</span></button>
        </div>
      </div>
    </div>
    <div class="row" style="margin-top:8px;">
      <div class="col">
        <label>Цвет волос</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="text" value="${escAttr(state.hair||'')}" oninput="state.hair=this.value;autosave()" />
          <button class="btn btn-sm" onclick="rollHair()"><span class="ic">${ICONS.dice}</span></button>
        </div>
      </div>
      <div class="col">
        <label>Цвет глаз</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="text" value="${escAttr(state.eyes||'')}" oninput="state.eyes=this.value;autosave()" />
          <button class="btn btn-sm" onclick="rollEyes()"><span class="ic">${ICONS.dice}</span></button>
        </div>
      </div>
    </div>
    <div style="margin-top:10px;">
      <button class="btn btn-gold" onclick="rollAllAppearance()"><span class="ic">${ICONS.dice}</span> Зарандомить всё (возраст · рост · волосы · глаза)</button>
    </div>
  </div>`;
  // Роковое пророчество (если есть в талантах народа)
  const hasProphecy = state.race && (DATA.races[state.race].race_talents || []).some(t => t.includes('Роковое'));
  if(hasProphecy){
    html += `<div class="panel">
      <div class="panel-title">Роковое Пророчество</div>
      <p class="muted" style="margin-bottom:6px;">У людей есть талант «Роковое Пророчество» — мрачное предсказание о судьбе персонажа. По правилам книги, игрок придумывает его вместе с ведущим. Запиши его сюда.</p>
      <textarea rows="3" placeholder="например: «Падёт от руки того, кто носит знак волка» или «Умрёт, прежде чем зацветёт второй гороховый куст…»"
        oninput="state.sheet.doomedProphecy=this.value;autosave()">${escHtml(state.sheet.doomedProphecy || '')}</textarea>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="btn btn-sm" onclick="rollProphecyTemplate()"><span class="ic">${ICONS.dice}</span> Случайный шаблон пророчества</button>
      </div>
    </div>`;
  }
  html += `<div class="panel">
    <div class="panel-title">Мотивация и амбиции</div>
    <label>Мотивация (слово/фраза, которая описывает суть героя)</label>
    <input type="text" value="${escAttr(state.motivation||'')}" oninput="state.motivation=this.value;autosave()" placeholder="например: милосердие, перфекционизм, балагурство…" />
    <div style="margin-top:8px;">
      <label>Краткосрочная амбиция</label>
      <input type="text" value="${escAttr(state.ambitionShort||'')}" oninput="state.ambitionShort=this.value;autosave()" />
    </div>
    <div style="margin-top:8px;">
      <label>Долгосрочная амбиция</label>
      <input type="text" value="${escAttr(state.ambitionLong||'')}" oninput="state.ambitionLong=this.value;autosave()" />
    </div>
  </div>`;
  el.innerHTML = html;
}

function rollAge(){
  const f = DATA.age_formulas[state.race];
  const m = f.match(/(\d+)\s*\+\s*(\d+)d10/);
  if(!m) return;
  const base = parseInt(m[1]); const n = parseInt(m[2]);
  state.age = String(base + roll(n, 10));
  renderFinishing();
}
function rollHeight(){
  const f = DATA.height_formulas[state.race];
  const m = f.match(/(\d+)'(\d+)''.*?(\d+)d10''/);
  if(!m) return;
  const ft = parseInt(m[1]); const inch = parseInt(m[2]); const n = parseInt(m[3]);
  const add = roll(n, 10);
  let totalInch = inch + add;
  let totalFt = ft + Math.floor(totalInch/12);
  totalInch = totalInch % 12;
  state.height = `${totalFt}'${totalInch}''`;
  renderFinishing();
}
function rollHair(){
  const ap = DATA.appearance[state.race];
  if(!ap) return;
  state.hair = ap.hair[Math.floor(Math.random() * ap.hair.length)];
  renderFinishing();
}
function rollEyes(){
  const ap = DATA.appearance[state.race];
  if(!ap) return;
  state.eyes = ap.eyes[Math.floor(Math.random() * ap.eyes.length)];
  renderFinishing();
}
function rollAllAppearance(){
  // rollAge сам перерисовывает; чтобы не делать 4 ререндера — делаем всё в одной функции
  const f = DATA.age_formulas[state.race];
  const m = f.match(/(\d+)\s*\+\s*(\d+)d10/);
  if(m) state.age = String(parseInt(m[1]) + roll(parseInt(m[2]), 10));
  const fh = DATA.height_formulas[state.race];
  const mh = fh.match(/(\d+)'(\d+)''.*?(\d+)d10''/);
  if(mh){
    const ft = parseInt(mh[1]); const inch = parseInt(mh[2]); const n = parseInt(mh[3]);
    const add = roll(n, 10);
    let totalInch = inch + add;
    let totalFt = ft + Math.floor(totalInch/12);
    totalInch = totalInch % 12;
    state.height = `${totalFt}'${totalInch}''`;
  }
  const ap = DATA.appearance[state.race];
  if(ap){
    state.hair = ap.hair[Math.floor(Math.random() * ap.hair.length)];
    state.eyes = ap.eyes[Math.floor(Math.random() * ap.eyes.length)];
  }
  renderFinishing();
  notify('Внешность сгенерирована');
}

// === ПОЛНОСТЬЮ СЛУЧАЙНЫЙ ПЕРСОНАЖ (один клик) ===
// Бросает народ → карьеру (с учётом доступности для народа) → характеристики
// → возраст/рост/внешность. Начисляет XP как при согласии со всеми бросками
// (народ +20, карьера +50, характеристики +50 = 120). Затем ведёт на «Штрихи».
function rollFullRandomCharacter(){
  ordoConfirm({
    title: 'Завести дело наугад?',
    text: 'Народ, карьера, характеристики и внешность будут брошены случайно.\nТекущий незавершённый черновик будет заменён.',
    yes: 'Бросить кости', no: 'Отмена',
    onYes: _rollFullRandomCharacterDo
  });
}
function _rollFullRandomCharacterDo(){
  // 1) чистый лист
  Object.assign(state, freshState());
  migrateState();
  showApp('creation');

  // 2) Народ
  const rRace = rollD100();
  let raceKey = 'human';
  for(const item of DATA.random_races){
    if(inRange(rRace, item.roll)){ raceKey = item.race; break; }
  }
  selectRace(raceKey, true);
  state.raceRolled = true;
  state.raceAccepted = true;
  state.raceXpAwarded = true; state.raceXpAmount = 20;

  // 3) Карьера — бросаем, пока не попадём в доступный для народа диапазон
  let career = null, attempts = 0;
  while(!career && attempts < 60){
    attempts++;
    const rC = rollD100();
    for(const item of DATA.random_careers){
      if(inRange(rC, item[raceKey])){ career = item; break; }
    }
  }
  // запасной план: первая карьера, у которой есть диапазон для народа
  if(!career){
    career = DATA.random_careers.find(it => it[raceKey]) || DATA.random_careers[0];
  }
  state.cls = career.class;
  state.career = career.career;
  state.careerStatAdv = {};
  // 5 стартовых шагов — случайно по трём «+»-характеристикам схемы (в духе случайной генерации)
  (function(){
    const sc = CAREER_SCHEMES[state.career];
    if(sc){ for(let k=0;k<5;k++){ const st = sc.plus[Math.floor(Math.random()*3)];
      state.careerStatAdv[st] = (state.careerStatAdv[st]||0)+1; } }
  })(); state.careerSkills = {}; state.careerTalentLvl = null;
  state.careerRolled = true;
  state.careerAccepted = true;
  state.careerXpAwarded = true; state.careerXpAmount = 50;

  // 3b) Стартовые монеты (иначе шаг 6 не завершён и переход на шаг 7 блокируется)
  try{ rollStartingMoney(); }catch(e){ if(state.sheet) state.sheet.moneyRolled = true; }

  // 4) Характеристики: 2d10 + расовый модификатор
  STAT_NAMES.forEach(s => {
    const mod = DATA.races[raceKey].stats_mod[s];
    const r = roll(2, 10);
    state.rolls[s] = r;
    state.stats[s] = r + mod;
  });
  state.statsRolled = true;
  state.statsAccepted = true;
  state.statsXpAwarded = true; state.statsXpAmount = 50;

  // 5) Возраст / рост / внешность
  const af = DATA.age_formulas[raceKey];
  const am = af && af.match(/(\d+)\s*\+\s*(\d+)d10/);
  if(am) state.age = String(parseInt(am[1]) + roll(parseInt(am[2]), 10));
  const hf = DATA.height_formulas[raceKey];
  const hm = hf && hf.match(/(\d+)'(\d+)''.*?(\d+)d10''/);
  if(hm){
    const ft = parseInt(hm[1]); const inch = parseInt(hm[2]); const n = parseInt(hm[3]);
    let totalInch = inch + roll(n, 10);
    let totalFt = ft + Math.floor(totalInch/12);
    totalInch = totalInch % 12;
    state.height = `${totalFt}'${totalInch}''`;
  }
  const ap = DATA.appearance[raceKey];
  if(ap){
    state.hair = ap.hair[Math.floor(Math.random()*ap.hair.length)];
    state.eyes = ap.eyes[Math.floor(Math.random()*ap.eyes.length)];
  }

  // 6) Расовые навыки: 3 по +5 и 3 по +3 (случайно из пула народа)
  const poolRS = (DATA.races[raceKey].race_skills || []).slice();
  for(let i=poolRS.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const tmp=poolRS[i]; poolRS[i]=poolRS[j]; poolRS[j]=tmp; }
  state.raceSkillsBig = poolRS.slice(0,3);
  state.raceSkillsSm  = poolRS.slice(3,6);

  // 7) Расовые таланты: выбор «X или Y» + бросок {случайный талант}
  state.raceTalentChoices = {}; state.randomTalents = [];
  (DATA.races[raceKey].race_talents || []).forEach((t, idx) => {
    if(t.includes(' или ')){
      const opts = t.split(' или ').map(x=>x.trim());
      state.raceTalentChoices['rt_'+idx] = opts[Math.floor(Math.random()*opts.length)];
    } else if(t === '{случайный талант}'){
      const rr = rollD100();
      let chosen = null;
      for(const item of DATA.random_talents){ if(inRange(rr, item.roll)){ chosen = item.talent; break; } }
      state.randomTalents[idx] = { roll: rr, talent: chosen };
    }
  });

  // 8) Судьба/Стойкость: случайно делим расовые extra-очки
  const _extra = DATA.races[raceKey].extra || 0;
  const _ef = Math.floor(Math.random()*(_extra+1));
  state.extraFate = _ef; state.extraRes = _extra - _ef;

  // 9) Карьерные навыки: 40 шагов по умениям 1-й ступени (<=10) + случайный талант
  const _t1 = DATA.careers[state.career].tiers[0];
  const _cs = (_t1.skills || '').split(/,\s*/).map(x=>x.trim()).filter(Boolean);
  state.careerSkills = {};
  _cs.forEach(x => state.careerSkills[x] = 0);
  if(_cs.length){
    let _left = 40, _g = 0;
    while(_left > 0 && _g++ < 500){
      const x = _cs[Math.floor(Math.random()*_cs.length)];
      if(state.careerSkills[x] < 10){ state.careerSkills[x]++; _left--; }
    }
  }
  const _ct = (_t1.talents || '').split(/,\s*/).map(x=>x.trim()).filter(Boolean);
  state.careerTalentLvl = _ct.length ? _ct[Math.floor(Math.random()*_ct.length)] : null;

  // 10) XP за согласие со всеми бросками
  state.xpGained = (state.xpGained||0) + 120;

  // 11) Готово — сохраняем и открываем бланк (остаётся вписать имя)
  finishAndSaveCharacter();
  const raceName = DATA.races[raceKey].name;
  notify(`Готовый случайный персонаж: ${raceName} · ${career.class} / ${career.career}. Осталось вписать имя на бланке.`);
}
function rollProphecyTemplate(){
  // Простой набор шаблонов в стиле WFRP — игрок дополнит сам
  const templates = [
    "Падёт от руки того, кто носит знак ____.",
    "Умрёт, прежде чем зацветёт ____.",
    "Никогда не увидит ____ снова.",
    "Найдёт смерть в ____, но не от ____.",
    "Совершит ____ великих дел и предаст троих.",
    "Кровь его прольётся на ____ землю.",
    "Встретит свой конец под ____ небом.",
    "Тот, кого он спасёт, станет его погибелью.",
    "Сгорит в огне, который сам разожжёт.",
    "Услышит свою смерть в ____ песне.",
    "Будет предан тем, кому больше всего доверяет.",
    "Падёт у врат ____ во ____-й день месяца.",
  ];
  state.sheet.doomedProphecy = templates[Math.floor(Math.random() * templates.length)];
  renderFinishing();
}
