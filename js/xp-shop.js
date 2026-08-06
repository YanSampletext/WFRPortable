// Магазин опыта: покупки, корзина, смена карьеры
//
// Вырезано из app.js без изменения семантики: файл по-прежнему обычный
// <script>, все функции остаются глобальными, и разметка находит их так же,
// как находила. Отдельный экран со своими ценами и правилами завершения ступеней.
//
// Подключается ПОСЛЕ app.js: тот держит state и расчёты, которыми здесь
// пользуются. Порядок задан в index.html и в списке ASSETS у sw.js.

// ===================== STEP 9 : XP SHOP =====================

// Стоимость шага развития характеристики/навыка по уже сделанным шагам.
// Берётся из DATA.adv_cost_table (см. источник).
// ВАЖНО (правила WFRP4): цена зависит от НОМЕРА покупаемого шага, а не от уже сделанных.
// Имея alreadyDone шагов, мы покупаем шаг №(alreadyDone+1) — его и ищем в таблице.
// Полосы таблицы: шаги 1–5 → 25/10, 6–10 → 30/15, 11–15 → 40/20 и т.д.
function advCostFor(alreadyDone){
  const tbl = DATA.adv_cost_table || [];
  const n = (alreadyDone || 0) + 1; // номер покупаемого шага (1-индексация)
  for(const row of tbl){
    // строки {min:0,max:5}, {min:6,max:10}… читаем как полосы шагов 1–5, 6–10…
    const lo = Math.max(1, row.min);
    if(n >= lo && n <= row.max) return { char: row.char, skill: row.skill };
  }
  // За пределами таблицы — экстраполируем: каждая следующая полоса из 5 шагов
  // дороже предыдущей на +50 (характеристика) / +40 (навык).
  const last = tbl[tbl.length-1] || { max: 70, char: 450, skill: 380 };
  const over = Math.ceil((n - last.max)/5); // 1 для шагов 71–75, 2 для 76–80 …
  return { char: last.char + over*50, skill: last.skill + over*40 };
}

// Сколько уже сделано шагов развития характеристики (куплено за опыт).
// При создании шаги не даются, поэтому считаем только купленное.
function statAdvancesTotal(s){
  return ((state.careerStatAdv && state.careerStatAdv[s]) || 0) + (state.sheet.statAdvBought[s] || 0);
}

// Сколько сделано шагов развития навыка
function skillAdvancesTotal(name){
  const lower = name.toLowerCase();
  let total = 0;
  if(state.raceSkillsBig.includes(name)) total += 5;
  if(state.raceSkillsSm.includes(name))  total += 3;
  if(state.careerSkills[name] != null) total += state.careerSkills[name];
  total += (state.sheet.skillAdv && state.sheet.skillAdv[lower]) || 0;
  total += (state.sheet.skillAdvBought && state.sheet.skillAdvBought[lower]) || 0;
  // Из extraSkills
  const es = (state.sheet.extraSkills||[]).find(x => x.name.toLowerCase() === lower);
  if(es) total += es.adv || 0;
  return total;
}


function cartTotal(){
  return (state.sheet._cart || []).reduce((sum, it) => sum + (it.cost||0), 0);
}
function xpAvailable(){
  return (state.xpGained || 0) - (state.sheet.spentXP || 0) - cartTotal();
}


function renderShop(){
  const el = document.getElementById('shop-area');
  if(!state.race || !state.career){
    el.innerHTML = '<p class="muted">Сначала закончи создание персонажа (шаги 1–7).</p>'; return;
  }
  const c = DATA.careers[state.career];
  const tierIdx = Math.max(0, Math.min(3, state.sheet.tier - 1));
  const tier = c.tiers[tierIdx];
  const avail = xpAvailable();
  const inRoster = !!(state.id && loadRoster().find(p => p.id === state.id));
  let html = '';

  // Шапка магазина — отдельная страница со своим корешком
  html += `<div class="ordo-bar shop">
    <button class="ordo-seal" onclick="goStep(8)" title="Назад на бланк">←</button>
    <div class="ordo-meta">
      <div class="ordo-no">Магазин обучения · трата опыта</div>
      <div class="ordo-name">${escHtml(state.name||'Без имени')}</div>
    </div>
    <div class="ordo-xp static"><b>${avail}</b><span>XP доступно</span></div>
  </div>`;

  // Промах по кнопке замечают сразу — держим один шаг назад под рукой
  if(typeof xpUndoButtonHtml === 'function'){
    const undo = xpUndoButtonHtml();
    if(undo) html += `<div class="xp-undo-row">${undo}</div>`;
  }

  // Тулбар (без дублей навигации)
  html += `<div class="sheet-toolbar" style="margin-bottom:10px;">
    ${inRoster
      ? `<button class="btn btn-sm btn-gold" onclick="saveCharacterToRoster()"><span class="ic">${ICONS.save}</span> Сохранить изменения</button>`
      : `<button class="btn btn-sm btn-gold" onclick="saveCharacterToRoster()"><span class="ic">${ICONS.save}</span> Сохранить как нового персонажа</button>`}
    <span class="muted" style="margin-left:8px;font-size:11px;">Персонаж: <b>${escHtml(state.name || '(без имени)')}</b></span>
  </div>`;

  // ===== Шапка =====
  const cart = state.sheet._cart || [];
  const ctotal = cartTotal();
  html += `<div class="panel">
    <div class="panel-title">Опыт</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
      <div>Доступно: <b style="color:${avail>=0?'var(--gold2)':'var(--blood2)'};font-size:24px;font-family:Cinzel,serif;">${avail}</b></div>
      ${ctotal>0?`<div style="color:var(--text3);font-size:12px;">в корзине: <b style="color:var(--blood2);">−${ctotal}</b> XP</div>`:''}
    </div>
    <p class="muted" style="margin-top:6px;font-size:11px;">Текущая ступень карьеры: <b>${state.sheet.tier}. ${tier.name}</b> (${tier.status}). Завершена: <b>${state.sheet.careerTier1Done?'да':'нет'}</b>.</p>
  </div>`;

  // ===== Корзина =====
  if(cart.length){
    html += `<div class="panel" style="border-color:var(--gold);box-shadow:0 0 14px rgba(218,165,32,0.15);">
      <div class="panel-title"><span class="ic">${ICONS.shop}</span> Корзина покупок <small style="font-weight:normal;font-size:11px;color:var(--text3);">— ничего не списано, пока не нажмёшь «Принять»</small></div>
      <div class="sv4-cart-list">`;
    cart.forEach((it, i) => {
      html += `<div class="sv4-cart-row">
        <span class="sv4-cart-label">${escHtml(it.label)}</span>
        <span class="sv4-cart-cost">−${it.cost} XP</span>
        <button class="sv4-cond-btn" onclick="cartRemove(${i})" title="Убрать">×</button>
      </div>`;
    });
    html += `</div>
      <div class="sv4-cart-foot">
        <div>Итого: <b style="color:var(--blood2);font-size:18px;font-family:Cinzel,serif;">−${ctotal}</b> XP</div>
        <button class="sv4-btn-mini" onclick="cartClear()">Отменить всё</button>
        <button class="sv4-btn-mini btn-gold" onclick="cartApply()" style="font-size:13px;padding:8px 16px;">✓ Принять</button>
      </div>
    </div>`;
  }

  // ===== Активные бонусы от талантов =====
  const activeBonuses = [];
  STAT_NAMES.forEach(s => {
    const b = talentStatBonus(s);
    if(b > 0) activeBonuses.push(`<b>${s}</b> +${b}`);
  });
  if(talentMoveBonus()>0) activeBonuses.push(`<b>Скорость</b> +${talentMoveBonus()}`);
  if(talentLevel('здоровяк')>0) activeBonuses.push(`<b>ОЗ</b> +${talentLevel('здоровяк')}×РВ (Здоровяк)`);
  if(talentLevel('бугай')>0) activeBonuses.push(`<b>Вес</b> +${talentLevel('бугай')*2} (Бугай)`);
  if(talentLevel('твёрдость духа')>0) activeBonuses.push(`<b>Решимость</b> +${talentLevel('твёрдость духа')}`);
  if(talentLevel('духовная чистота')>0) activeBonuses.push(`<b>Порог скверны</b> +${talentLevel('духовная чистота')}`);
  if(activeBonuses.length){
    html += `<div class="panel" style="background:linear-gradient(180deg,var(--panel3),var(--panel2));">
      <div class="panel-title"><span class="ic">${ICONS.bolt}</span> Активные бонусы от талантов</div>
      <p style="font-size:13px;">${activeBonuses.join(' · ')}</p>
    </div>`;
  }

  // ===== Карьерные навыки/таланты текущей ступени (для подсказки) =====
  const tierSkills = (tier.skills || '').split(/,(?![^()]*\))/).map(s=>s.trim()).filter(Boolean);
  const tierTalents = (tier.talents || '').split(/,(?![^()]*\))/).map(s=>s.trim()).filter(Boolean);

  // ===== Покупка характеристик =====
  html += `<div class="panel"><div class="panel-title">Характеристики (покупка шагов развития)</div>`;
  html += `<p class="muted" style="font-size:11px;">Цена шага зависит от уже сделанных шагов: 0–5: <b>25</b>, 6–10: <b>30</b>, 11–15: <b>40</b>, 16–20: <b>50</b>, 21–25: <b>70</b>, 26–30: <b>90</b>, 31–35: <b>120</b>, 36–40: <b>150</b>, и далее по таблице.</p>`;
  html += '<div class="shop-grid">';
  const availStats = careerStatsAvailable(state.sheet.tier); // характеристики карьеры на текущей ступени
  const schemeAll = careerScheme();
  STAT_NAMES.forEach(s => {
    const base = state.stats[s] || 0;
    const done = statAdvancesTotal(s);
    const cur  = base + done;
    const inCart = cartCountStat(s);
    const inCareer = !availStats || availStats.includes(s);
    // вне карьеры — двойная цена (правило «Улучшения», гл. II)
    const baseCost = advCostFor(done + inCart).char;
    const cost = inCareer ? baseCost : baseCost * 2;
    const can  = avail >= cost;
    // на какой ступени характеристика откроется (если из схемы, но пока недоступна)
    let unlockNote = '';
    if(!inCareer && schemeAll){
      if(schemeAll.t2===s) unlockNote='со 2-й ступени';
      else if(schemeAll.t3===s) unlockNote='с 3-й ступени';
      else if(schemeAll.t4===s) unlockNote='с 4-й ступени';
    }
    html += `<div class="shop-card${inCareer?'':' off'}${inCart?' incart':''}">
      <div class="sc-head"><b>${s}</b><span>${STAT_FULL[s]}</span></div>
      <div class="sc-val">${cur}</div>
      <div class="sc-sub">база ${base} · шагов ${done}${inCart?` · <i>+${inCart} 🛒</i>`:''}</div>
      <div class="sc-tag">${inCareer?'карьера':'×2'+(unlockNote?` · ${unlockNote}`:'')}</div>
      <button class="btn btn-sm sc-buy ${can?'btn-gold':''}" ${can?'':'disabled'} onclick="buyStatAdv('${s}')">+1 шаг · ${cost} XP</button>
    </div>`;
  });
  html += '</div></div>';

  // ===== Покупка навыков (карьерные текущей ступени) =====
  html += `<div class="panel"><div class="panel-title">Навыки карьеры (${tier.name})</div>`;
  html += `<p class="muted" style="font-size:11px;">Цена шага: 0–5: <b>10</b>, 6–10: <b>15</b>, 11–15: <b>20</b>, 16–20: <b>30</b>, 21–25: <b>40</b>, 26–30: <b>60</b>, 31–35: <b>80</b>, 36–40: <b>110</b>.</p>`;
  html += '<div class="shop-grid">';
  tierSkills.forEach(skName => {
    const done = skillAdvancesTotal(skName);
    const inCart = cartCountSkill(skName);
    const cost = advCostFor(done + inCart).skill;
    const can  = avail >= cost;
    const stat = statFor(skName);
    const statVal = (state.stats[stat]||0) + statAdvancesTotal(stat);
    const totalSkill = statVal + done;
    html += `<div class="shop-card${inCart?' incart':''}">
      <div class="sc-head"><b style="font-size:12px;">${skName}</b><span>${stat}</span></div>
      <div class="sc-val">${totalSkill}</div>
      <div class="sc-sub">шагов ${done}${inCart?` · <i>+${inCart} 🛒</i>`:''}</div>
      <button class="btn btn-sm sc-buy ${can?'btn-gold':''}" ${can?'':'disabled'} data-call="skill-buy" data-v="${escAttr(skName)}">+1 шаг · ${cost} XP</button>
    </div>`;
  });
  html += '</div></div>';

  // ===== Свободная покупка любого навыка =====
  const profOpts = DATA.prof_skills.map(p => `<option value="${escAttr(p.name)}">`).join('');
  const commonOpts = DATA.common_skills.map(p => `<option value="${escAttr(p.name)}">`).join('');
  html += `<div class="panel"><div class="panel-title">Купить шаг любого навыка</div>
    <p class="muted" style="font-size:11px;">Стоимость недоступного навыка (не из карьерной ступени) — х2 по правилам, но здесь даём базовую цену (ведущий пусть решает доступность).</p>
    <datalist id="shop-all-skills">${commonOpts}${profOpts}</datalist>
    <div class="add-row">
      <input type="text" id="shop-skill-name" list="shop-all-skills" placeholder="название навыка"/>
      <button class="btn btn-sm btn-gold" onclick="buyArbitrarySkill()">Купить +1 шаг</button>
    </div>
  </div>`;

  // ===== Таланты карьеры =====
  html += `<div class="panel"><div class="panel-title">Таланты карьеры (${tier.name})</div>`;
  html += `<p class="muted" style="font-size:11px;">Шаг развития таланта: <b>100</b> XP за уровень — по правилам WFRP4 цена не растёт.</p>`;
  html += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Талант</th><th>Уже шагов</th><th>Цена след.</th><th>Купить</th></tr></thead><tbody>';
  tierTalents.forEach(tn => {
    const lower = tn.toLowerCase();
    const cnt = (state.sheet.talentBought || []).filter(x => x.name.toLowerCase() === lower).length;
    const inCart = cartCountTalent(tn);
    const cost = 100 + 100*(cnt + inCart);
    const can  = avail >= cost;
    const hint = findTalentHint(tn);
    html += `<tr${inCart?' style="background:rgba(218,165,32,0.06);"':''}>
      <td><b>${tn}</b>${hint?`<br><span class="muted" style="font-size:10px;">${escHtml(hint).substring(0,140)}</span>`:''}</td>
      <td>${cnt}${inCart?` <span style="color:var(--gold2);font-size:10px;">+${inCart}<span class="ic">${ICONS.shop}</span></span>`:''}</td>
      <td>${cost} XP</td>
      <td><button class="btn btn-sm ${can?'btn-gold':''}" ${can?'':'disabled'} data-call="talent-buy" data-v="${escAttr(tn)}">+1 шаг</button></td>
    </tr>`;
  });
  html += '</tbody></table></div></div>';

  // ===== Свободная покупка таланта =====
  const talOpts = (DATA.all_talents || []).map(t => `<option value="${escAttr(t.name)}">`).join('');
  html += `<div class="panel"><div class="panel-title">Купить любой талант</div>
    <datalist id="shop-all-talents">${talOpts}</datalist>
    <div class="add-row">
      <input type="text" id="shop-talent-name" list="shop-all-talents" placeholder="название таланта"/>
      <button class="btn btn-sm btn-gold" onclick="buyArbitraryTalent()">Купить шаг</button>
    </div>
  </div>`;

  // ===== ПЕРЕМЕНЫ В КАРЬЕРЕ =====
  html += renderCareerChange(c, tierIdx);

  // ===== ЖУРНАЛ =====
  if((state.sheet.careerLog||[]).length){
    html += `<div class="panel"><div class="panel-title">Журнал перемен в карьере</div>`;
    html += '<ul style="margin-left:20px;">';
    state.sheet.careerLog.forEach(e => {
      html += `<li>${escHtml(e.from)} → <b>${escHtml(e.to)}</b> · ${e.cost} XP <span class="muted">${e.completed?'(ступень завершена)':'(не завершена)'}</span></li>`;
    });
    html += '</ul></div>';
  }

  el.innerHTML = html;
  renderCartBadge();
}

// Плавающий бейдж корзины — виден всегда в магазине
function renderCartBadge(){
  let badge = document.getElementById('cart-badge');
  const cart = state.sheet._cart || [];
  const n = cart.length;
  const total = cartTotal();
  if(!n){ if(badge) badge.remove(); return; }
  if(!badge){
    badge = document.createElement('div');
    badge.id = 'cart-badge';
    badge.className = 'sv4-cart-badge';
    document.body.appendChild(badge);
  }
  badge.innerHTML = `
    <button class="sv4-cart-badge-main" onclick="document.querySelector('.sv4-cart-list, [class*=cart]')?.scrollIntoView({behavior:'smooth',block:'center'})">
      🛒 <b>${n}</b> · −${total} XP
    </button>
    <button class="sv4-cart-badge-apply" onclick="cartApply()">✓</button>`;
}

// === Авто-проверка завершения ступени карьеры (правила WFRP4) ===
// Ступень считается завершённой, когда вложено нужное число шагов развития
// (1→5, 2→10, 3→15, 4→20) во ВСЕ 8 карьерных умений этой ступени, во все
// карьерные характеристики и хотя бы в 1 талант этой ступени.
// ВАЖНО: модель приложения не хранит, какие именно характеристики относятся
// к карьере (в книге они заданы значками), поэтому число характеристик
// сверяется по количеству, а не по конкретным. Остальное проверяется точно.
const TIER_MIN_ADV = { 1:5, 2:10, 3:15, 4:20 };

function careerTierCompletion(career, tierIdx){
  const c = DATA.careers[career];
  const res = { ok:false, need:0, skills:[], skillsOk:false, talentOk:false, statsCount:0, statsOk:false };
  if(!c) return res;
  const tier = c.tiers[tierIdx];
  if(!tier) return res;
  res.need = TIER_MIN_ADV[tierIdx+1] || 5;

  // ═══ По книге («Завершение карьеры», гл. III): нужно [need] улучшений
  //     В КАЖДОЙ характеристике уровня, В 8 умениях уровня и ≥1 талант уровня.
  //     Уровень 1 → 5, ур.2 → 10, ур.3 → 15, ур.4 → 20. Ранее купленные учитываются. ═══

  // 1) Умения: минимум 8 умений, доступных на этом уровне, с ≥ need шагами каждое
  const tierSkills = (tier.skills||'').split(/,(?![^()]*\))/).map(s=>s.trim()).filter(Boolean);
  res.skills = tierSkills.map(name => ({ name, adv: skillAdvancesTotal(name), ok: skillAdvancesTotal(name) >= res.need }));
  res.skillsDone = res.skills.filter(s => s.ok).length;
  res.skillsNeed = Math.min(8, res.skills.length);
  res.skillsOk = res.skillsDone >= res.skillsNeed;

  // 2) Хотя бы 1 талант этой ступени (купленные + взятый при создании)
  const tierTalents = (tier.talents||'').split(/,(?![^()]*\))/).map(s=>s.trim().toLowerCase()).filter(Boolean);
  const ownedTalents = new Set();
  (state.sheet.talentBought||[]).forEach(t => ownedTalents.add((t.name||'').toLowerCase()));
  (state.sheet.extraTalents||[]).forEach(t => ownedTalents.add((t.name||'').toLowerCase()));
  if(state.careerTalentLvl) ownedTalents.add(state.careerTalentLvl.toLowerCase());
  res.talentOk = tierTalents.some(t => ownedTalents.has(t));

  // 3) Характеристики: КАЖДАЯ из схемы уровня должна иметь ≥ need шагов
  const availStats = (typeof careerStatsAvailable==='function') ? careerStatsAvailable(tierIdx+1) : null;
  if(availStats && availStats.length){
    res.statList = availStats.map(st => ({ st, adv: statAdvancesTotal(st), ok: statAdvancesTotal(st) >= res.need }));
    res.statsOk = res.statList.every(x => x.ok);
    res.statsAdvSum = res.statList.reduce((a,x)=>a+x.adv,0);
  } else {
    // схема неизвестна — мягкая проверка по сумме
    res.statsAdvSum = STAT_NAMES.reduce((a,sname)=> a + Math.max(0, statAdvancesTotal(sname)), 0);
    res.statsOk = res.statsAdvSum >= res.need * 3;
    res.statList = null;
  }
  res.statsCount = STAT_NAMES.filter(s => statAdvancesTotal(s) > 0).length;

  res.ok = res.skillsOk && res.talentOk && res.statsOk;
  return res;
}

function renderCareerChange(c, tierIdx){
  const tier = c.tiers[tierIdx];
  // Авто-проверка завершения по правилам + ручной GM-оверрайд
  const chk = careerTierCompletion(c.name, tierIdx);
  const override = !!state.sheet.tierCompleteOverride;
  const completed = chk.ok || override;
  const avail = xpAvailable();
  let html = `<div class="panel"><div class="panel-title">Перемены в карьере</div>`;

  // Живой чек-лист завершения ступени
  const mark = b => b ? '<span style="color:var(--green2)">✓</span>' : '<span style="color:var(--blood2)">✗</span>';
  const skillsList = chk.skills.map(s => `${s.ok?'✓':'·'} ${escHtml(s.name)} <b style="color:${s.ok?'var(--green2)':(s.adv>0?'var(--gold2)':'var(--blood2)')}">${s.adv}/${chk.need}</b>`).join(' &nbsp; ');
  html += `<div style="border:1px solid var(--border);border-radius:6px;padding:8px;margin:6px 0;font-size:11px;">
    <b>Завершение ступени ${tierIdx+1} «${escHtml(tier.name)}»:</b>
    ${completed?'<b style="color:var(--green2)">✓ ЗАВЕРШЕНА</b>':'<b style="color:var(--blood2)">НЕ завершена</b>'}
    ${override && !chk.ok ? '<span class="muted">(вручную, GM)</span>' : ''}
    <div style="margin-top:5px;">${mark(chk.skillsOk)} Умения уровня с ≥${chk.need} шагами: <b>${chk.skillsDone||0} / ${chk.skillsNeed||8}</b><br><span class="muted">${skillsList || '—'}</span></div>
    <div style="margin-top:4px;">${mark(chk.talentOk)} Взят хотя бы 1 талант этой ступени</div>
    <div style="margin-top:4px;">${mark(chk.statsOk)} Характеристики схемы — в каждой ≥${chk.need} шагов:
      <span class="muted">${chk.statList ? chk.statList.map(x=>`${x.st} ${x.adv}/${chk.need}${x.ok?' ✓':''}`).join(' · ') : `сумма ${chk.statsAdvSum||0}`}</span></div>
  </div>`;
  html += `<p class="muted" style="font-size:11px;">Стоимость перехода: <b>100 XP</b> если ступень завершена, <b>200 XP</b> если нет. Переход в карьеру ДРУГОГО класса: <b>+100 XP</b> сверху.</p>`;
  html += `<div style="margin:6px 0;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
    <button class="btn btn-sm ${override?'btn-gold':''}" onclick="toggleTierCompleted()">${override?'✓ GM-оверрайд ВКЛ (снять)':'⚑ Отметить вручную (GM)'}</button>
    <span class="muted" style="font-size:10px;">обычно не нужно — статус считается автоматически</span>
  </div>`;

  // Опция 1: следующая ступень той же карьеры
  if(tierIdx < c.tiers.length - 1){
    const next = c.tiers[tierIdx+1];
    const cost = completed ? 100 : 200;
    const can = avail >= cost;
    html += `<div style="border-top:1px dashed var(--border);padding-top:8px;margin-top:8px;">
      <b>Следующая ступень:</b> ${tierIdx+2}. ${next.name} (${next.status})
      <button class="btn btn-sm ${can?'btn-gold':''}" ${can?'':'disabled'} style="margin-left:8px;" onclick="changeCareer('next', ${cost})">Перейти за ${cost} XP</button>
    </div>`;
  }

  // Опция 2: смена на ту же ступень другой карьеры того же класса
  const myClass = c.class;
  const sameClassCareers = (DATA.classes[myClass]?.careers || []).filter(n => n !== c.name);
  if(sameClassCareers.length){
    const cost = completed ? 100 : 200;
    const can = avail >= cost;
    html += `<div style="border-top:1px dashed var(--border);padding-top:8px;margin-top:8px;">
      <b>Сменить карьеру (тот же класс «${myClass}»):</b><br>
      <select id="shop-same-class-career" style="margin:4px;">
        ${sameClassCareers.map(n => `<option value="${escAttr(n)}">${n}</option>`).join('')}
      </select>
      <select id="shop-same-class-tier" style="margin:4px;">
        <option value="same">та же ступень (${tierIdx+1})</option>
        <option value="1">с 1-й ступени</option>
      </select>
      <button class="btn btn-sm ${can?'btn-gold':''}" ${can?'':'disabled'} onclick="changeCareer('same-class', ${cost})">Сменить за ${cost} XP</button>
    </div>`;
  }

  // Опция 3: смена класса (любая карьера любого класса)
  const otherClasses = Object.keys(DATA.classes).filter(cn => cn !== myClass);
  const baseCost = completed ? 100 : 200;
  const extraCost = 100;
  const fullCost = baseCost + extraCost;
  const canFull = avail >= fullCost;
  html += `<div style="border-top:1px dashed var(--border);padding-top:8px;margin-top:8px;">
    <b>Сменить класс и карьеру:</b><br>
    <select id="shop-new-class" onchange="updateNewClassCareers()" style="margin:4px;">
      <option value="">— выбери класс —</option>
      ${otherClasses.map(cn => `<option value="${escAttr(cn)}">${cn}</option>`).join('')}
    </select>
    <select id="shop-new-career" style="margin:4px;"><option value="">— карьера —</option></select>
    <button class="btn btn-sm ${canFull?'btn-gold':''}" ${canFull?'':'disabled'} onclick="changeCareer('new-class', ${fullCost})">Сменить за ${fullCost} XP</button>
    <p class="muted" style="font-size:10px;margin-top:4px;">Новая карьера начнётся с 1-й ступени.</p>
  </div>`;
  html += `</div>`;
  return html;
}

function updateNewClassCareers(){
  const cls = document.getElementById('shop-new-class').value;
  const sel = document.getElementById('shop-new-career');
  if(!cls){ sel.innerHTML = '<option value="">— карьера —</option>'; return; }
  const careers = DATA.classes[cls].careers || [];
  sel.innerHTML = '<option value="">— карьера —</option>' + careers.map(n => `<option value="${escAttr(n)}">${n}</option>`).join('');
}

function toggleTierCompleted(){
  state.sheet.tierCompleteOverride = !state.sheet.tierCompleteOverride;
  renderShop();
}

// ===== Покупки =====
// Сколько шагов этой хар./навыка/таланта уже лежит в корзине
function cartCountStat(s){ return (state.sheet._cart||[]).filter(i=>i.type==='stat'&&i.key===s).length; }
function cartCountSkill(name){ const l=name.toLowerCase(); return (state.sheet._cart||[]).filter(i=>i.type==='skill'&&i.key===l).length; }
function cartCountTalent(name){ const l=name.toLowerCase(); return (state.sheet._cart||[]).filter(i=>i.type==='talent'&&i.key===l).length; }

function buyStatAdv(s){
  const done = statAdvancesTotal(s) + cartCountStat(s);
  const availStats = careerStatsAvailable(state.sheet.tier);
  const inCareer = !availStats || availStats.includes(s);
  const cost = advCostFor(done).char * (inCareer ? 1 : 2);
  if(xpAvailable() < cost){ notify('Недостаточно XP (с учётом корзины).'); return; }
  // Мягкое напоминание о лимите шагов характеристики по ступени карьеры
  // (книга: каждая ступень открывает +5 шагов; 1-я → 5, 2-я → 10, 3-я → 15, 4-я → 20)
  const tier = state.sheet.tier || 1;
  const tierLimit = tier * 5;
  if(done >= tierLimit && !state.sheet._statLimitAck){
    state.sheet._statLimitAck = true;
    notify('⚠ ' + s + ': ' + done + ' шагов — это предел для ' + tier + '-й ступени (' + tierLimit + '). По правилам выше можно качать только на следующих ступенях. Покупка разрешена.');
  }
  if(!state.sheet._cart) state.sheet._cart = [];
  state.sheet._cart.push({ type:'stat', key:s, cost, label:`+1 шаг ${s}` });
  renderShop();
}

function buySkillAdv(name){
  const lower = name.toLowerCase();
  const done = skillAdvancesTotal(name) + cartCountSkill(name);
  const cost = advCostFor(done).skill;
  if(xpAvailable() < cost){ notify('Недостаточно XP (с учётом корзины).'); return; }
  if(!state.sheet._cart) state.sheet._cart = [];
  state.sheet._cart.push({ type:'skill', key:lower, name, cost, label:`+1 шаг «${name}»` });
  renderShop();
}

function buyArbitrarySkill(){
  const inp = document.getElementById('shop-skill-name');
  const name = inp.value.trim();
  if(!name){ notify('Введи название навыка.'); return; }
  buySkillAdv(name);
  inp.value = '';
}

function buyTalent(name){
  const lower = name.toLowerCase();
  // По правилам WFRP4 талант стоит ровно 100 XP за каждый уровень (без нарастания цены).
  const cost = 100;
  if(xpAvailable() < cost){ notify('Недостаточно XP (с учётом корзины).'); return; }
  if(!state.sheet._cart) state.sheet._cart = [];
  state.sheet._cart.push({ type:'talent', key:lower, name, cost, label:`Талант «${name}»` });
  renderShop();
}

function buyArbitraryTalent(){
  const inp = document.getElementById('shop-talent-name');
  const name = inp.value.trim();
  if(!name){ notify('Введи название таланта.'); return; }
  buyTalent(name);
  inp.value = '';
}

// Убрать одну позицию из корзины
function cartRemove(idx){
  if(!state.sheet._cart) return;
  state.sheet._cart.splice(idx, 1);
  renderShop();
}
// Очистить всю корзину
function cartClear(){
  state.sheet._cart = [];
  renderShop();
}
// Применить корзину — окончательно списать опыт и внести изменения
function cartApply(){
  const cart = state.sheet._cart || [];
  if(!cart.length){ notify('Корзина пуста.'); return; }
  const total = cartTotal();
  if((state.xpGained||0) - (state.sheet.spentXP||0) < total){
    notify('Недостаточно опыта для применения.'); return;
  }
  cart.forEach(it => {
    if(it.type==='stat'){
      state.sheet.statAdvBought[it.key] = (state.sheet.statAdvBought[it.key]||0) + 1;
    } else if(it.type==='skill'){
      if(!state.sheet.skillAdvBought) state.sheet.skillAdvBought = {};
      state.sheet.skillAdvBought[it.key] = (state.sheet.skillAdvBought[it.key]||0) + 1;
    } else if(it.type==='talent'){
      if(!state.sheet.talentBought) state.sheet.talentBought = [];
      const exB = state.sheet.talentBought.find(x => x.name === it.name);
      if(exB) exB.level = (exB.level||1) + 1; else state.sheet.talentBought.push({ name: it.name, level: 1 });
      const hint = findTalentHint(it.name);
      const exE = state.sheet.extraTalents.find(x => x.name === it.name);
      if(exE) exE.level = (exE.level||1) + 1; else state.sheet.extraTalents.push({ name: it.name, level: 1, hint });
    }
  });
  // Снимок для отмены — до того, как корзина опустеет
  if(typeof xpRemember === 'function'){
    xpRemember({ kind:'cart', cost: total, items: JSON.parse(JSON.stringify(cart)) });
  }
  state.sheet.spentXP = (state.sheet.spentXP||0) + total;
  state.sheet._cart = [];
  notify(`Принято! Потрачено ${total} XP.`);
  renderShop();
}

// ===== Смена карьеры/ступени =====
function changeCareer(mode, cost){
  if(xpAvailable() < cost){ notify('Недостаточно XP.'); return; }
  const c = DATA.careers[state.career];
  const tierIdx = Math.max(0, Math.min(3, state.sheet.tier - 1));
  const fromName = `${state.career} · ${state.sheet.tier}. ${c.tiers[tierIdx].name}`;
  let toCareer = state.career;
  let toTier   = state.sheet.tier;
  let completed = careerTierCompletion(state.career, tierIdx).ok || !!state.sheet.tierCompleteOverride;

  if(mode === 'next'){
    toTier = state.sheet.tier + 1;
  } else if(mode === 'same-class'){
    const sel = document.getElementById('shop-same-class-career');
    const tsel= document.getElementById('shop-same-class-tier');
    if(!sel || !sel.value){ notify('Выбери карьеру.'); return; }
    toCareer = sel.value;
    toTier = (tsel.value === '1') ? 1 : state.sheet.tier;
  } else if(mode === 'new-class'){
    const csel = document.getElementById('shop-new-class');
    const sel  = document.getElementById('shop-new-career');
    if(!csel.value || !sel.value){ notify('Выбери класс и карьеру.'); return; }
    state.cls = csel.value;
    toCareer = sel.value;
    toTier = 1;
  }

  // Снимок для отмены — пока карьера ещё прежняя
  if(typeof xpRemember === 'function'){
    xpRemember({ kind:'career', cost, career: state.career, cls: state.cls,
                 tier: state.sheet.tier, tier1Done: state.sheet.careerTier1Done,
                 override: state.sheet.tierCompleteOverride,
                 toName: `${toCareer} · ${toTier}` });
  }
  state.sheet.spentXP = (state.sheet.spentXP || 0) + cost;
  state.career = toCareer;
  state.sheet.tier = toTier;
  state.sheet.careerTier1Done = false;       // (устар. флаг — оставлен для совместимости)
  state.sheet.tierCompleteOverride = false;  // на новой ступени статус считается заново

  // === Имущество при смене карьеры/ступени НЕ выдаётся ===
  // По правилам WFRP4 стартовое имущество персонаж получает только при
  // создании (за класс + 1-ю ступень первой карьеры). Имущество ступеней
  // 2–4 — лишь ориентир, механически оно не начисляется. Новое снаряжение
  // нужно добывать по ходу игры (покупка, добыча, награда от GM).
  const newCar = DATA.careers[toCareer];

  // Журнал
  if(!Array.isArray(state.sheet.careerLog)) state.sheet.careerLog = [];
  const toName = `${toCareer} · ${toTier}. ${newCar?.tiers[toTier-1]?.name || ''}`;
  state.sheet.careerLog.push({ from: fromName, to: toName, cost, completed });

  notify(`Перешёл: ${toName}. Списано ${cost} XP.`);
  renderShop();
}
